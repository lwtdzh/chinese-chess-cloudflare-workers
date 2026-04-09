const { chromium } = require('playwright');

(async () => {
    console.log('=== 中国象棋 E2E 测试 ===\n');
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    // 捕获控制台日志
    page.on('console', msg => {
        if (msg.type() === 'error') {
            console.log('  [浏览器错误]', msg.text());
        }
    });
    
    try {
        // 1. 访问页面
        console.log('1. 访问页面...');
        await page.goto('http://localhost:8080', { waitUntil: 'load', timeout: 10000 });
        await page.waitForTimeout(2000);
        
        const title = await page.title();
        console.log('   页面标题:', title);
        
        const hasLobby = await page.isVisible('#lobby');
        console.log('   大厅区域可见:', hasLobby);
        
        // 2. 创建房间
        console.log('2. 创建房间...');
        await page.fill('#roomName', '测试房间');
        await page.click('#createBtn');
        await page.waitForTimeout(3000);
        
        const roomInfo = await page.textContent('#roomInfo');
        console.log('   房间信息:', roomInfo);
        
        const gameVisible = await page.isVisible('#game');
        console.log('   游戏界面可见:', gameVisible);
        
        if (roomInfo && roomInfo.includes('房间:')) {
            console.log('\n✓ 基本功能测试通过');
        } else {
            console.log('\n✗ 房间创建失败');
        }
        
    } catch (error) {
        console.error('测试失败:', error.message);
    } finally {
        await browser.close();
    }
})();
