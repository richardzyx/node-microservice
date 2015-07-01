/**
 * Created by dingziran on 2015/5/26.
 */

var mysql=require("mysql");
var mobile_card = mysql.createConnection({
    host:'112.124.34.213',
    user:'dingziran',
    password:'3MDlmMDYzNj',
    database:'mobile_card'
});
var loan_core = mysql.createConnection({
    host:'42.96.200.106',
    user:'root',
    password:'Wecash1505',
    database:'loan_core'
});

var black_info = mysql.createConnection({
    host:'42.96.200.106',
    user:'root',
    password:'Wecash1505',
    database:'black_info'
});

exports.mysql_mobile_card = mobile_card;
exports.mysql_loan_core = loan_core;
exports.mysql_black_info = black_info;
