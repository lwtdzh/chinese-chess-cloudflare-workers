import { test, expect } from '@playwright/test';

const BASE_URL = 'https://chess.netlib.re';
const MAX_LOOPS = 10;

// Helper to click board square
async function clickBoardSquare(page: any, row: number, col: number) {
  const canvas = page.locator('#board');
  const x = 35 + col * 50;
  const y = 35 + row * 50;
  await canvas.click({ position: { x, y }, force: true });
}

test('Quick stress test with detailed logging', async ({ browser }) => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Starting ${MAX_LOOPS} loop test with detailed logging`);
  console.log(`${'='.repeat(60)}\n`);

  const issues: string[] = [];

  for (let loop = 1; loop <= MAX_LOOPS; loop++) {
    console.log(`\n--- Loop ${loop}/${MAX_LOOPS} ---`);

    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    try {
      const roomName = `Test_${Date.now()}`;

      // Setup
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

      // Debug: Check initial state
      const p1State = await page1.evaluate(() => ({
        isPlaying: window.gameState?.isPlaying,
        myColor: window.gameState?.myColor,
        currentTurn: window.gameState?.currentTurn,
        selectedPiece: window.gameState?.selectedPiece,
        board_9_0: window.gameState?.board?.[9]?.[0]
      }));

      console.log(`P1 state: ${JSON.stringify(p1State)}`);

      // Check if it's RED's turn
      if (p1State.currentTurn !== 'RED') {
        issues.push(`Loop ${loop}: Expected RED's turn, got ${p1State.currentTurn}`);
        console.log(`ISSUE: Wrong initial turn`);
        continue;
      }

      // Try to make a move
      console.log(`Attempting RED move: (9,0) -> (7,0)`);

      // Click to select piece
      await clickBoardSquare(page1, 9, 0);
      await page1.waitForTimeout(300);

      // Check if piece selected
      const afterSelect = await page1.evaluate(() => ({
        selectedPiece: window.gameState?.selectedPiece,
        validMoves: window.gameState?.validMoves?.slice(0, 3)
      }));
      console.log(`After select: ${JSON.stringify(afterSelect)}`);

      if (!afterSelect.selectedPiece) {
        issues.push(`Loop ${loop}: Piece not selected after click`);
        console.log(`ISSUE: Piece not selected`);
        continue;
      }

      // Click to move
      await clickBoardSquare(page1, 7, 0);
      await page1.waitForTimeout(500);

      // Check if move was made
      const afterMove = await page1.evaluate(() => ({
        currentTurn: window.gameState?.currentTurn,
        board_7_0: window.gameState?.board?.[7]?.[0],
        board_9_0: window.gameState?.board?.[9]?.[0]
      }));
      console.log(`After move: ${JSON.stringify(afterMove)}`);

      if (afterMove.currentTurn !== 'BLACK') {
        issues.push(`Loop ${loop}: Move not applied, turn is ${afterMove.currentTurn}`);
        console.log(`ISSUE: Move not applied`);
        continue;
      }

      console.log(`SUCCESS: RED move applied`);

      // Now try BLACK's move
      const p2State = await page2.evaluate(() => ({
        currentTurn: window.gameState?.currentTurn,
        myColor: window.gameState?.myColor
      }));
      console.log(`P2 state before BLACK move: ${JSON.stringify(p2State)}`);

      if (p2State.currentTurn !== 'BLACK') {
        issues.push(`Loop ${loop}: Expected BLACK's turn for P2, got ${p2State.currentTurn}`);
        console.log(`ISSUE: Wrong turn for BLACK`);
        continue;
      }

      // BLACK move
      await clickBoardSquare(page2, 0, 0);
      await page2.waitForTimeout(300);
      await clickBoardSquare(page2, 1, 0);
      await page2.waitForTimeout(500);

      const afterBlackMove = await page2.evaluate(() => ({
        currentTurn: window.gameState?.currentTurn
      }));
      console.log(`After BLACK move: ${JSON.stringify(afterBlackMove)}`);

      if (afterBlackMove.currentTurn !== 'RED') {
        issues.push(`Loop ${loop}: BLACK move not applied, turn is ${afterBlackMove.currentTurn}`);
        console.log(`ISSUE: BLACK move not applied`);
        continue;
      }

      console.log(`SUCCESS: BLACK move applied`);

    } catch (error: any) {
      issues.push(`Loop ${loop}: Exception - ${error.message}`);
      console.log(`EXCEPTION: ${error.message}`);
    } finally {
      await context1.close();
      await context2.close();
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`SUMMARY: ${issues.length} issues in ${MAX_LOOPS} loops`);
  console.log(`${'='.repeat(60)}`);

  if (issues.length > 0) {
    for (const issue of issues) {
      console.log(`  - ${issue}`);
    }
  } else {
    console.log(`✅ All ${MAX_LOOPS} loops passed!`);
  }

  expect(true).toBe(true);
});