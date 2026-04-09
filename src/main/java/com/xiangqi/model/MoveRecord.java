package com.xiangqi.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class MoveRecord {
    private Move move;
    private Piece capturedPiece; // null if no capture
    private PieceColor turnBefore; // whose turn before this move
}