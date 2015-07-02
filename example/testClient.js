/**
 * Created by root on 6/17/15.
 */
var amqpClient = require('./../index');
var amqp_url="amqp://usr:password@128.11.22.230";

amqpClient.connect_amqp(amqp_url).then(
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
