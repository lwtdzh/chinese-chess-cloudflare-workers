import { test, expect, Page, BrowserContext } from '@playwright/test';

const BASE_URL = 'https://chess.netlib.re';
const ISSUES_FILE = './test-results/issues-log.txt';

// Helper to log issues
function logIssue(issues: string[], issue: string) {
  const timestamp = new Date().toISOString();
  const message = `[${timestamp}] ISSUE: ${issue}`;
  console.log(message);
  issues.push(message);
  return message;
}

// Helper: Click board square (row 0-9, col 0-8)
async function clickBoardSquare(page: Page, row: number, col: number) {
  const canvas = await page.$('#board');
  if (!canvas) throw new Error('Canvas not found');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('Canvas bounding box not found');
  const cellSize = box.width / 9;
  const margin = cellSize * 0.7;
  await page.mouse.click(
    box.x + margin + col * cellSize,
    box.y + margin + row * cellSize
  );
}

// Helper: Setup two player game
async function setupTwoPlayerGame(browser: any): Promise<{ page1: Page; page2: Page; roomName: string }> {
  const context1 = await browser.newContext();
  const context2 = await browser.newContext();
  const page1 = await context1.newPage();
  const page2 = await context2.newPage();

  const roomName = 'LongTest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);

  // Capture console messages for debugging
  const p1Logs: string[] = [];
  const p2Logs: string[] = [];

  page1.on('console', msg => {
    const text = msg.text();
    if (text.includes('[GAME]') || text.includes('[WS]') || text.includes('ISSUE')) {
      p1Logs.push(`P1: ${text}`);
      console.log(`P1: ${text}`);
    }
  });

  page2.on('console', msg => {
    const text = msg.text();
    if (text.includes('[GAME]') || text.includes('[WS]') || text.includes('ISSUE')) {
      p2Logs.push(`P2: ${text}`);
      console.log(`P2: ${text}`);
    }
  });

  // Player 1 creates room
  await page1.goto(BASE_URL);
  await page1.waitForFunction(() => window.isWebSocketConnected && window.isWebSocketConnected(), { timeout: 20000 });
  await page1.fill('#roomName', roomName);
  await page1.click('#createBtn');
  await page1.waitForSelector('#game', { timeout: 15000 });
  await page1.waitForTimeout(2000);

  // Player 2 joins room
  await page2.goto(BASE_URL);
  await page2.waitForFunction(() => window.isWebSocketConnected && window.isWebSocketConnected(), { timeout: 20000 });
  await page2.fill('#roomName', roomName);
  await page2.click('#joinBtn');
  await page2.waitForSelector('#game', { timeout: 15000 });
  await page2.waitForTimeout(3000);

  return { page1, page2, roomName };
}

test('Long running comprehensive game test', async ({ browser }) => {
  const issues: string[] = [];
  const fs = require('fs');

  console.log('=== Starting Long Running Game Test ===');
  console.log('Target:', BASE_URL);

  // Setup
  const { page1, page2, roomName } = await setupTwoPlayerGame(browser);
  console.log('Room created:', roomName);

  // ===========================================
  // PHASE 1: Test Audio Controls
  // ===========================================
  console.log('\n--- Phase 1: Testing Audio Controls ---');

  // Check initial state of music button
  const musicBtnClass = await page1.locator('#musicBtn').getAttribute('class');
  console.log('Music button initial class:', musicBtnClass);

  // Test music toggle multiple times
  for (let i = 0; i < 3; i++) {
    const beforeClass = await page1.locator('#musicBtn').getAttribute('class');
    await page1.locator('#musicBtn').click();
    await page1.waitForTimeout(500);
    const afterClass = await page1.locator('#musicBtn').getAttribute('class');
    console.log(`Music toggle ${i + 1}: "${beforeClass}" -> "${afterClass}"`);

    // The class should toggle between having and not having 'active'
    const beforeActive = beforeClass?.includes('active') || false;
    const afterActive = afterClass?.includes('active') || false;
    if (beforeActive === afterActive) {
      logIssue(issues, `Music button state did not change on toggle ${i + 1}: "${beforeClass}" -> "${afterClass}"`);
    }
  }

  // Test SFX toggle multiple times
  for (let i = 0; i < 3; i++) {
    const beforeClass = await page1.locator('#sfxBtn').getAttribute('class');
    await page1.locator('#sfxBtn').click();
    await page1.waitForTimeout(500);
    const afterClass = await page1.locator('#sfxBtn').getAttribute('class');
    console.log(`SFX toggle ${i + 1}: "${beforeClass}" -> "${afterClass}"`);

    const beforeActive = beforeClass?.includes('active') || false;
    const afterActive = afterClass?.includes('active') || false;
    if (beforeActive === afterActive) {
      logIssue(issues, `SFX button state did not change on toggle ${i + 1}: "${beforeClass}" -> "${afterClass}"`);
    }
  }

  // Ensure SFX is on for game
  const sfxClass = await page1.locator('#sfxBtn').getAttribute('class');
  if (!sfxClass?.includes('active')) {
    await page1.locator('#sfxBtn').click();
    await page1.waitForTimeout(300);
  }

  // ===========================================
  // PHASE 2: Test Chat - Multiple Messages
  // ===========================================
  console.log('\n--- Phase 2: Testing Chat ---');

  const testMessages = [
    'Hello, let\'s play!',
    'Good luck!',
    'Nice move!',
    'Thinking...',
    '这步棋走得好!',
    'Test with Chinese characters',
    'Final message before real game'
  ];

  // Send messages from both players
  for (let i = 0; i < testMessages.length; i++) {
    const msg = testMessages[i];
    const sender = i % 2 === 0 ? page1 : page2;

    await sender.fill('#chatInput', msg);
    await sender.click('.chat-input button');
    await sender.waitForTimeout(800);

    // Verify both see the message
    const p1HasMsg = await page1.locator('#chatMessages').textContent();
    const p2HasMsg = await page2.locator('#chatMessages').textContent();

    if (!p1HasMsg?.includes(msg)) {
      logIssue(issues, `Player 1 did not receive chat message "${msg}"`);
    }
    if (!p2HasMsg?.includes(msg)) {
      logIssue(issues, `Player 2 did not receive chat message "${msg}"`);
    }
  }

  // Test quick chat messages
  const quickChatValues = ['1', '3', '5', '7', '10'];
  for (const value of quickChatValues) {
    await page2.selectOption('#quickChat', value);
    await page2.waitForTimeout(1000);

    // Dropdown should reset
    const selectValue = await page2.locator('#quickChat').inputValue();
    if (selectValue !== '') {
      logIssue(issues, `Quick chat dropdown did not reset after selecting option ${value}`);
    }
  }

  // ===========================================
  // PHASE 3: Play a Full Game
  // ===========================================
  console.log('\n--- Phase 3: Playing Full Game ---');

  let moveCount = 0;
  const expectedTurnAfterMove = {
    'RED': 'BLACK',  // After RED moves, BLACK's turn
    'BLACK': 'RED'   // After BLACK moves, RED's turn
  };

  // Define a sequence of moves
  const gameMoves = [
    // Move 1: RED chariot forward
    { player: 'RED', from: { row: 9, col: 0 }, to: { row: 7, col: 0 }, desc: 'RED chariot forward' },
    { player: 'BLACK', from: { row: 3, col: 0 }, to: { row: 4, col: 0 }, desc: 'BLACK soldier forward' },
    { player: 'RED', from: { row: 7, col: 0 }, to: { row: 6, col: 0 }, desc: 'RED chariot forward' },
    { player: 'BLACK', from: { row: 0, col: 0 }, to: { row: 1, col: 0 }, desc: 'BLACK chariot forward' },
    { player: 'RED', from: { row: 6, col: 0 }, to: { row: 4, col: 0 }, desc: 'RED chariot captures soldier' },
    { player: 'BLACK', from: { row: 1, col: 0 }, to: { row: 2, col: 0 }, desc: 'BLACK chariot forward' },
    { player: 'RED', from: { row: 4, col: 0 }, to: { row: 3, col: 0 }, desc: 'RED chariot forward' },
    { player: 'BLACK', from: { row: 2, col: 1 }, to: { row: 2, col: 2 }, desc: 'BLACK cannon moves' },
    { player: 'RED', from: { row: 3, col: 0 }, to: { row: 2, col: 0 }, desc: 'RED chariot forward' },
    { player: 'BLACK', from: { row: 0, col: 1 }, to: { row: 2, col: 2 }, desc: 'BLACK horse moves' },
    { player: 'RED', from: { row: 7, col: 1 }, to: { row: 7, col: 3 }, desc: 'RED cannon moves' },
    { player: 'BLACK', from: { row: 0, col: 3 }, to: { row: 1, col: 4 }, desc: 'BLACK advisor moves' },
    { player: 'RED', from: { row: 6, col: 2 }, to: { row: 5, col: 2 }, desc: 'RED soldier forward' },
    { player: 'BLACK', from: { row: 0, col: 4 }, to: { row: 0, col: 3 }, desc: 'BLACK general moves' },
    { player: 'RED', from: { row: 9, col: 1 }, to: { row: 7, col: 2 }, desc: 'RED horse moves' },
    { player: 'BLACK', from: { row: 2, col: 0 }, to: { row: 0, col: 0 }, desc: 'BLACK chariot returns' },
    { player: 'RED', from: { row: 2, col: 0 }, to: { row: 1, col: 0 }, desc: 'RED chariot advances' },
    { player: 'BLACK', from: { row: 0, col: 2 }, to: { row: 2, col: 4 }, desc: 'BLACK elephant moves' },
    { player: 'RED', from: { row: 5, col: 2 }, to: { row: 4, col: 2 }, desc: 'RED soldier forward' },
    { player: 'BLACK', from: { row: 2, col: 7 }, to: { row: 7, col: 7 }, desc: 'BLACK cannon jumps' },
    { player: 'RED', from: { row: 9, col: 7 }, to: { row: 7, col: 7 }, desc: 'RED chariot captures cannon' },
    { player: 'BLACK', from: { row: 3, col: 2 }, to: { row: 4, col: 2 }, desc: 'BLACK soldier captures' },
    { player: 'RED', from: { row: 7, col: 3 }, to: { row: 7, col: 4 }, desc: 'RED cannon moves right' },
    { player: 'BLACK', from: { row: 3, col: 4 }, to: { row: 4, col: 4 }, desc: 'BLACK soldier forward' },
    { player: 'RED', from: { row: 7, col: 4 }, to: { row: 7, col: 5 }, desc: 'RED cannon moves right' },
    { player: 'BLACK', from: { row: 3, col: 6 }, to: { row: 4, col: 6 }, desc: 'BLACK soldier forward' },
    { player: 'RED', from: { row: 9, col: 3 }, to: { row: 8, col: 3 }, desc: 'RED advisor moves' },
    { player: 'BLACK', from: { row: 0, col: 6 }, to: { row: 2, col: 8 }, desc: 'BLACK elephant moves' },
    { player: 'RED', from: { row: 9, col: 5 }, to: { row: 8, col: 4 }, desc: 'RED advisor moves' },
    { player: 'BLACK', from: { row: 0, col: 5 }, to: { row: 1, col: 6 }, desc: 'BLACK advisor moves' },
  ];

  // Execute moves
  for (const move of gameMoves) {
    const activePage = move.player === 'RED' ? page1 : page2;
    const otherPage = move.player === 'RED' ? page2 : page1;

    console.log(`Move ${moveCount + 1}: ${move.desc}`);

    // Wait for WebSocket to be connected with retries
    let wsConnected = await activePage.evaluate(() => window.isWebSocketConnected?.() ?? false);
    let retries = 0;
    while (!wsConnected && retries < 5) {
      console.log(`  WebSocket not connected, waiting... (attempt ${retries + 1}/5)`);
      await activePage.waitForTimeout(1000);
      wsConnected = await activePage.evaluate(() => window.isWebSocketConnected?.() ?? false);
      retries++;
    }
    if (!wsConnected) {
      logIssue(issues, `Move ${moveCount + 1} (${move.desc}): WebSocket not connected after retries`);
      moveCount++;
      continue;
    }

    // Check turn info BEFORE move
    const turnInfoBefore = await activePage.locator('#turnInfo').textContent();
    const expectedBeforeMove = '你的回合'; // Should be their turn before moving

    if (!turnInfoBefore?.includes(expectedBeforeMove)) {
      logIssue(issues, `Move ${moveCount + 1} (${move.desc}): Wrong turn before move - expected "${expectedBeforeMove}", got "${turnInfoBefore}"`);
      console.log(`  Skipping move due to wrong turn`);
      moveCount++;
      continue;
    }

    // Get current board state to detect if move was applied
    const currentTurnBefore = await activePage.evaluate(() => window.gameState?.currentTurn);

    // Make the move
    await clickBoardSquare(activePage, move.from.row, move.from.col);
    await activePage.waitForTimeout(300);
    await clickBoardSquare(activePage, move.to.row, move.to.col);

    // Wait for move to be processed (check for turn change)
    let moveApplied = false;
    for (let i = 0; i < 10; i++) {
      await activePage.waitForTimeout(300);
      const currentTurnAfter = await activePage.evaluate(() => window.gameState?.currentTurn);
      if (currentTurnAfter !== currentTurnBefore) {
        moveApplied = true;
        break;
      }
    }

    if (!moveApplied) {
      logIssue(issues, `Move ${moveCount + 1} (${move.desc}): Move not applied after timeout`);
      moveCount++;
      continue;
    }

    // Check turn info AFTER move for the player who just moved
    const turnInfoAfter = await activePage.locator('#turnInfo').textContent();
    const expectedAfterMove = '对手回合'; // After moving, should be opponent's turn

    if (!turnInfoAfter?.includes(expectedAfterMove)) {
      logIssue(issues, `Move ${moveCount + 1} (${move.desc}): Wrong turn after move - expected "${expectedAfterMove}", got "${turnInfoAfter}"`);
    }

    // Check turn info for the OTHER player (should now be their turn)
    const otherPlayerTurn = await otherPage.locator('#turnInfo').textContent();
    if (!otherPlayerTurn?.includes('你的回合')) {
      logIssue(issues, `Move ${moveCount + 1} (${move.desc}): Other player wrong turn - expected "你的回合", got "${otherPlayerTurn}"`);
    }

    // Every few moves, test audio toggle again
    if (moveCount % 5 === 4) {
      console.log('  Testing audio toggle mid-game...');
      await activePage.locator('#musicBtn').click();
      await activePage.waitForTimeout(300);
      await activePage.locator('#musicBtn').click();
      await activePage.waitForTimeout(300);
    }

    // Every few moves, send a chat message
    if (moveCount % 4 === 3) {
      const chatMsg = `Move ${moveCount + 1} played!`;
      await activePage.fill('#chatInput', chatMsg);
      await activePage.click('.chat-input button');
      await activePage.waitForTimeout(500);
    }

    moveCount++;
  }

  // ===========================================
  // PHASE 4: Test Game Controls - Surrender
  // ===========================================
  console.log('\n--- Phase 4: Testing Game Controls - Surrender ---');

  // Set up dialog handler for surrender
  let gameEnded = false;
  page1.once('dialog', async dialog => {
    const msg = dialog.message();
    console.log('P1 Dialog:', msg);
    if (msg.includes('认输')) {
      await dialog.accept();
    } else if (msg.includes('游戏结束')) {
      gameEnded = true;
      await dialog.dismiss();
    } else {
      await dialog.dismiss();
    }
  });

  page2.once('dialog', async dialog => {
    const msg = dialog.message();
    console.log('P2 Dialog:', msg);
    if (msg.includes('游戏结束')) {
      await dialog.dismiss();
    } else {
      await dialog.dismiss();
    }
  });

  await page1.click('#resignBtn');
  await page1.waitForTimeout(3000);

  if (!gameEnded) {
    logIssue(issues, 'Game did not end after surrender');
  }

  // ===========================================
  // PHASE 5: Test Reconnection in new game
  // ===========================================
  console.log('\n--- Phase 5: Testing Reconnection ---');

  // Create new game for reconnection test
  const { page1: p1, page2: p2 } = await setupTwoPlayerGame(browser);

  // Make a move
  await clickBoardSquare(p1, 9, 0);
  await p1.waitForTimeout(300);
  await clickBoardSquare(p1, 7, 0);
  await p2.waitForTimeout(2000);

  // Verify turn switched
  const p1Turn = await p1.locator('#turnInfo').textContent();
  const p2Turn = await p2.locator('#turnInfo').textContent();
  console.log('Before reconnect - P1 turn:', p1Turn, 'P2 turn:', p2Turn);

  if (!p1Turn?.includes('对手回合')) {
    logIssue(issues, `Before reconnect: P1 should see "对手回合" but sees "${p1Turn}"`);
  }
  if (!p2Turn?.includes('你的回合')) {
    logIssue(issues, `Before reconnect: P2 should see "你的回合" but sees "${p2Turn}"`);
  }

  // Get cookies
  const p1Cookies = await p1.context().cookies();
  const playerCookie = p1Cookies.find(c => c.name === 'xiangqi_player_id');
  const roomCookie = p1Cookies.find(c => c.name === 'xiangqi_room_name');

  if (!playerCookie) {
    logIssue(issues, 'Session cookie xiangqi_player_id not set');
  }
  if (!roomCookie) {
    logIssue(issues, 'Session cookie xiangqi_room_name not set');
  }

  // Send a chat message before reconnect
  await p1.fill('#chatInput', 'Message before reconnect');
  await p1.click('.chat-input button');
  await p1.waitForTimeout(500);

  // Refresh page
  console.log('Refreshing page for reconnection test...');
  await p1.reload();
  await p1.waitForSelector('#game', { timeout: 15000 });
  await p1.waitForTimeout(2000);

  // Verify game state restored
  const p1TurnAfter = await p1.locator('#turnInfo').textContent();
  console.log('After reconnect - P1 turn:', p1TurnAfter);

  // Turn should still be BLACK's turn
  if (!p1TurnAfter?.includes('对手回合')) {
    logIssue(issues, `After reconnect: P1 should see "对手回合" but sees "${p1TurnAfter}"`);
  }

  // Check if chat history preserved
  const chatContent = await p1.locator('#chatMessages').textContent();
  if (!chatContent?.includes('Message before reconnect')) {
    logIssue(issues, 'Chat history not preserved after reconnection');
  }

  // ===========================================
  // PHASE 6: Test Disconnect Notification
  // ===========================================
  console.log('\n--- Phase 6: Testing Disconnect Notification ---');

  // Close player 1's page
  console.log('Closing player 1 page to test disconnect notification...');
  await p1.close();

  // Wait and check if player 2 sees disconnect status
  await p2.waitForTimeout(3000);
  const disconnectStatus = await p2.locator('#opponentStatus').isVisible();
  console.log('Disconnect status visible:', disconnectStatus);

  if (!disconnectStatus) {
    logIssue(issues, 'Disconnect notification not shown to opponent');
  } else {
    const statusText = await p2.locator('#opponentStatus').textContent();
    console.log('Disconnect status text:', statusText);
    if (!statusText?.includes('断开连接')) {
      logIssue(issues, `Disconnect status text incorrect: "${statusText}"`);
    }
  }

  // ===========================================
  // SUMMARY
  // ===========================================
  console.log('\n=== Test Summary ===');
  console.log('Total moves played:', moveCount);
  console.log('Total issues found:', issues.length);

  if (issues.length > 0) {
    console.log('\nIssues found:');
    issues.forEach((issue, i) => console.log(`${i + 1}. ${issue}`));
  } else {
    console.log('\nNo issues found!');
  }

  // Write issues to file
  const report = `
========================================
Long Running Game Test Report
========================================
Date: ${new Date().toISOString()}
Room: ${roomName}
Total Moves: ${moveCount}
Total Issues: ${issues.length}

ISSUES FOUND:
${issues.length > 0 ? issues.map((i, idx) => `${idx + 1}. ${i}`).join('\n') : 'None'}

========================================
`;

  try {
    fs.mkdirSync('./test-results', { recursive: true });
    fs.writeFileSync(ISSUES_FILE, report);
    console.log(`\nIssues logged to: ${ISSUES_FILE}`);
  } catch (e) {
    console.log('Could not write issues file:', e);
  }

  // Assert no more than 3 critical issues
  expect(issues.length).toBeLessThan(4);
});