let webSocket = null;
let reconnectAttempts = 0;
const MAX_RECONNECT = 10;
let currentPlayerId = null;
let currentRoomName = null;

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

function connectWebSocket() {
    console.log('Connecting to WebSocket at', CONFIG.WS_URL);

    // Check if we have a saved session (for reconnection)
    const savedPlayerId = getSavedPlayerIdFromCookie();
    const savedRoomName = getSavedRoomNameFromCookie();

    if (savedPlayerId && savedRoomName) {
        currentPlayerId = savedPlayerId;
        currentRoomName = savedRoomName;
        console.log('Found saved session, will attempt reconnection:', savedPlayerId, savedRoomName);
    } else {
        currentPlayerId = 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        console.log('New session with playerId:', currentPlayerId);
    }

    try {
        // Build WebSocket URL with roomName parameter
        let wsUrl = CONFIG.WS_URL;
        if (currentRoomName) {
            wsUrl += '?roomName=' + encodeURIComponent(currentRoomName) + '&playerId=' + encodeURIComponent(currentPlayerId);
        } else {
            wsUrl += '?playerId=' + encodeURIComponent(currentPlayerId);
        }

        webSocket = new WebSocket(wsUrl);

        webSocket.onopen = function() {
            console.log('WebSocket Connected');
            reconnectAttempts = 0;

            // If we have a saved room, try to rejoin
            if (currentRoomName) {
                console.log('Attempting to rejoin room:', currentRoomName);
                sendRejoin(currentRoomName);
            }
        };

        webSocket.onmessage = function(event) {
            const data = JSON.parse(event.data);
            handleServerMessage(data);
        };

        webSocket.onerror = function(error) {
            console.error('WebSocket error:', error);
        };

        webSocket.onclose = function() {
            console.log('WebSocket closed');
            if (reconnectAttempts < MAX_RECONNECT) {
                reconnectAttempts++;
                setTimeout(() => connectWebSocket(), 2000 * reconnectAttempts);
            }
        };
    } catch (error) {
        console.error('Failed to initialize WebSocket:', error);
    }
}

// Expose connection status
window.isWebSocketConnected = function() {
    return webSocket && webSocket.readyState === WebSocket.OPEN;
};

// Expose saved room name for UI
window.getSavedRoomName = function() {
    return currentRoomName;
};

function sendMessage(message) {
    if (webSocket && webSocket.readyState === WebSocket.OPEN) {
        webSocket.send(JSON.stringify(message));
    } else {
        console.error('WebSocket not connected');
    }
}

function sendCreateRoom(roomName) {
    currentRoomName = roomName;
    sendMessage({
        type: 'createRoom',
        roomName: roomName,
        playerId: currentPlayerId
    });
}

function sendJoinRoom(roomName) {
    currentRoomName = roomName;
    sendMessage({
        type: 'joinRoom',
        roomId: roomName,
        playerId: currentPlayerId
    });
}

function sendRejoin(roomName) {
    sendMessage({
        type: 'rejoin',
        roomId: roomName,
        playerId: currentPlayerId
    });
}

function sendMove(roomName, from, to) {
    sendMessage({
        type: 'move',
        roomId: roomName,
        from: from,
        to: to,
        playerId: currentPlayerId
    });
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