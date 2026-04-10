import { test, expect } from '@playwright/test';

const BASE_URL = 'https://chess.netlib.re';

test('Debug move test', async ({ browser }) => {
  const context1 = await browser.newContext();
  const context2 = await browser.newContext();
  const page1 = await context1.newPage();
  const page2 = await context2.newPage();

  // Capture console logs
  page1.on('console', msg => console.log('P1:', msg.text()));
  page2.on('console', msg => console.log('P2:', msg.text()));

  const roomName = `Debug_${Date.now()}`;

  // Setup players
  await page1.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page1.waitForFunction(() => window.isWebSocketConnected?.(), { timeout: 10000 });
  console.log('P1 connected');

  await page1.fill('#roomName', roomName);
  await page1.click('#createBtn');
  await page1.waitForSelector('#game', { state: 'visible', timeout: 5000 });
  console.log('P1 created room');

  await page2.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page2.waitForFunction(() => window.isWebSocketConnected?.(), { timeout: 10000 });
  console.log('P2 connected');

  await page2.fill('#roomName', roomName);
  await page2.click('#joinBtn');
  await page2.waitForSelector('#game', { state: 'visible', timeout: 5000 });
  console.log('P2 joined room');

  // Wait for game to start
  await page1.waitForFunction(() => window.gameState?.isPlaying, { timeout: 5000 });
  await page2.waitForFunction(() => window.gameState?.isPlaying, { timeout: 5000 });
  console.log('Game started');

  // Check game state
  const p1Color = await page1.evaluate(() => window.gameState?.myColor);
  const p2Color = await page2.evaluate(() => window.gameState?.myColor);
  console.log(`P1 color: ${p1Color}, P2 color: ${p2Color}`);

  const p1Turn = await page1.evaluate(() => window.gameState?.currentTurn);
  const p2Turn = await page2.evaluate(() => window.gameState?.currentTurn);
  console.log(`P1 turn: ${p1Turn}, P2 turn: ${p2Turn}`);

  // Get canvas dimensions
  const canvas = page1.locator('#board');
  const box = await canvas.boundingBox();
  console.log(`Canvas size: ${box?.width}x${box?.height}`);

  // Get CONFIG values
  const config = await page1.evaluate(() => ({
    CELL_SIZE: (window as any).CONFIG?.CELL_SIZE,
    MARGIN: (window as any).CONFIG?.MARGIN
  }));
  console.log(`Config: CELL_SIZE=${config.CELL_SIZE}, MARGIN=${config.MARGIN}`);

  // Calculate click positions for chariot at (9,0) moving to (7,0)
  const CELL_SIZE = config.CELL_SIZE || 50;
  const MARGIN = config.MARGIN || 35;

  const fromX = MARGIN + 0 * CELL_SIZE; // col 0
  const fromY = MARGIN + 9 * CELL_SIZE; // row 9
  const toX = MARGIN + 0 * CELL_SIZE;   // col 0
  const toY = MARGIN + 7 * CELL_SIZE;   // row 7

  console.log(`Clicking to select piece at (${fromX}, ${fromY})`);
  console.log(`Clicking to move piece to (${toX}, ${toY})`);

  // Take screenshot before move
  await page1.screenshot({ path: 'test-results/before-move.png' });

  // Click to select piece
  await canvas.click({ position: { x: fromX, y: fromY } });
  await page1.waitForTimeout(500);

  // Check if piece is selected
  const selected = await page1.evaluate(() => window.gameState?.selectedPiece);
  console.log(`Selected piece: ${JSON.stringify(selected)}`);

  const validMoves = await page1.evaluate(() => window.gameState?.validMoves);
  console.log(`Valid moves: ${JSON.stringify(validMoves?.slice(0, 5))}`);

  // Take screenshot after selection
  await page1.screenshot({ path: 'test-results/after-select.png' });

  // Click to move
  await canvas.click({ position: { x: toX, y: toY } });
  await page1.waitForTimeout(1000);

  // Check if move was made
  const newTurn = await page1.evaluate(() => window.gameState?.currentTurn);
  console.log(`Turn after move: ${newTurn}`);

  // Take screenshot after move
  await page1.screenshot({ path: 'test-results/after-move.png' });

  await context1.close();
  await context2.close();
});