let gameState = {
    roomName: null,
    playerId: null,
    myColor: null,
    board: null,
    currentTurn: null,
    selectedPiece: null,
    validMoves: [],
    isPlaying: false
};

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');

function handleServerMessage(data) {
    switch (data.type) {
        case 'ROOM_CREATED':
            gameState.roomName = data.roomId; // roomId is now room name
            gameState.playerId = data.playerId;
            gameState.myColor = data.color;
            document.getElementById('roomInfo').textContent = `房间: ${data.roomName || data.roomId} (等待对手加入)`;
            document.getElementById('lobby').style.display = 'none';
            document.getElementById('game').style.display = 'block';
            break;
        case 'JOINED':
            gameState.roomName = data.roomId; // roomId is now room name
            gameState.playerId = data.playerId;
            gameState.myColor = data.color;
            document.getElementById('roomInfo').textContent = `房间: ${data.roomId}`;
            // If second player joins, switch to game view
            if (data.color === 'BLACK') {
                document.getElementById('lobby').style.display = 'none';
                document.getElementById('game').style.display = 'block';
            }
            break;
        case 'REJOINED':
            console.log('[GAME] REJOINED received, board currentTurn:', data.currentTurn, 'gameState:', data.gameState);
            gameState.roomName = data.roomId;
            gameState.playerId = data.playerId;
            gameState.myColor = data.color;
            gameState.board = deserializeBoard(data.board);
            gameState.currentTurn = data.currentTurn;
            gameState.isPlaying = data.gameState === 'PLAYING';
            // Save session again
            saveGameSession(gameState.playerId, gameState.roomName);
            // Show proper room info based on game state
            if (data.gameState === 'PLAYING') {
                document.getElementById('roomInfo').textContent = `房间: ${data.roomId}`;
            } else {
                document.getElementById('roomInfo').textContent = `房间: ${data.roomId} (等待对手加入)`;
            }
            document.getElementById('lobby').style.display = 'none';
            document.getElementById('game').style.display = 'block';
            // Load chat history
            if (data.chatHistory) {
                loadChatHistory(data.chatHistory);
            }
            renderBoard();
            updateTurnInfo();
            // Clear opponent disconnect status
            clearOpponentStatus();
            console.log('[GAME] Successfully rejoined game');
            break;
        case 'GAME_START':
            gameState.board = deserializeBoard(data.board);
            gameState.currentTurn = data.board.currentTurn;
            gameState.isPlaying = true;
            // Save session for potential reconnection
            saveGameSession(gameState.playerId, gameState.roomName || data.roomId);
            document.getElementById('roomInfo').textContent = `房间: ${gameState.roomName || data.roomId}`;
            document.getElementById('lobby').style.display = 'none';
            document.getElementById('game').style.display = 'block';
            renderBoard();
            updateTurnInfo();
            // Start background music on game start
            AudioManager.startBackgroundMusic();
            break;
        case 'MOVE':
            console.log('[GAME] MOVE received:', data.from, '->', data.to, 'nextTurn:', data.nextTurn);
            applyMove(data);
            break;
        case 'GAME_OVER':
            gameState.isPlaying = false;
            clearGameSession();
            // Play game over sound
            const isWinner = data.winner === gameState.myColor;
            const isDraw = data.winner === 'DRAW';
            AudioManager.playGameOver(isWinner);
            let resultMsg;
            if (isDraw) {
                resultMsg = '和棋!';
            } else if (isWinner) {
                resultMsg = '你赢了!';
            } else {
                resultMsg = '你输了!';
            }
            alert(`游戏结束! ${resultMsg} (${data.reason})`);
            break;
        case 'ERROR':
            alert(data.message);
            break;
        case 'INVALID_MOVE':
            alert('无效走法!');
            break;
        case 'CHAT':
            displayChatMessage(data);
            break;
        case 'DRAW_REQUEST':
            handleDrawRequest(data);
            break;
        case 'DRAW_DECLINED':
            // Only show alert to the player who requested the draw
            if (data.playerId !== gameState.playerId) {
                alert('对方拒绝了和棋请求');
            }
            break;
        case 'TAKE_BACK_REQUEST':
            handleTakeBackRequest(data);
            break;
        case 'TAKE_BACK_DECLINED':
            // Only show alert to the player who requested the take back
            if (data.playerId !== gameState.playerId) {
                alert('对方拒绝了悔棋请求');
            }
            break;
        case 'TAKE_BACK':
            handleTakeBack(data);
            break;
        case 'OPPONENT_DISCONNECTED':
            handleOpponentDisconnected(data);
            break;
        case 'OPPONENT_RECONNECTED':
            handleOpponentReconnected(data);
            break;
    }
}

function deserializeBoard(boardData) {
    const board = Array(10).fill(null).map(() => Array(9).fill(null));
    for (let row = 0; row < 10; row++) {
        for (let col = 0; col < 9; col++) {
            const p = boardData.pieces[row][col];
            if (p) {
                board[row][col] = { type: p.type, color: p.color };
            }
        }
    }
    return board;
}

function applyMove(data) {
    console.log('[GAME] applyMove called, piece at from:', gameState.board[data.from.row][data.from.col]);
    const piece = gameState.board[data.from.row][data.from.col];
    gameState.board[data.from.row][data.from.col] = null;
    gameState.board[data.to.row][data.to.col] = piece;
    gameState.currentTurn = data.nextTurn;
    gameState.selectedPiece = null;
    gameState.validMoves = [];

    renderBoard();
    updateTurnInfo();

    // Play move sound
    AudioManager.playMove();

    if (data.inCheck) {
        document.getElementById('statusInfo').textContent = '将军!';
        // Play check sound
        AudioManager.playCheck();
    } else {
        document.getElementById('statusInfo').textContent = '';
    }

    if (data.gameState !== 'PLAYING') {
        gameState.isPlaying = false;
        clearGameSession();
        // Play game over sound
        const isWin = data.winner === gameState.myColor;
        AudioManager.playGameOver(isWin);
        setTimeout(() => {
            if (data.gameState === 'TIMEOUT') {
                alert('游戏超时! 10分钟无操作');
            } else {
                alert(`游戏结束! 状态: ${data.gameState}`);
            }
        }, 100);
    }
}

function updateTurnInfo() {
    const isMyTurn = gameState.currentTurn === gameState.myColor;
    document.getElementById('turnInfo').textContent = isMyTurn ? '你的回合' : '对手回合';
    document.getElementById('turnInfo').style.background = isMyTurn ? '#d4edda' : '#f8d7da';
}

function renderBoard() {
    if (!gameState.board) {
        return;
    }
    drawBoard(ctx);
    for (let row = 0; row < 10; row++) {
        for (let col = 0; col < 9; col++) {
            const piece = gameState.board[row][col];
            if (piece) {
                const isSelected = gameState.selectedPiece &&
                                   gameState.selectedPiece.row === row &&
                                   gameState.selectedPiece.col === col;
                drawPiece(ctx, row, col, piece, isSelected);
            }
        }
    }
    if (gameState.validMoves) {
        gameState.validMoves.forEach(pos => drawHighlight(ctx, pos.row, pos.col));
    }
}

function handleCanvasClick(event) {
    if (!gameState.isPlaying) return;
    if (gameState.currentTurn !== gameState.myColor) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const col = Math.round((x - CONFIG.MARGIN) / CONFIG.CELL_SIZE);
    const row = Math.round((y - CONFIG.MARGIN) / CONFIG.CELL_SIZE);

    if (row < 0 || row > 9 || col < 0 || col > 8) return;

    if (!gameState.selectedPiece) {
        const piece = gameState.board[row][col];
        if (piece && piece.color === gameState.myColor) {
            gameState.selectedPiece = { row, col };
            gameState.validMoves = getValidMoves(gameState.board, row, col, gameState.myColor);
            renderBoard();
            // Play select sound
            AudioManager.playSelect();
        }
    } else {
        const isValid = gameState.validMoves.some(m => m.row === row && m.col === col);
        if (isValid) {
            sendMove(gameState.roomName, gameState.selectedPiece, { row, col });
        } else {
            const piece = gameState.board[row][col];
            if (piece && piece.color === gameState.myColor) {
                gameState.selectedPiece = { row, col };
                gameState.validMoves = getValidMoves(gameState.board, row, col, gameState.myColor);
                renderBoard();
            } else {
                gameState.selectedPiece = null;
                gameState.validMoves = [];
                renderBoard();
            }
        }
    }
}

function resign() {
    if (gameState.isPlaying && gameState.roomName) {
        sendResign(gameState.roomName);
        clearGameSession();
    }
}

// Chat functions
function displayChatMessage(data) {
    const container = document.getElementById('chatMessages');
    const msgDiv = document.createElement('div');
    msgDiv.className = `chat-message ${data.playerColor.toLowerCase()}`;

    const isMe = data.playerId === gameState.playerId;
    const senderName = isMe ? '我' : (data.playerColor === 'RED' ? '红方' : '黑方');

    const time = data.timestamp ? new Date(data.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : '';

    msgDiv.innerHTML = `
        <div class="sender">${senderName}</div>
        <div class="text">${escapeHtml(data.message)}</div>
        ${time ? `<div class="time">${time}</div>` : ''}
    `;

    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;

    // Speak opponent's message
    if (!isMe) {
        AudioManager.speakMessage(data.message);
    }
}

function loadChatHistory(messages) {
    const container = document.getElementById('chatMessages');
    container.innerHTML = '';
    if (messages && messages.length > 0) {
        messages.forEach(msg => {
            displayChatMessage({
                playerId: msg.playerId,
                playerColor: msg.playerColor,
                message: msg.message,
                timestamp: msg.timestamp
            });
        });
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Draw and take back handlers
function handleDrawRequest(data) {
    // Don't show dialog to the requester
    if (data.playerId === gameState.playerId) return;

    const opponentColor = data.playerColor === 'RED' ? '红方' : '黑方';
    if (confirm(`${opponentColor}请求和棋，是否同意？`)) {
        sendDrawResponse(gameState.roomName, true);
    } else {
        sendDrawResponse(gameState.roomName, false);
    }
}

function handleTakeBackRequest(data) {
    // Don't show dialog to the requester
    if (data.playerId === gameState.playerId) return;

    const opponentColor = data.playerColor === 'RED' ? '红方' : '黑方';
    if (confirm(`${opponentColor}请求悔棋，是否同意？`)) {
        sendTakeBackResponse(gameState.roomName, true);
    } else {
        sendTakeBackResponse(gameState.roomName, false);
    }
}

function handleTakeBack(data) {
    // Update board from server response
    gameState.board = deserializeBoard(data.board);
    gameState.currentTurn = data.board.currentTurn;
    gameState.selectedPiece = null;
    gameState.validMoves = [];
    renderBoard();
    updateTurnInfo();
    // Play sound
    AudioManager.playMove();
}

function handleOpponentDisconnected(data) {
    // Show disconnect status for opponent
    const opponentColor = data.playerColor;
    const opponentName = opponentColor === 'RED' ? '红方' : '黑方';
    showOpponentStatus(`${opponentName}已断开连接`);
}

function handleOpponentReconnected(data) {
    // Clear disconnect status when opponent reconnects
    clearOpponentStatus();
}

function showOpponentStatus(message) {
    const statusDiv = document.getElementById('opponentStatus');
    if (statusDiv) {
        statusDiv.textContent = message;
        statusDiv.style.display = 'block';
    }
}

function clearOpponentStatus() {
    const statusDiv = document.getElementById('opponentStatus');
    if (statusDiv) {
        statusDiv.textContent = '';
        statusDiv.style.display = 'none';
    }
}