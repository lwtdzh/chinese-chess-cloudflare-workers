package com.xiangqi.rules;

import com.xiangqi.model.*;
import com.xiangqi.game.ChessBoard;
import org.springframework.stereotype.Component;

@Component
public class CheckDetector {

    public boolean isInCheck(ChessBoard board, PieceColor kingColor) {
        Position kingPos = findKingPosition(board, kingColor);
        if (kingPos == null) return false;

        if (isFlyingGeneral(board, kingPos, kingColor)) return true;

        PieceColor opponentColor = kingColor == PieceColor.RED ? PieceColor.BLACK : PieceColor.RED;

        for (int row = 0; row < 10; row++) {
            for (int col = 0; col < 9; col++) {
                Position pos = new Position(row, col);
                Piece piece = board.getPiece(pos);

                if (piece != null && piece.getColor() == opponentColor) {
                    if (canAttack(board, pos, kingPos, piece)) return true;
                }
            }
        }

        return false;
    }

    private Position findKingPosition(ChessBoard board, PieceColor color) {
        for (int row = 0; row < 10; row++) {
            for (int col = 0; col < 9; col++) {
                Position pos = new Position(row, col);
                Piece piece = board.getPiece(pos);

                if (piece != null && piece.getType() == PieceType.GENERAL && piece.getColor() == color) {
                    return pos;
                }
            }
        }
        return null;
    }

    private boolean isFlyingGeneral(ChessBoard board, Position kingPos, PieceColor kingColor) {
        PieceColor opponentColor = kingColor == PieceColor.RED ? PieceColor.BLACK : PieceColor.RED;
        Position opponentKingPos = findKingPosition(board, opponentColor);

        if (opponentKingPos == null) return false;
        if (kingPos.getCol() != opponentKingPos.getCol()) return false;

        int minRow = Math.min(kingPos.getRow(), opponentKingPos.getRow());
        int maxRow = Math.max(kingPos.getRow(), opponentKingPos.getRow());

        for (int row = minRow + 1; row < maxRow; row++) {
            if (board.getPiece(new Position(row, kingPos.getCol())) != null) return false;
        }

        return true;
    }

    private boolean canAttack(ChessBoard board, Position from, Position to, Piece attacker) {
        switch (attacker.getType()) {
            case GENERAL:
                return to.isInPalace(attacker.getColor()) &&
                       Math.abs(to.getRow() - from.getRow()) + Math.abs(to.getCol() - from.getCol()) == 1;
            case ADVISOR:
                return to.isInPalace(attacker.getColor()) &&
                       Math.abs(to.getRow() - from.getRow()) == 1 &&
                       Math.abs(to.getCol() - from.getCol()) == 1;
            case ELEPHANT:
                int rowDiff = to.getRow() - from.getRow();
                int colDiff = to.getCol() - from.getCol();
                if (Math.abs(rowDiff) != 2 || Math.abs(colDiff) != 2) return false;
                if (attacker.getColor() == PieceColor.RED && to.getRow() < 5) return false;
                if (attacker.getColor() == PieceColor.BLACK && to.getRow() > 4) return false;
                Position eyePos = new Position(from.getRow() + rowDiff / 2, from.getCol() + colDiff / 2);
                return board.getPiece(eyePos) == null;
            case HORSE:
                int rDiff = Math.abs(to.getRow() - from.getRow());
                int cDiff = Math.abs(to.getCol() - from.getCol());
                if (!((rDiff == 2 && cDiff == 1) || (rDiff == 1 && cDiff == 2))) return false;
                int legRow, legCol;
                if (rDiff == 2) {
                    legRow = from.getRow() + (to.getRow() - from.getRow()) / 2;
                    legCol = from.getCol();
                } else {
                    legRow = from.getRow();
                    legCol = from.getCol() + (to.getCol() - from.getCol()) / 2;
                }
                return board.getPiece(new Position(legRow, legCol)) == null;
            case CHARIOT:
                if (from.getRow() != to.getRow() && from.getCol() != to.getCol()) return false;
                return countPiecesBetween(board, from, to) == 0;
            case CANNON:
                if (from.getRow() != to.getRow() && from.getCol() != to.getCol()) return false;
                return countPiecesBetween(board, from, to) == 1;
            case SOLDIER:
                int sRowDiff = to.getRow() - from.getRow();
                int sColDiff = Math.abs(to.getCol() - from.getCol());
                if (attacker.getColor() == PieceColor.RED) {
                    if (from.getRow() > 4) {
                        return sRowDiff == -1 && sColDiff == 0;
                    } else {
                        return (sRowDiff == -1 && sColDiff == 0) || (sRowDiff == 0 && sColDiff == 1);
                    }
                } else {
                    if (from.getRow() < 5) {
                        return sRowDiff == 1 && sColDiff == 0;
                    } else {
                        return (sRowDiff == 1 && sColDiff == 0) || (sRowDiff == 0 && sColDiff == 1);
                    }
                }
            default:
                return false;
        }
    }

    private int countPiecesBetween(ChessBoard board, Position from, Position to) {
        int count = 0;
        if (from.getRow() == to.getRow()) {
            int minCol = Math.min(from.getCol(), to.getCol());
            int maxCol = Math.max(from.getCol(), to.getCol());
            for (int col = minCol + 1; col < maxCol; col++) {
                if (board.getPiece(new Position(from.getRow(), col)) != null) count++;
            }
        } else {
            int minRow = Math.min(from.getRow(), to.getRow());
            int maxRow = Math.max(from.getRow(), to.getRow());
            for (int row = minRow + 1; row < maxRow; row++) {
                if (board.getPiece(new Position(row, from.getCol())) != null) count++;
            }
        }
        return count;
    }
}
