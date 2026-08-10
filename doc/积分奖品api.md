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




积分兑换奖品接口
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


