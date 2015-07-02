Node Microservice Package
============================

Clean, Direct, Easy to Scale solution to Node Microservice Framework.

Inspired by [seneca.js][1], IBM's article on [microservice using seneca and MQLight][2], and RabbitMQ's [tutorial on RPC][3], 
we aim to create a one stop solution that will allow seneca-style communication between any number of servers and clients, with the
ability of load balance offered by message brokers such as RabbitMQ. We did it by first trying all the current available
choices based on seneca.js, but none of them really worked in the most basic aspects. So we decided to do this without
any dependency on seneca, thus allowing us the maximum freedom in programming language, and set up RabbitMQ server
as our own message broker. Using this package, you only need one line of code to set up the server, and about three lines for
the client. You can even separate the connection and send functions for the client, so you only need to connect once
for your entire project, and send any number of requests.



**TL;DR**: Freedom in language, minimum lines of code, over amqp message broker



Advantage/Features: 
- **Timeout mechanism**: During our production test, we found that having the timeout mechanism is extremely helpful especially when the internet
    connection is poor and the number of requests is huge. Both the server and the client take an parameter of timeout,
    so that when the time is due, the client will automatically timeout the requests, or the tasks will timeout in the queue
    before being sent to the server.
- **Multiple Requests**: While testing all of the available choices, we found that none of them can handle the problem of having multiple
    requests from one client. By using our own function, we made sure that no matter which request client 
    received the response, the request will be resolved and returned properly.
- **Promise**: No more call back api! Everything is a Promise.



## Install

    npm install node-microservice

## Usage

Server:

    require('seneca')()
        .use(require('..'))
        .add({generate: 'id'}, function(message, done) {
            done(null, {pid: process.pid, id: '' + Math.random()});
        })
        .listen({type: 'amqp'});

Client:

    var client = require('seneca')()
        .use(require('..'))
        .client({type: 'amqp'}):

    setInterval(function() {
        client.act({generate: 'id'}, function(err, result) {
            console.log(JSON.stringify(result));
        });
    }, 500)

## Options

The following object describes the available options for this transport.
These are applicable to both clients and servers.

    var defaults = {
        amqp: {
            type: 'amqp',
            url: 'amqp://localhost',
            exchange: {
                name: 'seneca',
                options: {
                    durable: true,
                    autoDelete: false
                }
            },
            queues: {
                action: {
                    durable: true
                },
                response: {
                    autoDelete: true,
                    exclusive: true
                }
            }
        }
    };

## TODO

- Tests

Any help/contribution is appreciated!


[1]: http://senecajs.org/
[2]: https://developer.ibm.com/messaging/2015/05/06/microservices-with-seneca-and-mq-light/
[3]: https://github.com/squaremo/amqp.node/tree/master/examples/tutorials