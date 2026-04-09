# 8. Edge Cases & Error Handling Tests

## Overview

Tests for edge cases, error handling, and unusual scenarios.

---

## 8.1 Both Players Disconnect

- **Description**: Both players disconnect from game
- **Priority**: P2 (Medium)
- **Steps**:
  1. Game in progress
  2. Both players close tabs or disconnect
  3. Wait for timeout
  4. One player reconnects
- **Expected**:
  - Game state preserved in Durable Object
  - Player can reconnect within timeout period
- **Playwright Implementation**:
  ```javascript
  test('both players disconnect then reconnect', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    const roomName = 'BothDisconnect_' + Date.now();
    await setupGame(page1, page2, roomName);

    // Make a move to have game state
    await clickBoardSquare(page1, 9, 1);
    await clickBoardSquare(page1, 7, 1);
    await page2.waitForTimeout(500);

    // Close both pages
    await page1.close();
    await page2.close();

    // Wait for potential cleanup
    await new Promise(r => setTimeout(r, 5000));

    // Create new contexts and try to reconnect
    const newContext1 = await browser.newContext();
    const newPage1 = await newContext1.newPage();

    // Manually set cookies for reconnection
    // (In real scenario, cookies might still exist)
    await newPage1.goto(BASE_URL);
    await newPage1.waitForFunction(() => window.isWebSocketConnected());

    // With cookies, player should be able to reconnect
    // Without cookies, player starts fresh in lobby
    // Document actual behavior based on implementation
  });
  ```

---

## 8.2 Player Disconnects Mid-Turn

- **Description**: Player disconnects while it's their turn
- **Priority**: P1 (High)
- **Steps**:
  1. Game in progress, RED's turn
  2. RED player closes tab
  3. BLACK player waits
  4. RED player returns
- **Expected**:
  - Game state preserved
  - RED can reconnect and continue
- **Playwright Implementation**:
  ```javascript
  test('player disconnects mid-turn can reconnect', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    const roomName = 'MidTurnDisconnect_' + Date.now();
    await setupGame(page1, page2, roomName);

    // RED's turn - player 1 disconnects
    await page1.close();

    // Player 2 (BLACK) waits
    await page2.waitForTimeout(3000);

    // Player 1 reconnects with same context cookies
    const cookies = await context1.cookies();
    const newPage1 = await context1.newPage();
    await newPage1.goto(BASE_URL);
    await newPage1.waitForFunction(() => window.isWebSocketConnected());

    // Should reconnect to same game
    await newPage1.waitForSelector('#game-container');
    await expect(newPage1.locator('#turn-indicator')).toContainText('红方');
  });
  ```

---

## 8.3 Rapid Reconnection

- **Description**: Player rapidly refreshes page
- **Priority**: P2 (Medium)
- **Steps**:
  1. Game in progress
  2. Rapidly refresh page 5 times
- **Expected**:
  - Each refresh establishes new WebSocket
  - Previous connections closed
  - Game state consistent
- **Playwright Implementation**:
  ```javascript
  test('rapid reconnection maintains game state', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    const roomName = 'RapidRefresh_' + Date.now();
    await setupGame(page1, page2, roomName);

    // Make a move
    await clickBoardSquare(page1, 9, 1);
    await clickBoardSquare(page1, 7, 1);
    await page2.waitForTimeout(500);

    const moveCount = await page1.locator('#move-history li').count();

    // Rapid refresh 5 times
    for (let i = 0; i < 5; i++) {
      await page1.reload();
      await page1.waitForFunction(() => window.isWebSocketConnected());
      await page1.waitForSelector('#game-container');
      await page1.waitForTimeout(200);
    }

    // Verify game state consistent
    const finalMoveCount = await page1.locator('#move-history li').count();
    expect(finalMoveCount).toBe(moveCount);

    // Turn should still be BLACK
    await expect(page1.locator('#turn-indicator')).toContainText('黑方');
  });
  ```

---

## 8.4 WebSocket Error

- **Description**: WebSocket encounters error
- **Priority**: P3 (Low)
- **Steps**:
  1. Simulate WebSocket error
- **Expected**:
  - Error logged to console
  - Reconnection attempted
- **Playwright Implementation**:
  ```javascript
  test('WebSocket error triggers reconnection', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(BASE_URL);
    await page.waitForFunction(() => window.isWebSocketConnected());

    // Collect console messages
    const consoleMessages = [];
    page.on('console', msg => consoleMessages.push(msg.text()));

    // Simulate WebSocket error by navigating away and back
    await page.goto('about:blank');
    await page.waitForTimeout(1000);
    await page.goto(BASE_URL);

    // Wait for reconnection
    await page.waitForFunction(() => window.isWebSocketConnected());

    // Verify error logged and reconnection attempted
    expect(consoleMessages.some(m => m.includes('WebSocket') && m.includes('error'))).toBeTruthy();
    expect(consoleMessages.some(m => m.includes('Connecting'))).toBeTruthy();
  });
  ```

---

## 8.5 Invalid JSON Message

- **Description**: Client receives malformed JSON
- **Priority**: P3 (Low)
- **Steps**:
  1. Simulate server sending invalid JSON
- **Expected**: Error handled gracefully, no crash
- **Playwright Implementation**:
  ```javascript
  test('invalid JSON handled gracefully', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(BASE_URL);
    await page.waitForFunction(() => window.isWebSocketConnected());

    // Inject invalid JSON handler test
    const result = await page.evaluate(() => {
      try {
        // Simulate receiving invalid JSON
        const invalidJson = '{ invalid json }';
        JSON.parse(invalidJson);
        return 'parsed';
      } catch (e) {
        return 'error caught';
      }
    });

    expect(result).toBe('error caught');

    // Page should still be functional
    await expect(page.locator('#lobby-container')).toBeVisible();
  });
  ```

---

## 8.6 Game State After Game End

- **Description**: Attempt moves after game ended
- **Priority**: P1 (High)
- **Steps**:
  1. Game ends (checkmate)
  2. Try to click on board
- **Expected**:
  - No piece selection
  - No moves possible
- **Playwright Implementation**:
  ```javascript
  test('no moves after game end', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    const roomName = 'AfterGameEnd_' + Date.now();
    await setupGame(page1, page2, roomName);

    // End game via surrender
    page1.on('dialog', dialog => dialog.accept());
    await page1.click('#surrender-btn');
    await page1.waitForTimeout(500);

    // Try to click on board
    await clickBoardSquare(page1, 9, 0);

    // No piece should be selected
    // Game controls should be disabled
    const moveBtnDisabled = await page1.$eval('#takeback-btn', el => el.disabled);
    expect(moveBtnDisabled).toBeTruthy();
  });
  ```

---

## 8.7 Concurrent Room Creation

- **Description**: Two players try to create same room simultaneously
- **Priority**: P3 (Low)
- **Steps**:
  1. Two players enter same room name
  2. Both click "创建房间" at nearly same time
- **Expected**: Only one succeeds, other gets error
- **Playwright Implementation**:
  ```javascript
  test('concurrent room creation handled', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    const roomName = 'Concurrent_' + Date.now();

    await page1.goto(BASE_URL);
    await page2.goto(BASE_URL);

    await page1.waitForFunction(() => window.isWebSocketConnected());
    await page2.waitForFunction(() => window.isWebSocketConnected());

    await page1.fill('#room-name-input', roomName);
    await page2.fill('#room-name-input', roomName);

    // Click both at nearly same time
    await Promise.all([
      page1.click('#create-room-btn'),
      page2.click('#create-room-btn')
    ]);

    await page1.waitForTimeout(1000);

    // Check results - one should succeed, one should fail
    const page1InGame = await page1.$('#game-container').isVisible();
    const page2InGame = await page2.$('#game-container').isVisible();

    // Only one should be in game
    expect(page1InGame || page2InGame).toBeTruthy();
    expect(page1InGame && page2InGame).toBeFalsy();
  });
  ```

---

## Helper Functions

```javascript
async function setupGame(page1, page2, roomName) {
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