package com.xiangqi.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class Position {
    private int row;
    private int col;

    public boolean isValid() {
        return row >= 0 && row < 10 && col >= 0 && col < 9;
    }

    public boolean isInPalace(PieceColor color) {
        if (col < 3 || col > 5) return false;
        if (color == PieceColor.RED) return row >= 7 && row <= 9;
        else return row >= 0 && row <= 2;
    }
}
