# 3. Game Play Tests

## Overview

Tests for move execution, piece selection, piece movement rules, check/checkmate detection, and special rules.

---

## 3.1 Move - Valid Piece Selection

- **Description**: Player clicks on their own piece during their turn
- **Priority**: P0 (Critical)
- **Steps**:
  1. Game started, RED's turn
  2. RED player clicks on a red piece
- **Expected**:
  - Piece is highlighted
  - Valid move positions are shown on board
- **Playwright Implementation**:
  ```javascript
  test('valid piece selection shows highlights', async ({ browser }) => {
    const { page1, page2 } = await setupGame(browser);

    // RED's turn - click on a red piece (chariot at row 9, col 0)
    await clickBoardSquare(page1, 9, 0);

    // Verify piece is highlighted
    const canvas = await page1.$('#board');
    // Check that piece is visually selected (highlighted state)
  });
  ```

---

## 3.2 Move - Invalid Piece Selection (Opponent's Piece)

- **Description**: Player clicks on opponent's piece
- **Priority**: P1 (High)
- **Steps**:
  1. Game started, RED's turn
  2. RED player clicks on a black piece
- **Expected**: Nothing happens, piece not selected
- **Playwright Implementation**:
  ```javascript
  test('clicking opponent piece does nothing', async ({ browser }) => {
    const { page1, page2 } = await setupGame(browser);

    // RED's turn - try to click on black piece (row 0, col 0)
    await clickBoardSquare(page1, 0, 0);

    // No piece should be selected
    // Can verify by checking game state or visual indicators
  });
  ```

---

## 3.3 Move - Invalid Piece Selection (Wrong Turn)

- **Description**: Player clicks on their piece when it's not their turn
- **Priority**: P1 (High)
- **Steps**:
  1. Game started, RED's turn
  2. BLACK player clicks on a black piece
- **Expected**: Nothing happens, piece not selected
- **Playwright Implementation**:
  ```javascript
  test('clicking piece on wrong turn does nothing', async ({ browser }) => {
    const { page1, page2 } = await setupGame(browser);

    // RED's turn - BLACK tries to click on their piece
    await clickBoardSquare(page2, 0, 0);

    // No piece should be selected for BLACK
  });
  ```

---

## 3.4 Move - Valid Move Execution

- **Description**: Player makes a valid move
- **Priority**: P0 (Critical)
- **Steps**:
  1. Game started, RED's turn
  2. RED player selects a piece
  3. Clicks on valid destination
- **Expected**:
  - Piece moves to new position
  - Turn switches to BLACK
  - Both players see updated board
- **Playwright Implementation**:
  ```javascript
  test('valid move executes and syncs', async ({ browser }) => {
    const { page1, page2 } = await setupGame(browser);

    // RED moves chariot from 9,1 to 7,1
    await clickBoardSquare(page1, 9, 1);
    await clickBoardSquare(page1, 7, 1);

    // Wait for sync
    await page2.waitForTimeout(500);

    // Verify turn switched
    await expect(page1.locator('#turn-indicator')).toContainText('黑方');
    await expect(page2.locator('#turn-indicator')).toContainText('黑方');

    // Verify move in history
    await expect(page1.locator('#move-history')).toContainText('车');
  });
  ```

---

## 3.5 Move - Invalid Move (Rule Violation)

- **Description**: Player attempts an invalid move
- **Priority**: P1 (High)
- **Steps**:
  1. Player selects piece
  2. Clicks on invalid destination
- **Expected**: Alert "无效走法!"
- **Playwright Implementation**:
  ```javascript
  test('invalid move shows error', async ({ browser }) => {
    const { page1, page2 } = await setupGame(browser);

    // Select chariot and try invalid diagonal move
    await clickBoardSquare(page1, 9, 0);
    await clickBoardSquare(page1, 8, 1); // Diagonal - invalid for chariot

    page1.on('dialog', async dialog => {
      expect(dialog.message()).toContain('无效');
      await dialog.dismiss();
    });
  });
  ```

---

## 3.6 Move - Capture Enemy Piece

- **Description**: Player captures an enemy piece
- **Priority**: P1 (High)
- **Steps**:
  1. Set up position where capture is possible
  2. Player moves to capture
- **Expected**:
  - Enemy piece is removed
  - Moving piece takes its place
- **Playwright Implementation**:
  ```javascript
  test('capture removes enemy piece', async ({ browser }) => {
    const { page1, page2 } = await setupGame(browser);

    // Setup: move pieces to create capture opportunity
    // RED chariot moves forward
    await clickBoardSquare(page1, 9, 1);
    await clickBoardSquare(page1, 7, 1);
    await page2.waitForTimeout(500);

    // BLACK moves soldier forward
    await clickBoardSquare(page2, 3, 1);
    await clickBoardSquare(page2, 4, 1);
    await page1.waitForTimeout(500);

    // RED chariot captures soldier
    await clickBoardSquare(page1, 7, 1);
    await clickBoardSquare(page1, 4, 1);

    // Verify capture recorded
    await expect(page1.locator('#captured-pieces')).toBeVisible();
  });
  ```

---

## Piece Movement Rules Tests

### 3.7 General (将/帅)

- **Description**: Verify General movement rules
- **Priority**: P1 (High)
- **Tests**:
  - Can move one step horizontally or vertically within palace
  - Cannot move outside palace (rows 7-9 for RED, 0-2 for BLACK, cols 3-5)
  - Cannot move diagonally
- **Playwright Implementation**:
  ```javascript
  test('General movement rules', async ({ browser }) => {
    const { page1, page2 } = await setupGame(browser);

    // Setup position for general movement test
    // Clear blocking pieces first
    // ...

    // Test valid horizontal move within palace
    await clickBoardSquare(page1, 9, 4);
    await clickBoardSquare(page1, 9, 3); // Should work

    // Test invalid move outside palace
    // Reset and try invalid move
  });
  ```

### 3.8 Advisor (士)

- **Description**: Verify Advisor movement rules
- **Priority**: P1 (High)
- **Tests**:
  - Can move one step diagonally within palace
  - Cannot move outside palace
  - Cannot move horizontally or vertically

### 3.9 Elephant (象)

- **Description**: Verify Elephant movement rules
- **Priority**: P1 (High)
- **Tests**:
  - Moves exactly 2 steps diagonally
  - Cannot cross river (row 5 boundary)
  - Blocked if "elephant eye" position has a piece

### 3.10 Horse (马)

- **Description**: Verify Horse movement rules
- **Priority**: P1 (High)
- **Tests**:
  - Moves in "L" shape (2+1 or 1+2)
  - Blocked if "horse leg" position has a piece
- **Playwright Implementation**:
  ```javascript
  test('Horse blocked by leg', async ({ browser }) => {
    const { page1, page2 } = await setupGame(browser);

    // Horse at row 9, col 1 - blocked by soldier at row 7, col 2
    // Try to move horse - should be blocked
    await clickBoardSquare(page1, 9, 1);
    await clickBoardSquare(page1, 7, 0); // Invalid - leg blocked

    page1.on('dialog', async dialog => {
      expect(dialog.message()).toContain('无效');
      await dialog.dismiss();
    });
  });
  ```

### 3.11 Chariot (车)

- **Description**: Verify Chariot movement rules
- **Priority**: P1 (High)
- **Tests**:
  - Moves any number of squares horizontally or vertically
  - Cannot jump over pieces

### 3.12 Cannon (炮)

- **Description**: Verify Cannon movement rules
- **Priority**: P1 (High)
- **Tests**:
  - Moves like chariot when not capturing
  - Must jump over exactly one piece to capture
- **Playwright Implementation**:
  ```javascript
  test('Cannon capture requires screen', async ({ browser }) => {
    const { page1, page2 } = await setupGame(browser);

    // Cannon at row 7, col 1
    // Move to capture position using screen piece
    // ...
  });
  ```

### 3.13 Soldier (兵/卒)

- **Description**: Verify Soldier movement rules
- **Priority**: P1 (High)
- **Tests**:
  - Before crossing river: can only move forward one step
  - After crossing river: can move forward or sideways one step

---

## 3.14 Check Detection

- **Description**: Verify check is detected and displayed
- **Priority**: P0 (Critical)
- **Steps**:
  1. Make a move that puts opponent's general in check
- **Expected**:
  - "将军!" displayed in status area
  - Check sound plays
- **Playwright Implementation**:
  ```javascript
  test('check is detected and displayed', async ({ browser }) => {
    const { page1, page2 } = await setupGame(browser);

    // Setup position for check
    // Move piece to create check situation

    // Verify check indicator appears
    await expect(page1.locator('#game-status')).toContainText('将军');
  });
  ```

---

## 3.15 Checkmate Detection

- **Description**: Verify checkmate ends the game
- **Priority**: P0 (Critical)
- **Steps**:
  1. Set up checkmate position
  2. Complete the checkmate move
- **Expected**:
  - GAME_OVER message with winner and reason "CHECKMATE"
  - Alert shows "游戏结束! 你赢了!" or "你输了!"
- **Playwright Implementation**:
  ```javascript
  test('checkmate ends game', async ({ browser }) => {
    const { page1, page2 } = await setupGame(browser);

    // Setup checkmate position (e.g., double chariot checkmate)
    // Execute final checkmate move

    // Verify game over
    await expect(page1.locator('#game-status')).toContainText('游戏结束');
    await expect(page1.locator('#game-result')).toContainText('CHECKMATE');
  });
  ```

---

## 3.16 Stalemate Detection

- **Description**: Verify stalemate ends game as draw
- **Priority**: P2 (Medium)
- **Steps**:
  1. Set up stalemate position (no legal moves but not in check)
- **Expected**:
  - GAME_OVER with winner "DRAW" and reason "STALEMATE"

---

## 3.17 Flying General Rule

- **Description**: Two generals cannot face each other with no pieces between
- **Priority**: P1 (High)
- **Tests**:
  - Verify this rule is enforced in move validation
- **Playwright Implementation**:
  ```javascript
  test('Flying general rule enforced', async ({ browser }) => {
    const { page1, page2 } = await setupGame(browser);

    // Setup position where generals would face each other
    // Try move that violates flying general rule

    page1.on('dialog', async dialog => {
      expect(dialog.message()).toContain('无效');
      await dialog.dismiss();
    });
  });
  ```

---

## Helper Functions

```javascript
// Setup game helper
async function setupGame(browser) {
  const context1 = await browser.newContext();
  const context2 = await browser.newContext();
  const page1 = await context1.newPage();
  const page2 = await context2.newPage();

  const roomName = 'GameTest_' + Date.now();

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

// Board click helper
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