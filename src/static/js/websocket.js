let webSocket = null;
let reconnectAttempts = 0;
const MAX_RECONNECT = 10;
let currentPlayerId = null;
let currentRoomName = null;
let isIntentionalClose = false; // Flag to prevent auto-reconnect on intentional closes
let keepaliveInterval = null; // Keepalive ping interval

// Cookie helper functions
function setCookie(name, value, minutes) {
    const expires = new Date(Date.now() + minutes * 60 * 1000).toUTCString();
    document.cookie = name + '=' + encodeURIComponent(value) + '; expires=' + expires + '; path=/';
}

function getCookie(name) {
    const cookies = document.cookie;
    const regex = new RegExp('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)');
    const match = cookies.match(regex);
    return match ? decodeURIComponent(match[2]) : null;
}

function deleteCookie(name) {
    document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
}

// Save room name and player ID for reconnection
function saveGameSession(playerId, roomName) {
    if (roomName && playerId) {
        console.log('Saving game session:', playerId, roomName);
        setCookie('xiangqi_player_id', playerId, 15);
        setCookie('xiangqi_room_name', roomName, 15);
    }
}

// Clear session
function clearSession() {
    deleteCookie('xiangqi_room_name');
    deleteCookie('xiangqi_player_id');
}

// Get saved room name from cookie
function getSavedRoomNameFromCookie() {
    return getCookie('xiangqi_room_name');
}

// Get saved player ID from cookie
function getSavedPlayerIdFromCookie() {
    return getCookie('xiangqi_player_id');
}

// Clear game session
function clearGameSession() {
    deleteCookie('xiangqi_player_id');
    deleteCookie('xiangqi_room_name');
}

// Send keepalive ping to prevent connection timeout
function startKeepalive() {
    if (keepaliveInterval) {
        clearInterval(keepaliveInterval);
    }
    keepaliveInterval = setInterval(() => {
        if (webSocket && webSocket.readyState === WebSocket.OPEN) {
            // Send a ping message to keep connection alive
            webSocket.send(JSON.stringify({ type: 'ping' }));
        }
    }, 25000); // Send ping every 25 seconds
}

function stopKeepalive() {
    if (keepaliveInterval) {
        clearInterval(keepaliveInterval);
        keepaliveInterval = null;
    }
}

function connectWebSocket(roomName = null) {
    console.log('Connecting to WebSocket at', CONFIG.WS_URL, 'roomName:', roomName);

    // Initialize player ID if not set
    if (!currentPlayerId) {
        const savedPlayerId = getSavedPlayerIdFromCookie();
        const savedRoomName = getSavedRoomNameFromCookie();

        if (savedPlayerId && savedRoomName) {
            currentPlayerId = savedPlayerId;
            currentRoomName = savedRoomName;
            console.log('Found saved session:', savedPlayerId, savedRoomName);
        } else {
            currentPlayerId = 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            console.log('New session with playerId:', currentPlayerId);
        }
    }

    // If roomName is provided, use it
    if (roomName) {
        currentRoomName = roomName;
    }

    try {
        // Build WebSocket URL
        let wsUrl = CONFIG.WS_URL;
        wsUrl += '?playerId=' + encodeURIComponent(currentPlayerId);
        if (currentRoomName) {
            wsUrl += '&roomName=' + encodeURIComponent(currentRoomName);
        }

        // Close existing connection if any
        if (webSocket && webSocket.readyState !== WebSocket.CLOSED) {
            isIntentionalClose = true; // Mark as intentional to prevent auto-reconnect
            webSocket.close();
        }

        webSocket = new WebSocket(wsUrl);

        webSocket.onopen = function() {
            console.log('WebSocket Connected');
            reconnectAttempts = 0;
            isIntentionalClose = false; // Reset flag on successful connection
            startKeepalive(); // Start keepalive pings
        };

        webSocket.onmessage = function(event) {
            lastMessageTime = Date.now(); // Update last message time
            const data = JSON.parse(event.data);
            console.log('[WS] Received message:', data.type, data);
            handleServerMessage(data);
        };

        webSocket.onerror = function(error) {
            console.error('WebSocket error:', error);
        };

        webSocket.onclose = function() {
            console.log('WebSocket closed, isIntentional:', isIntentionalClose);
            stopKeepalive(); // Stop keepalive pings
            // Only auto-reconnect if this wasn't an intentional close
            if (!isIntentionalClose && reconnectAttempts < MAX_RECONNECT) {
                reconnectAttempts++;
                setTimeout(() => connectWebSocket(), 2000 * reconnectAttempts);
            }
            isIntentionalClose = false; // Reset flag
        };
    } catch (error) {
        console.error('Failed to initialize WebSocket:', error);
    }
}

// Expose connection status with additional checks
window.isWebSocketConnected = function() {
    if (!webSocket) return false;
    if (webSocket.readyState !== WebSocket.OPEN) return false;
    // Check if we've received a message recently (within last 60 seconds)
    // This helps detect dead connections that are still in OPEN state
    return true;
};

// Track last message time for health check
let lastMessageTime = Date.now();

// Expose health check based on recent activity
window.isWebSocketHealthy = function() {
    if (!webSocket || webSocket.readyState !== WebSocket.OPEN) return false;
    // Consider connection healthy if we received a message in last 60 seconds
    return (Date.now() - lastMessageTime) < 60000;
};

// Expose saved room name for UI
window.getSavedRoomName = function() {
    return currentRoomName;
};

function sendMessage(message) {
    if (webSocket && webSocket.readyState === WebSocket.OPEN) {
        try {
            webSocket.send(JSON.stringify(message));
            return true;
        } catch (e) {
            console.error('WebSocket send error:', e);
            return false;
        }
    } else {
        console.error('WebSocket not connected, readyState:', webSocket?.readyState);
        return false;
    }
}

function sendCreateRoom(roomName) {
    console.log('sendCreateRoom called:', roomName);
    // Reconnect with the room name - server will auto-create the room
    currentRoomName = roomName;
    connectWebSocket(roomName);
}

function sendJoinRoom(roomName) {
    console.log('sendJoinRoom called:', roomName);
    // Reconnect with the room name - server will handle joining
    currentRoomName = roomName;
    connectWebSocket(roomName);
}

function sendRejoin(roomName) {
    sendMessage({
        type: 'rejoin',
        roomId: roomName,
        playerId: currentPlayerId
    });
}

function sendMove(roomName, from, to) {
    console.log('[WS] Sending move:', from, '->', to);
    const sent = sendMessage({
        type: 'move',
        roomId: roomName,
        from: from,
        to: to,
        playerId: currentPlayerId
    });
    if (!sent) {
        console.error('[WS] Failed to send move - WebSocket not ready');
    }
    return sent;
}

function sendResign(roomName) {
    sendMessage({
        type: 'resign',
        roomId: roomName,
        playerId: currentPlayerId
    });
}

function sendChatMessage(roomName, message) {
    sendMessage({
        type: 'chat',
        roomId: roomName,
        playerId: currentPlayerId,
        message: message
    });
}

function sendDrawRequest(roomName) {
    sendMessage({
        type: 'drawRequest',
        roomId: roomName,
        playerId: currentPlayerId
    });
}

function sendDrawResponse(roomName, accepted) {
    sendMessage({
        type: 'drawResponse',
        roomId: roomName,
        playerId: currentPlayerId,
        accepted: accepted
    });
}

function sendTakeBackRequest(roomName) {
    sendMessage({
        type: 'takeBackRequest',
        roomId: roomName,
        playerId: currentPlayerId
    });
}

function sendTakeBackResponse(roomName, accepted) {
    sendMessage({
        type: 'takeBackResponse',
        roomId: roomName,
        playerId: currentPlayerId,
        accepted: accepted
    });
}

function sendRestartGame(roomName) {
    sendMessage({
        type: 'restartGame',
        roomId: roomName,
        playerId: currentPlayerId
    });
}