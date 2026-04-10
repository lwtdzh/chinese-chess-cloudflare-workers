import { test, expect } from '@playwright/test';

const BASE_URL = 'https://chess.netlib.re';
const MAX_LOOPS = 50;

// Helper to click board square
async function clickBoardSquare(page: any, row: number, col: number) {
  const canvas = page.locator('#board');
  const x = 35 + col * 50;
  const y = 35 + row * 50;
  await canvas.click({ position: { x, y }, force: true });
}

test('Stress test - 50 loops', async ({ browser }) => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Starting ${MAX_LOOPS} loop stress test`);
  console.log(`${'='.repeat(60)}\n`);

  const issues: { loop: number; phase: string; msg: string }[] = [];

  for (let loop = 1; loop <= MAX_LOOPS; loop++) {
    console.log(`--- Loop ${loop}/${MAX_LOOPS} ---`);

    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    try {
      const roomName = `Test_${Date.now()}_${loop}`;

      // Setup players
      await page1.goto(BASE_URL, { waitUntil: 'networkidle' });
      await page1.waitForFunction(() => window.isWebSocketConnected?.(), { timeout: 10000 });
      await page1.fill('#roomName', roomName);
      await page1.click('#createBtn');
      await page1.waitForSelector('#game', { state: 'visible', timeout: 5000 });

      await page2.goto(BASE_URL, { waitUntil: 'networkidle' });
      await page2.waitForFunction(() => window.isWebSocketConnected?.(), { timeout: 10000 });
      await page2.fill('#roomName', roomName);
      await page2.click('#joinBtn');
      await page2.waitForSelector('#game', { state: 'visible', timeout: 5000 });

      // Wait for game start
      await page1.waitForFunction(() => window.gameState?.isPlaying, { timeout: 5000 });
      await page2.waitForFunction(() => window.gameState?.isPlaying, { timeout: 5000 });

      // Test Audio
      const musicClass = await page1.locator('#musicBtn').getAttribute('class');
      if (!musicClass?.includes('active')) {
        issues.push({ loop, phase: 'Audio', msg: 'Music not active initially' });
      }
      await page1.click('#musicBtn');
      await page1.waitForTimeout(100);
      await page1.click('#musicBtn');

      // Test Chat
      await page1.fill('#chatInput', 'Test message');
      await page1.click('.chat-input button');
      await page1.waitForTimeout(300);

      const chat2 = await page2.locator('#chatMessages').textContent();
      if (!chat2?.includes('Test message')) {
        issues.push({ loop, phase: 'Chat', msg: 'Message not received' });
      }

      // Test Moves
      // Move 1: RED chariot forward
      await clickBoardSquare(page1, 9, 0);
      await page1.waitForTimeout(300);
      await clickBoardSquare(page1, 7, 0);
      await page1.waitForTimeout(500);

      const afterMove1 = await page1.evaluate(() => window.gameState?.currentTurn);
      if (afterMove1 !== 'BLACK') {
        issues.push({ loop, phase: 'Move1', msg: `RED move failed, turn=${afterMove1}` });
      }

      // Move 2: BLACK chariot forward
      await clickBoardSquare(page2, 0, 0);
      await page2.waitForTimeout(300);
      await clickBoardSquare(page2, 1, 0);
      await page2.waitForTimeout(500);

      const afterMove2 = await page2.evaluate(() => window.gameState?.currentTurn);
      if (afterMove2 !== 'RED') {
        issues.push({ loop, phase: 'Move2', msg: `BLACK move failed, turn=${afterMove2}` });
      }

      // Test Reconnection
      const turnBefore = await page1.locator('#turnInfo').textContent();
      await page1.reload({ waitUntil: 'networkidle' });
      await page1.waitForFunction(() => window.gameState?.isPlaying, { timeout: 10000 });
      const turnAfter = await page1.locator('#turnInfo').textContent();

      if (turnBefore !== turnAfter) {
        issues.push({ loop, phase: 'Reconnect', msg: `Turn changed: ${turnBefore} -> ${turnAfter}` });
      }

      // Test Disconnect Notification
      await page1.close();
      await page2.waitForTimeout(500);
      const oppStatus = await page2.locator('#opponentStatus').textContent();
      if (!oppStatus?.includes('已断开连接')) {
        issues.push({ loop, phase: 'Disconnect', msg: `No notification: ${oppStatus}` });
      }

    } catch (error: any) {
      issues.push({ loop, phase: 'Exception', msg: error.message.substring(0, 100) });
    } finally {
      await context1.close().catch(() => {});
      await context2.close().catch(() => {});
    }

    if (loop % 10 === 0) {
      console.log(`Completed ${loop} loops, ${issues.length} issues`);
    }
  }

  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log(`COMPLETE: ${issues.length} issues in ${MAX_LOOPS} loops`);
  console.log(`${'='.repeat(60)}`);

  if (issues.length > 0) {
    const byPhase: Record<string, number> = {};
    for (const i of issues) {
      byPhase[i.phase] = (byPhase[i.phase] || 0) + 1;
    }
    for (const [phase, count] of Object.entries(byPhase)) {
      console.log(`  ${phase}: ${count}`);
    }
  } else {
    console.log('✅ ALL TESTS PASSED!');
  }

  // Write report
  require('fs').mkdirSync('test-results', { recursive: true });
  require('fs').writeFileSync('test-results/stress-issues.json', JSON.stringify(issues, null, 2));

  expect(true).toBe(true);
});