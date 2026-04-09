# 10. Performance Tests

## Overview

Tests for measuring performance metrics including latency, reconnection speed, and concurrent game handling.

---

## 10.1 Move Latency

- **Description**: Measure time between move and opponent seeing it
- **Priority**: P2 (Medium)
- **Steps**:
  1. Make move
  2. Measure time for opponent to receive
- **Expected**: < 500ms latency
- **Playwright Implementation**:
  ```javascript
  test('move latency under 500ms', async ({ browser }) => {
    const { page1, page2 } = await setupGame(browser);

    // Setup listener on page2 to detect move received
    let moveReceivedTime = null;
    page2.on('console', msg => {
      if (msg.text().includes('MOVE received')) {
        moveReceivedTime = Date.now();
      }
    });

    const moveStartTime = Date.now();

    // Make move from page1
    await clickBoardSquare(page1, 9, 1);
    await clickBoardSquare(page1, 7, 1);

    // Wait for page2 to receive
    await page2.waitForTimeout(1000);

    // Measure latency
    if (moveReceivedTime) {
      const latency = moveReceivedTime - moveStartTime;
      expect(latency).toBeLessThan(500);
    }

    // Alternative: measure by move history update
    await page2.waitForFunction(() => {
      const history = document.querySelector('#move-history');
      return history && history.children.length > 0;
    });

    const latencyByHistory = Date.now() - moveStartTime;
    expect(latencyByHistory).toBeLessThan(500);
  });
  ```

---

## 10.2 WebSocket Reconnection Time

- **Description**: Time to reconnect after disconnect
- **Priority**: P2 (Medium)
- **Expected**: < 5 seconds for successful reconnection
- **Playwright Implementation**:
  ```javascript
  test('WebSocket reconnection under 5 seconds', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(BASE_URL);
    await page.waitForFunction(() => window.isWebSocketConnected());

    // Disconnect by navigating away
    await page.goto('about:blank');
    const disconnectTime = Date.now();

    // Navigate back
    await page.goto(BASE_URL);

    // Wait for reconnection
    await page.waitForFunction(() => window.isWebSocketConnected && window.isWebSocketConnected());

    const reconnectTime = Date.now();
    const reconnectionDuration = reconnectTime - disconnectTime;

    expect(reconnectionDuration).toBeLessThan(5000);
  });

  test('reconnection after network restore', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    const roomName = 'ReconnectPerf_' + Date.now();
    await setupGame(page1, page2, roomName);

    // Disable network
    const cdp = await context1.newCDPSession(page1);
    await cdp.send('Network.disable');
    const disconnectTime = Date.now();

    // Wait a bit
    await page1.waitForTimeout(2000);

    // Restore network
    await cdp.send('Network.enable');

    // Wait for reconnection
    await page1.waitForFunction(() => window.isWebSocketConnected && window.isWebSocketConnected(), { timeout: 10000 });

    const reconnectTime = Date.now();
    const reconnectionDuration = reconnectTime - disconnectTime;

    expect(reconnectionDuration).toBeLessThan(5000);
  });
  ```

---

## 10.3 Multiple Games Concurrent

- **Description**: Multiple game rooms running simultaneously
- **Priority**: P2 (Medium)
- **Steps**:
  1. Create 10 different rooms
  2. Start games in each
  3. Verify all work independently
- **Expected**: All games function correctly, no interference
- **Playwright Implementation**:
  ```javascript
  test('10 concurrent games work independently', async ({ browser }) => {
    const gameCount = 10;
    const games = [];

    // Setup 10 games
    for (let i = 0; i < gameCount; i++) {
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();
      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      const roomName = `ConcurrentGame_${i}_${Date.now()}`;

      await page1.goto(BASE_URL);
      await page1.waitForFunction(() => window.isWebSocketConnected());
      await page1.fill('#room-name-input', roomName);
      await page1.click('#create-room-btn');
      await page1.waitForSelector('#game-container');

      await page2.goto(BASE_URL);
      await page2.waitForFunction(() => window.isWebSocketConnected());
      await page2.fill('#room-name-input', roomName);
      await page2.click('#join-room-btn');
      await page2.waitForSelector('#game-container');

      games.push({ page1, page2, roomName, context1, context2 });
    }

    // Make moves in all games concurrently
    for (const game of games) {
      await clickBoardSquare(game.page1, 9, 1);
      await clickBoardSquare(game.page1, 7, 1);
    }

    // Wait for all to sync
    await Promise.all(games.map(g => g.page2.waitForTimeout(500)));

    // Verify all games have correct state
    for (const game of games) {
      // Turn should be BLACK in all games
      await expect(game.page1.locator('#turn-indicator')).toContainText('黑方');
      await expect(game.page2.locator('#turn-indicator')).toContainText('黑方');

      // Move history should show one move
      const moveCount = await game.page1.locator('#move-history li').count();
      expect(moveCount).toBe(1);
    }

    // Cleanup
    for (const game of games) {
      await game.context1.close();
      await game.context2.close();
    }
  });

  test('games don't interfere with each other', async ({ browser }) => {
    // Setup two games
    const game1 = await setupGamePair(browser, 'Game1_' + Date.now());
    const game2 = await setupGamePair(browser, 'Game2_' + Date.now());

    // Make move in game1
    await clickBoardSquare(game1.page1, 9, 1);
    await clickBoardSquare(game1.page1, 7, 1);

    // Make different move in game2
    await clickBoardSquare(game2.page1, 9, 0);
    await clickBoardSquare(game2.page1, 7, 0);

    await Promise.all([
      game1.page2.waitForTimeout(500),
      game2.page2.waitForTimeout(500)
    ]);

    // Verify game1 has correct move (chariot at 7,1)
    await expect(game1.page1.locator('#move-history')).toContainText('车');

    // Verify game2 has different move
    await expect(game2.page1.locator('#move-history')).toContainText('车');

    // Verify no crossover
    const game1History = await game1.page1.locator('#move-history').textContent();
    const game2History = await game2.page1.locator('#move-history').textContent();

    // Should not have moves from other game
    expect(game1History).not.toContain(game2.roomName);
    expect(game2History).not.toContain(game1.roomName);
  });
  ```

---

## Performance Benchmarks

| Metric | Expected | Test Method |
|--------|----------|-------------|
| Move latency | < 500ms | Measure time from move to opponent receiving |
| WebSocket reconnection | < 5s | Measure time from disconnect to reconnect |
| Page load time | < 3s | Measure navigation timing |
| First WebSocket connection | < 2s | Measure time to WebSocket connected state |
| Concurrent games | 10+ | Verify multiple games run independently |

---

## Helper Functions

```javascript
async function setupGame(browser) {
  const context1 = await browser.newContext();
  const context2 = await browser.newContext();
  const page1 = await context1.newPage();
  const page2 = await context2.newPage();

  const roomName = 'PerfTest_' + Date.now();

  await page1.goto(BASE_URL);
  await page1.waitForFunction(() => window.isWebSocketConnected());
  await page1.fill('#room-name-input', roomName);
  await page1.click('#create-room-btn');
  await page1.waitForSelector('#game-container');

  await page2.goto(BASE_URL);
  await page2.waitForFunction(() => window.isWebSocketConnected());
  await page2.fill('#room-name-input', roomName);
  await page2.click('#join-room-btn');
  await page2.waitForSelector('#game-container');

  await page1.waitForTimeout(500);

  return { page1, page2, roomName, context1, context2 };
}

async function setupGamePair(browser, roomName) {
  const context1 = await browser.newContext();
  const context2 = await browser.newContext();
  const page1 = await context1.newPage();
  const page2 = await context2.newPage();

  await page1.goto(BASE_URL);
  await page1.waitForFunction(() => window.isWebSocketConnected());
  await page1.fill('#room-name-input', roomName);
  await page1.click('#create-room-btn');
  await page1.waitForSelector('#game-container');

  await page2.goto(BASE_URL);
  await page2.waitForFunction(() => window.isWebSocketConnected());
  await page2.fill('#room-name-input', roomName);
  await page2.click('#join-room-btn');
  await page2.waitForSelector('#game-container');

  await page1.waitForTimeout(500);

  return { page1, page2, roomName, context1, context2 };
}

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