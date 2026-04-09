const CONFIG = {
    WS_URL: window.location.origin.replace('http', 'ws') + '/ws',
    // Base dimensions (will be scaled for mobile)
    BASE_CELL_SIZE: 50,
    BASE_MARGIN: 35,
    BASE_PIECE_RADIUS: 22,
    BASE_FONT_SIZE: 18,
    BASE_BOARD_FONT_SIZE: 20,
    BASE_HIGHLIGHT_RADIUS: 8,
    // Calculated dimensions (updated on resize)
    CANVAS_WIDTH: 520,
    CANVAS_HEIGHT: 580,
    CELL_SIZE: 50,
    MARGIN: 35,
    PIECE_RADIUS: 22,
    FONT_SIZE: 18,
    BOARD_FONT_SIZE: 20,
    HIGHLIGHT_RADIUS: 8
};

// Calculate and update dimensions based on available width
function updateDimensions() {
    const maxWidth = Math.min(window.innerWidth - 40, 520); // 40px padding
    const scale = maxWidth / 520;

    CONFIG.CELL_SIZE = Math.round(CONFIG.BASE_CELL_SIZE * scale);
    CONFIG.MARGIN = Math.round(CONFIG.BASE_MARGIN * scale);
    CONFIG.PIECE_RADIUS = Math.round(CONFIG.BASE_PIECE_RADIUS * scale);
    CONFIG.FONT_SIZE = Math.round(CONFIG.BASE_FONT_SIZE * scale);
    CONFIG.BOARD_FONT_SIZE = Math.round(CONFIG.BASE_BOARD_FONT_SIZE * scale);
    CONFIG.HIGHLIGHT_RADIUS = Math.max(4, Math.round(CONFIG.BASE_HIGHLIGHT_RADIUS * scale));

    CONFIG.CANVAS_WIDTH = CONFIG.MARGIN * 2 + 8 * CONFIG.CELL_SIZE;
    CONFIG.CANVAS_HEIGHT = CONFIG.MARGIN * 2 + 9 * CONFIG.CELL_SIZE;

    const canvas = document.getElementById('board');
    if (canvas) {
        canvas.width = CONFIG.CANVAS_WIDTH;
        canvas.height = CONFIG.CANVAS_HEIGHT;
    }

    return scale;
}

// Initialize dimensions on load
window.addEventListener('load', updateDimensions);
window.addEventListener('resize', function() {
    updateDimensions();
    // Re-render board if game is active
    if (typeof renderBoard === 'function' && gameState && gameState.board) {
        renderBoard();
    }
});