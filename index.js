var amqp = require('amqplib');
var uuid = require('node-uuid');
var cacheTable={};
var mqService={};
//defer is discourage in most promise library so we define one for this particular situation
function defer(timeout) {
    var resolve, reject;
    var promise = new Promise(function() {
        resolve = arguments[0];
        reject = arguments[1];
        setTimeout(reject, timeout, "Timeout");
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
exports.send=function(serviceName,message,timeout){
    var q = serviceName + "_queue";
    var corrId = uuid();
    var ok = mqService.ok;
    var ch = mqService.ch;
    //create a new Promise and waiting for resolve
    var df=defer(timeout);
    cacheTable[corrId]=df;
    ok = ok.then(function (queue) {
        return ch.consume(queue, maybeAnswer, {noAck: true})
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
        pro.resolve(JSON.parse(msg.content.toString()));
        delete cacheTable[corrId];
    }
}

/**
 * Server Side function
 **/


/**
 *
 * @param amqp_url
 * @param service_name
 * @param pro (this function has to be a promise)
 * @param options (object)
 *      Must Have: noAck (boolean)
 *                 if noAck = True: the queue will send tasks to server and then discard regardless of the server's
 *                                  state.
 *                                  Warning: when having two or more servers, setting noAck to True will risk loosing
 *                                          message if one of the server that gets the messages goes offline.
 *                 if noAck = False: the queue will make sure the server get and finish the task with acknowledgements.
 *                                  Warning: if the server gets the tasks but fails to finish, the message will
 *                                          1. Timeout as determined by messageTtl option
 *                                          2. If the server goes offline, the tasks will be requeued and sent to the
 *                                              next available server.
 *                *We recommend setting noAck to False to guarantee message delivery and avoid loosing message when
 *                      multiple servers are online and working
 *      Optional :
 *              messageTtl (milliseconds) (must start a new queue if this option was just added, modified, or taken out)
 *                  Set Timeout for messages in the queue. This option has proven to be extremely helpful when the
 *                      server goes offline and comes back and the messages are requeued. If the messageTtl is set to
 *                      the same milliseconds as the client's timeout, the queue will make sure the server do not get
 *                      timed out messages that the client no longer cares about.
 *              *We recommend setting the messageTtl equal to the client's timeout parameter.
 *
 *              prefetch_num (integer bigger than or equal to 1)
 *                  Set the maximum number of acknowledgements the queue can wait from the server. In other words, it
 *                      is the maximum number of tasks one server can take each time. That said, this will only be
 *                      effective when the noAck is set to False. If prefetch_num is not passed in, the server will
 *                      simply take as many tasks as possible and this may cause a race condition. In our production
 *                      experience, we find that a number of 10 or 100 works just fine.
 *             *Only effective when noAck == False
 *
 *             durable (boolean)
 *                  Make the queue durable as stated on the RabbitMQ website. The default setting is false.
 *      Example:
 *              Our Safest/Most Used Options: {noAck:false, prefetch_num:10, messageTtl:60000}
 *              Simplest/Minimalist Options(best for just testing): {noAck:true}
 *
 *
 *
 */
exports.server_listen=function(amqp_url,service_name,pro,options){//pro has to be a promise
    var durable;
    if(options.durable) {
        durable = options.durable;
    }else
        durable = false;

    var queueOptions={durable: durable};

    if(options.messageTtl)
        queueOptions.messageTtl = options.messageTtl;

    amqp.connect(amqp_url).then(function(conn) {
        process.once('SIGINT', function() { conn.close(); });
        return conn.createChannel().then(function(ch) {
            var q = service_name + "_queue";
            var ok = ch.assertQueue(q, queueOptions);
            var ok = ok.then(function() {
                if(options.prefetch_num) {
                    ch.prefetch(options.prefetch_num);
                }
                return ch.consume(q, reply,{noAck:options.noAck});
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
                        if(!options.noAck) {
                            ch.ack(msg);
                        }
                    },
                    function onReject(err){
                        console.log(err);
                        ch.sendToQueue(msg.properties.replyTo,
                            new Buffer(JSON.stringify(err)),
                            {correlationId: msg.properties.correlationId});
                        if(!options.noAck) {
                            ch.ack(msg);
                        }
                    }
                );
            }
        });
    }).then(null, function(err){
        console.error("Server has problem connecting, shutting down...\nDetail:\n" + err);
    });
};