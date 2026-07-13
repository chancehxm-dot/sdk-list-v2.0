取任务列表接口
简要描述
H5JS或SDK获取任务列表
请求URL
https://api.zombifieds.com/api/v2/tasklists
请求方式
GET/POST
参数
参数名	必选	类型	说明
c_id	是	string	渠道产品标识
user_id	是	string	用户ID(渠道传来用户标识)
ts	是	string	unix时间戳，单位秒
sign	是	string	本次调用的签名，算法：md5(c_id+user_id+ts+secret_key)
is_hide	否	intval	是否隐藏已完成任务分组，0否(默认)，1是
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
    "task": [{
        "t_id": 1,
        "title": "Test1",
        "desc": "试玩小游戏30秒",
        "type": "h5",
        "link": "https://api.zombifieds.com/?id=1",
        "price": 1,
        "is_finish": 1,
        "total": 5,
        "finish": 1
    }, {
        "t_id": 2,
        "title": "Test2",
        "desc": "试玩小游戏30秒",
        "type": "h5",
        "link": "https://api.zombifieds.com/?id=2",
        "price": 15,
        "is_finish": 0,
        "total": 3,
        "finish": 2
    }],
    "points": 30,
    "checkin": {
        "mode": "daily",
        "method": "ad",
        "days_total": 5,
        "rewards": [1, 10, 20, 30, 50],
        "days_checked": 2,
        "checked": [1, 0, 1, 0, 0],
        "makeup": "ad",
        "is_break": 0
    }
}
返回参数说明
参数名	类型	说明
task	Array of object	任务分组列表对像数组
task[n].t_id	intval	任务流水号
task[n].title	string	任务标题
task[n].desc	string	任务描述
task[n].type	string	任务类型,ad或h5或api
task[n].category	string	任务分类，例如：游戏、新闻
task[n].price	intval	任务积分
task[n].priceRange	string	任务积分范围(api特有)，例如：10-20
task[n].link	string	任务链接，ad广告类型无
task[n].is_finish	intval	任务是否完成
task[n].is_claim	intval	是否已领取积分
task[n].total	intval	该任务分组任务总数
task[n].finish	intval	用户已完成该任务分组任务数
points	intval	用户当前积分余额
checkin	object	签到对像
checkin.mode	string	签到模式: consecutive=连续签到, daily=每日签到
checkin.method	string	奖励方式: ad=看广告, task=完成任务
checkin.index	intval	当前签到第几天
checkin.days_total	intval	签到天数
checkin.rewards	Array of intval	签到奖励数组
checkin.days_checked	intval	已签到天数
checkin.checked	Array of intval	已签到状态数组，1已签到，0未签到
checkin.makeup	string	补签条件: 空=不允许补签, ad=看广告, task=完成任务
checkin.is_break	intval	当等于1时表示连续签到已断签重新开始新周期
expire_point	intval	用户快到期的积分
expire_date	date	积分到期日期
ad_unit_id	string	广告位ID
