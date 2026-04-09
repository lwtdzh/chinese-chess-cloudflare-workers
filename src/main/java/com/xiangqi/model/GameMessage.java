package com.xiangqi.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class GameMessage {
    private String type;
    private String roomId;
    private Map<String, Object> payload;
}
