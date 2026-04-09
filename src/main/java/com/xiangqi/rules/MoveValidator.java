package com.xiangqi.rules;

import com.xiangqi.model.*;
import com.xiangqi.game.ChessBoard;
import org.springframework.stereotype.Component;

@Component
public class MoveValidator {

    public boolean isValidMove(ChessBoard board, Move move, PieceColor currentTurn) {
        Position from = move.getFrom();
        Position to = move.getTo();

        Piece piece = board.getPiece(from);
        if (piece == null || piece.getColor() != currentTurn) return false;
        if (!to.isValid()) return false;

        Piece targetPiece = board.getPiece(to);
        if (targetPiece != null && targetPiece.getColor() == currentTurn) return false;

        switch (piece.getType()) {
            case GENERAL: return validateGeneralMove(board, from, to, piece.getColor());
            case ADVISOR: return validateAdvisorMove(board, from, to, piece.getColor());
            case ELEPHANT: return validateElephantMove(board, from, to, piece.getColor());
            case HORSE: return validateHorseMove(board, from, to);
            case CHARIOT: return validateChariotMove(board, from, to);
            case CANNON: return validateCannonMove(board, from, to);
            case SOLDIER: return validateSoldierMove(from, to, piece.getColor());
            default: return false;
        }
    }

    private boolean validateGeneralMove(ChessBoard board, Position from, Position to, PieceColor color) {
        if (!to.isInPalace(color)) return false;
        int rowDiff = Math.abs(to.getRow() - from.getRow());
        int colDiff = Math.abs(to.getCol() - from.getCol());
        return (rowDiff + colDiff == 1);
    }

    private boolean validateAdvisorMove(ChessBoard board, Position from, Position to, PieceColor color) {
        if (!to.isInPalace(color)) return false;
        int rowDiff = Math.abs(to.getRow() - from.getRow());
        int colDiff = Math.abs(to.getCol() - from.getCol());
        return (rowDiff == 1 && colDiff == 1);
    }

    private boolean validateElephantMove(ChessBoard board, Position from, Position to, PieceColor color) {
        if (color == PieceColor.RED && to.getRow() < 5) return false;
        if (color == PieceColor.BLACK && to.getRow() > 4) return false;

        int rowDiff = to.getRow() - from.getRow();
        int colDiff = to.getCol() - from.getCol();

        if (Math.abs(rowDiff) != 2 || Math.abs(colDiff) != 2) return false;

        int eyeRow = from.getRow() + rowDiff / 2;
        int eyeCol = from.getCol() + colDiff / 2;
        Position eyePos = new Position(eyeRow, eyeCol);

        return board.getPiece(eyePos) == null;
    }

    private boolean validateHorseMove(ChessBoard board, Position from, Position to) {
        int rowDiff = Math.abs(to.getRow() - from.getRow());
        int colDiff = Math.abs(to.getCol() - from.getCol());

        if (!((rowDiff == 2 && colDiff == 1) || (rowDiff == 1 && colDiff == 2))) return false;

        int legRow, legCol;
        if (rowDiff == 2) {
            legRow = from.getRow() + (to.getRow() - from.getRow()) / 2;
            legCol = from.getCol();
        } else {
            legRow = from.getRow();
            legCol = from.getCol() + (to.getCol() - from.getCol()) / 2;
        }

        Position legPos = new Position(legRow, legCol);
        return board.getPiece(legPos) == null;
    }

    private boolean validateChariotMove(ChessBoard board, Position from, Position to) {
        if (from.getRow() != to.getRow() && from.getCol() != to.getCol()) return false;
        return countPiecesBetween(board, from, to) == 0;
    }

    private boolean validateCannonMove(ChessBoard board, Position from, Position to) {
        if (from.getRow() != to.getRow() && from.getCol() != to.getCol()) return false;

        int piecesBetween = countPiecesBetween(board, from, to);
        Piece targetPiece = board.getPiece(to);

        if (targetPiece == null) {
            return piecesBetween == 0;
        } else {
            return piecesBetween == 1;
        }
    }

    private boolean validateSoldierMove(Position from, Position to, PieceColor color) {
        int rowDiff = to.getRow() - from.getRow();
        int colDiff = Math.abs(to.getCol() - from.getCol());

        if (color == PieceColor.RED) {
            if (from.getRow() > 4) {
                return (rowDiff == -1 && colDiff == 0);
            } else {
                return ((rowDiff == -1 && colDiff == 0) || (rowDiff == 0 && colDiff == 1));
            }
        } else {
            if (from.getRow() < 5) {
                return (rowDiff == 1 && colDiff == 0);
            } else {
                return ((rowDiff == 1 && colDiff == 0) || (rowDiff == 0 && colDiff == 1));
            }
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
