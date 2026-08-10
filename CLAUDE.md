# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

积分中心（Points Center）H5 application — a loyalty/rewards platform where users earn points by completing tasks (playing games, watching videos, reading articles) and redeem points for rewards. Supports daily check-in, incentive video ads, and WebView native bridge integration.

**Tech stack**: Vanilla HTML/CSS/JS, ES5 syntax only, zero framework dependencies. CryptoJS for MD5/AES (with a standalone pure-JS backup in `crypto.js`).

## File Architecture

```
├── index.html        # Main app: points card, daily check-in (7-day), task/rewards tabs
├── go.html           # Landing page transit — decrypts AES-encrypted task URL & redirects
├── task-demo.html    # Simulated task completion page with countdown timer (dev/testing)
├── api.js            # API layer: CONFIG (URL-param-driven), XHR helpers, all business endpoints
├── native.js         # WebView bridge (window.JSNative) — Chrome Tab + incentive video
├── crypto.js         # Pure-JS MD5, Base64, AES-128-CBC (zero-dependency fallback for CryptoJS)
├── privacy.html      # Legal: Privacy Policy (no ads/tracking)
├── terms.html        # Legal: Terms of Service (no ads/tracking)
├── cookies.html      # Legal: Cookie Policy (no ads/tracking)
├── robots.txt        # Allow all, disallow /api/
├── sitemap.xml       # Index + legal pages
├── libs/
│   ├── crypto-js.min.js   # CryptoJS (MD5 + AES) — loaded before api.js
│   └── crypto.ts          # TypeScript source reference for crypto.js
├── task-center/           # Task Center SDK (separate npm project, Rollup build)
│   ├── src/               # Source: core.js, adapter.js, ui.js, utils.js, constants.js
│   ├── build/             # Output: ES, UMD, IIFE bundles
│   └── rollup.config.js
└── doc/                   # API documentation (Chinese), including native interaction spec
```

## Script Loading Order

`index.html` loads scripts in this dependency order:
1. `libs/crypto-js.min.js` — CryptoJS (MD5 + AES primitives)
2. `api.js` — Depends on CryptoJS for `buildSign()` and `aesDecrypt()`
3. `native.js` — Standalone, self-executing module

`go.html` and `task-demo.html` each include their own inline API logic and only depend on `libs/crypto-js.min.js`.

## API Signing & Encryption

### Request Signing

MD5-based, with two variants depending on the endpoint:

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

1. **h5** — Opens a landing URL (production: native Chrome Tab or direct link; test: `go.html` transit page). Reports click→arrive, user completes task on landing page, then refreshes to claim.
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

## Development

- **Local dev server**: Port 3338 (configured in `.vscode/settings.json`)
- **API environments**: Set via `?env=` param — `test2` (default), `prod`
  - Test API base: `http://192.168.1.153:7020/api/v2`
  - Prod API base: `https://api.zombifieds.com/api/v2`
- **No build step** for the main app — edit HTML/JS files directly
- **View `go.html` debug panel**: Set `CONFIG.env` to non-`prod` to see the full request/decrypt inspector instead of silent redirect
- **View `task-demo.html`**: Navigate with `?c_id=...&t_id=...&user_id=...&duration=30`

## Code Style Constraints

- **ES5 only**: `var`, `function`, callbacks — no arrow functions, `let`/`const`, template strings, classes, Promises, async/await, destructuring, or spread operators
- **IIFE modules**: Use `(function() { ... })()` patterns for scope isolation where appropriate
- **XHR over fetch**: Prefer `XMLHttpRequest`; `fetch` used only in `go.html`'s `reportArrival` with `keepalive` for reliability during page unload
- **English UI** throughout (labels, button text, toast messages)
- **No ads on legal pages** — `privacy.html`, `terms.html`, `cookies.html` must never contain ad scripts, GPT containers, or tracking code
