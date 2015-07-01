/**
 * Created by root on 6/17/15.
 */
var amqpServer = require('./amqpConnect');
var amqp_url="amqp://richard:12345678@115.28.35.230";

function test(content){
    return new Promise(function(resolve,reject){
        var n = parseInt(content.toString());
        console.log(' [.] fib(%d)', n);
        var response = n+1;
        setTimeout(function(){
            resolve(response);
        },n*1000);
    });
}
amqpServer.server_listen(amqp_url,'rpc',test);