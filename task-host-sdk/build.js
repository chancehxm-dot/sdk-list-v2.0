/**
 * build.js
 *
 * 构建脚本：按依赖顺序合并所有模块为单一文件。
 *
 * 使用方式：
 *   node build.js                    → 输出到 task-host-sdk.bundle.js
 *   node build.js > ../sdk.full.js   → 输出到上级目录
 *
 * 模块加载顺序（严格按依赖关系排列）：
 *   00-core.js          基础工具（无依赖）
 *   01-md5.js           MD5 算法（无依赖）
 *   02-http.js          HTTP 请求层（无依赖）
 *   03-config.js        配置常量（无依赖）
 *   04-storage.js       本地存储（依赖 03）
 *   05-i18n.js          国际化（无依赖）
 *   06-toast.js         Toast 组件（无依赖）
 *   07-badge.js         徽章组件（无依赖）
 *   08-adapters.js      适配器（依赖 02）
 *   09-reporter.js      上报器（依赖 01,03,08）
 *   10-base-tracker.js  追踪器基类（依赖 09,04）
 *   11-click-tracker.js 点击追踪器（依赖 03,04,05,06,10）
 *   12-duration-tracker.js 停留追踪器（依赖 03,04,05,06,07,10）
 *   13-ad-shield.js     广告屏蔽（无依赖）
 *   14-sdk.js           SDK 主入口（依赖所有以上模块）
 */
(function() {
    "use strict";

    var fs   = require("fs");
    var path = require("path");

    var MODULES_DIR = path.join(__dirname, "modules");
    var OUT_FILE    = path.join(__dirname, "..", "task-host-sdk.js");

    // 按依赖顺序排列的模块列表
    var files = [
        "00-core.js",
        "01-md5.js",
        "02-http.js",
        "03-config.js",
        "04-storage.js",
        "05-i18n.js",
        "06-toast.js",
        "07-badge.js",
        "08-adapters.js",
        "09-reporter.js",
        "10-base-tracker.js",
        "11-click-tracker.js",
        "12-duration-tracker.js",
        "13-ad-shield.js",
        "14-sdk.js"
    ];

    var banner = [
        "/*!",
        " * TaskHostSDK v2.0",
        " * Build date: " + new Date().toISOString(),
        " *",
        " * 任务追踪 SDK，支持点击型和停留型任务的自动上报。",
        " * ES5 兼容，无框架依赖。",
        " *",
        " * 项目仓库: utils-project/sdk-list/v2.0",
        " */",
        ""
    ].join("\n");

    var output = banner;

    console.log("Building TaskHostSDK...\n");

    files.forEach(function(filename, index) {
        var filepath = path.join(MODULES_DIR, filename);
        var source   = fs.readFileSync(filepath, "utf8");
        var lines    = source.split("\n").length;

        output += "// ================================================================\n";
        output += "// " + filename + " (" + lines + " lines)\n";
        output += "// ================================================================\n\n";
        output += source + "\n\n";

        console.log("  [" + (index + 1) + "/" + files.length + "] " + filename + " (" + lines + " lines)");
    });

    fs.writeFileSync(OUT_FILE, output, "utf8");
    console.log("\nDone! Output: " + OUT_FILE);
    console.log("Total size: " + (output.length / 1024).toFixed(1) + " KB");

})();
