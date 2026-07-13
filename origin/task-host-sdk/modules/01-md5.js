/**
 * 01-MD5 哈希
 *
 * 完整的 MD5 消息摘要算法实现。
 * 用于对上报请求参数做签名，防止数据被篡改。
 *
 * 输入：任意字符串
 * 输出：32 位小写十六进制字符串
 *
 * 使用方式：
 *   var sign = M.md5("hello world");
 *   // sign === "5eb63bbbe01eeed093cb22bb8f5acdc3"
 */
;(function(M) {
    "use strict";

    /** 每轮的左移位数表 */
    var S = [
        7, 12, 17, 22,  7, 12, 17, 22,  7, 12, 17, 22,  7, 12, 17, 22,
        5,  9, 14, 20,  5,  9, 14, 20,  5,  9, 14, 20,  5,  9, 14, 20,
        4, 11, 16, 23,  4, 11, 16, 23,  4, 11, 16, 23,  4, 11, 16, 23,
        6, 10, 15, 21,  6, 10, 15, 21,  6, 10, 15, 21,  6, 10, 15, 21
    ];

    /** 每轮的常量表 K[i] = floor(abs(sin(i+1)) * 2^32) */
    var K = [
        -680876936, -389564586,  606105819, -1044525330,
        -176418897,  1200080426, -1473231341,   -45705983,
        1770035416, -1958414417,      -42063, -1990404162,
        1804603682,  -40341101, -1502002290,  1236535329,
        -165796510, -1069501632,   643717713,  -373897302,
        -701558691,    38016083,  -660478335,   -405537848,
         568446438, -1019803690,  -187363961,  1163531501,
       -1444681467,   -51403784,  1735328473, -1926607734,
           -378558, -2022574463,  1839030562,    -35309556,
       -1530992060,  1272893353,  -155497632, -1094730640,
         681279174,  -358537222,  -722521979,     76029189,
        -640364487,  -421815835,   530742520,   -995338651,
        -198630844,  1126891415, -1416354905,    -57434055,
        1700485571, -1894986606,    -1051523, -2054922799,
        1873313359,   -30611744, -1560198380,   1309151649,
        -145523070, -1120210379,   718787259,   -343485551
    ];

    /** 初始向量 IV */
    var INIT_A = 1732584193;   // 0x67452301
    var INIT_B = -271733879;   // 0xEFCDAB89
    var INIT_C = -1732584194;  // 0x98BADCFE
    var INIT_D = 271733878;    // 0x10325476

    /**
     * 循环左移
     * @param   {number} x - 待移位的 32 位整数
     * @param   {number} n - 左移位数
     * @returns {number} 移位后的无符号 32 位整数
     */
    function rotl(x, n) {
        return (x << n) | (x >>> (32 - n));
    }

    /**
     * 将字符串转换为 UTF-8 字节数组
     *
     * @param   {string} str - 原始字符串
     * @returns {number[]} UTF-8 编码的字节数组
     */
    function toUTF8Bytes(str) {
        var bytes = [];
        var i, ch;

        for (i = 0; i < str.length; i++) {
            ch = str.charCodeAt(i);

            if (ch < 0x80) {
                // 单字节 ASCII：0xxx xxxx
                bytes.push(ch);
            } else if (ch < 0x800) {
                // 双字节：110x xxxx 10xx xxxx
                bytes.push(0xC0 | (ch >> 6));
                bytes.push(0x80 | (ch & 0x3F));
            } else if (ch < 0xD800 || ch >= 0xE000) {
                // 三字节 BMP 字符：1110 xxxx 10xx xxxx 10xx xxxx
                bytes.push(0xE0 | (ch >> 12));
                bytes.push(0x80 | ((ch >> 6) & 0x3F));
                bytes.push(0x80 | (ch & 0x3F));
            } else {
                // 四字节（代理对）：处理 emoji 等补充平面字符
                i++;
                var cp = ((ch & 0x3FF) << 10) | (str.charCodeAt(i) & 0x3FF);
                bytes.push(0xF0 | (cp >> 18));
                bytes.push(0x80 | ((cp >> 12) & 0x3F));
                bytes.push(0x80 | ((cp >> 6) & 0x3F));
                bytes.push(0x80 | (cp & 0x3F));
            }
        }

        return bytes;
    }

    /**
     * 从字节数组中读取一个 32 位小端字
     *
     * @param   {number[]} arr - 字节数组
     * @param   {number}   off - 偏移量
     * @returns {number} 无符号 32 位整数
     */
    function readWord(arr, off) {
        return (arr[off] | (arr[off + 1] << 8) | (arr[off + 2] << 16) | (arr[off + 3] << 24)) >>> 0;
    }

    /**
     * 计算 MD5 哈希
     *
     * @param   {string} input - 待哈希的字符串
     * @returns {string} 32 位小写十六进制 MD5 值
     */
    function md5(input) {
        // ---- 第一步：UTF-8 编码并填充 ----
        var msgBytes = toUTF8Bytes(input);
        var msgLen   = msgBytes.length;
        var padLen   = (((msgLen + 8) >>> 6) + 1) << 6; // 补位后总长度（必须是 64 的倍数）
        var words    = new Array(padLen);

        var i;
        for (i = 0; i < padLen; i++) { words[i] = 0; }
        for (i = 0; i < msgLen; i++) { words[i] = msgBytes[i]; }

        // 补位：先加一个 0x80，后续全是 0x00
        words[msgLen] = 0x80;

        // 附加原始消息长度（64 位小端，只取低 64 位中的低 32 和高 32）
        var bitLen = 8 * msgLen;
        words[padLen - 8] =  bitLen        & 0xFF;
        words[padLen - 7] = (bitLen >>> 8)  & 0xFF;
        words[padLen - 6] = (bitLen >>> 16) & 0xFF;
        words[padLen - 5] = (bitLen >>> 24) & 0xFF;

        // ---- 第二步：初始化缓冲区 ----
        var a = INIT_A;
        var b = INIT_B;
        var c = INIT_C;
        var d = INIT_D;

        // ---- 第三步：主循环（每次处理 64 字节 / 512 位块） ----
        var hexChars = "0123456789abcdef";

        for (var block = 0; block < padLen; block += 64) {
            var aa = a, bb = b, cc = c, dd = d;

            // 将当前块分解为 16 个 32 位字
            var M = new Array(16);
            for (var j = 0; j < 16; j++) {
                M[j] = readWord(words, block + 4 * j);
            }

            // 64 轮变换
            for (var r = 0; r < 64; r++) {
                var f, idx;

                if (r < 16) {
                    // 轮次 1: F(B,C,D) = (B & C) | (~B & D)
                    f   = (bb & cc) | (~bb & dd);
                    idx = r;
                } else if (r < 32) {
                    // 轮次 2: G(B,C,D) = (D & B) | (~D & C)
                    f   = (dd & bb) | (~dd & cc);
                    idx = (5 * r + 1) % 16;
                } else if (r < 48) {
                    // 轮次 3: H(B,C,D) = B ^ C ^ D
                    f   = bb ^ cc ^ dd;
                    idx = (3 * r + 5) % 16;
                } else {
                    // 轮次 4: I(B,C,D) = C ^ (B | ~D)
                    f   = cc ^ (bb | ~dd);
                    idx = (7 * r) % 16;
                }

                var temp = dd;
                dd = cc;
                cc = bb;
                bb = (bb + rotl(aa + f + K[r] + M[idx], S[r])) >>> 0;
                aa = temp;
            }

            // 累加到缓冲区
            a = (a + aa) >>> 0;
            b = (b + bb) >>> 0;
            c = (c + cc) >>> 0;
            d = (d + dd) >>> 0;
        }

        // ---- 第四步：输出 32 位十六进制字符串 ----
        var out = "";
        var parts = [a, b, c, d];

        for (var p = 0; p < 4; p++) {
            var val = parts[p];
            for (var t = 0; t < 4; t++) {
                out += hexChars[(val >>> (8 * t + 4)) & 0xF];
                out += hexChars[(val >>> (8 * t))      & 0xF];
            }
        }

        return out;
    }

    // ---- 导出 ----
    M.md5 = md5;

})(window.__TaskHostSDK__ = window.__TaskHostSDK__ || {});
