Node－Microservice Package
============================



Clean, Direct, Easy to Scale solution to Node Microservice Framework.




Inspired by [seneca.js][1], IBM's article on [microservice using seneca and MQLight][2], and RabbitMQ's [tutorial on RPC][3], 
we aim to create a one stop solution that will allow seneca-style communication between any number of servers and clients, with the
ability of load balance offered by message brokers such as RabbitMQ. We did it by first trying all the current available
choices based on seneca.js, but none of them really worked in the most basic aspects. So we decided to do this without
any dependency on seneca, thus allowing us the maximum freedom in programming language, and set up RabbitMQ server
as our own message broker. Using this package, you only need one function to set up the server, and two functions for
the client. You can even separate the connection and send functions for the client, so you only need to connect once
for your entire project, and send any number of requests.



Special thanks to my mentor and great boss: [dingziran][4]@[Wecash][5]! This solution will not exist or even work without his help.




**TL;DR**: freedom in language, minimum lines of code, over amqp message broker




Advantage/Features: 
- **Timeout Mechanism**: During our production test, we found that having the timeout mechanism is extremely helpful especially when the internet
    connection is poor and the number of requests is huge. Both the server and the client take the parameter of timeout,
    so that when the time is due, the client will automatically timeout the requests, or the tasks will timeout in the queue
    before being sent to the server.
- **Multiple Requests**: While testing all of the available choices, we found that none of them can handle the problem of having multiple
    requests from one client. By using our own function, we made sure that no matter which requesting client 
    received the response, the request will be resolved and returned properly.
- **Promise**: No more call back api! Everything is a Promise.




## Install

    npm install node-microservice

## Usage



npm users please refer to GitHub repo for better formatted Readme.

###Server:
Just add this one line of code at the end of your service file, pass options as an object, and you have a working server.



`exports.server_listen=function(amqp_url,service_name,pro,options)`


- amqp_url is the address of your MQ service. Such as:`"amqp://usr:password@128.11.22.230"`
- service_name is the name of the request the server is listening to. The server will only listen to the request that the
client sent with the same service name.
- pro is the function that you want to pass the message/task to. This function **MUST** be a Promise.

For options:



**Must Have**: noAck (boolean)
- if noAck = True: the queue will send tasks to server and then discard regardless of the server's
state. **Warning**: when having two or more servers, setting noAck to True will risk loosing message if one of the server that gets the messages goes offline.
- if noAck = False: the queue will make sure the server get and finish the task with acknowledgements.
Warning: if the server gets the tasks but fails to finish, the message will
  - 1. Timeout as determined by messageTtl option,
  - 2. If the server goes offline, the tasks will be requeued and sent to the
   next available server.



*We recommend setting noAck to False to guarantee message delivery and avoid loosing message when
multiple servers are online and working.


**Optional**:

**messageTtl** (milliseconds) (must start a new queue if this option was just added, modified, or taken out)
- Set timeout for messages in the queue. This option has proven to be extremely helpful when the
server goes offline and comes back and the messages are requeued. If the messageTtl is set to
the same milliseconds as the client's timeout, the queue will make sure the server do not get
timed out messages that the client no longer cares about.



*We recommend setting the messageTtl equal to the client's timeout parameter.


**prefetch_num** (integer bigger than or equal to 1)
- Set the maximum number of acknowledgements the queue can wait from the server. In other words, it
is the maximum number of tasks one server can take each time. That said, this will only be
effective when the noAck is set to False. If prefetch_num is not passed in, the server will
simply take as many tasks as possible and this may cause a race condition. In our production
experience, we find that a number of 10 or 100 works just fine.



*Only effective when noAck is set to False.

**durable** (boolean)
- Make the queue durable as stated on the RabbitMQ website. The default setting is false.


#####Example:
- Our Safest/Most Used Options:
  `{noAck:false, prefetch_num:10, messageTtl:60000}`
- Simplest/Minimalist Options(best for just testing): 
  `{noAck:true}`




###Client:
This function will easily set up your client with your message broker over amqp protocol:



`exports.connect_amqp=function(amqp_url)`


- amqp_url is the address of your MQ service. Such as:`"amqp://usr:password@128.11.22.230"`




This function will send your message to your designated server, and timeout if a response is not received within the given time:



`exports.send=function(serviceName,message,timeout)`


- serviceName is the name of the server you want to send your message to. Make sure your server and client have the same serviceName!
- message is an object that is sent to the message broker. Behind the scene, the message is first transformed to string and then a buffer.
After the server received the message, it will first decode and parse it as a JSON object.
- timeout is the milliseconds you want the client to wait before giving up



We have decided that the client will not have an noAck option and it is set to true since we do not really care about whether
the client has received the response. Welcome to fork if you would like to add this feature!




## Example 

You can find one test client and one test server file in the example folder. The amqp_url is fortified! Try with different options.



## Message Broker

We recommend and use RabbitMQ for its popularity and wide range of support. For a simple intro to installation and tutorial, please refer
to its [website][6]. Essentially, since we use `amqplib`, any message broker based on amqp protocol is just fine.




## Version Updates

- Ver 0.5.6: fixed the problem of not parsing the response from server to JSON in package before passing back to client;
no parsing is needed at all now!
- Ver 0.5.5: fixed problems in server side on error handling including returning messages and shutting down when connection throws an error;
updated license from ISC to MIT; minor fixes in readme; no longer prefer global installation




## TODO


Definite:
- Improve Readme with photos/interactions and version logs
- Implement the logger system that would include all log info in one place
- Include a simple RabbitMQ tutorial in README

Maybe:
- Implement the topic/fanout delivery options
- Implement the exchange/clustering node options

Any help/fork/issues/contribution is deeply appreciated and welcomed!




July 2015


[1]: http://senecajs.org/
[2]: https://developer.ibm.com/messaging/2015/05/06/microservices-with-seneca-and-mq-light/
[3]: https://github.com/squaremo/amqp.node/tree/master/examples/tutorials
[4]: https://github.com/dingziran
[5]: http://www.wecash.net/
[6]: https://www.rabbitmq.com/download.html