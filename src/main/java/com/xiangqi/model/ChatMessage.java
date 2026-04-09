package com.xiangqi.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ChatMessage {
    private String playerId;
    private String playerColor;
    private String message;
    private LocalDateTime timestamp;

    public ChatMessage(String playerId, String playerColor, String message) {
        this.playerId = playerId;
        this.playerColor = playerColor;
        this.message = message;
        this.timestamp = LocalDateTime.now();
    }
}