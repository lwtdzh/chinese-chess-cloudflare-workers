# 9. Audio Tests

## Overview

Tests for sound effects and background music functionality. Most audio tests are difficult to automate programmatically and may require visual verification or manual testing.

---

## 9.1 Move Sound

- **Description**: Sound plays on piece move
- **Priority**: P3 (Low)
- **Note**: Hard to test programmatically, may skip or verify visually
- **Manual Test Steps**:
  1. Start game
  2. Make a move
  3. Verify move sound plays
- **Playwright Alternative**:
  ```javascript
  test('move sound triggered', async ({ browser }) => {
    const { page1, page2 } = await setupGame(browser);

    // Check if audio API is available
    const audioContextAvailable = await page1.evaluate(() => {
      return typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined';
    });
    expect(audioContextAvailable).toBeTruthy();

    // Make a move and check audio element state
    await clickBoardSquare(page1, 9, 1);
    await clickBoardSquare(page1, 7, 1);

    // Check if audio was triggered (look for audio element play state)
    // This is a visual/manual verification point
  });
  ```

---

## 9.2 Check Sound

- **Description**: Sound plays on check
- **Priority**: P3 (Low)
- **Manual Test Steps**:
  1. Setup position for check
  2. Execute check move
  3. Verify check sound plays (distinct from regular move sound)
- **Note**: Cannot easily verify programmatically

---

## 9.3 Game Over Sound

- **Description**: Sound plays when game ends
- **Priority**: P3 (Low)
- **Manual Test Steps**:
  1. End game via checkmate, surrender, or draw
  2. Verify game over sound plays
- **Playwright Alternative**:
  ```javascript
  test('game over sound triggered', async ({ browser }) => {
    const { page1, page2 } = await setupGame(browser);

    page1.on('dialog', dialog => dialog.accept());

    await page1.click('#surrender-btn');
    await page1.waitForTimeout(500);

    // Check if game-over audio element exists and was played
    const audioPlayed = await page1.evaluate(() => {
      const audio = document.querySelector('#game-over-audio');
      if (audio) {
        // Check if audio was attempted to play
        return audio.currentTime > 0 || audio.paused === false;
      }
      return false;
    });

    // This test may need adjustment based on actual implementation
    // Consider as visual verification point
  });
  ```

---

## 9.4 Background Music Toggle

- **Description**: Toggle background music on/off
- **Priority**: P3 (Low)
- **Steps**:
  1. Click music button
  2. Click again
- **Expected**: Button shows active/inactive state
- **Playwright Implementation**:
  ```javascript
  test('background music toggle', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForFunction(() => window.isWebSocketConnected());

    // Find music toggle button
    const musicBtn = await page.$('#music-toggle-btn');

    // Check initial state
    const initialState = await musicBtn.getAttribute('class');

    // Click to toggle
    await musicBtn.click();
    await page.waitForTimeout(300);

    // Verify state changed
    const toggledState = await musicBtn.getAttribute('class');
    expect(toggledState).not.toBe(initialState);

    // Click again to restore
    await musicBtn.click();
    await page.waitForTimeout(300);

    const restoredState = await musicBtn.getAttribute('class');
    expect(restoredState).toBe(initialState);
  });
  ```

---

## 9.5 Sound Effects Toggle

- **Description**: Toggle sound effects on/off
- **Priority**: P3 (Low)
- **Steps**:
  1. Click SFX button
  2. Make a move
- **Expected**: No sound when disabled
- **Playwright Implementation**:
  ```javascript
  test('sound effects toggle', async ({ browser }) => {
    const { page1, page2 } = await setupGame(browser);

    // Toggle SFX off
    await page1.click('#sfx-toggle-btn');
    await page1.waitForTimeout(300);

    // Verify SFX disabled state
    const sfxDisabled = await page1.evaluate(() => {
      const btn = document.querySelector('#sfx-toggle-btn');
      return btn.classList.contains('disabled');
    });
    expect(sfxDisabled).toBeTruthy();

    // Make move - verify no audio played
    await clickBoardSquare(page1, 9, 1);
    await clickBoardSquare(page1, 7, 1);

    // Check audio didn't play (hard to verify programmatically)
    // Consider as manual verification point
  });
  ```

---

## Notes on Audio Testing

Audio testing in automated browser tests is challenging because:

1. **No audio output in CI environments** - Most CI runners don't have audio capabilities
2. **Browser security restrictions** - Audio requires user interaction before playing
3. **No programmatic audio verification** - Can't easily "hear" what the browser plays

**Recommended approach**:
- Test UI state changes (button toggles, audio element states)
- Use manual testing for actual audio verification
- Consider visual indicators that show audio is playing (e.g., icon changes)

---

## Helper Functions

```javascript
async function setupGame(browser) {
  const context1 = await browser.newContext();
  const context2 = await browser.newContext();
  const page1 = await context1.newPage();
  const page2 = await context2.newPage();

  const roomName = 'AudioTest_' + Date.now();

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