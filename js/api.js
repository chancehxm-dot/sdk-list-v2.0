/**
 * api.js - 积分中心 API 层
 * 配置管理、HTTP 请求工具、业务接口封装。
 * 前置依赖：CryptoJS（在本脚本之前加载）
 */
/* ============================================================
 * 工具函数
 * ============================================================ */

function getParam(name) {
    var match = window.location.search.match(new RegExp('[?&]' + name + '=([^&]*)'));
    return match ? decodeURIComponent(match[1]) : '';
}

/* ============================================================
 * 配置管理
 *
 * URL_PARAM_MAP 定义了所有可通过查询字符串覆盖的配置项。
 * 每项包含：
 *   key      - CONFIG 属性名
 *   param    - URL 查询参数名
 *   default  - URL 未传参时的默认值
 *   coerce   - （可选）类型转换：'int'、'bool'、'string'（默认）
 *
 * 新增配置字段只需在 URL_PARAM_MAP 中添加一行即可，
 * 无需修改其他代码。
 * ============================================================ */

var URL_PARAM_MAP = [
    { key: 'env',        param: 'env',        default: 'test2' },
    { key: 'cId',        param: 'c_id',       default: 'test2' },
    { key: 'userId',     param: 'user_id',    default: 'demo_user_002' },
    { key: 'secretKey',  param: 'secret_key', default: '00fd3c92cecb228f39743ad7a6584062' },
    { key: 'isHideCompleted', param: 'is_hide', default: false, coerce: 'bool' },
    { key: 'loadingTimeout',  param: 'loading_timeout', default: 20000, coerce: 'int' }
];

var CONFIG = {
    testApi: 'https://api.zombifieds.com',
    prodApi: 'https://api.zombifieds.com'
};

/**
 * 从 URL_PARAM_MAP 初始化 CONFIG。
 * 优先级：URL 查询参数 > 默认值。
 */
(function initConfig() {
    for (var i = 0; i < URL_PARAM_MAP.length; i++) {
        var entry = URL_PARAM_MAP[i];
        var raw = getParam(entry.param);
        var value;

        if (raw !== '') {
            // URL 传了参数 — 按类型转换
            if (entry.coerce === 'int') {
                value = parseInt(raw, 10);
                if (isNaN(value)) value = entry.default;
            } else if (entry.coerce === 'bool') {
                value = (raw === '1' || raw === 'true');
            } else {
                value = raw;
            }
            console.log('[api] config ' + entry.key + ' = ' + value + ' (from URL ' + entry.param + ')');
        } else {
            value = entry.default;
            console.log('[api] config ' + entry.key + ' = ' + value + ' (default)');
        }

        CONFIG[entry.key] = value;
    }
})();

// 根据环境自动选择 API 基础地址
CONFIG.apiBase = (CONFIG.env === 'prod' ? CONFIG.prodApi : CONFIG.testApi) + '/api/v2';
console.log('[api] apiBase=' + CONFIG.apiBase);

function md5(str) {
    return CryptoJS.MD5(str).toString();
}

function buildSign(params, withSecret) {
    var raw = params.join('');
    console.log('[api] buildSign raw=' + raw);
    if (withSecret) {
        raw += CONFIG.secretKey;
    }
    var h = md5(raw);
    console.log('[api] buildSign hash=' + h);
    return h;
}

function getTs() {
    var t = Math.floor(Date.now() / 1000).toString();
    console.log('[api] getTs=' + t);
    return t;
}

/**
 * 将 ASCII 字符串转为 CryptoJS WordArray。
 * 每个字符的 byte 值映射为 WordArray 中的一个字节。
 */
function asciiToWordArray(str) {
    var hex = '';
    for (var i = 0; i < str.length; i++) {
        var c = str.charCodeAt(i).toString(16);
        if (c.length === 1) c = '0' + c;
        hex += c;
    }
    return CryptoJS.enc.Hex.parse(hex);
}

/**
 * 使用 CryptoJS 进行 AES-128-CBC 解密。
 * 密钥派生（与服务端一致）：
 *   raw    = ts + secretKey
 *   keyMd5 = md5(raw)
 *   KEY    = keyMd5 前 16 个 hex 字符，作为 ASCII 字节 → 16 字节
 *   IV     = keyMd5 后 16 个 hex 字符，作为 ASCII 字节 → 16 字节
 * 密文为完整 base64 解码后的数据（IV 不在前面拼接）。
 */
function aesDecrypt(encryptedBase64, ts, secretKey) {
    try {
        console.log('[api] aesDecrypt START (ts-based key derivation)');
        console.log('[api]   ts=' + ts);
        console.log('[api]   secretKey=' + secretKey);
        console.log('[api]   input (first 60 chars)=' + encryptedBase64.substring(0, 60));

        // 密钥派生：md5(ts + secretKey)
        var raw = ts + secretKey;
        var keyMd5 = md5(raw);
        var keyStr = keyMd5.substring(0, 16);
        var ivStr = keyMd5.substring(16);

        console.log('[api]   raw=' + raw.substring(0, 20) + '...');
        console.log('[api]   keyMd5=' + keyMd5);
        console.log('[api]   keyStr=' + keyStr + ' (as ASCII bytes → 16 bytes)');
        console.log('[api]   ivStr=' + ivStr + ' (as ASCII bytes → 16 bytes)');

        // 将 hex 字符串字符转为 CryptoJS 可用的字节数组
        var keyWordArray = asciiToWordArray(keyStr);
        var ivWordArray  = asciiToWordArray(ivStr);

        console.log('[api]   keyWordArray sigBytes=' + keyWordArray.sigBytes);
        console.log('[api]   ivWordArray sigBytes=' + ivWordArray.sigBytes);

        // Base64 解码（完整数据即密文，不含 IV 前缀）
        var ciphertext = CryptoJS.enc.Base64.parse(encryptedBase64);
        console.log('[api]   ciphertext sigBytes=' + ciphertext.sigBytes + ' blocks=' + (ciphertext.sigBytes / 16));

        console.log('[api]   calling CryptoJS.AES.decrypt...');
        var decrypted = CryptoJS.AES.decrypt(
            CryptoJS.lib.CipherParams.create({ ciphertext: ciphertext }),
            keyWordArray,
            { iv: ivWordArray, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 }
        );

        var result = decrypted.toString(CryptoJS.enc.Utf8);
        console.log('[api]   decrypt result: len=' + result.length + ' chars');

        if (result) {
            console.log('[api] aesDecrypt SUCCESS: ' + result.substring(0, 200));
        } else {
            console.log('[api] aesDecrypt FAILED: returned empty');
        }
        return result;
    } catch (e) {
        console.log('[api] aesDecrypt EXCEPTION: ' + e.message);
        console.log('[api]   stack: ' + e.stack);
        return '';
    }
}

/**
 * 解密 API 响应中的 AES 加密 data 字段。
 * ts 必须与 API 请求中的 ts 一致（密钥派生需要）。
 */
function decryptResponseData(resp, ts) {
    if (!resp || !resp.data || typeof resp.data !== 'string') {
        console.log('[api] decryptResponseData: no data field, skipping');
        return resp;
    }
    console.log('[api] decryptResponseData: dataLen=' + resp.data.length + ' ts=' + ts);
    var decrypted = aesDecrypt(resp.data, ts, CONFIG.secretKey);
    if (decrypted) {
        try {
            var obj = JSON.parse(decrypted);
            resp._decrypted = obj;
            console.log('[api] decryptResponseData: parsed JSON ↓');
            console.log(obj);
        } catch (e) {
            resp._decrypted = decrypted;
            console.log('[api] decryptResponseData: string (' + decrypted.length + ' chars)=', decrypted.substring(0, 300));
        }
    } else {
        console.log('[api] decryptResponseData: decryption returned empty');
    }
    return resp;
}

/* ============================================================
 * HTTP 请求工具
 * ============================================================ */

function apiGet(url, callback) {
    console.log('[api] GET ' + url);
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.timeout = 15000;
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            console.log('[api]  <- HTTP ' + xhr.status + ' (' + xhr.responseText.length + ' bytes)');
            if (xhr.status === 200) {
                try {
                    var resp = JSON.parse(xhr.responseText);
                    console.log('[api]  <- code=' + resp.code + ' msg=' + resp.msg + ' dataLen=' + (resp.data ? resp.data.length : 0));
                    callback(null, resp);
                } catch (e) {
                    console.log('[api]  <- JSON parse failed: ' + e.message);
                    callback(new Error('Invalid response'), null);
                }
            } else {
                console.log('[api]  <- HTTP error ' + xhr.status);
                callback(new Error('HTTP ' + xhr.status), null);
            }
        }
    };
    xhr.onerror = function() {
        console.log('[api]  <- Network error');
        callback(new Error('Network error'), null);
    };
    xhr.ontimeout = function() {
        console.log('[api]  <- Request timeout');
        callback(new Error('Request timeout'), null);
    };
    xhr.send();
}

function apiPost(url, body, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('POST', url, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.timeout = 15000;
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                try {
                    var resp = JSON.parse(xhr.responseText);
                    callback(null, resp);
                } catch (e) {
                    callback(new Error('Invalid response'), null);
                }
            } else {
                callback(new Error('HTTP ' + xhr.status), null);
            }
        }
    };
    xhr.onerror = function() {
        callback(new Error('Network error'), null);
    };
    xhr.ontimeout = function() {
        callback(new Error('Request timeout'), null);
    };
    xhr.send(JSON.stringify(body));
}

/* ============================================================
 * 任务图标映射
 * ============================================================ */

var ICON_MAP = {
    game:    { icon: 'game',   emoji: '&#127918;' },
    video:   { icon: 'video',  emoji: '&#127916;' },
    news:    { icon: 'news',   emoji: '&#128240;' },
    novel:   { icon: 'novel',  emoji: '&#128214;' },
    survey:  { icon: 'survey', emoji: '&#128221;' },
    default: { icon: 'game',   emoji: '&#127918;' }
};

function mapTaskIcon(category, type) {
    var cat = (category || '').toLowerCase();
    var typ = (type || '').toLowerCase();

    if (cat.indexOf('game') !== -1 || cat.indexOf('游戏') !== -1 || typ.indexOf('game') !== -1) {
        return ICON_MAP.game;
    }
    if (cat.indexOf('video') !== -1 || cat.indexOf('视频') !== -1 || typ.indexOf('video') !== -1) {
        return ICON_MAP.video;
    }
    if (cat.indexOf('news') !== -1 || cat.indexOf('新闻') !== -1 || cat.indexOf('资讯') !== -1) {
        return ICON_MAP.news;
    }
    if (cat.indexOf('novel') !== -1 || cat.indexOf('小说') !== -1 || cat.indexOf('阅读') !== -1) {
        return ICON_MAP.novel;
    }
    if (cat.indexOf('survey') !== -1 || cat.indexOf('问卷') !== -1 || cat.indexOf('调查') !== -1) {
        return ICON_MAP.survey;
    }
    return ICON_MAP.default;
}

/** 将任务对象从 API 格式转为 UI 展示格式 */
function normalizeTask(raw) {
    var iconData = mapTaskIcon(raw.category || '', raw.type || '');
    // 强制手动领取交互——刷新后也保持。
    // 'done' 状态仅在本次会话中用户点击 Claim 后设置。
    var status = 'available';
    if (raw.is_claim === 1) {
        status = 'done';
    } else if (raw.is_finish === 1) {
        status = 'claim';
    }

    return {
        t_id: raw.t_id,
        name: raw.title || raw.name || '',
        desc: raw.desc || '',
        type: raw.type || 'h5',
        category: raw.category || '',
        link: raw.link || '',
        reward: raw.price || raw.reward || 0,
        priceRange: raw.priceRange || '',
        target: 1,
        isFinish: raw.is_finish === 1,
        isClaim: raw.is_claim === 1,
        total: raw.total || 0,
        finish: raw.finish || 0,
        status: status,
        icon: iconData.icon,
        emoji: iconData.emoji
    };
}

/** 批量规范化任务对象数组 */
function normalizeTasks(rawList) {
    var result = [];
    for (var i = 0; i < rawList.length; i++) {
        result.push(normalizeTask(rawList[i]));
    }
    return result;
}

/** 从 API 签到对象构建签到天数组 */
function normalizeCheckin(checkinData) {
    if (!checkinData) return null;

    var ci = checkinData;
    var totalDays = ci.days_total || 7;
    var rewards = ci.rewards || [];
    var checked = ci.checked || [];
    var daysChecked = ci.days_checked || 0;
    var index = ci.index || daysChecked;

    var days = [];
    for (var i = 0; i < totalDays; i++) {
        days.push({
            day: i + 1,
            checked: checked[i] === 1,
            isToday: (i === index) && checked[i] !== 1,
            reward: rewards[i] || 0
        });
    }

    // 判断今天是否已签到
    var checkedToday = false;
    if (index > 0 && index <= totalDays && checked[index - 1] === 1) {
        checkedToday = true;
    }

    return {
        days: days,
        streak: daysChecked,
        checkedToday: checkedToday,
        mode: ci.mode || 'daily',
        method: ci.method || '',
        makeup: ci.makeup || '',
        isBreak: ci.is_break === 1,
        raw: ci
    };
}

/* ============================================================
 * 业务接口
 * ============================================================ */

/**
 * 一次请求获取任务列表、积分和签到状态。
 * GET /api/v2/tasklists
 * 响应 data（AES 加密）：{ task: [...], points: int, checkin: {...}, expire_point, expire_date, ad_unit_id }
 */
function fetchTaskLists(callback) {
    var ts = getTs();
    var sign = buildSign([CONFIG.cId, CONFIG.userId, ts], true);
    var url = CONFIG.apiBase + '/tasklists?c_id=' + encodeURIComponent(CONFIG.cId)
        + '&user_id=' + encodeURIComponent(CONFIG.userId)
        + '&ts=' + ts + '&sign=' + sign;

    if (CONFIG.isHideCompleted) {
        url += '&is_hide=1';
    }

    console.log('[api] fetchTaskLists start');

    apiGet(url, function(err, resp) {
        if (err) {
            console.log('[api] fetchTaskLists ERROR: ' + err.message);
            callback(err, null);
            return;
        }

        console.log('[api] fetchTaskLists raw resp: code=' + resp.code + ' msg=' + (resp.msg || '') + ' hasData=' + !!(resp.data));

        resp = decryptResponseData(resp, ts);

        if (resp._decrypted && typeof resp._decrypted === 'object') {
            var data = resp._decrypted;
            console.log('[api] fetchTaskLists DECRYPTED ↓');
            console.log(data);
            console.log('[api]   task count=' + (data.task ? data.task.length : 0));

            // 规范化任务数据
            var tasks = [];
            if (data.task && data.task.length !== undefined) {
                tasks = normalizeTasks(data.task);
                console.log('[api]   normalized ' + tasks.length + ' tasks');
                for (var ti = 0; ti < tasks.length; ti++) {
                    var t = tasks[ti];
                    console.log('[api]     task[' + ti + ']: t_id=' + t.t_id + ' name=' + t.name + ' reward=' + t.reward + ' status=' + t.status + ' type=' + t.type);
                }
            }

            // 规范化签到数据
            var checkinNorm = null;
            if (data.checkin) {
                checkinNorm = normalizeCheckin(data.checkin);
                console.log('[api]   checkin: streak=' + checkinNorm.streak + ' checkedToday=' + checkinNorm.checkedToday + ' days=' + checkinNorm.days.length);
            }

            callback(null, {
                tasks: tasks,
                points: data.points || 0,
                checkin: checkinNorm,
                expirePoint: data.expire_point || 0,
                expireDate: data.expire_date || '',
                adUnitId: data.ad_unit_id || ''
            });
        } else if (resp.code === 0 && resp.data) {
            console.log('[api] fetchTaskLists: code=0 but decryption failed or returned non-object');
            callback(null, resp);
        } else {
            console.log('[api] fetchTaskLists FAILED: code=' + resp.code + ' msg=' + (resp.msg || 'unknown'));
            callback(new Error(resp.msg || 'Failed to load task list'), null);
        }
    });
}

/** 获取积分明细/历史记录（历史面板使用的独立接口） */
function fetchPoints(callback) {
    var ts = getTs();
    var sign = buildSign([CONFIG.cId, CONFIG.userId, ts], true);
    var url = CONFIG.apiBase + '/points?c_id=' + encodeURIComponent(CONFIG.cId)
        + '&user_id=' + encodeURIComponent(CONFIG.userId)
        + '&ts=' + ts + '&sign=' + sign;
    apiGet(url, function(err, resp) {
        if (err) { callback(err, null); return; }
        resp = decryptResponseData(resp, ts);
        if (resp._decrypted) {
            callback(null, resp._decrypted);
        } else if (resp.code === 0 && resp.data) {
            callback(null, resp);
        } else {
            callback(null, resp);
        }
    });
}

/** 每日签到 */
function apiCheckin(isMakeup, callback) {
    var ts = getTs();
    var sign = buildSign([CONFIG.cId, CONFIG.userId, ts], true);
    var url = CONFIG.apiBase + '/checkin?c_id=' + encodeURIComponent(CONFIG.cId)
        + '&user_id=' + encodeURIComponent(CONFIG.userId)
        + '&ts=' + ts + '&sign=' + sign;
    if (isMakeup) {
        url += '&is_makeup=' + encodeURIComponent(isMakeup);
    }
    apiGet(url, function(err, resp) {
        callback(err, resp);
    });
}

/** 获取任务落地页 URL（响应 data 为 AES 加密） */
function apiLanding(tId, callback) {
    var ts = getTs();
    var sign = buildSign([CONFIG.cId, String(tId), ts], true);
    var url = CONFIG.apiBase + '/landing?c_id=' + encodeURIComponent(CONFIG.cId)
        + '&t_id=' + encodeURIComponent(tId)
        + '&ts=' + ts + '&sign=' + sign;
    apiGet(url, function(err, resp) {
        if (err) { callback(err, null); return; }
        resp = decryptResponseData(resp, ts);
        callback(null, resp);
    });
}

/** 上报任务行为（click 点击 / arrive 到达 / finish 完成） */
function apiReport(tId, act, site, callback) {
    var ts = getTs();
    site = site || '';
    var sign = buildSign([CONFIG.cId, String(tId), site, act, ts], false);
    var url = CONFIG.apiBase + '/report?c_id=' + encodeURIComponent(CONFIG.cId)
        + '&t_id=' + encodeURIComponent(tId)
        + '&act=' + encodeURIComponent(act)
        + '&site=' + encodeURIComponent(site)
        + '&ts=' + ts + '&sign=' + sign;
    apiGet(url, function(err, resp) {
        callback(err, resp);
    });
}

/** 领取任务积分奖励 */
function apiClaim(tId, callback) {
    var ts = getTs();
    var sign = buildSign([CONFIG.cId, String(tId), CONFIG.userId, ts], true);
    var url = CONFIG.apiBase + '/claim?c_id=' + encodeURIComponent(CONFIG.cId)
        + '&user_id=' + encodeURIComponent(CONFIG.userId)
        + '&t_id=' + encodeURIComponent(tId)
        + '&ts=' + ts + '&sign=' + sign;
    apiGet(url, function(err, resp) {
        callback(err, resp);
    });
}

/** 获取奖品列表 */
function fetchRewards(callback) {
    var ts = getTs();
    var sign = buildSign([CONFIG.cId, CONFIG.userId, ts], true);
    var url = CONFIG.apiBase + '/rewards?c_id=' + encodeURIComponent(CONFIG.cId)
        + '&user_id=' + encodeURIComponent(CONFIG.userId)
        + '&ts=' + ts + '&sign=' + sign;
    apiGet(url, function(err, resp) {
        if (err) { callback(err, null); return; }
        resp = decryptResponseData(resp, ts);
        if (resp._decrypted) {
            callback(null, resp._decrypted);
        } else {
            callback(null, resp);
        }
    });
}

/** 积分兑换奖品 */
function apiExchange(rewardId, callback) {
    var ts = getTs();
    var sign = buildSign([CONFIG.cId, CONFIG.userId, String(rewardId), ts], true);
    var url = CONFIG.apiBase + '/exchange?c_id=' + encodeURIComponent(CONFIG.cId)
        + '&user_id=' + encodeURIComponent(CONFIG.userId)
        + '&reward_id=' + encodeURIComponent(rewardId)
        + '&ts=' + ts + '&sign=' + sign;
    apiGet(url, function(err, resp) {
        callback(err, resp);
    });
}
