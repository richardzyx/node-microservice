/**
 * Created by root on 6/30/15.
 */
var _ = require('underscore');
var mysql_customer =require('./mysql_customer');
var pg_client= require('./lib/db/db_client').pg_client;
var amqpServer = require('./amqpConnect');
var amqp_url="amqp://richard:12345678@115.28.35.230";

/**
 * group
 * username
 * name
 * national_id,
 * cellphone
 * companySchoolName
 */

exports.insideWecashQuery=function(query_info){
    var group = query_info.group;
    var username = query_info.username;
    var name = query_info.name;
    var national_id = query_info.national_id;
    var cellphone = query_info.cellphone;
    var company_school_name = query_info.company_school_name;
    return Promise.resolve(1).then(
        function onFulfilled(){
            return mysql_customer.findCustomerIds(national_id,cellphone)
        }
    ).then(
        function onFulfilled(ids){
            if(_.isEmpty(ids)){
                return {
                    is_register:false,
                    from_now:-1,
                    risk_mark:[],
                    auth:[],
                    examine_amount:-1,
                    is_withdrawal:false,
                    is_overdue:false,
                    longest_overdue:-1
                };
            }
            else{
                return Promise.all(_.map(ids,function(id){
                    return mysql_customer.getDetailById(id.id);
                })).then(
                    function onFulfilled(details) {
                        var register_date = details[0].register_date;
                        var examine_amount = details[0].examine_amount;
                        var overdue_day = details[0].overdue_day;
                        var auth = {
                            "renren": false,
                            "tencent": false,
                            "taobao": false,
                            "unionpay": false,
                            "sina": false,
                            "jingdong": false,
                            "xuexin": false,
                            "credit_bill_email": false
                        };
                        var is_withdrawal = false;
                        var is_overdue = false;
                        _.each(details, function (detail) {
                            if (detail.register_date > register_date) {
                                register_date = detail.register_date;
                            }
                            if (detail.examine_amount > examine_amount) {
                                examine_amount = detail.examine_amount;
                            }
                            if (detail.overdue_day > overdue_day) {
                                overdue_day = detail.overdue_day;
                            }
                            if (detail.withdrawal) {
                                is_withdrawal = true;
                            }
                            if (detail.isOverdue) {
                                is_overdue = true;
                            }
                            auth = mysql_customer.checkAuthFlag(auth,detail);
                        });
                        var now = new Date();
                        var time_dist_tmp,time_dist;
                        if(register_date) {
                            time_dist_tmp = register_date.getTime() - now.getTime();
                            time_dist = Math.abs(Math.floor(time_dist_tmp / (1000 * 60 * 60 * 24)));
                            time_dist = Math.ceil(time_dist/30);
                        }else{
                            time_dist=-1
                        }

                        if(typeof overdue_day!= "undefined"){
                            overdue_day = Math.ceil(overdue_day/30);
                        }else{
                            overdue_day = -1;
                        }

                        if(typeof examine_amount!="undefined"){
                            examine_amount =exports.money_level(examine_amount);
                        }else{
                            examine_amount = -1;
                        }
                        return new Promise(function(resolve,reject) {
                            exports.record(group, username, name, national_id, cellphone, company_school_name, true, time_dist, auth, examine_amount, is_withdrawal, is_overdue, overdue_day).catch(function (err) {
                                logger.fatal(err);
                            });
                            resolve({
                                is_register: true,
                                from_now: time_dist,
                                auth: auth,
                                examine_amount: examine_amount,
                                is_withdrawal: is_withdrawal,
                                is_overdue: is_overdue,
                                longest_overdue: overdue_day
                            });
                        });
                    }

                )
            }
        }
    )
}


exports.money_level = function(examine_amount){
    var ret=0;
    if(examine_amount == null){
        ret = 0;
    }
    else if (examine_amount < 500) {
        ret= 1;
    }
    else if (examine_amount < 2000) {
        ret= 2;
    }
    else if (examine_amount < 5000) {
        ret = 3;
    }
    else if (examine_amount < 10000) {
        ret = 4;
    }
    else {
        ret = 5;
    }
    return ret;
}

exports.record=function(group,username,name, national_id, cellphone,company_school_name,is_register, from_now,auth,examine_amount,is_withdrawal,is_overdue,longest_overdue){
    return new Promise(function(resolve,reject){
        var sql="insert into wecash_query (\"group\",username, name, national_id, cellphone,company_school_name,is_register, " +
            "from_now,auth,examine_amount,is_withdrawal,is_overdue,longest_overdue,query_time) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,now());"
        var options=[group,username,name,national_id, cellphone,company_school_name,is_register, from_now,auth,examine_amount,is_withdrawal,is_overdue,longest_overdue];
        pg_client.query(sql,options,function(err,results){
            if(err){
                reject(err);
            }
            else{
                resolve();
            }
        });
    })
};


amqpServer.server_listen(amqp_url,'wecash',exports.insideWecashQuery);