package com.xiangqi.rules;

import com.xiangqi.model.*;
import com.xiangqi.game.ChessBoard;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
@RequiredArgsConstructor
public class MoveGenerator {
    private final MoveValidator validator;
    private final CheckDetector checkDetector;

    public List<Move> generateLegalMoves(ChessBoard board, PieceColor color) {
        List<Move> legalMoves = new ArrayList<>();

        for (int row = 0; row < 10; row++) {
            for (int col = 0; col < 9; col++) {
                Position from = new Position(row, col);
                Piece piece = board.getPiece(from);

                if (piece != null && piece.getColor() == color) {
                    List<Move> pieceMoves = generatePieceMoves(board, from, piece);
                    for (Move move : pieceMoves) {
                        if (isLegalMove(board, move, color)) {
                            legalMoves.add(move);
                        }
                    }
                }
            }
        }

        return legalMoves;
    }

    private List<Move> generatePieceMoves(ChessBoard board, Position from, Piece piece) {
        List<Move> moves = new ArrayList<>();
        PieceColor color = piece.getColor();

        switch (piece.getType()) {
            case GENERAL:
                int[][] generalDirs = {{-1, 0}, {1, 0}, {0, -1}, {0, 1}};
                for (int[] dir : generalDirs) {
                    Position to = new Position(from.getRow() + dir[0], from.getCol() + dir[1]);
                    if (to.isInPalace(color)) {
                        Piece target = board.getPiece(to);
                        if (target == null || target.getColor() != color) moves.add(new Move(from, to));
                    }
                }
                break;
            case ADVISOR:
                int[][] advisorDirs = {{-1, -1}, {-1, 1}, {1, -1}, {1, 1}};
                for (int[] dir : advisorDirs) {
                    Position to = new Position(from.getRow() + dir[0], from.getCol() + dir[1]);
                    if (to.isInPalace(color)) {
                        Piece target = board.getPiece(to);
                        if (target == null || target.getColor() != color) moves.add(new Move(from, to));
                    }
                }
                break;
            case ELEPHANT:
                int[][] elephantDirs = {{-2, -2}, {-2, 2}, {2, -2}, {2, 2}};
                for (int[] dir : elephantDirs) {
                    int newRow = from.getRow() + dir[0];
                    int newCol = from.getCol() + dir[1];
                    if (color == PieceColor.RED && newRow < 5) continue;
                    if (color == PieceColor.BLACK && newRow > 4) continue;
                    Position to = new Position(newRow, newCol);
                    if (to.isValid()) {
                        Position eye = new Position(from.getRow() + dir[0] / 2, from.getCol() + dir[1] / 2);
                        if (board.getPiece(eye) == null) {
                            Piece target = board.getPiece(to);
                            if (target == null || target.getColor() != color) moves.add(new Move(from, to));
                        }
                    }
                }
                break;
            case HORSE:
                int[][] horseDirs = {{-2, -1}, {-2, 1}, {-1, -2}, {-1, 2}, {1, -2}, {1, 2}, {2, -1}, {2, 1}};
                for (int[] dir : horseDirs) {
                    Position to = new Position(from.getRow() + dir[0], from.getCol() + dir[1]);
                    if (to.isValid()) {
                        int legRow = Math.abs(dir[0]) == 2 ? from.getRow() + dir[0] / 2 : from.getRow();
                        int legCol = Math.abs(dir[0]) == 2 ? from.getCol() : from.getCol() + dir[1] / 2;
                        if (board.getPiece(new Position(legRow, legCol)) == null) {
                            Piece target = board.getPiece(to);
                            if (target == null || target.getColor() != color) moves.add(new Move(from, to));
                        }
                    }
                }
                break;
            case CHARIOT:
                int[][] chariotDirs = {{-1, 0}, {1, 0}, {0, -1}, {0, 1}};
                for (int[] dir : chariotDirs) {
                    int r = from.getRow() + dir[0];
                    int c = from.getCol() + dir[1];
                    while (r >= 0 && r < 10 && c >= 0 && c < 9) {
                        Position to = new Position(r, c);
                        Piece target = board.getPiece(to);
                        if (target == null) {
                            moves.add(new Move(from, to));
                        } else {
                            if (target.getColor() != color) moves.add(new Move(from, to));
                            break;
                        }
                        r += dir[0];
                        c += dir[1];
                    }
                }
                break;
            case CANNON:
                int[][] cannonDirs = {{-1, 0}, {1, 0}, {0, -1}, {0, 1}};
                for (int[] dir : cannonDirs) {
                    int r = from.getRow() + dir[0];
                    int c = from.getCol() + dir[1];
                    boolean jumped = false;
                    while (r >= 0 && r < 10 && c >= 0 && c < 9) {
                        Position to = new Position(r, c);
                        Piece target = board.getPiece(to);
                        if (!jumped) {
                            if (target == null) moves.add(new Move(from, to));
                            else jumped = true;
                        } else {
                            if (target != null) {
                                if (target.getColor() != color) moves.add(new Move(from, to));
                                break;
                            }
                        }
                        r += dir[0];
                        c += dir[1];
                    }
                }
                break;
            case SOLDIER:
                if (color == PieceColor.RED) {
                    Position fwd = new Position(from.getRow() - 1, from.getCol());
                    if (fwd.isValid()) moves.add(new Move(from, fwd));
                    if (from.getRow() <= 4) {
                        Position left = new Position(from.getRow(), from.getCol() - 1);
                        Position right = new Position(from.getRow(), from.getCol() + 1);
                        if (left.isValid()) moves.add(new Move(from, left));
                        if (right.isValid()) moves.add(new Move(from, right));
                    }
                } else {
                    Position fwd = new Position(from.getRow() + 1, from.getCol());
                    if (fwd.isValid()) moves.add(new Move(from, fwd));
                    if (from.getRow() >= 5) {
                        Position left = new Position(from.getRow(), from.getCol() - 1);
                        Position right = new Position(from.getRow(), from.getCol() + 1);
                        if (left.isValid()) moves.add(new Move(from, left));
                        if (right.isValid()) moves.add(new Move(from, right));
                    }
                }
                break;
        }
        return moves;
    }

    private boolean isLegalMove(ChessBoard board, Move move, PieceColor color) {
        ChessBoard temp = board.deepCopy();
        Piece piece = temp.getPiece(move.getFrom());
        temp.setPiece(move.getFrom(), null);
        temp.setPiece(move.getTo(), piece);
        return !checkDetector.isInCheck(temp, color);
    }

    public boolean isCheckmate(ChessBoard board, PieceColor color) {
        if (!checkDetector.isInCheck(board, color)) return false;
        return generateLegalMoves(board, color).isEmpty();
    }

    public boolean isStalemate(ChessBoard board, PieceColor color) {
        if (checkDetector.isInCheck(board, color)) return false;
        return generateLegalMoves(board, color).isEmpty();
    }
}
