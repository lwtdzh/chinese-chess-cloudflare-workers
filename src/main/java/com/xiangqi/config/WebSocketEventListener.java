package com.xiangqi.config;

import com.xiangqi.game.GameRoom;
import com.xiangqi.game.RoomManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

@Slf4j
@Component
@RequiredArgsConstructor
public class WebSocketEventListener {

    private final RoomManager roomManager;

    @EventListener
    public void handleWebSocketConnectListener(SessionConnectEvent event) {
        log.info("WebSocket connection established: {}", event.getMessage());
    }

    @EventListener
    public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
        String sessionId = event.getSessionId();
        log.info("WebSocket disconnected: {}", sessionId);

        String playerId = roomManager.getPlayerBySession(sessionId);
        log.info("Player ID from session: {}", playerId);

        if (playerId != null) {
            GameRoom room = roomManager.getRoomByPlayerId(playerId);
            log.info("Room found: {}, Game state: {}", room != null ? room.getRoomId() : "null",
                     room != null ? room.getGameState() : "null");

            if (room != null && room.getGameState() == com.xiangqi.model.GameState.PLAYING) {
                room.markPlayerDisconnected(playerId);
                log.info("Player {} disconnected during game, keeping in room for reconnection", playerId);
            } else if (room != null) {
                roomManager.leaveRoom(playerId);
                log.info("Player {} left room {} (game not in playing state)", playerId, room.getRoomId());
            }
        } else {
            log.info("No player found for session {}", sessionId);
        }
    }
}