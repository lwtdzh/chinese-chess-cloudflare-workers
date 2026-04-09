package com.xiangqi.game;

import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Component
public class RoomManager {

    private final ConcurrentHashMap<String, GameRoom> rooms = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, String> playerRoomMap = new ConcurrentHashMap<>();

    public GameRoom createRoom(String roomName, String creatorId) {
        // Check if room with same name already exists
        if (rooms.containsKey(roomName)) {
            log.info("Room name already exists: {}", roomName);
            return null; // Return null to indicate duplicate name
        }

        GameRoom room = new GameRoom(roomName, creatorId);
        room.setRoomId(roomName); // Use room name as ID
        rooms.put(roomName, room);
        playerRoomMap.put(creatorId, roomName);
        log.info("Room created: {} by {}", roomName, creatorId);
        return room;
    }

    public GameRoom joinRoom(String roomName, String playerId) {
        GameRoom room = rooms.get(roomName);
        if (room == null || room.isFull()) return null;

        String oldRoomId = playerRoomMap.get(playerId);
        if (oldRoomId != null) leaveRoom(playerId);

        if (room.getRedPlayerId() == null) {
            room.setRedPlayerId(playerId);
        } else {
            room.setBlackPlayerId(playerId);
        }

        playerRoomMap.put(playerId, roomName);
        room.updateActivity();

        if (room.isFull()) {
            room.setGameState(com.xiangqi.model.GameState.PLAYING);
        }

        log.info("Player {} joined room {}", playerId, roomName);
        return room;
    }

    public void leaveRoom(String playerId) {
        String roomName = playerRoomMap.remove(playerId);
        if (roomName != null) {
            GameRoom room = rooms.get(roomName);
            if (room != null) {
                if (playerId.equals(room.getRedPlayerId())) room.setRedPlayerId(null);
                if (playerId.equals(room.getBlackPlayerId())) room.setBlackPlayerId(null);
                room.updateActivity();
                log.info("Player {} left room {}", playerId, roomName);
            }
        }
    }

    public GameRoom getRoom(String roomName) {
        return rooms.get(roomName);
    }

    public String getPlayerRoom(String playerId) {
        return playerRoomMap.get(playerId);
    }

    public void linkSession(String sessionId, String playerId) {
        GameRoom room = getRoomByPlayer(playerId);
        log.info("linkSession called: sessionId={}, playerId={}, room={}", sessionId, playerId, room != null ? room.getRoomId() : "null");
        if (room != null) {
            room.getSessionIdMap().put(sessionId, playerId);
            log.info("Session linked: {} -> {}", sessionId, playerId);
        }
    }

    public String getPlayerBySession(String sessionId) {
        for (GameRoom room : rooms.values()) {
            String playerId = room.getSessionIdMap().get(sessionId);
            if (playerId != null) return playerId;
        }
        return null;
    }

    private GameRoom getRoomByPlayer(String playerId) {
        String roomName = playerRoomMap.get(playerId);
        return roomName != null ? rooms.get(roomName) : null;
    }

    public GameRoom getRoomByPlayerId(String playerId) {
        String roomName = playerRoomMap.get(playerId);
        return roomName != null ? rooms.get(roomName) : null;
    }

    public GameRoom rejoinRoom(String roomName, String playerId, String newSessionId) {
        GameRoom room = rooms.get(roomName);
        if (room == null) return null;

        if (!room.hasPlayer(playerId)) return null;

        if (room.isPlayerDisconnected(playerId)) {
            room.markPlayerReconnected(playerId);
            room.getSessionIdMap().put(newSessionId, playerId);
            room.updateActivity();
            log.info("Player {} reconnected to room {}", playerId, roomName);
            return room;
        }

        return null;
    }

    @Scheduled(fixedRate = 60000)
    public void cleanupIdleRooms() {
        LocalDateTime now = LocalDateTime.now();
        rooms.entrySet().removeIf(entry -> {
            GameRoom room = entry.getValue();
            // Remove empty rooms after 10 minutes
            if (room.isEmpty() && Duration.between(room.getLastActivityTime(), now).toMinutes() >= 10) {
                log.info("Cleaning up idle room: {}", room.getRoomId());
                return true;
            }
            // End games that have been inactive for 10 minutes
            if (room.getGameState() == com.xiangqi.model.GameState.PLAYING &&
                Duration.between(room.getLastActivityTime(), now).toMinutes() >= 10) {
                log.info("Game timeout for room: {}", room.getRoomId());
                room.setGameState(com.xiangqi.model.GameState.TIMEOUT);
                return true;
            }
            return false;
        });
    }

    @Scheduled(fixedRate = 60000)
    public void cleanupStaleDisconnections() {
        for (GameRoom room : rooms.values()) {
            room.cleanupStaleDisconnections();
        }
    }
}