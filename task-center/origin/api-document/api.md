获取单个任务接口
简要描述
H5JS或SDK获取单个任务
请求URL
https://api.zombifieds.com/api/v1/tasks
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
    "total": 5,
    "finish": 1,
    "task": {
        "t_id": 1,
        "title": "Test1",
        "desc": "试玩小游戏30秒",
        "category": "游戏",
        "link": "https://api.zombifieds.com/?id=1",
        "price": 0.1
    }
}
返回参数说明
参数名	类型	说明
total	intval	用户任务总数
finish	intval	用户已完成任务数
total_price	float	用户可完成任务总价值
task	object	当前任务对像
task.t_id	intval	任务流水号
task.title	string	任务标题
task.desc	string	任务描述
task.category	string	任务分类，例如：游戏、新闻
task.price	float	任务价格(元)
task.link	string	任务链接
方法逻辑：

参数获取 — 从请求获取 c_id、user_id、ts，以及当前 PT 日期
1) 校验 c_id, user_id, ts, sign 必填
2) 校验 ts 时间戳（300s 容差）
3) 从 ChannelService 读取渠道配置（Redis 300s 缓存），校验渠道是否存在、secret_key 是否配置
4) 计算 md5(cId . userId . ts . secretKey) 比对 sign
5) 通过后把 channel_data 注入请求属性
获取用户国家 + 今日任务记录（协程并行）
1)获取用户 IP — 按优先级：X-Real-IP → X-Forwarded-For → remote_addr
2)无匹配国家配置 → 返回”当前地区无任务”
3)有记录 → 跳过分配，直接进入响应构建
4)无记录 → 进入分配阶段
无今日记录时分配新任务
1)前置检查（顺序执行，任一满足即返回）：
检查渠道日限额（Redis 缓存 30s） → 超限返回”当日任务已满”
填充率：random_int(1,100) > fill_rate → 返回”暂无任务”
2)均匀放量检查（even_distribute=1 时生效）：
查 Redis uhc:{channelId}:{userId}:{hour}，若 >= ceil(maxTasks/24) 直接返回
3)查询可用链接分类 → 查询可用任务：
查 js_links 获取该渠道+国家有可用链接的 website_category
无分类 → 返回（无法分配）
查 js_tasks 获取有效期内、匹配分类的任务，按 sort_order 排序
4)按 max_tasks/hourlyBudget/user_daily_limit 循环分配 → 批量 INSERT生成记录 → 更新 Redis 小时计数器 (INCRBY, TTL 2h)
5)重新拉取分配后的任务记录
响应构建
1) 计算统计 — total（任务总数，至少 1）、finish（已完成数）、total_price（累计金额）
2) 待处理任务 — 取第一个未完成任务，生成落地页 URL：api_domain?c_id=xxx&t_id=xxx
3) AES 加密响应 — JSON 编码后用 AES-128-CBC 加密返回






