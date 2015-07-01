/**
 * Created by dingziran on 2015/3/17.
 */
"use strict";
var postgre = require('pg');
var redis = require('redis');
var Db = require('mongodb').Db;
var Server = require('mongodb').Server;
var db_config = require('./db_config').test;

//project config
var config = {
    projectName : "nodejs_https",
    jwtToken : "dingziran_payriskapi"
};

//PG
var url = "postgres://" + db_config.username + ":" + db_config.pg_password + "@" + db_config.IP + ":5432/" + config.projectName;
var postgre_client = new postgre.Client(url);
postgre_client.connect();
postgre_client.on('error',function(err){
    console.log("postgre_config: on");
    console.log('PG Error '+err);
});

//REDIS
var redis_client = redis.createClient(6379, db_config.IP);
redis_client.auth(db_config.redis_password);
redis_client.on('error', function(err) {
    console.log("redis_config: on");
    console.log('Redis Error: ' + err);
});

//mongo DB
var db = new Db(config.projectName, new Server(db_config.IP, 27017));
db.open();




exports.pg_client = postgre_client;
exports.config = config;
exports.redis_client=redis_client;
exports.mongo_db=db;

