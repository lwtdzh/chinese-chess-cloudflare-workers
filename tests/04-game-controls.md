# 4. Game Control Tests

## Overview

Tests for surrender, draw request/response, and take back request/response functionality.

---

## 4.1 Surrender - Basic

- **Description**: Player surrenders during game
- **Priority**: P1 (High)
- **Steps**:
  1. Game in progress
  2. Player clicks "认输" button
- **Expected**:
  - GAME_OVER sent to both players
  - Winner is opponent
  - Reason is "RESIGN"
  - Session cookies cleared
- **Playwright Implementation**:
  ```javascript
  test('surrender ends game correctly', async ({ browser }) => {
    const { page1, page2, roomName } = await setupGame(browser);

    // Player 1 (RED) surrenders
    page1.on('dialog', async dialog => {
      if (dialog.message().includes('确定要认输')) {
        await dialog.accept();
      }
    });

    await page1.click('#surrender-btn');
    await page1.waitForTimeout(500);

    // Verify game over for both players
    await expect(page1.locator('#game-status')).toContainText('游戏结束');
    await expect(page1.locator('#game-result')).toContainText('你输了');

    await expect(page2.locator('#game-status')).toContainText('游戏结束');
    await expect(page2.locator('#game-result')).toContainText('你赢了');

    // Verify cookies cleared
    const cookies = await page1.context().cookies();
    expect(cookies.find(c => c.name === 'xiangqi_room_name')).toBeUndefined();
  });
  ```

---

## 4.2 Surrender - Confirm Dialog Cancel

- **Description**: Player cancels surrender confirmation
- **Priority**: P1 (High)
- **Steps**:
  1. Game in progress
  2. Click "认输" button
  3. Cancel the confirm dialog
- **Expected**: Game continues normally
- **Playwright Implementation**:
  ```javascript
  test('cancel surrender dialog continues game', async ({ browser }) => {
    const { page1, page2 } = await setupGame(browser);

    page1.on('dialog', async dialog => {
      if (dialog.message().includes('确定要认输')) {
        await dialog.dismiss(); // Cancel
      }
    });

    await page1.click('#surrender-btn');
    await page1.waitForTimeout(500);

    // Game should still be in progress
    await expect(page1.locator('#game-container')).toBeVisible();
    await expect(page1.locator('#turn-indicator')).toBeVisible();
  });
  ```

---

## 4.3 Surrender - Not In Game

- **Description**: Player clicks surrender when not in a game
- **Priority**: P2 (Medium)
- **Steps**:
  1. In lobby or game not started
  2. Click "认输" button (if visible)
- **Expected**: Nothing happens (button should be disabled/hidden)
- **Playwright Implementation**:
  ```javascript
  test('surrender button disabled when not in game', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForFunction(() => window.isWebSocketConnected());

    // Button should be disabled or hidden in lobby
    const surrenderBtn = await page.$('#surrender-btn');
    const isDisabled = await surrenderBtn.getAttribute('disabled');
    expect(isDisabled).toBeTruthy();
  });
  ```

---

## 4.4 Draw Request - Accepted

- **Description**: Player requests draw, opponent accepts
- **Priority**: P1 (High)
- **Steps**:
  1. Game in progress
  2. Player 1 clicks "求和"
  3. Confirms request
  4. Player 2 receives dialog and accepts
- **Expected**:
  - GAME_OVER with winner "DRAW" and reason "AGREED_DRAW"
  - Both players see "游戏结束! 和棋!"
- **Playwright Implementation**:
  ```javascript
  test('draw request accepted ends game as draw', async ({ browser }) => {
    const { page1, page2 } = await setupGame(browser);

    // Player 1 requests draw
    page1.on('dialog', async dialog => {
      if (dialog.message().includes('确定要请求和棋')) {
        await dialog.accept();
      }
    });

    // Player 2 accepts draw
    page2.on('dialog', async dialog => {
      if (dialog.message().includes('对方请求和棋')) {
        await dialog.accept();
      }
    });

    await page1.click('#draw-btn');
    await page1.waitForTimeout(1000);

    // Verify draw result
    await expect(page1.locator('#game-status')).toContainText('游戏结束');
    await expect(page1.locator('#game-result')).toContainText('和棋');

    await expect(page2.locator('#game-status')).toContainText('游戏结束');
    await expect(page2.locator('#game-result')).toContainText('和棋');
  });
  ```

---

## 4.5 Draw Request - Declined

- **Description**: Player requests draw, opponent declines
- **Priority**: P1 (High)
- **Steps**:
  1. Game in progress
  2. Player 1 clicks "求和"
  3. Confirms request
  4. Player 2 receives dialog and declines
- **Expected**:
  - DRAW_DECLINED sent to Player 1
  - Player 1 sees alert "对方拒绝了和棋请求"
  - Game continues
- **Playwright Implementation**:
  ```javascript
  test('draw request declined continues game', async ({ browser }) => {
    const { page1, page2 } = await setupGame(browser);

    // Player 1 requests draw
    page1.on('dialog', async dialog => {
      if (dialog.message().includes('确定要请求和棋')) {
        await dialog.accept();
      }
    });

    // Player 2 declines draw
    page2.on('dialog', async dialog => {
      if (dialog.message().includes('对方请求和棋')) {
        await dialog.dismiss(); // Decline
      }
    });

    // Listen for decline message on player 1
    let declineReceived = false;
    page1.on('dialog', async dialog => {
      if (dialog.message().includes('拒绝')) {
        declineReceived = true;
        await dialog.dismiss();
      }
    });

    await page1.click('#draw-btn');
    await page1.waitForTimeout(1000);

    // Game should still be running
    await expect(page1.locator('#game-container')).toBeVisible();
    expect(declineReceived).toBeTruthy();
  });
  ```

---

## 4.6 Draw Request - Requester Sees No Dialog

- **Description**: Draw requester should not see opponent's confirm dialog
- **Priority**: P2 (Medium)
- **Steps**:
  1. Player 1 requests draw
  2. Check if Player 1 sees any additional dialog
- **Expected**: Player 1 only sees their own confirmation, not opponent's
- **Playwright Implementation**:
  ```javascript
  test('draw requester does not see opponent dialog', async ({ browser }) => {
    const { page1, page2 } = await setupGame(browser);

    let dialogsSeen = [];
    page1.on('dialog', async dialog => {
      dialogsSeen.push(dialog.message());
      await dialog.accept();
    });

    page2.on('dialog', async dialog => {
      // Don't respond yet - just record
      dialogsSeen.push('P2: ' + dialog.message());
    });

    await page1.click('#draw-btn');
    await page1.waitForTimeout(500);

    // Player 1 should only see their own confirmation dialog
    // Not the opponent's acceptance dialog
    expect(dialogsSeen.filter(m => m.includes('对方请求和棋'))).toHaveLength(0);
  });
  ```

---

## 4.7 Draw Request - Not In Game

- **Description**: Draw button when not in game
- **Priority**: P2 (Medium)
- **Steps**:
  1. Not in active game
  2. Click "求和"
- **Expected**: Nothing happens (button should be disabled)
- **Playwright Implementation**:
  ```javascript
  test('draw button disabled when not in game', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForFunction(() => window.isWebSocketConnected());

    const drawBtn = await page.$('#draw-btn');
    const isDisabled = await drawBtn.getAttribute('disabled');
    expect(isDisabled).toBeTruthy();
  });
  ```

---

## 4.8 Take Back Request - Accepted

- **Description**: Player requests take back, opponent accepts
- **Priority**: P1 (High)
- **Steps**:
  1. Game in progress
  2. Player 1 makes a move
  3. Player 1 clicks "悔棋"
  4. Confirms request
  5. Player 2 accepts
- **Expected**:
  - Board reverts to previous state
  - Captured piece restored (if any)
  - Turn restored to before the move
- **Playwright Implementation**:
  ```javascript
  test('take back request accepted restores board', async ({ browser }) => {
    const { page1, page2 } = await setupGame(browser);

    // Make a move first
    await clickBoardSquare(page1, 9, 1);
    await clickBoardSquare(page1, 7, 1);
    await page2.waitForTimeout(500);

    // Get move count before take back
    const moveCountBefore = await page1.locator('#move-history li').count();

    // Player 1 requests take back
    page1.on('dialog', async dialog => {
      if (dialog.message().includes('确定要请求悔棋')) {
        await dialog.accept();
      }
    });

    // Player 2 accepts
    page2.on('dialog', async dialog => {
      if (dialog.message().includes('对方请求悔棋')) {
        await dialog.accept();
      }
    });

    await page1.click('#takeback-btn');
    await page1.waitForTimeout(1000);

    // Verify board restored
    const moveCountAfter = await page1.locator('#move-history li').count();
    expect(moveCountAfter).toBe(moveCountBefore - 1);

    // Turn should be back to RED
    await expect(page1.locator('#turn-indicator')).toContainText('红方');
  });
  ```

---

## 4.9 Take Back Request - Declined

- **Description**: Player requests take back, opponent declines
- **Priority**: P1 (High)
- **Steps**:
  1. Player 1 requests take back
  2. Player 2 declines
- **Expected**:
  - Player 1 sees "对方拒绝了悔棋请求"
  - Game continues unchanged
- **Playwright Implementation**:
  ```javascript
  test('take back request declined continues game', async ({ browser }) => {
    const { page1, page2 } = await setupGame(browser);

    // Make a move
    await clickBoardSquare(page1, 9, 1);
    await clickBoardSquare(page1, 7, 1);
    await page2.waitForTimeout(500);

    // Player 1 requests take back
    page1.on('dialog', async dialog => {
      if (dialog.message().includes('确定要请求悔棋')) {
        await dialog.accept();
      }
    });

    // Player 2 declines
    page2.on('dialog', async dialog => {
      if (dialog.message().includes('对方请求悔棋')) {
        await dialog.dismiss();
      }
    });

    let declineReceived = false;
    page1.on('dialog', async dialog => {
      if (dialog.message().includes('拒绝')) {
        declineReceived = true;
        await dialog.dismiss();
      }
    });

    await page1.click('#takeback-btn');
    await page1.waitForTimeout(1000);

    // Game continues
    await expect(page1.locator('#turn-indicator')).toContainText('黑方');
    expect(declineReceived).toBeTruthy();
  });
  ```

---

## 4.10 Take Back - Restore Captured Piece

- **Description**: Take back restores captured piece
- **Priority**: P1 (High)
- **Steps**:
  1. Player captures enemy piece
  2. Request take back
  3. Opponent accepts
- **Expected**: Captured piece returned to its original position
- **Playwright Implementation**:
  ```javascript
  test('take back restores captured piece', async ({ browser }) => {
    const { page1, page2 } = await setupGame(browser);

    // Setup capture scenario
    // Move pieces to create capture opportunity
    await clickBoardSquare(page1, 9, 1); // Select chariot
    await clickBoardSquare(page1, 7, 1); // Move forward
    await page2.waitForTimeout(500);

    await clickBoardSquare(page2, 3, 1); // Black soldier
    await clickBoardSquare(page2, 4, 1); // Move forward
    await page1.waitForTimeout(500);

    await clickBoardSquare(page1, 7, 1); // Red chariot
    await clickBoardSquare(page1, 4, 1); // Capture soldier
    await page2.waitForTimeout(500);

    // Count captured pieces
    const capturedBefore = await page1.locator('#captured-black li').count();

    // Take back
    page1.on('dialog', dialog => dialog.accept());
    page2.on('dialog', dialog => dialog.accept());

    await page1.click('#takeback-btn');
    await page1.waitForTimeout(1000);

    // Verify captured piece restored
    const capturedAfter = await page1.locator('#captured-black li').count();
    expect(capturedAfter).toBe(capturedBefore - 1);
  });
  ```

---

## 4.11 Take Back - No Move History

- **Description**: Take back request when no moves made
- **Priority**: P2 (Medium)
- **Steps**:
  1. Game just started, no moves yet
  2. Click "悔棋"
- **Expected**: Nothing happens (no moves to undo)
- **Playwright Implementation**:
  ```javascript
  test('take back with no moves does nothing', async ({ browser }) => {
    const { page1, page2 } = await setupGame(browser);

    // No moves made yet
    // Try to take back
    await page1.click('#takeback-btn');

    // No dialog should appear, game continues
    await expect(page1.locator('#turn-indicator')).toContainText('红方');
  });
  ```

---

## 4.12 Take Back - Multiple Moves

- **Description**: Multiple take backs in sequence
- **Priority**: P2 (Medium)
- **Steps**:
  1. Make several moves
  2. Request take back, accepted
  3. Request take back again, accepted
- **Expected**: Each take back undoes one move
- **Playwright Implementation**:
  ```javascript
  test('multiple take backs undo multiple moves', async ({ browser }) => {
    const { page1, page2 } = await setupGame(browser);

    // Make 3 moves
    await clickBoardSquare(page1, 9, 1);
    await clickBoardSquare(page1, 7, 1);
    await page2.waitForTimeout(500);

    await clickBoardSquare(page2, 0, 1);
    await clickBoardSquare(page2, 2, 2);
    await page1.waitForTimeout(500);

    await clickBoardSquare(page1, 7, 1);
    await clickBoardSquare(page1, 5, 1);
    await page2.waitForTimeout(500);

    const moveCount = await page1.locator('#move-history li').count();
    expect(moveCount).toBe(3);

    // First take back
    page1.on('dialog', dialog => dialog.accept());
    page2.on('dialog', dialog => dialog.accept());

    await page1.click('#takeback-btn');
    await page1.waitForTimeout(1000);

    expect(await page1.locator('#move-history li').count()).toBe(2);

    // Second take back
    await page1.click('#takeback-btn');
    await page1.waitForTimeout(1000);

    expect(await page1.locator('#move-history li').count()).toBe(1);
  });
  ```

---

## Helper Functions

```javascript
async function setupGame(browser) {
  const context1 = await browser.newContext();
  const context2 = await browser.newContext();
  const page1 = await context1.newPage();
  const page2 = await context2.newPage();

  const roomName = 'ControlTest_' + Date.now();

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

  return { page1, page2, roomName };
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