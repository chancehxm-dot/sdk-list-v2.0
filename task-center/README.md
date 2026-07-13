# Task Center SDK

This project restores the original `TaskCenter` browser SDK from the bundled artifacts and keeps the implementation in a source-first engineering layout.

## Public API

- `TaskCenter.init(config)`
- `TaskCenter.onBrowserClose()`
- `TaskCenter.refresh()`
- `TaskCenter.reload()`
- `TaskCenter.destroy()`

## Build targets

- `build/task-center-sdk.es.js`
- `build/task-center-sdk.umd.js`
- `build/task-center-sdk.iife.js`

## Development

```bash
npm install
npm run build
```
