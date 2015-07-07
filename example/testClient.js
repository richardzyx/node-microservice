/**
 * Created by root on 6/17/15.
 */
var amqpClient = require('./../index');
var amqp_url="amqp://usr:password@128.11.22.230";//Change to your own username, password, and address and/or vhost
var options = {
    servers: [
        { 'host': "42.11.11.123", port: 12201 }//Put your own graylog server here!
    ],
    hostname: "node-microservice" // the name of this host
    // (optional, default: os.hostname())
};

amqpClient.connect_amqp(amqp_url, options).then(
    function(){
        amqpClient.send('testing',3,60000).then(
            function onFulfilled(result){
                console.log(result);
            },
            function onTimeout(err){
                console.log(err);
            }
        )
        amqpClient.send('testing',6,60000).then(
            function onFulfilled(result){
                console.log(result);
            },
            function onTimeout(err){
                console.log(err);
            }
        )
    }
);
