function drawBoard(ctx) {
    const { CANVAS_WIDTH, CANVAS_HEIGHT, CELL_SIZE, MARGIN } = CONFIG;
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    
    for (let i = 0; i < 10; i++) {
        ctx.beginPath();
        ctx.moveTo(MARGIN, MARGIN + i * CELL_SIZE);
        ctx.lineTo(MARGIN + 8 * CELL_SIZE, MARGIN + i * CELL_SIZE);
        ctx.stroke();
    }
    
    for (let i = 0; i < 9; i++) {
        if (i === 0 || i === 8) {
            ctx.beginPath();
            ctx.moveTo(MARGIN + i * CELL_SIZE, MARGIN);
            ctx.lineTo(MARGIN + i * CELL_SIZE, MARGIN + 9 * CELL_SIZE);
            ctx.stroke();
        } else {
            ctx.beginPath();
            ctx.moveTo(MARGIN + i * CELL_SIZE, MARGIN);
            ctx.lineTo(MARGIN + i * CELL_SIZE, MARGIN + 4 * CELL_SIZE);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(MARGIN + i * CELL_SIZE, MARGIN + 5 * CELL_SIZE);
            ctx.lineTo(MARGIN + i * CELL_SIZE, MARGIN + 9 * CELL_SIZE);
            ctx.stroke();
        }
    }
    
    ctx.beginPath();
    ctx.moveTo(MARGIN + 3 * CELL_SIZE, MARGIN);
    ctx.lineTo(MARGIN + 5 * CELL_SIZE, MARGIN + 2 * CELL_SIZE);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(MARGIN + 5 * CELL_SIZE, MARGIN);
    ctx.lineTo(MARGIN + 3 * CELL_SIZE, MARGIN + 2 * CELL_SIZE);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(MARGIN + 3 * CELL_SIZE, MARGIN + 7 * CELL_SIZE);
    ctx.lineTo(MARGIN + 5 * CELL_SIZE, MARGIN + 9 * CELL_SIZE);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(MARGIN + 5 * CELL_SIZE, MARGIN + 7 * CELL_SIZE);
    ctx.lineTo(MARGIN + 3 * CELL_SIZE, MARGIN + 9 * CELL_SIZE);
    ctx.stroke();
    
    ctx.font = 'bold ' + CONFIG.BOARD_FONT_SIZE + 'px serif';
    ctx.fillStyle = '#000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('楚河', MARGIN + 2 * CELL_SIZE, MARGIN + 4.5 * CELL_SIZE);
    ctx.fillText('汉界', MARGIN + 6 * CELL_SIZE, MARGIN + 4.5 * CELL_SIZE);
}
