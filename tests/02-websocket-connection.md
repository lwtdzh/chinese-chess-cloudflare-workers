# 2. WebSocket Connection Tests

## Overview

Tests for WebSocket connection establishment, reconnection scenarios, and session handling.

---

## 2.1 Initial Connection

- **Description**: Verify WebSocket connects on page load
- **Priority**: P0 (Critical)
- **Steps**:
  1. Navigate to homepage
  2. Check browser console for "WebSocket Connected"
- **Expected**: WebSocket connection established successfully
- **Playwright Implementation**:
  ```javascript
  test('WebSocket connects on page load', async ({ page }) => {
    await page.goto(BASE_URL);

    // Wait for WebSocket connection
    await page.waitForFunction(() => window.isWebSocketConnected && window.isWebSocketConnected());

    // Check console for connection message
    const messages = [];
    page.on('console', msg => messages.push(msg.text()));
    expect(messages.some(m => m.includes('WebSocket Connected'))).toBeTruthy();
  });
  ```

---

## 2.2 Reconnection - Page Refresh (In Lobby)

- **Description**: User refreshes page while in lobby (no active game)
- **Priority**: P1 (High)
- **Steps**:
  1. Navigate to homepage
  2. Refresh the page
- **Expected**:
  - New player ID is generated
  - User remains in lobby
- **Playwright Implementation**:
  ```javascript
  test('page refresh in lobby stays in lobby', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForFunction(() => window.isWebSocketConnected());

    // Get initial player ID from console
    const initialMessages = [];
    page.on('console', msg => initialMessages.push(msg.text()));

    // Refresh page
    await page.reload();
    await page.waitForFunction(() => window.isWebSocketConnected());

    // Verify still in lobby (lobby visible)
    await expect(page.locator('#lobby-container')).toBeVisible();

    // New player ID should be generated (different from initial)
    const newMessages = [];
    page.on('console', msg => newMessages.push(msg.text()));
    expect(newMessages.some(m => m.includes('New session'))).toBeTruthy();
  });
  ```

---

## 2.3 Reconnection - Page Refresh (In Game)

- **Description**: Player refreshes page during active game
- **Priority**: P0 (Critical)
- **Steps**:
  1. Two players start a game
  2. Player 1 refreshes the page
- **Expected**:
  - Player 1's session cookies restore player ID
  - REJOINED message received
  - Board state restored to current position
  - Chat history restored
  - Player can continue playing
- **Playwright Implementation**:
  ```javascript
  test('page refresh during game reconnects properly', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    const roomName = 'ReconnectTest_' + Date.now();

    // Setup game
    await setupTwoPlayerGame(page1, page2, roomName);

    // Make a move first
    await clickBoardSquare(page1, 9, 1); // Select red chariot
    await clickBoardSquare(page1, 7, 1); // Move forward
    await page2.waitForTimeout(500); // Wait for sync

    // Player 1 refreshes
    await page1.reload();
    await page1.waitForFunction(() => window.isWebSocketConnected());

    // Verify reconnection
    await page1.waitForSelector('#game-container');
    await expect(page1.locator('#room-info')).toContainText(roomName);

    // Verify board state is restored (chariot at row 7, col 1)
    // Can verify by checking if move history shows last move
    await expect(page1.locator('#move-history')).toContainText('车');
  });
  ```

---

## 2.4 Reconnection - Network Disconnect

- **Description**: Player loses network connection temporarily
- **Priority**: P1 (High)
- **Steps**:
  1. Two players start a game
  2. Simulate network disconnect for Player 1 (close network)
  3. Wait 5 seconds
  4. Restore network
- **Expected**:
  - WebSocket automatically reconnects (up to 10 attempts)
  - Game state restored after reconnection
- **Playwright Implementation**:
  ```javascript
  test('network disconnect reconnects automatically', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    const roomName = 'NetworkTest_' + Date.now();
    await setupTwoPlayerGame(page1, page2, roomName);

    // Simulate network disconnect using CDP
    const cdp = await page1.context().newCDPSession(page1);
    await cdp.send('Network.disable');

    // Wait for disconnect to be detected
    await page1.waitForTimeout(3000);

    // Restore network
    await cdp.send('Network.enable');

    // Wait for reconnection
    await page1.waitForFunction(() => window.isWebSocketConnected && window.isWebSocketConnected(), { timeout: 15000 });

    // Verify game state restored
    await expect(page1.locator('#game-container')).toBeVisible();
  });
  ```

---

## 2.5 Reconnection - Cookies Expired

- **Description**: Player's session cookies have expired (15 minutes)
- **Priority**: P2 (Medium)
- **Steps**:
  1. Start a game
  2. Clear browser cookies
  3. Refresh page
- **Expected**:
  - New player ID generated
  - Player sees lobby (cannot rejoin old game)
  - Old game continues for opponent (timeout eventually)
- **Playwright Implementation**:
  ```javascript
  test('cookies cleared prevents reconnection', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    const roomName = 'CookieTest_' + Date.now();
    await setupTwoPlayerGame(page1, page2, roomName);

    // Clear cookies for player 1
    await context1.clearCookies();

    // Refresh page
    await page1.reload();
    await page1.waitForFunction(() => window.isWebSocketConnected());

    // Should be in lobby, not game
    await expect(page1.locator('#lobby-container')).toBeVisible();
    await expect(page1.locator('#game-container')).not.toBeVisible();
  });
  ```

---

## 2.6 Multiple Tab/Window

- **Description**: Player opens same game in multiple tabs
- **Priority**: P2 (Medium)
- **Steps**:
  1. Player 1 creates room in Tab 1
  2. Player 1 opens same URL in Tab 2
- **Expected**:
  - Each tab has separate WebSocket connection
  - Behavior depends on whether same cookies are used
- **Playwright Implementation**:
  ```javascript
  test('multiple tabs have separate connections', async ({ browser }) => {
    const context = await browser.newContext();
    const page1 = await context.newPage();
    const page2 = await context.newPage(); // Same context = same cookies

    const roomName = 'MultiTabTest_' + Date.now();

    // Create room in tab 1
    await page1.goto(BASE_URL);
    await page1.waitForFunction(() => window.isWebSocketConnected());
    await page1.fill('#room-name-input', roomName);
    await page1.click('#create-room-btn');
    await page1.waitForSelector('#game-container');

    // Open same page in tab 2
    await page2.goto(BASE_URL);
    await page2.waitForFunction(() => window.isWebSocketConnected());

    // Both should show game (same cookies)
    await expect(page1.locator('#game-container')).toBeVisible();
    await expect(page2.locator('#game-container')).toBeVisible();
  });
  ```

---

## Helper Functions

```javascript
// Setup two player game helper
async function setupTwoPlayerGame(page1, page2, roomName) {
  // Player 1 creates room
  await page1.goto(BASE_URL);
  await page1.waitForFunction(() => window.isWebSocketConnected());
  await page1.fill('#room-name-input', roomName);
  await page1.click('#create-room-btn');
  await page1.waitForSelector('#game-container');

  // Player 2 joins room
  await page2.goto(BASE_URL);
  await page2.waitForFunction(() => window.isWebSocketConnected());
  await page2.fill('#room-name-input', roomName);
  await page2.click('#join-room-btn');
  await page2.waitForSelector('#game-container');

  // Wait for game to start
  await page1.waitForTimeout(500);
}
```