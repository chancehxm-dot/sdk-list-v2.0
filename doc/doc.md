用户领取任务积分接口
简要描述
用户领取任务积分
请求URL
https://api.zombifieds.com/api/v2/claim
请求方式
GET/POST
参数
参数名	必选	类型	说明
c_id	是	string	渠道产品标识
user_id	是	string	用户ID(渠道传来用户标识)
t_id	是	string	任务流水号
ts	是	string	unix时间戳，单位秒
sign	是	string	本次调用的签名，算法：md5(c_id+t_id+user_id+ts+secret_key)
返回示例
{
    "code": 0,
    "msg": "ok"
}
返回说明
参数名	类型	说明
code	number	0: 表示成功
msg	string	错误信息


签到上报接口
简要描述
用户完成签到条件后上报接口
请求URL
https://api.zombifieds.com/api/v2/checkin
请求方式
GET/POST
公共参数
参数名	必选	类型	说明
c_id	是	string	渠道产品标识
user_id	是	string	用户ID(渠道传来用户标识)
is_makeup	否	string	补签标识，0正常签到（默认），大于0为补签第几天
ts	是	string	unix时间戳，单位秒
sign	是	string	本次调用的签名，算法：md5(c_id+user_id+ts+secret_key)
返回示例
{
    "code": 0,
    "msg": "ok"
}
返回说明
参数名	类型	说明
code	number	0: 表示成功
msg	string	错误信息


简要描述
落地页中转H5获取任务实际落地页
请求URL
https://api.zombifieds.com/api/v2/landing
请求方式
GET/POST
参数
参数名	必选	类型	说明
c_id	是	string	渠道产品标识
t_id	是	string	任务流水号
ts	是	string	unix时间戳，单位秒
sign	是	string	本次调用的签名，算法：md5(c_id+t_id+ts+secret_key)
返回示例
{
    "code": 0,
    "msg": "ok",
    "data": "gxcyzXVIKE5JPTu3XlClffXTKyz0BGESw3WKgo0v\/P7AXT4RDoO0B+y2M88ME2v9GhsmpACVolOwAk3Ww1Wn+A\/3MVd0\/HRH3vXwbNoYVsSIwZLoN8n5Jg0C95WLYANUWefET0f3B5bqSCaY+v42OIfLhCR2IxStq4MdHqkNqs7U0kf59msH5I9XZaV5AAPAYNrLNKf3xPqJb20qTtReFLSoYgkfckSr0MXnFueRpstQ65k7T\/sYS6xWARu4Z+YM7e7yxRppVLIzs6zIgvyOaa8gfoLahsqwMUUwnZqxmNflQETHWOvFmfmgNzu+Hfp8X3CGv3fCjPaMMzhW4jdZ1cmoMSLIEEjm4tDIoTkp+ioTXdzXZ2Xu9jXFHQlMo\/pqkLQTItbNmzYZpV380P6A5i0UZxvJHYx1LHvqSwHGwC8rd44fCJbzpeM9F9L6dQJcONlHjrolpcs2KuiOxEu6UEpbgRjh10SdGS4kW19kPThaYjeuNvstMTsoAcGZpVWYzfu422IVnrUwdAh0QDmO5zcE2Be+fep5KDlM+JSUZWjuL3WJLOdl\/F\/z59n6Ix86vd5Uxd36Tp7bN8VLShdF6l004zAapwelbEJCplSks2kY7O9GZYM39xzLF4unKHQCzox5UL9luiB+dKmbgqA3T9d\/1sDfa89awEfZ\/0Q02wdHMfaQsXxWLuPJSAHKaDmUIRIaPEurAn+0Bzx\/mHORu4CEUV+F5O\/B7\/49aDnshFuHRa4qnUWYltz+7Wj4Gz7OKuaC8LjUjQ9Pt4NqpGlr8LoNcTAxj0YWDF3eijloULgxZ3PWYrF8oheeMG7N98BboNePfTbfByWvgwGu9AQS+3n3R\/bNC1+8\/VtowNMr5krdJR2v+BhvJSG+n0q85RoQ3Oq48pkZP0YZ5ZrvFuU5gTlaPzd0qjNvs3RosOQrbpzeE6bDHhKKO\/6omQaGv6w098xDtiJqkFWWXxVFdl5J92VX9ZxHGKQ0kQStX8\/BK0SLXnIdAo1DMHHhh0Tu8aEzC15cvru7qcVbE9An1Zkn+8G4GeqDJu+SFaqPhkmzEneEmcrGAOblo+d+4Y7F8CmfrzRA0kSeTUazVIgGsas7fWMWgtlHDL3IG3G9rNoNrwAG2GNwUmvEcB103HXswOM4AIxHP1U7QhLy8qKrXj7pbTvVUAaJC0vEYKr9cLP95yscRh14VJ+SE7QAwDr6echOgHHDKhc9U+T\/YsQP7eDN8D89WO36ia9nMTGJ\/JE+J7MYBDXlnbF3wyEZ3NAjHtwd03r35xgRriyX9hKp3W\/YFRbOcB9Gw+Ro7iX8lnTmTL6hwj7ZoqJ7\/5bQymmF74naqBnGl8NE0jWxjsjA3wLkaigBiv2BtCCtzSXsxOxPkWrED7a09h0Dhz+X1USFWv9jftpaMYW\/TWpTPEe9pbhYVm2cbM+86oyKFyLz5aNsdEhi6\/matEiO0BLOCEj8R75cY02E3I9RYhwk1hihI8kLrFEaPFJNsi4bDo+x3IHh9YzzGBVZbP9Ni\/UMnmu+LMCYVhQ1mgyPlsvmQnlYIWluFw+IHaLd9VOi1EAvyYyMrs40L96d\/9YXU+Hp2aMQ3hZRDjHtV6LSMoQwR4EdDC3e62UUkK1PPJE0F2qe3Ilb9u0="
}
返回说明
参数名	类型	说明
code	number	0: 表示成功
msg	string	错误信息
data	string	落地页地址按aes_128_cbc加密
错误返回或超时处理
前端H5页面显示“请求处理中，请稍后…”
(保持等待超过20秒后改为)“加载超时，请检查网络后重试”

data解密后示例
http://dragonkint.com/?t_id=1&c=test&type=game_stay&target=30&cb=50
落地页参数说明
参数名	类型	说明
t_id	intval	任务流水号
c	string	渠道标识
type	string	任务类型，例如：game_stay、news_click
target	string	考核指标，例如：30、1
cb	float	屏蔽广告点击率，当前端随机0-99值比该值小时屏蔽用户点击广告，即0不屏蔽，100肯定屏蔽
domain	string	接口域名，例如：https://api.zombifieds.com.com ，用于落地页上报
ver	string	接口版本，例如：v2，用于落地页上报
任务类型说明
任务类型标识	任务说明	考核指标说明
game_click	用户点击开始试玩小游戏	点击次数
video_click	用户点击播放短视频	播放完成次数
news_click	用户点击文章并阅读	点击次数
novel_click	用户点击小说并阅读	完整点击次数
questionnaire_click	用户点击问卷开始填写	提交次数
game_stay	用户试玩小游戏停留时长	停留时长(秒)
video_stay	用户在 H5 页面停留观看视频	观看时长(秒)
news_stay	用户浏览文章停留时间	阅读时长(秒)
novel_stay	用户阅读小说停留时间	浏览时长(秒)


用户领取任务积分接口
简要描述
用户领取任务积分
请求URL
https://api.zombifieds.com/api/v2/claim
请求方式
GET/POST
参数
参数名	必选	类型	说明
c_id	是	string	渠道产品标识
user_id	是	string	用户ID(渠道传来用户标识)
t_id	是	string	任务流水号
ts	是	string	unix时间戳，单位秒
sign	是	string	本次调用的签名，算法：md5(c_id+t_id+user_id+ts+secret_key)
返回示例
{
    "code": 0,
    "msg": "ok"
}
返回说明
参数名	类型	说明
code	number	0: 表示成功
msg	string	错误信息


埋点上报接口
简要描述
SDK上报埋点接口
请求URL
https://api.zombifieds.com/api/v2/track
请求方式
GET/POST
公共参数
参数名	必选	类型	说明
c_id	是	string	渠道产品标识
user_id	是	string	用户ID(渠道传来用户标识)
act	是	string	上报动作
ts	是	string	unix时间戳，单位秒
sign	是	string	本次调用的签名，算法：md5(c_id+user_id+act+ts+secret_key)
返回示例
{
    "code": 0,
    "msg": "ok"
}
返回说明
参数名	类型	说明
code	number	0: 表示成功
msg	string	错误信息
act上报动作及额外上报参数说明
参数名	说明	额外上报参数
user_login	用户登录	login_type, login_result
user_logout	用户退出	
home_show	首页曝光	coin_balance, user_level
home_stay	首页停留	stay_time
task_show	任务列表展示	task_id, task_name, task_type
task_click	点击任务	task_id
task_start	开始任务	task_id
task_complete	完成任务	task_id, reward_coin, complete_time
task_reward_receive	领取奖励	task_id, reward_coin, balance_after
ad_request	广告请求	ad_network, placement_id
ad_load_success	广告加载成功	ad_network, placement_id
ad_load_fail	广告加载失败	ad_network, placement_id, error_code, error_msg
ad_impression	广告展示	ad_network, placement_id, ecpm
ad_click	广告点击	ad_network, placement_id
ad_start	开始观看	ad_network, placement_id
ad_complete	广告完成	ad_network, placement_id, duration, reward_coin
ad_reward	广告奖励发放	reward_coin, balance_after
sign_show	签到页曝光	
sign_click	点击签到	
sign_success	签到成功	sign_days, reward_coin
activity_show	活动曝光	activity_id
activity_click	点击活动	activity_id
activity_join	参与活动	activity_id
activity_complete	活动完成	activity_id, reward_coin
coin_income	金币增加	source, amount, balance_after
coin_consume	金币消费	biz_type, amount, balance_after
level_upgrade	升级	old_level, new_level
channel_consume_request	渠道金币消耗请求	channel_id, consume_coin
channel_consume_success	消费成功	channel_id, consume_coin
channel_consume_fail	消费失败	channel_id, consume_coin, reason
risk_hit	命中风控规则	rule_id, risk_type, action
account_freeze	冻结账号	rule_id, freeze_type
account_unfreeze	解冻账号	rule_id


获取积分明细接口
简要描述
H5JS或SDK获取积分明细
请求URL
https://api.zombifieds.com/api/v2/points
请求方式
GET/POST
参数
参数名	必选	类型	说明
c_id	是	string	渠道产品标识
user_id	是	string	用户ID(渠道传来用户标识)
ts	是	string	unix时间戳，单位秒
sign	是	string	本次调用的签名，算法：md5(c_id+user_id+ts+secret_key)
type	否	string	类型: 无或空表示全部(默认), earn=增加, spend=兑换, expire=过期
month	否	string	查询月份，格式：YYYY-mm，无则默认当前月
返回示例
{
    "code": 0,
    "msg": "ok",
    "data": "gxcyzXVIKE5JPTu3XlClffXTKyz0BGESw3WKgo0v\/P7AXT4RDoO0B+y2M88ME2v9GhsmpACVolOwAk3Ww1Wn+A\/3MVd0\/HRH3vXwbNoYVsSIwZLoN8n5Jg0C95WLYANUWefET0f3B5bqSCaY+v42OIfLhCR2IxStq4MdHqkNqs7U0kf59msH5I9XZaV5AAPAYNrLNKf3xPqJb20qTtReFLSoYgkfckSr0MXnFueRpstQ65k7T\/sYS6xWARu4Z+YM7e7yxRppVLIzs6zIgvyOaa8gfoLahsqwMUUwnZqxmNflQETHWOvFmfmgNzu+Hfp8X3CGv3fCjPaMMzhW4jdZ1cmoMSLIEEjm4tDIoTkp+ioTXdzXZ2Xu9jXFHQlMo\/pqkLQTItbNmzYZpV380P6A5i0UZxvJHYx1LHvqSwHGwC8rd44fCJbzpeM9F9L6dQJcONlHjrolpcs2KuiOxEu6UEpbgRjh10SdGS4kW19kPThaYjeuNvstMTsoAcGZpVWYzfu422IVnrUwdAh0QDmO5zcE2Be+fep5KDlM+JSUZWjuL3WJLOdl\/F\/z59n6Ix86vd5Uxd36Tp7bN8VLShdF6l004zAapwelbEJCplSks2kY7O9GZYM39xzLF4unKHQCzox5UL9luiB+dKmbgqA3T9d\/1sDfa89awEfZ\/0Q02wdHMfaQsXxWLuPJSAHKaDmUIRIaPEurAn+0Bzx\/mHORu4CEUV+F5O\/B7\/49aDnshFuHRa4qnUWYltz+7Wj4Gz7OKuaC8LjUjQ9Pt4NqpGlr8LoNcTAxj0YWDF3eijloULgxZ3PWYrF8oheeMG7N98BboNePfTbfByWvgwGu9AQS+3n3R\/bNC1+8\/VtowNMr5krdJR2v+BhvJSG+n0q85RoQ3Oq48pkZP0YZ5ZrvFuU5gTlaPzd0qjNvs3RosOQrbpzeE6bDHhKKO\/6omQaGv6w098xDtiJqkFWWXxVFdl5J92VX9ZxHGKQ0kQStX8\/BK0SLXnIdAo1DMHHhh0Tu8aEzC15cvru7qcVbE9An1Zkn+8G4GeqDJu+SFaqPhkmzEneEmcrGAOblo+d+4Y7F8CmfrzRA0kSeTUazVIgGsas7fWMWgtlHDL3IG3G9rNoNrwAG2GNwUmvEcB103HXswOM4AIxHP1U7QhLy8qKrXj7pbTvVUAaJC0vEYKr9cLP95yscRh14VJ+SE7QAwDr6echOgHHDKhc9U+T\/YsQP7eDN8D89WO36ia9nMTGJ\/JE+J7MYBDXlnbF3wyEZ3NAjHtwd03r35xgRriyX9hKp3W\/YFRbOcB9Gw+Ro7iX8lnTmTL6hwj7ZoqJ7\/5bQymmF74naqBnGl8NE0jWxjsjA3wLkaigBiv2BtCCtzSXsxOxPkWrED7a09h0Dhz+X1USFWv9jftpaMYW\/TWpTPEe9pbhYVm2cbM+86oyKFyLz5aNsdEhi6\/matEiO0BLOCEj8R75cY02E3I9RYhwk1hihI8kLrFEaPFJNsi4bDo+x3IHh9YzzGBVZbP9Ni\/UMnmu+LMCYVhQ1mgyPlsvmQnlYIWluFw+IHaLd9VOi1EAvyYyMrs40L96d\/9YXU+Hp2aMQ3hZRDjHtV6LSMoQwR4EdDC3e62UUkK1PPJE0F2qe3Ilb9u0="
}
返回说明
参数名	类型	说明
code	number	0: 表示成功
msg	string	错误信息
data	string	列表json字符串按aes_128_cbc加密
data解密后示例
{
    "lists": [{
        "points": 100,
        "type": "earn",
        "remark": "积分签到",
        "created_at": "2025.08.06  12:20:01"
    },{
        "points": -20,
        "type": "spend",
        "remark": "积分兑换",
        "created_at": "2025.08.06  12:30:01"
    }],
    "points": 80,
    "earn": 100,
    "spend": 20
}
返回参数说明
参数名	类型	说明
lists	Array of object	积分明细对像数组
lists[n].points	intval	变动积分数
lists[n].type	string	类型: earn=增加, spend=兑换, expire=过期
lists[n].remark	string	变动原因
lists[n].created_at	datetime	变动时间
points	intval	用户当前积分余额
earn	intval	用户增加积分总计
spend	intval	用户兑换积分总计



获取积分奖品列表接口
简要描述
H5JS或SDK获取积分兑换奖品列表
请求URL
https://api.zombifieds.com/api/v2/rewards
请求方式
GET/POST
参数
参数名	必选	类型	说明
c_id	是	string	渠道产品标识
user_id	是	string	用户ID(渠道传来用户标识)
ts	是	string	unix时间戳，单位秒
sign	是	string	本次调用的签名，算法：md5(c_id+user_id+ts+secret_key)
返回示例
{
    "code": 0,
    "msg": "ok",
    "data": "gxcyzXVIKE5JPTu3XlClffXTKyz0BGESw3WKgo0v\/P7AXT4RDoO0B+y2M88ME2v9GhsmpACVolOwAk3Ww1Wn+A\/3MVd0\/HRH3vXwbNoYVsSIwZLoN8n5Jg0C95WLYANUWefET0f3B5bqSCaY+v42OIfLhCR2IxStq4MdHqkNqs7U0kf59msH5I9XZaV5AAPAYNrLNKf3xPqJb20qTtReFLSoYgkfckSr0MXnFueRpstQ65k7T\/sYS6xWARu4Z+YM7e7yxRppVLIzs6zIgvyOaa8gfoLahsqwMUUwnZqxmNflQETHWOvFmfmgNzu+Hfp8X3CGv3fCjPaMMzhW4jdZ1cmoMSLIEEjm4tDIoTkp+ioTXdzXZ2Xu9jXFHQlMo\/pqkLQTItbNmzYZpV380P6A5i0UZxvJHYx1LHvqSwHGwC8rd44fCJbzpeM9F9L6dQJcONlHjrolpcs2KuiOxEu6UEpbgRjh10SdGS4kW19kPThaYjeuNvstMTsoAcGZpVWYzfu422IVnrUwdAh0QDmO5zcE2Be+fep5KDlM+JSUZWjuL3WJLOdl\/F\/z59n6Ix86vd5Uxd36Tp7bN8VLShdF6l004zAapwelbEJCplSks2kY7O9GZYM39xzLF4unKHQCzox5UL9luiB+dKmbgqA3T9d\/1sDfa89awEfZ\/0Q02wdHMfaQsXxWLuPJSAHKaDmUIRIaPEurAn+0Bzx\/mHORu4CEUV+F5O\/B7\/49aDnshFuHRa4qnUWYltz+7Wj4Gz7OKuaC8LjUjQ9Pt4NqpGlr8LoNcTAxj0YWDF3eijloULgxZ3PWYrF8oheeMG7N98BboNePfTbfByWvgwGu9AQS+3n3R\/bNC1+8\/VtowNMr5krdJR2v+BhvJSG+n0q85RoQ3Oq48pkZP0YZ5ZrvFuU5gTlaPzd0qjNvs3RosOQrbpzeE6bDHhKKO\/6omQaGv6w098xDtiJqkFWWXxVFdl5J92VX9ZxHGKQ0kQStX8\/BK0SLXnIdAo1DMHHhh0Tu8aEzC15cvru7qcVbE9An1Zkn+8G4GeqDJu+SFaqPhkmzEneEmcrGAOblo+d+4Y7F8CmfrzRA0kSeTUazVIgGsas7fWMWgtlHDL3IG3G9rNoNrwAG2GNwUmvEcB103HXswOM4AIxHP1U7QhLy8qKrXj7pbTvVUAaJC0vEYKr9cLP95yscRh14VJ+SE7QAwDr6echOgHHDKhc9U+T\/YsQP7eDN8D89WO36ia9nMTGJ\/JE+J7MYBDXlnbF3wyEZ3NAjHtwd03r35xgRriyX9hKp3W\/YFRbOcB9Gw+Ro7iX8lnTmTL6hwj7ZoqJ7\/5bQymmF74naqBnGl8NE0jWxjsjA3wLkaigBiv2BtCCtzSXsxOxPkWrED7a09h0Dhz+X1USFWv9jftpaMYW\/TWpTPEe9pbhYVm2cbM+86oyKFyLz5aNsdEhi6\/matEiO0BLOCEj8R75cY02E3I9RYhwk1hihI8kLrFEaPFJNsi4bDo+x3IHh9YzzGBVZbP9Ni\/UMnmu+LMCYVhQ1mgyPlsvmQnlYIWluFw+IHaLd9VOi1EAvyYyMrs40L96d\/9YXU+Hp2aMQ3hZRDjHtV6LSMoQwR4EdDC3e62UUkK1PPJE0F2qe3Ilb9u0="
}
返回说明
参数名	类型	说明
code	number	0: 表示成功
msg	string	错误信息
data	string	列表json字符串按aes_128_cbc加密
data解密后示例
{
    "lists": [{
        "id": 1,
        "points": 200,
        "name": "1天VIP"
    },{
        "id": 2,
        "points": 500,
        "name": "3天VIP"
    }]
}
返回参数说明
参数名	类型	说明
lists	Array of object	奖品对像数组
lists[n].id	intval	奖品ID
lists[n].name	string	奖品名称
lists[n].points	intval	奖品所需积分数


简要描述
用户积分兑换奖品接口
请求URL
https://api.zombifieds.com/api/v2/exchange
请求方式
GET/POST
公共参数
参数名	必选	类型	说明
c_id	是	string	渠道产品标识
user_id	是	string	用户ID(渠道传来用户标识)
reward_id	是	intval	奖品ID
ts	是	string	unix时间戳，单位秒
sign	是	string	本次调用的签名，算法：md5(c_id+user_id+reward_id+ts+secret_key)
返回示例
{
    "code": 0,
    "msg": "处理中"
}
返回说明
参数名	类型	说明
code	number	0: 表示成功
msg	string	错误信息