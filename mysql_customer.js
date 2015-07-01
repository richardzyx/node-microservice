/**
 * Created by root on 6/30/15.
 */
var _ = require('underscore');
var mysql_mobile_card = require('./lib/db/mysql_config_client').mysql_mobile_card;


exports.findCustomerIds=function(national_id,cellphone){
    return new Promise(function(resolve,reject){
        var options=[];
        var sql="select id from mcc_customer where ";
        if(!_.isString(national_id)&&!_.isString(cellphone)){
            reject("national_id and cellphone are not strings");
        }
        else{
            if(_.isString(national_id)&& _.isString(cellphone)){
                sql+=" idcard = ? and phone = ? ";
                options.push(national_id,cellphone);
            }
            else if(_.isString(national_id)&&!_.isString(cellphone)){
                sql+=" idcard = ? ";
                options.push(national_id);
            }
            else{
                sql+=" phone = ? ";
                options.push(cellphone);
            }
            mysql_mobile_card.query(sql,options,function(err,results){
                if(err){
                    reject(err);
                }
                else{
                    resolve(results);
                }
            });
        }
    });
};

exports.getDetailById= function (id) {
    return new Promise(function(resolve,reject){
        var sql="select register_date from mcc_customer where id = ?";
        var options=[id];
        mysql_mobile_card.query(sql, options, function(err,results){
            if(err){
                reject(err);
            }else{
                if(results.length>0) {
                    resolve({
                        register_date: results[0].register_date
                    });
                }
                else{
                    resolve({})
                }
            }
        });
    }).then(
        function onFulfilled(object_tmp){
            var sql="select rr_flag,tx_flag, jd_flag,taobao_flag,card_flag,xx_flag," +
                "xyk_email, xl_flag from mcc_customer_auth where customer_id = ?";
            var options=[id];
            return new Promise(function(resolve,reject){
                mysql_mobile_card.query(sql, options, function(err,results){
                    if(err){
                        //throw err;
                        reject(err);
                    }else{
                        if(results.length>0) {
                            object_tmp = exports.checkAuthFlag(object_tmp, results[0]);
                        }
                        resolve(object_tmp);
                    }
                });
            });
        }
    ).then(
        function onFulfilled(object_tmp){
            var sql="select mcc.examine_amount,mec.cash_status,mrs.is_overdue, mrs.overdue_day" +
                " from mcc_credit_card as mcc " +
                "left join mcc_extract_cash as mec on mec.credit_card_id = mcc.id " +
                "left join mcc_repayment_schedule as mrs on mrs.extract_cash_id = mec.id " +
                "where mcc.customer_id = ? ";
            var options=[id];
            return new Promise(function(resolve,reject)
            {
                mysql_mobile_card.query(sql, options, function (err, results) {
                    if (err) {
                        reject(err);
                    } else {

                        if (results.length > 0 && _.isNumber(results[0].examine_amount)) {
                            object_tmp.examine_amount = results[0].examine_amount;
                        }
                        object_tmp.overdue_day = 0;
                        object_tmp.withdrawal = false;
                        object_tmp.isOverdue=false;
                        _.each(results, function (result) {
                            if (result.cash_status == 1 && object_tmp.withdrawal == false) {
                                object_tmp.withdrawal = true;
                            }
                            if (result.is_overdue == 1 && result.overdue_day > 0 && object_tmp.isOverdue==false) {
                                object_tmp.isOverdue = true;
                                if (result.overdue_day > object_tmp.overdue_day) {
                                    object_tmp.overdue_day = result.overdue_day;
                                }
                            }
                        })
                        resolve(object_tmp);
                    }
                });
            });
        }
    )
}

exports.checkAuthFlag = function(object_tmp, result){
    if(result.rr_flag || result.renren){
        object_tmp.renren=true;
    }
    if(result.tx_flag || result.tencent){
        object_tmp.tencent=true;
    }
    if(result.jd_flag || result.jingdong){
        object_tmp.jingdong=true;
    }
    if(result.taobao_flag || result.taobao){
        object_tmp.taobao=true;
    }
    if(result.card_flag || result.unionpay){
        object_tmp.unionpay=true;
    }
    if(result.xx_flag || result.xuexin){
        object_tmp.xuexin=true;
    }
    if(result.xl_flag || result.sina){
        object_tmp.sina=true;
    }
    if(result.xyk_email != null || result.credit_bill_email){
        object_tmp.credit_bill_email=true;
    }
    return object_tmp;
}