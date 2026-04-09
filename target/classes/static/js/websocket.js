let stompClient = null;
let reconnectAttempts = 0;
const MAX_RECONNECT = 10;
let currentPlayerId = null;
let currentRoomName = null;
let roomSubscription = null;

// Cookie helper functions
function setCookie(name, value, minutes) {
    const expires = new Date(Date.now() + minutes * 60 * 1000).toUTCString();
    document.cookie = name + '=' + encodeURIComponent(value) + '; expires=' + expires + '; path=/';
}

function getCookie(name) {
    const cookies = document.cookie;
    console.log('getCookie called for:', name, 'all cookies:', cookies);
    const regex = new RegExp('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)');
    const match = cookies.match(regex);
    console.log('getCookie:', name, 'match:', match);
    return match ? decodeURIComponent(match[2]) : null;
}

function deleteCookie(name) {
    document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
}

// Save room name and player ID for reconnection (call this when game starts)
function saveGameSession(playerId, roomName) {
    if (roomName && playerId) {
        console.log('Saving game session:', playerId, roomName);
        setCookie('xiangqi_player_id', playerId, 15); // 15 minutes for game session
        setCookie('xiangqi_room_name', roomName, 15);
        console.log('Cookies saved:', document.cookie);
    }
}

// Clear session
function clearSession() {
    deleteCookie('xiangqi_room_name');
    deleteCookie('xiangqi_player_id');
}

// Get saved room name from cookie
function getSavedRoomNameFromCookie() {
    const value = getCookie('xiangqi_room_name');
    console.log('getSavedRoomNameFromCookie:', value);
    return value;
}

// Get saved player ID from cookie
function getSavedPlayerIdFromCookie() {
    const value = getCookie('xiangqi_player_id');
    console.log('getSavedPlayerIdFromCookie:', value);
    return value;
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

    console.log('Cookies found:', document.cookie);
    console.log('Saved playerId:', savedPlayerId, 'Saved roomName:', savedRoomName);

    if (savedPlayerId && savedRoomName) {
        // Use saved player ID for potential reconnection
        currentPlayerId = savedPlayerId;
        currentRoomName = savedRoomName;
        console.log('Found saved session, attempting reconnection:', savedPlayerId, savedRoomName);
    } else {
        // Generate new player ID for new session
        currentPlayerId = 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        currentRoomName = savedRoomName;
        console.log('New session with playerId:', currentPlayerId);
    }

    try {
        const socket = new SockJS(CONFIG.WS_URL);
        stompClient = StompJs.Stomp.over(socket);

        stompClient.reconnect_delay = 5000;
        const headers = { playerId: currentPlayerId };
        stompClient.connect(headers, onConnected, onError);

        console.log('WebSocket activation initiated with playerId:', currentPlayerId);
    } catch (error) {
        console.error('Failed to initialize WebSocket:', error);
    }
}

// Expose connection status
window.isWebSocketConnected = function() {
    return stompClient && stompClient.connected;
};

// Expose saved room name for UI
window.getSavedRoomName = function() {
    return currentRoomName;
};

function onConnected(frame) {
    console.log('WebSocket Connected:', frame);
    reconnectAttempts = 0;
    stompClient.subscribe('/user/queue/game', onGameMessage);
    console.log('Subscribed to /user/queue/game');

    // If we have a saved room, try to rejoin
    if (currentRoomName) {
        console.log('Attempting to rejoin room:', currentRoomName);
        sendRejoin(currentRoomName);
    }
}

function onError(error) {
    console.error('STOMP error:', error);
}

function onDisconnected() {
    console.log('Disconnected');
    if (reconnectAttempts < MAX_RECONNECT) {
        reconnectAttempts++;
        setTimeout(() => connectWebSocket(), 2000 * reconnectAttempts);
    }
}

function onGameMessage(message) {
    const data = JSON.parse(message.body);
    handleServerMessage(data);
}

function subscribeToRoom(roomName) {
    if (roomSubscription) {
        roomSubscription.unsubscribe();
    }
    currentRoomName = roomName;
    roomSubscription = stompClient.subscribe('/topic/room/' + roomName, onGameMessage);
    console.log('Subscribed to room topic: /topic/room/' + roomName);
}

function sendCreateRoom(roomName) {
    if (stompClient && stompClient.connected) {
        console.log('Sending createRoom:', roomName);
        stompClient.publish({
            destination: '/app/createRoom',
            body: JSON.stringify({ roomName, playerId: currentPlayerId })
        });
    } else {
        console.error('WebSocket not connected, cannot create room');
    }
}

function sendJoinRoom(roomName) {
    if (stompClient && stompClient.connected) {
        currentRoomName = roomName;
        stompClient.publish({
            destination: '/app/joinRoom',
            body: JSON.stringify({ roomId: roomName, playerId: currentPlayerId })
        });
    }
}

function sendRejoin(roomName) {
    if (stompClient && stompClient.connected) {
        stompClient.publish({
            destination: '/app/rejoin',
            body: JSON.stringify({ roomId: roomName, playerId: currentPlayerId })
        });
    }
}

function sendMove(roomName, from, to) {
    if (stompClient && stompClient.connected) {
        stompClient.publish({
            destination: '/app/move',
            body: JSON.stringify({ roomId: roomName, from, to, playerId: currentPlayerId })
        });
    }
}

function sendResign(roomName) {
    if (stompClient && stompClient.connected) {
        stompClient.publish({
            destination: '/app/resign',
            body: JSON.stringify({ roomId: roomName, playerId: currentPlayerId })
        });
    }
}

function sendChatMessage(roomName, message) {
    if (stompClient && stompClient.connected) {
        stompClient.publish({
            destination: '/app/chat',
            body: JSON.stringify({ roomId: roomName, playerId: currentPlayerId, message: message })
        });
    }
}

function sendDrawRequest(roomName) {
    if (stompClient && stompClient.connected) {
        stompClient.publish({
            destination: '/app/drawRequest',
            body: JSON.stringify({ roomId: roomName, playerId: currentPlayerId })
        });
    }
}

function sendDrawResponse(roomName, accepted) {
    if (stompClient && stompClient.connected) {
        stompClient.publish({
            destination: '/app/drawResponse',
            body: JSON.stringify({ roomId: roomName, playerId: currentPlayerId, accepted: accepted })
        });
    }
}

function sendTakeBackRequest(roomName) {
    if (stompClient && stompClient.connected) {
        stompClient.publish({
            destination: '/app/takeBackRequest',
            body: JSON.stringify({ roomId: roomName, playerId: currentPlayerId })
        });
    }
}

function sendTakeBackResponse(roomName, accepted) {
    if (stompClient && stompClient.connected) {
        stompClient.publish({
            destination: '/app/takeBackResponse',
            body: JSON.stringify({ roomId: roomName, playerId: currentPlayerId, accepted: accepted })
        });
    }
}