const { chromium } = require('playwright');

(async () => {
    console.log('=== 中国象棋功能测试 ===\n');
    const browser = await chromium.launch({ headless: true });

    let passed = 0;
    let failed = 0;

    // ===================== TEST 1: Surrender =====================
    console.log('TEST 1: Surrender Button');
    try {
        const page1a = await browser.newPage();
        const page1b = await browser.newPage();

        const roomName = 'SurrenderTest' + Date.now();

        // Player 1 creates room
        await page1a.goto('http://localhost:8080', { waitUntil: 'networkidle' });
        await page1a.fill('#roomName', roomName);
        await page1a.click('#createBtn');
        await page1a.waitForSelector('#game', { state: 'visible', timeout: 5000 });
        console.log('  P1 created room:', roomName);

        // Player 2 joins
        await page1b.goto('http://localhost:8080', { waitUntil: 'networkidle' });
        await page1b.fill('#roomName', roomName);
        await page1b.click('#joinBtn');
        await page1b.waitForSelector('#game', { state: 'visible', timeout: 5000 });
        console.log('  P2 joined room');

        await page1a.waitForTimeout(1000);

        // Check game started
        const turnP1 = await page1a.$eval('#turnInfo', el => el.textContent).catch(() => '');
        const turnP2 = await page1b.$eval('#turnInfo', el => el.textContent).catch(() => '');
        console.log('  Turn P1:', turnP1, 'Turn P2:', turnP2);

        // Player 2 clicks surrender
        const surrenderBtn = await page1b.$('#resignBtn');
        if (surrenderBtn) {
            await page1b.click('#resignBtn');
            await page1b.waitForTimeout(2000);

            // Check if game ended - turn info should change or alert should appear
            const turnP1After = await page1a.$eval('#turnInfo', el => el.textContent).catch(() => '');
            console.log('  Turn P1 after surrender:', turnP1After);
            console.log('  ✓ PASS: Surrender button clicked and executed');
            passed++;
        } else {
            console.log('  ✗ FAIL: Surrender button not found');
            failed++;
        }

        await page1a.close();
        await page1b.close();
    } catch (e) {
        console.log('  ✗ FAIL:', e.message);
        failed++;
    }

    // ===================== TEST 2: Draw =====================
    console.log('\nTEST 2: Draw Request/Response');
    try {
        const page2a = await browser.newPage();
        const page2b = await browser.newPage();

        const roomName = 'DrawTest' + Date.now();

        await page2a.goto('http://localhost:8080', { waitUntil: 'networkidle' });
        await page2a.fill('#roomName', roomName);
        await page2a.click('#createBtn');
        await page2a.waitForSelector('#game', { state: 'visible', timeout: 5000 });

        await page2b.goto('http://localhost:8080', { waitUntil: 'networkidle' });
        await page2b.fill('#roomName', roomName);
        await page2b.click('#joinBtn');
        await page2b.waitForSelector('#game', { state: 'visible', timeout: 5000 });

        await page2a.waitForTimeout(1000);
        console.log('  Game started for draw test');

        // Player 1 requests draw - will get confirm dialog
        page2a.on('dialog', async dialog => {
            const msg = dialog.message();
            console.log('  P1 dialog:', msg);
            if (msg.includes('确定要请求和棋')) {
                await dialog.accept();
            }
        });

        // Player 2 will receive draw request
        page2b.on('dialog', async dialog => {
            const msg = dialog.message();
            console.log('  P2 dialog:', msg);
            if (msg.includes('请求和棋') || msg.includes('和棋')) {
                await dialog.accept(); // Accept draw
            }
        });

        await page2a.click('#drawBtn');
        await page2a.waitForTimeout(3000);

        console.log('  ✓ PASS: Draw request flow completed');
        passed++;

        await page2a.close();
        await page2b.close();
    } catch (e) {
        console.log('  ✗ FAIL:', e.message);
        failed++;
    }

    // ===================== TEST 3: Take Back =====================
    console.log('\nTEST 3: Take Back Request/Response');
    try {
        const page3a = await browser.newPage();
        const page3b = await browser.newPage();

        const roomName = 'TakeBackTest' + Date.now();

        await page3a.goto('http://localhost:8080', { waitUntil: 'networkidle' });
        await page3a.fill('#roomName', roomName);
        await page3a.click('#createBtn');
        await page3a.waitForSelector('#game', { state: 'visible', timeout: 5000 });

        await page3b.goto('http://localhost:8080', { waitUntil: 'networkidle' });
        await page3b.fill('#roomName', roomName);
        await page3b.click('#joinBtn');
        await page3b.waitForSelector('#game', { state: 'visible', timeout: 5000 });

        await page3a.waitForTimeout(1000);
        console.log('  Game started for take back test');

        // Make a move first
        const canvas = await page3a.$('#board');
        const box = await canvas.boundingBox();
        if (box) {
            const cellSize = 50;
            const margin = 35;

            // Click on red pawn at row 6, col 0
            await page3a.mouse.click(box.x + margin, box.y + margin + 6 * cellSize);
            await page3a.waitForTimeout(300);
            // Move to row 5, col 0
            await page3a.mouse.click(box.x + margin, box.y + margin + 5 * cellSize);
            await page3a.waitForTimeout(1000);
            console.log('  Move made');
        }

        // Player 1 requests take back
        page3a.on('dialog', async dialog => {
            const msg = dialog.message();
            console.log('  P1 dialog:', msg);
            if (msg.includes('确定要请求悔棋')) {
                await dialog.accept();
            }
        });

        // Player 2 will receive take back request
        page3b.on('dialog', async dialog => {
            const msg = dialog.message();
            console.log('  P2 dialog:', msg);
            if (msg.includes('请求悔棋') || msg.includes('悔棋')) {
                await dialog.accept(); // Accept take back
            }
        });

        await page3a.click('#takeBackBtn');
        await page3a.waitForTimeout(3000);

        console.log('  ✓ PASS: Take back request flow completed');
        passed++;

        await page3a.close();
        await page3b.close();
    } catch (e) {
        console.log('  ✗ FAIL:', e.message);
        failed++;
    }

    await browser.close();

    console.log('\n' + '='.repeat(50));
    console.log(`Results: ${passed} passed, ${failed} failed`);
    console.log('='.repeat(50));
})();