H5JS或SDK、落地页上报任务状态接口
请求URL
https://api.zombifieds.com/api/v2/report
请求方式
GET/POST
参数
参数名	必选	类型	说明
c_id	是	string	渠道产品标识
t_id	是	string	任务流水号
site	否	string	展示和点击动作填接口域名，到达和完成动作填落地页域名，非H5无落地页的留空
act	是	string	上报动作
ts	是	string	unix时间戳，单位秒
sign	是	string	本次调用的签名，算法：md5(c_id+t_id+site+act+ts)
返回示例
{
    "code": 0,
    "msg": "ok"
}
返回说明
参数名	类型	说明
code	number	0: 表示成功
msg	string	错误信息
act上报动作说明
参数名	说明
s	任务展示
c	点击开始任务
a	到达落地页，非H5的广告类任务无
f	任务完成