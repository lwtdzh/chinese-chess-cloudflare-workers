package com.xiangqi.controller;

import com.xiangqi.game.ChessBoard;
import com.xiangqi.game.GameRoom;
import com.xiangqi.game.RoomManager;
import com.xiangqi.model.*;
import com.xiangqi.rules.CheckDetector;
import com.xiangqi.rules.MoveGenerator;
import com.xiangqi.rules.MoveValidator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.annotation.SubscribeMapping;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Controller
@RequiredArgsConstructor
public class GameController {

    private final RoomManager roomManager;
    private final SimpMessagingTemplate messagingTemplate;
    private final MoveValidator moveValidator;
    private final CheckDetector checkDetector;
    private final MoveGenerator moveGenerator;

    @MessageMapping("/createRoom")
    public void createRoom(@Payload Map<String, String> payload, Principal principal, StompHeaderAccessor accessor) {
        String playerId = payload.getOrDefault("playerId", principal != null ? principal.getName() : "player_" + System.currentTimeMillis());
        String roomName = payload.getOrDefault("roomName", "房间");

        GameRoom room = roomManager.createRoom(roomName, playerId);

        // Room name already exists
        if (room == null) {
            Map<String, Object> error = new HashMap<>();
            error.put("type", "ERROR");
            error.put("message", "房间名已存在，请使用其他名称");
            messagingTemplate.convertAndSendToUser(playerId, "/queue/game", error);
            log.info("Room creation failed - name already exists: {} by {}", roomName, playerId);
            return;
        }

        String sessionId = accessor.getSessionId();
        roomManager.linkSession(sessionId, playerId);

        Map<String, Object> response = new HashMap<>();
        response.put("type", "ROOM_CREATED");
        response.put("roomId", room.getRoomId());
        response.put("roomName", room.getRoomName());
        response.put("playerId", playerId);
        response.put("color", "RED");
        messagingTemplate.convertAndSendToUser(playerId, "/queue/game", response);

        log.info("Room created: {} by {} with session {}", room.getRoomId(), playerId, sessionId);
    }

    @MessageMapping("/joinRoom")
    public void joinRoom(@Payload Map<String, String> payload, Principal principal, StompHeaderAccessor accessor) {
        String playerId = payload.getOrDefault("playerId", principal != null ? principal.getName() : "player_" + System.currentTimeMillis());
        String roomId = payload.get("roomId");

        GameRoom room = roomManager.joinRoom(roomId, playerId);
        if (room == null) {
            Map<String, Object> error = new HashMap<>();
            error.put("type", "ERROR");
            error.put("message", "房间不存在或已满");
            messagingTemplate.convertAndSendToUser(playerId, "/queue/game", error);
            return;
        }

        String sessionId = accessor.getSessionId();
        roomManager.linkSession(sessionId, playerId);

        Map<String, Object> response = new HashMap<>();
        response.put("type", "JOINED");
        response.put("roomId", room.getRoomId());
        response.put("playerId", playerId);
        response.put("color", room.getPlayerColor(playerId) == PieceColor.RED ? "RED" : "BLACK");
        messagingTemplate.convertAndSendToUser(playerId, "/queue/game", response);

        if (room.isFull()) {
            Map<String, Object> startMsg = new HashMap<>();
            startMsg.put("type", "GAME_START");
            startMsg.put("roomId", room.getRoomId());
            startMsg.put("board", serializeBoard(room.getBoard()));
            // Send to room topic for Player 1 who already subscribed
            messagingTemplate.convertAndSend("/topic/room/" + room.getRoomId(), startMsg);
            // Also send to joining player's user queue since they subscribe after JOINED
            messagingTemplate.convertAndSendToUser(playerId, "/queue/game", startMsg);
            log.info("Game started in room {}", room.getRoomId());
        }
    }

    @MessageMapping("/move")
    public void handleMove(@Payload Map<String, Object> payload, Principal principal) {
        String playerId = (String) payload.getOrDefault("playerId", principal != null ? principal.getName() : "unknown");
        String roomId = (String) payload.get("roomId");
        GameRoom room = roomManager.getRoom(roomId);
        
        if (room == null || room.getGameState() != GameState.PLAYING) return;
        
        PieceColor myColor = room.getPlayerColor(playerId);
        if (myColor == null || room.getBoard().getCurrentTurn() != myColor) return;

        @SuppressWarnings("unchecked")
        Map<String, Integer> from = (Map<String, Integer>) payload.get("from");
        @SuppressWarnings("unchecked")
        Map<String, Integer> to = (Map<String, Integer>) payload.get("to");
        
        Move move = new Move(new Position(from.get("row"), from.get("col")), 
                            new Position(to.get("row"), to.get("col")));

        if (!moveValidator.isValidMove(room.getBoard(), move, myColor)) {
            Map<String, Object> error = new HashMap<>();
            error.put("type", "INVALID_MOVE");
            messagingTemplate.convertAndSendToUser(playerId, "/queue/game", error);
            return;
        }

        ChessBoard board = room.getBoard();
        Piece piece = board.getPiece(move.getFrom());
        Piece capturedPiece = board.getPiece(move.getTo());

        // Store move for potential take back
        MoveRecord record = new MoveRecord(move, capturedPiece, myColor);
        room.addMove(record);

        board.setPiece(move.getFrom(), null);
        board.setPiece(move.getTo(), piece);
        
        PieceColor nextTurn = myColor == PieceColor.RED ? PieceColor.BLACK : PieceColor.RED;
        board.setCurrentTurn(nextTurn);
        room.updateActivity();

        boolean inCheck = checkDetector.isInCheck(board, nextTurn);
        room.getPositionHistory().addPosition(board, nextTurn, inCheck);

        if (moveGenerator.isCheckmate(board, nextTurn)) {
            room.setGameState(myColor == PieceColor.RED ? GameState.RED_WIN : GameState.BLACK_WIN);
        } else if (moveGenerator.isStalemate(board, nextTurn)) {
            room.setGameState(GameState.DRAW);
        } else if (room.getPositionHistory().isPerpetualCheck(board, nextTurn, inCheck)) {
            room.setGameState(myColor == PieceColor.RED ? GameState.BLACK_WIN : GameState.RED_WIN);
        }

        Map<String, Object> moveMsg = new HashMap<>();
        moveMsg.put("type", "MOVE");
        moveMsg.put("from", move.getFrom());
        moveMsg.put("to", move.getTo());
        moveMsg.put("piece", piece.getType().name());
        moveMsg.put("nextTurn", nextTurn.name());
        moveMsg.put("inCheck", inCheck);
        moveMsg.put("gameState", room.getGameState().name());
        messagingTemplate.convertAndSend("/topic/room/" + roomId, moveMsg);
    }

    @MessageMapping("/resign")
    public void resign(@Payload Map<String, String> payload, Principal principal) {
        String playerId = payload.getOrDefault("playerId", principal != null ? principal.getName() : "unknown");
        String roomId = payload.get("roomId");
        GameRoom room = roomManager.getRoom(roomId);

        if (room != null && room.getGameState() == GameState.PLAYING) {
            PieceColor myColor = room.getPlayerColor(playerId);
            room.setGameState(myColor == PieceColor.RED ? GameState.BLACK_WIN : GameState.RED_WIN);

            Map<String, Object> msg = new HashMap<>();
            msg.put("type", "GAME_OVER");
            msg.put("winner", myColor == PieceColor.RED ? "BLACK" : "RED");
            msg.put("reason", "RESIGN");
            messagingTemplate.convertAndSend("/topic/room/" + roomId, msg);
        }
    }

    @MessageMapping("/drawRequest")
    public void drawRequest(@Payload Map<String, String> payload, Principal principal) {
        String playerId = payload.getOrDefault("playerId", principal != null ? principal.getName() : "unknown");
        String roomId = payload.get("roomId");
        GameRoom room = roomManager.getRoom(roomId);

        if (room == null || room.getGameState() != GameState.PLAYING) return;
        if (!room.hasPlayer(playerId)) return;

        // Set pending draw request
        room.setDrawRequest(playerId);

        // Notify opponent
        Map<String, Object> msg = new HashMap<>();
        msg.put("type", "DRAW_REQUEST");
        msg.put("playerId", playerId);
        msg.put("playerColor", room.getPlayerColor(playerId) == PieceColor.RED ? "RED" : "BLACK");
        messagingTemplate.convertAndSend("/topic/room/" + roomId, msg);

        log.info("Draw request from {} in room {}", playerId, roomId);
    }

    @MessageMapping("/drawResponse")
    public void drawResponse(@Payload Map<String, String> payload, Principal principal) {
        String playerId = payload.getOrDefault("playerId", principal != null ? principal.getName() : "unknown");
        String roomId = payload.get("roomId");
        boolean accepted = Boolean.parseBoolean(payload.getOrDefault("accepted", "false"));
        GameRoom room = roomManager.getRoom(roomId);

        if (room == null || room.getGameState() != GameState.PLAYING) return;
        if (!room.hasPlayer(playerId)) return;
        if (room.getPendingDrawRequest() == null) return;
        if (room.getPendingDrawRequest().equals(playerId)) return; // Can't respond to own request

        room.clearDrawRequest();

        if (accepted) {
            room.setGameState(GameState.DRAW);
            Map<String, Object> msg = new HashMap<>();
            msg.put("type", "GAME_OVER");
            msg.put("winner", "DRAW");
            msg.put("reason", "AGREED_DRAW");
            messagingTemplate.convertAndSend("/topic/room/" + roomId, msg);
            log.info("Draw accepted in room {}", roomId);
        } else {
            Map<String, Object> msg = new HashMap<>();
            msg.put("type", "DRAW_DECLINED");
            msg.put("playerId", playerId);
            messagingTemplate.convertAndSend("/topic/room/" + roomId, msg);
            log.info("Draw declined in room {}", roomId);
        }
    }

    @MessageMapping("/takeBackRequest")
    public void takeBackRequest(@Payload Map<String, String> payload, Principal principal) {
        String playerId = payload.getOrDefault("playerId", principal != null ? principal.getName() : "unknown");
        String roomId = payload.get("roomId");
        GameRoom room = roomManager.getRoom(roomId);

        if (room == null || room.getGameState() != GameState.PLAYING) return;
        if (!room.hasPlayer(playerId)) return;
        if (!room.hasMoveHistory()) return;

        // Set pending take back request
        room.setTakeBackRequest(playerId);

        // Notify opponent
        Map<String, Object> msg = new HashMap<>();
        msg.put("type", "TAKE_BACK_REQUEST");
        msg.put("playerId", playerId);
        msg.put("playerColor", room.getPlayerColor(playerId) == PieceColor.RED ? "RED" : "BLACK");
        messagingTemplate.convertAndSend("/topic/room/" + roomId, msg);

        log.info("Take back request from {} in room {}", playerId, roomId);
    }

    @MessageMapping("/takeBackResponse")
    public void takeBackResponse(@Payload Map<String, String> payload, Principal principal) {
        String playerId = payload.getOrDefault("playerId", principal != null ? principal.getName() : "unknown");
        String roomId = payload.get("roomId");
        boolean accepted = Boolean.parseBoolean(payload.getOrDefault("accepted", "false"));
        GameRoom room = roomManager.getRoom(roomId);

        if (room == null || room.getGameState() != GameState.PLAYING) return;
        if (!room.hasPlayer(playerId)) return;
        if (room.getPendingTakeBackRequest() == null) return;
        if (room.getPendingTakeBackRequest().equals(playerId)) return;

        room.clearTakeBackRequest();

        if (accepted && room.hasMoveHistory()) {
            // Undo the last move
            MoveRecord record = room.getLastMove();
            ChessBoard board = room.getBoard();

            // Restore pieces
            Piece movingPiece = board.getPiece(record.getMove().getTo());
            board.setPiece(record.getMove().getFrom(), movingPiece);
            board.setPiece(record.getMove().getTo(), record.getCapturedPiece());

            // Restore turn
            board.setCurrentTurn(record.getTurnBefore());
            room.updateActivity();

            // Notify both players
            Map<String, Object> msg = new HashMap<>();
            msg.put("type", "TAKE_BACK");
            msg.put("board", serializeBoard(board));
            messagingTemplate.convertAndSend("/topic/room/" + roomId, msg);
            log.info("Take back accepted in room {}", roomId);
        } else {
            Map<String, Object> msg = new HashMap<>();
            msg.put("type", "TAKE_BACK_DECLINED");
            msg.put("playerId", playerId);
            messagingTemplate.convertAndSend("/topic/room/" + roomId, msg);
            log.info("Take back declined in room {}", roomId);
        }
    }

    @MessageMapping("/chat")
    public void handleChat(@Payload Map<String, String> payload, Principal principal) {
        String playerId = payload.getOrDefault("playerId", principal != null ? principal.getName() : "unknown");
        String roomId = payload.get("roomId");
        String message = payload.get("message");

        if (message == null || message.trim().isEmpty()) return;

        GameRoom room = roomManager.getRoom(roomId);
        if (room == null || !room.hasPlayer(playerId)) return;

        PieceColor playerColor = room.getPlayerColor(playerId);
        String colorStr = playerColor == PieceColor.RED ? "RED" : "BLACK";

        // Create and store chat message
        ChatMessage chatMessage = new ChatMessage(playerId, colorStr, message.trim());
        room.addChatMessage(chatMessage);

        // Broadcast to room
        Map<String, Object> msg = new HashMap<>();
        msg.put("type", "CHAT");
        msg.put("playerId", playerId);
        msg.put("playerColor", colorStr);
        msg.put("message", message.trim());
        msg.put("timestamp", chatMessage.getTimestamp().toString());
        messagingTemplate.convertAndSend("/topic/room/" + roomId, msg);

        log.info("Chat in room {}: {} said: {}", roomId, playerId, message);
    }

    @MessageMapping("/rejoin")
    public void rejoinRoom(@Payload Map<String, String> payload, Principal principal, StompHeaderAccessor accessor) {
        String playerId = payload.getOrDefault("playerId", principal != null ? principal.getName() : "unknown");
        String roomId = payload.get("roomId");

        GameRoom room = roomManager.getRoom(roomId);
        if (room == null) {
            Map<String, Object> error = new HashMap<>();
            error.put("type", "ERROR");
            error.put("message", "房间不存在");
            messagingTemplate.convertAndSendToUser(playerId, "/queue/game", error);
            return;
        }

        if (!room.hasPlayer(playerId)) {
            // Player not in this room - they need to join normally
            Map<String, Object> error = new HashMap<>();
            error.put("type", "ERROR");
            error.put("message", "你不在这个房间中");
            messagingTemplate.convertAndSendToUser(playerId, "/queue/game", error);
            return;
        }

        // Check if player was disconnected (only then allow rejoin)
        if (!room.isPlayerDisconnected(playerId)) {
            Map<String, Object> error = new HashMap<>();
            error.put("type", "ERROR");
            error.put("message", "你的游戏连接仍然有效，无需重连");
            messagingTemplate.convertAndSendToUser(playerId, "/queue/game", error);
            return;
        }

        String sessionId = accessor.getSessionId();
        GameRoom rejoinedRoom = roomManager.rejoinRoom(roomId, playerId, sessionId);
        if (rejoinedRoom == null) {
            Map<String, Object> error = new HashMap<>();
            error.put("type", "ERROR");
            error.put("message", "重连失败");
            messagingTemplate.convertAndSendToUser(playerId, "/queue/game", error);
            return;
        }

        Map<String, Object> response = new HashMap<>();
        response.put("type", "REJOINED");
        response.put("roomId", room.getRoomId());
        response.put("playerId", playerId);
        response.put("color", room.getPlayerColor(playerId) == PieceColor.RED ? "RED" : "BLACK");
        response.put("board", serializeBoard(room.getBoard()));
        response.put("currentTurn", room.getBoard().getCurrentTurn().name());
        response.put("gameState", room.getGameState().name());
        // Include chat history
        response.put("chatHistory", room.getChatMessages());
        messagingTemplate.convertAndSendToUser(playerId, "/queue/game", response);

        log.info("Player {} rejoined room {}", playerId, roomId);
    }

    private String getSessionId(Principal principal) {
        return principal != null ? principal.getName() : "unknown_session";
    }

    private Map<String, Object> serializeBoard(ChessBoard board) {
        Map<String, Object> result = new HashMap<>();
        Object[][] pieces = new Object[10][9];
        for (int row = 0; row < 10; row++) {
            for (int col = 0; col < 9; col++) {
                Piece piece = board.getPiece(new Position(row, col));
                if (piece != null) {
                    Map<String, String> p = new HashMap<>();
                    p.put("type", piece.getType().name());
                    p.put("color", piece.getColor().name());
                    pieces[row][col] = p;
                }
            }
        }
        result.put("pieces", pieces);
        result.put("currentTurn", board.getCurrentTurn().name());
        return result;
    }
}