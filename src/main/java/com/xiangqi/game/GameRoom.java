package com.xiangqi.game;

import com.xiangqi.model.ChatMessage;
import com.xiangqi.model.GameState;
import com.xiangqi.model.MoveRecord;
import com.xiangqi.model.PieceColor;
import com.xiangqi.model.Move;
import com.xiangqi.rules.PositionHistory;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Stack;
import java.util.concurrent.ConcurrentHashMap;

@Data
public class GameRoom {
    private String roomId;
    private String roomName;
    private String redPlayerId;
    private String blackPlayerId;
    private ChessBoard board;
    private GameState gameState;
    private LocalDateTime lastActivityTime;
    private PositionHistory positionHistory;
    private Map<String, String> sessionIdMap; // sessionId -> playerId
    private Map<String, LocalDateTime> disconnectedPlayers; // playerId -> disconnectTime
    private List<ChatMessage> chatMessages;
    // Move history for take back
    private Stack<MoveRecord> moveHistory;
    // Pending requests
    private String pendingDrawRequest; // playerId who requested draw
    private String pendingTakeBackRequest; // playerId who requested take back

    public GameRoom(String roomName, String creatorId) {
        this.roomId = roomName; // Use room name as ID
        this.roomName = roomName;
        this.redPlayerId = creatorId;
        this.board = new ChessBoard();
        this.gameState = GameState.WAITING;
        this.lastActivityTime = LocalDateTime.now();
        this.positionHistory = new PositionHistory();
        this.sessionIdMap = new ConcurrentHashMap<>();
        this.disconnectedPlayers = new ConcurrentHashMap<>();
        this.chatMessages = new ArrayList<>();
        this.moveHistory = new Stack<>();
        this.pendingDrawRequest = null;
        this.pendingTakeBackRequest = null;
    }

    public boolean isFull() {
        return redPlayerId != null && blackPlayerId != null;
    }

    public boolean hasPlayer(String playerId) {
        return playerId.equals(redPlayerId) || playerId.equals(blackPlayerId);
    }

    public PieceColor getPlayerColor(String playerId) {
        if (playerId.equals(redPlayerId)) return PieceColor.RED;
        if (playerId.equals(blackPlayerId)) return PieceColor.BLACK;
        return null;
    }

    public boolean isEmpty() {
        return redPlayerId == null && blackPlayerId == null;
    }

    public void updateActivity() {
        this.lastActivityTime = LocalDateTime.now();
    }

    public int getPlayerCount() {
        int count = 0;
        if (redPlayerId != null) count++;
        if (blackPlayerId != null) count++;
        return count;
    }

    public void markPlayerDisconnected(String playerId) {
        disconnectedPlayers.put(playerId, LocalDateTime.now());
    }

    public void markPlayerReconnected(String playerId) {
        disconnectedPlayers.remove(playerId);
    }

    public boolean isPlayerDisconnected(String playerId) {
        return disconnectedPlayers.containsKey(playerId);
    }

    public void cleanupStaleDisconnections() {
        LocalDateTime now = LocalDateTime.now();
        disconnectedPlayers.entrySet().removeIf(entry ->
            java.time.Duration.between(entry.getValue(), now).toMinutes() >= 5
        );
    }

    public void addChatMessage(ChatMessage message) {
        chatMessages.add(message);
        updateActivity();
    }

    public List<ChatMessage> getChatMessages() {
        return new ArrayList<>(chatMessages);
    }

    public void clearChatMessages() {
        chatMessages.clear();
    }

    // Move history management
    public void addMove(MoveRecord record) {
        moveHistory.push(record);
    }

    public MoveRecord getLastMove() {
        return moveHistory.isEmpty() ? null : moveHistory.pop();
    }

    public boolean hasMoveHistory() {
        return !moveHistory.isEmpty();
    }

    // Draw request management
    public boolean hasPendingDrawRequest() {
        return pendingDrawRequest != null;
    }

    public void setDrawRequest(String playerId) {
        this.pendingDrawRequest = playerId;
    }

    public String getPendingDrawRequest() {
        return pendingDrawRequest;
    }

    public void clearDrawRequest() {
        this.pendingDrawRequest = null;
    }

    // Take back request management
    public boolean hasPendingTakeBackRequest() {
        return pendingTakeBackRequest != null;
    }

    public void setTakeBackRequest(String playerId) {
        this.pendingTakeBackRequest = playerId;
    }

    public String getPendingTakeBackRequest() {
        return pendingTakeBackRequest;
    }

    public void clearTakeBackRequest() {
        this.pendingTakeBackRequest = null;
    }
}