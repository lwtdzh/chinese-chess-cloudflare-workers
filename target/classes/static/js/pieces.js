const PIECE_NAMES = {
    'RED': { 'GENERAL': '帅', 'ADVISOR': '仕', 'ELEPHANT': '相', 'HORSE': '马', 'CHARIOT': '车', 'CANNON': '炮', 'SOLDIER': '兵' },
    'BLACK': { 'GENERAL': '将', 'ADVISOR': '士', 'ELEPHANT': '象', 'HORSE': '马', 'CHARIOT': '车', 'CANNON': '炮', 'SOLDIER': '卒' }
};

function drawPiece(ctx, row, col, piece, selected = false) {
    const { CELL_SIZE, MARGIN, PIECE_RADIUS } = CONFIG;
    const x = MARGIN + col * CELL_SIZE;
    const y = MARGIN + row * CELL_SIZE;
    
    ctx.beginPath();
    ctx.arc(x, y, PIECE_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = '#f5deb3';
    ctx.fill();
    ctx.strokeStyle = piece.color === 'RED' ? '#c00' : '#000';
    ctx.lineWidth = selected ? 3 : 2;
    ctx.stroke();
    
    ctx.beginPath();
    ctx.arc(x, y, PIECE_RADIUS - 4, 0, Math.PI * 2);
    ctx.strokeStyle = piece.color === 'RED' ? '#c00' : '#000';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    ctx.font = 'bold ' + CONFIG.FONT_SIZE + 'px serif';
    ctx.fillStyle = piece.color === 'RED' ? '#c00' : '#000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(PIECE_NAMES[piece.color][piece.type], x, y);
}

function drawHighlight(ctx, row, col) {
    const { CELL_SIZE, MARGIN } = CONFIG;
    const x = MARGIN + col * CELL_SIZE;
    const y = MARGIN + row * CELL_SIZE;
    
    ctx.beginPath();
    ctx.arc(x, y, CONFIG.HIGHLIGHT_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 255, 0, 0.5)';
    ctx.fill();
}
