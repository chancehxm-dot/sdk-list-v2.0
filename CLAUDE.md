# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SDK 集合项目 — 包含积分中心 H5 应用、Task Center SDK、Task Host SDK 等多个独立模块。每个模块在自己的目录下，公共资源在 `shared/`。

**Tech stack**: Vanilla HTML/CSS/JS, ES5 syntax only, zero framework dependencies. CryptoJS for MD5/AES (with a standalone pure-JS backup in `shared/crypto.js`).

## File Architecture

```
├── shared/                           # 公共模块 — 所有子模块共享
│   ├── libs/
│   │   └── crypto-js.min.js          #   CryptoJS 库（MD5 + AES）
│   ├── crypto.ts                     #   TypeScript 参考实现
│   └── crypto.js                     #   纯 JS 加解密备用（零依赖）
│
├── points-center/                    # 积分中心模块 — H5 积分商城应用
│   ├── index.html                    #   主页面：积分卡片、签到、任务、奖品
│   ├── js/
│   │   ├── api.js                    #     API 层：CONFIG、签名、AES 解密、业务接口
│   │   └── native.js                 #     WebView 桥接：Chrome Tab + 激励视频
│   ├── privacy.html                  #   法律页面（无广告/追踪）
│   ├── terms.html                    #   法律页面（无广告/追踪）
│   └── cookies.html                  #   Cookie 政策（无广告/追踪）
│
├── landing/                          # 落地页中转模块 — AES 解密 URL 并跳转
│   └── go.html                       #   中转页（自包含 inline JS）
│
├── task-demo/                        # 任务演示模块 — 开发/测试用
│   └── task-demo.html                #   模拟任务页（自包含 inline JS）
│
├── task-center/                      # Task Center SDK — 独立 npm 项目（Rollup 构建）
│   ├── src/                          #   源码：core.js, adapter.js, ui.js, utils.js, constants.js
│   ├── build/                        #   输出：ES, UMD, IIFE 三种格式
│   ├── rollup.config.js
│   └── package.json
│
├── task-host-sdk/                    # Task Host SDK — 任务宿主页 SDK
│   ├── task-host-sdk.js              #   拼接构建产物
│   ├── task-host-sdk.umd.js          #   UMD 单文件构建产物
│   └── modules/                      #   源码模块（00-core ~ 14-sdk，按依赖顺序排列）
│
├── doc/                              # API 文档（中文）
├── robots.txt
├── sitemap.xml
└── CLAUDE.md
```

## Script Loading

**`points-center/index.html`** loads in this order:
1. `../shared/libs/crypto-js.min.js` — CryptoJS 库
2. `js/api.js` — 依赖 CryptoJS，暴露 CONFIG、业务 API 函数
3. `js/native.js` — 独立 IIFE，暴露 NativeBridge 全局对象
4. Inline `<script>` — 依赖以上三个文件的所有导出

**`landing/go.html`** and **`task-demo/task-demo.html`** each load only `../shared/libs/crypto-js.min.js` plus their own inline JS — they are fully self-contained.

## API Signing & Encryption

### Request Signing

MD5-based, with two variants:

| Endpoint | Sign algorithm |
|---|---|
| `tasklists`, `points`, `checkin`, `landing`, `claim`, `rewards`, `exchange` | `md5(c_id + t_id/user_id + ts + secretKey)` — **with** secret |
| `report` | `md5(c_id + t_id + site + act + ts)` — **without** secret |

### Response Encryption

API responses with sensitive data have the `data` field AES-128-CBC encrypted:
- **Key derivation**: `md5(ts + secretKey)`, then split into KEY (first 16 hex chars) and IV (remaining chars), each interpreted as ASCII bytes → 16 bytes
- **Ciphertext**: Base64-encoded, no IV prefix — the full base64 string is the ciphertext
- Both `api.js` (using CryptoJS) and `crypto.js` (pure JS) implement the same algorithm

### Report Action Codes

`s` = show (task displayed), `c` = click (task started), `a` = arrive (landed on task page), `f` = finish (task completed)

## Task Types & Flow

1. **h5** — Opens a landing URL (production: native Chrome Tab or direct link; test: `landing/go.html` transit page). Reports click→arrive, user completes task on landing page, then refreshes to claim.
2. **ad** — Incentive video. Requires native bridge (`NativeBridge.openVideo`). After video completes, auto-reports finish and auto-claims reward.
3. **api** — Server-side task. Only reports click, no jump. The server detects completion.

Task state machine: `available` → (click) → (complete on landing page) → `claim` → (claim reward) → `done`

## URL Configuration

`api.js` uses `URL_PARAM_MAP` to drive CONFIG from query string parameters. Add new configurable fields by adding entries to this array only — no other code changes needed. Supported coercions: `int`, `bool`, `string` (default).

Key URL params: `c_id`, `user_id`, `env`, `secret_key`, `is_hide`, `loading_timeout`

## Native Bridge (`native.js`)

`NativeBridge` wraps `window.JSNative.postMessage()` with:
- Request/response pattern via unique IDs and 60s timeout
- `openChrome(taskId, url, callback)` — opens link in native Chrome Tab, falls back to `location.href`
- `openVideo(taskId, callback)` — plays incentive video, errors if native unavailable
- Global callbacks `window.onChromeClose` / `window.onVideoClose` registered for native responses

## Task Center SDK (`task-center/`)

Separate Rollup project. Build via `cd task-center && npm run build`. Public API: `TaskCenter.init(config)`, `.onBrowserClose()`, `.refresh()`, `.reload()`, `.destroy()`.

## Task Host SDK (`task-host-sdk/`)

Task host page SDK — tracks user behavior (click, duration) on task landing pages. Exposes `window.TaskHostSDK`. Source modules in `modules/` numbered 00-14 by dependency order. Build via `node modules/build.js`.

## Adding a New Module

1. Create `<module-name>/` directory at repo root
2. If the module depends on `crypto-js.min.js`, reference it as `../shared/libs/crypto-js.min.js`
3. Keep module self-contained — own JS, own HTML, no cross-module imports (use `shared/` for truly common code)

## Development

- **Local dev server**: Port 3338 (configured in `.vscode/settings.json`)
- **API environments**: Set via `?env=` param — `test2` (default), `prod`
  - Test API base: `http://192.168.1.153:7020/api/v2`
  - Prod API base: `https://api.zombifieds.com/api/v2`
- **No build step** for points-center/landing/task-demo — edit HTML/JS files directly
- **View `landing/go.html` debug panel**: Set `CONFIG.env` to non-`prod` to see the full request/decrypt inspector
- **View `task-demo/task-demo.html`**: Navigate with `?c_id=...&t_id=...&user_id=...&duration=30`

## Code Style Constraints

- **ES5 only**: `var`, `function`, callbacks — no arrow functions, `let`/`const`, template strings, classes, Promises, async/await, destructuring, or spread operators
- **IIFE modules**: Use `(function() { ... })()` patterns for scope isolation where appropriate
- **XHR over fetch**: Prefer `XMLHttpRequest`; `fetch` used only in `landing/go.html`'s `reportArrival` with `keepalive` for reliability during page unload
- **English UI** throughout (labels, button text, toast messages)
- **No ads on legal pages** — legal pages must never contain ad scripts, GPT containers, or tracking code
