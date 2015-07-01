/**
 * Created by root on 6/17/15.
 */
var amqpClient = require('./amqpConnect');
var amqp_url="amqp://richard:12345678@115.28.35.230";

amqpClient.connect_amqp(amqp_url).then(
    function(){
        amqpClient.send('rpc',3).then(
            function onFulfilled(result){
                console.log(result);
            },
            function onTimeout(err){
                console.log(err);
            }
        )
        amqpClient.send('rpc',6).then(
            function onFulfilled(result){
                console.log(result);
            },
            function onTimeout(err){
                console.log(err);
            }
        )
    }
);
