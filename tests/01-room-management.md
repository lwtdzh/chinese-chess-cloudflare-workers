# 1. Room Management Tests

## Overview

Tests for room creation, joining, and validation logic.

---

## 1.1 Create Room - Basic

- **Description**: Player creates a new room with a valid name
- **Priority**: P0 (Critical)
- **Steps**:
  1. Navigate to homepage
  2. Enter a unique room name
  3. Click "创建房间" button
- **Expected**:
  - Lobby hides, game view shows
  - Room info displays "房间: {roomName} (等待对手加入)"
  - Player is assigned RED color
  - Board is displayed with pieces in initial positions
- **Playwright Implementation**:
  ```javascript
  test('create room with valid name', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForFunction(() => window.isWebSocketConnected());

    const roomName = 'TestRoom_' + Date.now();
    await page.fill('#room-name-input', roomName);
    await page.click('#create-room-btn');

    await page.waitForSelector('#game-container');
    await expect(page.locator('#room-info')).toContainText(roomName);
    await expect(page.locator('#player-color')).toContainText('红方');
  });
  ```

---

## 1.2 Create Room - Empty Name

- **Description**: Player attempts to create room without entering a name
- **Priority**: P0 (Critical)
- **Steps**:
  1. Navigate to homepage
  2. Leave room name empty
  3. Click "创建房间" button
- **Expected**: Alert shows "请输入房间名"
- **Playwright Implementation**:
  ```javascript
  test('create room with empty name shows error', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForFunction(() => window.isWebSocketConnected());

    await page.fill('#room-name-input', '');
    await page.click('#create-room-btn');

    // Listen for alert dialog
    page.on('dialog', async dialog => {
      expect(dialog.message()).toBe('请输入房间名');
      await dialog.dismiss();
    });
  });
  ```

---

## 1.3 Create Room - Duplicate Name

- **Description**: Player attempts to create a room with a name that already exists
- **Priority**: P1 (High)
- **Steps**:
  1. Player 1 creates room "TestRoom"
  2. Player 2 (different browser context) attempts to create room "TestRoom"
- **Expected**: Player 2 receives error "房间名已存在，请使用其他名称"
- **Playwright Implementation**:
  ```javascript
  test('create room with duplicate name shows error', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    const roomName = 'DuplicateTest_' + Date.now();

    // Player 1 creates room
    await page1.goto(BASE_URL);
    await page1.waitForFunction(() => window.isWebSocketConnected());
    await page1.fill('#room-name-input', roomName);
    await page1.click('#create-room-btn');
    await page1.waitForSelector('#game-container');

    // Player 2 tries to create same room
    await page2.goto(BASE_URL);
    await page2.waitForFunction(() => window.isWebSocketConnected());
    await page2.fill('#room-name-input', roomName);
    await page2.click('#create-room-btn');

    page2.on('dialog', async dialog => {
      expect(dialog.message()).toContain('已存在');
      await dialog.dismiss();
    });
  });
  ```

---

## 1.4 Join Room - Basic

- **Description**: Player joins an existing room
- **Priority**: P0 (Critical)
- **Steps**:
  1. Player 1 creates room "TestRoom"
  2. Player 2 enters "TestRoom" and clicks "加入房间"
- **Expected**:
  - Player 2 is assigned BLACK color
  - Both players see GAME_START
  - Board is synchronized on both sides
- **Playwright Implementation**:
  ```javascript
  test('join existing room', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    const roomName = 'JoinTest_' + Date.now();

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
    await expect(page2.locator('#player-color')).toContainText('黑方');

    // Verify both players see game started
    await expect(page1.locator('#game-status')).toContainText('游戏开始');
    await expect(page2.locator('#game-status')).toContainText('游戏开始');
  });
  ```

---

## 1.5 Join Room - Non-existent

- **Description**: Player attempts to join a room that doesn't exist
- **Priority**: P1 (High)
- **Steps**:
  1. Enter a non-existent room name
  2. Click "加入房间"
- **Expected**: Error message "房间不存在"
- **Playwright Implementation**:
  ```javascript
  test('join non-existent room shows error', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForFunction(() => window.isWebSocketConnected());

    await page.fill('#room-name-input', 'NonExistentRoom_' + Date.now());
    await page.click('#join-room-btn');

    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('不存在');
      await dialog.dismiss();
    });
  });
  ```

---

## 1.6 Join Room - Full Room

- **Description**: Third player attempts to join a full room
- **Priority**: P1 (High)
- **Steps**:
  1. Player 1 creates room
  2. Player 2 joins room
  3. Player 3 attempts to join same room
- **Expected**: Player 3 receives error "房间已满"
- **Playwright Implementation**:
  ```javascript
  test('join full room shows error', async ({ browser }) => {
    const contexts = await Promise.all([
      browser.newContext(),
      browser.newContext(),
      browser.newContext()
    ]);
    const pages = await Promise.all(contexts.map(c => c.newPage()));

    const roomName = 'FullRoomTest_' + Date.now();

    // Player 1 creates room
    await pages[0].goto(BASE_URL);
    await pages[0].waitForFunction(() => window.isWebSocketConnected());
    await pages[0].fill('#room-name-input', roomName);
    await pages[0].click('#create-room-btn');
    await pages[0].waitForSelector('#game-container');

    // Player 2 joins room
    await pages[1].goto(BASE_URL);
    await pages[1].waitForFunction(() => window.isWebSocketConnected());
    await pages[1].fill('#room-name-input', roomName);
    await pages[1].click('#join-room-btn');
    await pages[1].waitForSelector('#game-container');

    // Player 3 tries to join full room
    await pages[2].goto(BASE_URL);
    await pages[2].waitForFunction(() => window.isWebSocketConnected());
    await pages[2].fill('#room-name-input', roomName);
    await pages[2].click('#join-room-btn');

    pages[2].on('dialog', async dialog => {
      expect(dialog.message()).toContain('已满');
      await dialog.dismiss();
    });
  });
  ```

---

## 1.7 Join Room - Empty Name

- **Description**: Player attempts to join without entering a room name
- **Priority**: P0 (Critical)
- **Steps**:
  1. Leave room name empty
  2. Click "加入房间"
- **Expected**: Alert shows "请输入房间名"
- **Playwright Implementation**:
  ```javascript
  test('join room with empty name shows error', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForFunction(() => window.isWebSocketConnected());

    await page.fill('#room-name-input', '');
    await page.click('#join-room-btn');

    page.on('dialog', async dialog => {
      expect(dialog.message()).toBe('请输入房间名');
      await dialog.dismiss();
    });
  });
  ```