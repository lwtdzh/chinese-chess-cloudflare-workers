// Quick chat messages
const QUICK_MESSAGES = {
    '1': '能不能快一点儿呀，我等到花儿也谢了',
    '2': '再考虑考虑，别走臭棋哦',
    '3': '你的棋艺不错嘛！',
    '4': '哎呀，大意了！',
    '5': '这局我赢定了！',
    '6': '服了服了，你太厉害了',
    '7': '和棋怎么样？',
    '8': '我要认真了！',
    '9': '运气不好，下次再来',
    '10': '交个朋友吧！'
};

function createRoom() {
    // Initialize audio on first user interaction
    AudioManager.init();
    if (!window.isWebSocketConnected()) {
        alert('WebSocket 未连接，请刷新页面重试');
        return;
    }
    const roomName = document.getElementById('roomName').value.trim();
    if (!roomName) {
        alert('请输入房间名');
        return;
    }
    console.log('createRoom called:', roomName);
    sendCreateRoom(roomName);
}

function joinRoom() {
    // Initialize audio on first user interaction
    AudioManager.init();
    if (!window.isWebSocketConnected()) {
        alert('WebSocket 未连接，请刷新页面重试');
        return;
    }
    const roomName = document.getElementById('roomName').value.trim();
    if (roomName) {
        sendJoinRoom(roomName);
    } else {
        alert('请输入房间名');
    }
}

// Toggle background music
function toggleMusic() {
    AudioManager.init();
    const enabled = AudioManager.toggleBgMusic();
    const btn = document.getElementById('musicBtn');
    btn.classList.toggle('active', enabled);
}

// Toggle sound effects
function toggleSfx() {
    AudioManager.init();
    const enabled = AudioManager.toggleSfx();
    const btn = document.getElementById('sfxBtn');
    btn.classList.toggle('active', enabled);
}

// Send chat message
function sendChat() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    if (message && gameState.roomName) {
        sendChatMessage(gameState.roomName, message);
        // Speak own message
        AudioManager.speakMessage(message);
        input.value = '';
    }
}

// Send quick chat message
function sendQuickChat() {
    const select = document.getElementById('quickChat');
    const value = select.value;
    if (value && QUICK_MESSAGES[value] && gameState.roomName) {
        const message = QUICK_MESSAGES[value];
        sendChatMessage(gameState.roomName, message);
        // Speak the message
        AudioManager.speakMessage(message);
        select.value = ''; // Reset selection
    }
}

// Request draw
function requestDraw() {
    if (gameState.isPlaying && gameState.roomName) {
        if (confirm('确定要请求和棋吗？')) {
            sendDrawRequest(gameState.roomName);
        }
    }
}

// Request take back
function requestTakeBack() {
    if (gameState.isPlaying && gameState.roomName) {
        if (confirm('确定要请求悔棋吗？')) {
            sendTakeBackRequest(gameState.roomName);
        }
    }
}

// Handle enter key in chat input
document.addEventListener('DOMContentLoaded', function() {
    const chatInput = document.getElementById('chatInput');
    if (chatInput) {
        chatInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                sendChat();
            }
        });
    }
});

window.onload = function() {
    console.log('Page loaded, initializing...');
    connectWebSocket();
    if (typeof canvas !== 'undefined') {
        canvas.addEventListener('click', handleCanvasClick);
    }

    // Pre-fill room name if there's a saved one
    setTimeout(() => {
        const savedRoom = window.getSavedRoomName ? window.getSavedRoomName() : null;
        if (savedRoom) {
            document.getElementById('roomName').value = savedRoom;
        }
    }, 500);
};