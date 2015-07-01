var amqp = require('amqplib');
var uuid = require('node-uuid');
var cacheTable={};
var mqService={};
//defer is discourage in most promise library so we define one for this particular situation
function defer() {
    var resolve, reject;
    var promise = new Promise(function() {
        resolve = arguments[0];
        reject = arguments[1];
        setTimeout(reject, 60000, "Timeout");
    });
    return {
        resolve: resolve,
        reject: reject,
        promise: promise
    };
}
exports.connect_amqp=function(amqp_url){
    return amqp.connect(amqp_url).then(function (conn) {
        return conn.createChannel().then(
            function onFulfilled(ch) {
                mqService.ch=ch;
                var ok = ch.assertQueue('', {exclusive: true})
                    .then(function (qok) {
                        return qok.queue;
                    });
                mqService.ok=ok;
                return ok;
            });
    }).then(null, function(err) {
        console.error("Exception handled, reconnecting...\nDetail:\n" + err);
        setTimeout(exports.connect_amqp(amqp_url), 5000);
    });
};
exports.send=function(serviceName,message){
    var q = serviceName + "_queue";
    var corrId = uuid();
    var ok = mqService.ok;
    var ch = mqService.ch;
    //create a new Promise and waiting for resolve
    var df=defer();
    cacheTable[corrId]=df;
    ok = ok.then(function (queue) {
        return ch.consume(queue, maybeAnswer, {noAck: false})
            .then(function () {
                return queue;
            });
    });
    ok = ok.then(function (queue) {
        console.log(' [x] Requesting'+ message);
        ch.sendToQueue(q, new Buffer(JSON.stringify(message)), {
            correlationId: corrId, replyTo: queue
        });
    });
    return df.promise;
};

function maybeAnswer(msg) {
    var corrId=msg.properties.correlationId;
    var pro = cacheTable[corrId];
    if(pro){
        pro.resolve(msg.content.toString());
        delete cacheTable[corrId];
    }
}


/**
 * Server Side function
 * @param amqp_url
 * @param service_name
 * @param pro
 **/

exports.server_listen=function(amqp_url,service_name,pro){//pro has to be a promise
    amqp.connect(amqp_url).then(function(conn) {
        process.once('SIGINT', function() { conn.close(); });
        return conn.createChannel().then(function(ch) {
            var q = service_name + "_queue";
            var ok = ch.assertQueue(q, {durable: false});
            var ok = ok.then(function() {
                //ch.prefetch(1);
                return ch.consume(q, reply);
            });
            return ok.then(function() {
                console.log(' [x] Awaiting requests');
            });

            function reply(msg) {
                var content=JSON.parse(msg.content.toString());
                pro(content).then(
                    function onFulfilled(response){
                        ch.sendToQueue(msg.properties.replyTo,
                            new Buffer(JSON.stringify(response)),
                            {correlationId: msg.properties.correlationId});
                        ch.ack(msg);
                    },
                    function onReject(err){
                        console.log(err);
                    }
                );
            }
        });
    }).then(null, console.warn);
};