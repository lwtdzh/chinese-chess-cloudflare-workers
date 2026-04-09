package com.xiangqi.rules;

import com.xiangqi.model.PieceColor;
import com.xiangqi.game.ChessBoard;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

@Component
public class PositionHistory {
    private final Map<String, Integer> positionCount = new HashMap<>();
    private final Map<String, Integer> checkPositionCount = new HashMap<>();

    public void addPosition(ChessBoard board, PieceColor currentTurn, boolean isCheck) {
        String key = board.toFen();
        positionCount.put(key, positionCount.getOrDefault(key, 0) + 1);

        if (isCheck) {
            checkPositionCount.put(key, checkPositionCount.getOrDefault(key, 0) + 1);
        }
    }

    public boolean isPerpetualCheck(ChessBoard board, PieceColor currentTurn, boolean isCheck) {
        if (!isCheck) return false;
        String key = board.toFen();
        return checkPositionCount.getOrDefault(key, 0) >= 3;
    }

    public boolean isRepetition(ChessBoard board, PieceColor currentTurn) {
        String key = board.toFen();
        return positionCount.getOrDefault(key, 0) >= 3;
    }

    public void clear() {
        positionCount.clear();
        checkPositionCount.clear();
    }
}
