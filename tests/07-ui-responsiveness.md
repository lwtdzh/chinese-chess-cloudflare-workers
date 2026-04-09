# 7. UI & Responsiveness Tests

## Overview

Tests for UI layout, responsiveness across different screen sizes, and canvas scaling.

---

## 7.1 Mobile Layout - Small Screen

- **Description**: Verify layout on mobile screens
- **Priority**: P2 (Medium)
- **Steps**:
  1. Set viewport to 375x667 (iPhone SE)
  2. Navigate to game
- **Expected**:
  - Board scales to fit screen
  - Controls are accessible
  - Chat panel below board (not beside)
  - No horizontal scroll
- **Playwright Implementation**:
  ```javascript
  test('mobile layout - small screen', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 375, height: 667 } // iPhone SE
    });
    const page = await context.newPage();

    await page.goto(BASE_URL);
    await page.waitForFunction(() => window.isWebSocketConnected());

    // Create room to see full game UI
    await page.fill('#room-name-input', 'MobileTest');
    await page.click('#create-room-btn');
    await page.waitForSelector('#game-container');

    // Verify board fits viewport
    const canvas = await page.$('#board');
    const box = await canvas.boundingBox();
    expect(box.width).toBeLessThanOrEqual(375);
    expect(box.height).toBeLessThanOrEqual(667);

    // Verify no horizontal scroll
    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    const clientWidth = await page.evaluate(() => document.body.clientWidth);
    expect(scrollWidth).toBe(clientWidth);

    // Chat panel should be below board (check layout)
    const chatBox = await page.$('#chat-panel').boundingBox();
    expect(chatBox.y).toBeGreaterThan(box.y + box.height);
  });
  ```

---

## 7.2 Mobile Layout - Medium Screen

- **Description**: Verify layout on tablet-sized screens
- **Priority**: P2 (Medium)
- **Steps**:
  1. Set viewport to 768x1024 (iPad)
- **Expected**: Layout adapts appropriately
- **Playwright Implementation**:
  ```javascript
  test('mobile layout - tablet screen', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 768, height: 1024 } // iPad
    });
    const page = await context.newPage();

    await page.goto(BASE_URL);
    await page.waitForFunction(() => window.isWebSocketConnected());

    await page.fill('#room-name-input', 'TabletTest');
    await page.click('#create-room-btn');
    await page.waitForSelector('#game-container');

    // Board should scale appropriately
    const canvas = await page.$('#board');
    const box = await canvas.boundingBox();
    expect(box.width).toBeLessThanOrEqual(768);

    // Controls should be accessible
    const controlsVisible = await page.$('#controls-panel').isVisible();
    expect(controlsVisible).toBeTruthy();
  });
  ```

---

## 7.3 Desktop Layout

- **Description**: Verify layout on desktop
- **Priority**: P2 (Medium)
- **Steps**:
  1. Set viewport to 1920x1080
- **Expected**:
  - Chat panel beside board
  - Full-size board displayed
- **Playwright Implementation**:
  ```javascript
  test('desktop layout - full screen', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 }
    });
    const page = await context.newPage();

    await page.goto(BASE_URL);
    await page.waitForFunction(() => window.isWebSocketConnected());

    await page.fill('#room-name-input', 'DesktopTest');
    await page.click('#create-room-btn');
    await page.waitForSelector('#game-container');

    // Chat panel should be beside board
    const boardBox = await page.$('#board').boundingBox();
    const chatBox = await page.$('#chat-panel').boundingBox();

    // Chat should be to the right of board (not below)
    expect(chatBox.x).toBeGreaterThan(boardBox.x + boardBox.width);

    // Board should be at full or near-full size
    expect(boardBox.width).toBeGreaterThan(400);
  });
  ```

---

## 7.4 Canvas Scaling

- **Description**: Verify board canvas scales correctly
- **Priority**: P1 (High)
- **Steps**:
  1. Test on various viewport widths
- **Expected**:
  - Board maintains aspect ratio
  - All squares are clickable at correct positions
- **Playwright Implementation**:
  ```javascript
  test('canvas scaling maintains aspect ratio', async ({ browser }) => {
    const viewports = [
      { width: 320, height: 480 },
      { width: 768, height: 1024 },
      { width: 1280, height: 720 },
      { width: 1920, height: 1080 }
    ];

    for (const viewport of viewports) {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();

      await page.goto(BASE_URL);
      await page.waitForFunction(() => window.isWebSocketConnected());

      await page.fill('#room-name-input', 'ScaleTest_' + viewport.width);
      await page.click('#create-room-btn');
      await page.waitForSelector('#game-container');

      const canvas = await page.$('#board');
      const box = await canvas.boundingBox();

      // Board should maintain aspect ratio (approximately 9:10 for Chinese chess)
      const ratio = box.width / box.height;
      expect(ratio).toBeCloseTo(0.9, 0.1);

      await context.close();
    }
  });

  test('clickable positions scale correctly', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 500, height: 600 }
    });
    const page = await context.newPage();

    await page.goto(BASE_URL);
    await page.waitForFunction(() => window.isWebSocketConnected());

    await page.fill('#room-name-input', 'ClickTest');
    await page.click('#create-room-btn');
    await page.waitForSelector('#game-container');

    // Join with second player
    const context2 = await browser.newContext({ viewport: { width: 500, height: 600 } });
    const page2 = await context2.newPage();
    await page2.goto(BASE_URL);
    await page2.waitForFunction(() => window.isWebSocketConnected());
    await page2.fill('#room-name-input', 'ClickTest');
    await page2.click('#join-room-btn');
    await page2.waitForSelector('#game-container');

    // Click on piece and make move - should work at scaled size
    await clickBoardSquare(page, 9, 1);
    await clickBoardSquare(page, 7, 1);

    await page2.waitForTimeout(500);

    // Verify move executed
    await expect(page.locator('#move-history')).toContainText('车');
  });
  ```

---

## Helper Functions

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