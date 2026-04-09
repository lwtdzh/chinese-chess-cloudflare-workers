# 5. Chat Tests

## Overview

Tests for in-game chat functionality including custom messages, quick chat, and chat history.

---

## 5.1 Send Custom Message

- **Description**: Player sends a custom chat message
- **Priority**: P1 (High)
- **Steps**:
  1. Game in progress
  2. Type message in chat input
  3. Click "发送" or press Enter
- **Expected**:
  - Message appears in chat panel
  - Opponent receives message
  - Input field cleared
- **Playwright Implementation**:
  ```javascript
  test('send custom chat message', async ({ browser }) => {
    const { page1, page2 } = await setupGame(browser);

    const message = 'Hello from RED player!';

    // Player 1 sends message
    await page1.fill('#chat-input', message);
    await page1.click('#send-chat-btn');

    // Wait for message to be sent
    await page1.waitForTimeout(500);

    // Verify message appears on both sides
    await expect(page1.locator('#chat-messages')).toContainText(message);
    await expect(page2.locator('#chat-messages')).toContainText(message);

    // Verify input cleared
    const inputValue = await page1.$eval('#chat-input', el => el.value);
    expect(inputValue).toBe('');
  });
  ```

---

## 5.2 Send Quick Chat

- **Description**: Player selects a predefined message
- **Priority**: P1 (High)
- **Steps**:
  1. Select a message from dropdown
- **Expected**:
  - Message sent immediately
  - Dropdown resets to placeholder
- **Playwright Implementation**:
  ```javascript
  test('send quick chat message', async ({ browser }) => {
    const { page1, page2 } = await setupGame(browser);

    // Select quick chat option
    await page1.selectOption('#quick-chat-select', '请快一点');

    await page1.waitForTimeout(500);

    // Verify message sent
    await expect(page1.locator('#chat-messages')).toContainText('请快一点');
    await expect(page2.locator('#chat-messages')).toContainText('请快一点');

    // Verify dropdown reset
    const selectValue = await page1.$eval('#quick-chat-select', el => el.value);
    expect(selectValue).toBe('');
  });
  ```

---

## 5.3 Chat - Empty Message

- **Description**: Player tries to send empty message
- **Priority**: P2 (Medium)
- **Steps**:
  1. Leave chat input empty
  2. Click send
- **Expected**: Nothing sent
- **Playwright Implementation**:
  ```javascript
  test('empty message not sent', async ({ browser }) => {
    const { page1, page2 } = await setupGame(browser);

    const messageCountBefore = await page1.locator('#chat-messages li').count();

    // Try to send empty message
    await page1.fill('#chat-input', '');
    await page1.click('#send-chat-btn');

    await page1.waitForTimeout(500);

    // Message count should not increase
    const messageCountAfter = await page1.locator('#chat-messages li').count();
    expect(messageCountAfter).toBe(messageCountBefore);
  });
  ```

---

## 5.4 Chat History - Reconnection

- **Description**: Chat history restored on reconnection
- **Priority**: P1 (High)
- **Steps**:
  1. Players exchange several chat messages
  2. One player refreshes page
- **Expected**:
  - Chat history restored in REJOINED message
  - All previous messages visible
- **Playwright Implementation**:
  ```javascript
  test('chat history restored on reconnection', async ({ browser }) => {
    const { page1, page2 } = await setupGame(browser);

    // Send several messages
    const messages = ['Msg1', 'Msg2', 'Msg3'];

    for (const msg of messages) {
      await page1.fill('#chat-input', msg);
      await page1.click('#send-chat-btn');
      await page1.waitForTimeout(300);
    }

    // Count messages before refresh
    const messageCount = await page1.locator('#chat-messages li').count();

    // Player 1 refreshes
    await page1.reload();
    await page1.waitForFunction(() => window.isWebSocketConnected());
    await page1.waitForSelector('#game-container');

    // Verify chat history restored
    const restoredCount = await page1.locator('#chat-messages li').count();
    expect(restoredCount).toBe(messageCount);

    // Verify all messages present
    for (const msg of messages) {
      await expect(page1.locator('#chat-messages')).toContainText(msg);
    }
  });
  ```

---

## 5.5 Chat - Message Display

- **Description**: Verify chat message format
- **Priority**: P2 (Medium)
- **Steps**:
  1. Send messages from both players
- **Expected**:
  - Own messages show sender as "我"
  - Opponent messages show "红方" or "黑方"
  - Timestamp displayed
- **Playwright Implementation**:
  ```javascript
  test('chat message format correct', async ({ browser }) => {
    const { page1, page2 } = await setupGame(browser);

    // Player 1 sends message
    await page1.fill('#chat-input', 'From RED');
    await page1.click('#send-chat-btn');
    await page1.waitForTimeout(500);

    // On player 1's side: shows "我"
    await expect(page1.locator('#chat-messages li:first-child')).toContainText('我');

    // On player 2's side: shows "红方"
    await expect(page2.locator('#chat-messages li:first-child')).toContainText('红方');

    // Player 2 sends message
    await page2.fill('#chat-input', 'From BLACK');
    await page2.click('#send-chat-btn');
    await page2.waitForTimeout(500);

    // On player 2's side: shows "我"
    await expect(page2.locator('#chat-messages li:last-child')).toContainText('我');

    // On player 1's side: shows "黑方"
    await expect(page1.locator('#chat-messages li:last-child')).toContainText('黑方');
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

  const roomName = 'ChatTest_' + Date.now();

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
```