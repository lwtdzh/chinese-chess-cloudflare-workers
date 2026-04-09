# Chinese Chess E2E Tests

## Overview

This directory contains comprehensive test cases for the Chinese Chess application deployed on Cloudflare Workers. All tests should be executed using Playwright browser automation to simulate real user interactions.

**Test Target URL**: `https://chess.netlib.re`

## Test Files

| File | Description | Priority |
|------|-------------|----------|
| [01-room-management.md](./01-room-management.md) | Create/join room, validation tests | P0 (Critical) |
| [02-websocket-connection.md](./02-websocket-connection.md) | WebSocket connection, reconnection tests | P0 (Critical) |
| [03-game-play.md](./03-game-play.md) | Move execution, piece rules, check/checkmate | P0 (Critical) |
| [04-game-controls.md](./04-game-controls.md) | Surrender, draw, take back tests | P1 (High) |
| [05-chat.md](./05-chat.md) | Chat functionality tests | P1 (High) |
| [06-session-cookie.md](./06-session-cookie.md) | Cookie management tests | P2 (Medium) |
| [07-ui-responsiveness.md](./07-ui-responsiveness.md) | Mobile, tablet, desktop layout tests | P2 (Medium) |
| [08-edge-cases.md](./08-edge-cases.md) | Error handling, edge cases | P3 (Low) |
| [09-audio.md](./09-audio.md) | Sound effects tests | P3 (Low) |
| [10-performance.md](./10-performance.md) | Latency, concurrent games tests | P2 (Medium) |

## Test Priority Matrix

| Priority | Test Category | Tests |
|----------|---------------|-------|
| P0 (Critical) | Room Management | Create/Join Room |
| P0 (Critical) | Game Play | Basic moves, checkmate |
| P0 (Critical) | Reconnection | Page refresh in game |
| P1 (High) | Game Controls | Surrender, Draw, Take Back |
| P1 (High) | Chat | Send/Receive messages |
| P2 (Medium) | Session | Cookie management |
| P2 (Medium) | UI | Mobile responsiveness |
| P2 (Medium) | Performance | Latency, concurrent games |
| P3 (Low) | Edge Cases | Error handling |
| P3 (Low) | Audio | Sound effects |

## Implementation Files

Test implementation should be placed in the following structure:

```
tests/
├── e2e/
│   ├── room.spec.js           - Room management tests
│   ├── gameplay.spec.js       - Game play tests
│   ├── reconnection.spec.js   - WebSocket/session tests
│   ├── controls.spec.js       - Surrender, draw, take back tests
│   ├── chat.spec.js           - Chat functionality tests
│   ├── ui.spec.js             - UI/responsive tests
│   └── performance.spec.js    - Performance tests
├── helpers/
│   └── game-helpers.js        - Shared test utilities
└── playwright.config.js       - Playwright configuration
```

## Quick Reference

### Playwright Test Setup
```javascript
const { chromium } = require('playwright');

// Create two browser contexts for two players
const browser = await chromium.launch();
const context1 = await browser.newContext();
const context2 = await browser.newContext();
const page1 = await context1.newPage();
const page2 = await context2.newPage();
```

### Wait for WebSocket Connection
```javascript
await page.waitForFunction(() => window.isWebSocketConnected && window.isWebSocketConnected());
```

### Canvas Click Helper
```javascript
async function clickBoardSquare(page, row, col) {
    const canvas = await page.$('#board');
    const box = await canvas.boundingBox();
    const cellSize = box.width / 9;
    const margin = cellSize * 0.7;
    await page.mouse.click(
        box.x + margin + col * cellSize,
        box.y + margin + row * cellSize
    );
}
```

### Dialog Handling
```javascript
page.on('dialog', async dialog => {
    if (dialog.message().includes('确定要请求和棋')) {
        await dialog.accept();
    }
});
```