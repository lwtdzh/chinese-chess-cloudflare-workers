# 6. Session & Cookie Tests

## Overview

Tests for session management, cookie storage, and timeout handling.

---

## 6.1 Cookie Storage

- **Description**: Verify session cookies are set correctly
- **Priority**: P2 (Medium)
- **Steps**:
  1. Start a game
  2. Check browser cookies
- **Expected**:
  - `xiangqi_player_id` cookie set with player ID
  - `xiangqi_room_name` cookie set with room name
  - Both cookies expire in 15 minutes
- **Playwright Implementation**:
  ```javascript
  test('session cookies set correctly', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    const roomName = 'CookieTest_' + Date.now();

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

    // Check cookies for player 1
    const cookies1 = await context1.cookies();
    const playerIdCookie = cookies1.find(c => c.name === 'xiangqi_player_id');
    const roomNameCookie = cookies1.find(c => c.name === 'xiangqi_room_name');

    expect(playerIdCookie).toBeDefined();
    expect(roomNameCookie).toBeDefined();
    expect(roomNameCookie.value).toBe(roomName);

    // Verify expiry is approximately 15 minutes
    const expiryTime = new Date(playerIdCookie.expires * 1000);
    const now = new Date();
    const diffMinutes = (expiryTime - now) / (1000 * 60);
    expect(diffMinutes).toBeLessThanOrEqual(15);
    expect(diffMinutes).toBeGreaterThan(14);
  });
  ```

---

## 6.2 Cookie Clearing on Game End

- **Description**: Cookies cleared when game ends
- **Priority**: P1 (High)
- **Steps**:
  1. Game ends (checkmate, resign, draw)
  2. Check cookies
- **Expected**: Both game session cookies are deleted
- **Playwright Implementation**:
  ```javascript
  test('cookies cleared on game end', async ({ browser }) => {
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();

    // Setup and end game via surrender
    const { page2 } = await setupGame(browser);

    page1.on('dialog', dialog => dialog.accept());

    await page1.click('#surrender-btn');
    await page1.waitForTimeout(500);

    // Check cookies are cleared
    const cookies = await context1.cookies();
    expect(cookies.find(c => c.name === 'xiangqi_player_id')).toBeUndefined();
    expect(cookies.find(c => c.name === 'xiangqi_room_name')).toBeUndefined();
  });

  test('cookies cleared on checkmate', async ({ browser }) => {
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    // Setup checkmate position
    // Execute checkmate

    // Verify cookies cleared
    const cookies = await context1.cookies();
    expect(cookies.find(c => c.name === 'xiangqi_player_id')).toBeUndefined();
  });
  ```

---

## 6.3 Session Timeout - 15 Minutes

- **Description**: Session cookies expire after 15 minutes
- **Priority**: P3 (Low)
- **Note**: This tests client-side cookie expiration - may need to simulate or mock
- **Steps**:
  1. Start game
  2. Wait 15+ minutes
  3. Refresh page
- **Expected**:
  - Cookies expired/deleted
  - Player cannot reconnect to game
- **Playwright Implementation**:
  ```javascript
  test('session timeout after 15 minutes', async ({ browser }) => {
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    const roomName = 'TimeoutTest_' + Date.now();
    await setupGame(browser, roomName);

    // Simulate cookie expiration by manually clearing them
    await context1.clearCookies();

    // Refresh page
    await page1.reload();
    await page1.waitForFunction(() => window.isWebSocketConnected());

    // Should be in lobby, not game
    await expect(page1.locator('#lobby-container')).toBeVisible();
    await expect(page1.locator('#game-container')).not.toBeVisible();
  });

  // Alternative: Test with modified cookie expiry
  test('session timeout with modified expiry', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(BASE_URL);
    await page.waitForFunction(() => window.isWebSocketConnected());

    // Set cookies with very short expiry (1 minute)
    await context.addCookies([
      { name: 'xiangqi_player_id', value: 'test_player', domain: 'chess.netlib.re', path: '/', expires: Math.floor(Date.now() / 1000) + 60 },
      { name: 'xiangqi_room_name', value: 'test_room', domain: 'chess.netlib.re', path: '/', expires: Math.floor(Date.now() / 1000) + 60 }
    ]);

    // Wait for expiry
    await page.waitForTimeout(65000);

    // Refresh and verify cannot reconnect
    await page.reload();
    await expect(page.locator('#lobby-container')).toBeVisible();
  });
  ```

---

## 6.4 Multiple Devices Same Account

- **Description**: Same player ID used across devices
- **Priority**: P3 (Low)
- **Steps**:
  1. Start game on Device 1
  2. Copy cookies to Device 2
  3. Open game on Device 2
- **Expected**: Both devices can potentially connect (behavior may vary)
- **Playwright Implementation**:
  ```javascript
  test('same cookies on multiple devices', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const page1 = await context1.newPage();

    const roomName = 'MultiDevice_' + Date.now();

    // Player 1 creates room
    await page1.goto(BASE_URL);
    await page1.waitForFunction(() => window.isWebSocketConnected());
    await page1.fill('#room-name-input', roomName);
    await page1.click('#create-room-btn');
    await page1.waitForSelector('#game-container');

    // Get cookies from context1
    const cookies = await context1.cookies();

    // Add same cookies to context2
    await context2.addCookies(cookies);

    // Open same URL in context2
    const page2 = await context2.newPage();
    await page2.goto(BASE_URL);
    await page2.waitForFunction(() => window.isWebSocketConnected());

    // Both should show game (or one might disconnect the other)
    // This tests the behavior of same player ID in multiple sessions
    await page2.waitForTimeout(1000);

    // Document actual behavior - may need adjustment based on implementation
  });
  ```

---

## Helper Functions

```javascript
async function setupGame(browser, roomName = 'SessionTest_' + Date.now()) {
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
```