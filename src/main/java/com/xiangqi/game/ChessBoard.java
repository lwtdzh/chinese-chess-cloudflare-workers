package com.xiangqi.game;

import com.xiangqi.model.*;
import lombok.Data;

@Data
public class ChessBoard {
    private Piece[][] board;
    private PieceColor currentTurn;

    public ChessBoard() {
        this.board = new Piece[10][9];
        this.currentTurn = PieceColor.RED;
        initializeBoard();
    }

    private void initializeBoard() {
        // 红方（下方）
        board[9][4] = new Piece(PieceType.GENERAL, PieceColor.RED);
        board[9][3] = new Piece(PieceType.ADVISOR, PieceColor.RED);
        board[9][5] = new Piece(PieceType.ADVISOR, PieceColor.RED);
        board[9][2] = new Piece(PieceType.ELEPHANT, PieceColor.RED);
        board[9][6] = new Piece(PieceType.ELEPHANT, PieceColor.RED);
        board[9][1] = new Piece(PieceType.HORSE, PieceColor.RED);
        board[9][7] = new Piece(PieceType.HORSE, PieceColor.RED);
        board[9][0] = new Piece(PieceType.CHARIOT, PieceColor.RED);
        board[9][8] = new Piece(PieceType.CHARIOT, PieceColor.RED);
        board[7][1] = new Piece(PieceType.CANNON, PieceColor.RED);
        board[7][7] = new Piece(PieceType.CANNON, PieceColor.RED);
        for (int i = 0; i < 5; i++) {
            board[6][i * 2] = new Piece(PieceType.SOLDIER, PieceColor.RED);
        }

        // 黑方（上方）
        board[0][4] = new Piece(PieceType.GENERAL, PieceColor.BLACK);
        board[0][3] = new Piece(PieceType.ADVISOR, PieceColor.BLACK);
        board[0][5] = new Piece(PieceType.ADVISOR, PieceColor.BLACK);
        board[0][2] = new Piece(PieceType.ELEPHANT, PieceColor.BLACK);
        board[0][6] = new Piece(PieceType.ELEPHANT, PieceColor.BLACK);
        board[0][1] = new Piece(PieceType.HORSE, PieceColor.BLACK);
        board[0][7] = new Piece(PieceType.HORSE, PieceColor.BLACK);
        board[0][0] = new Piece(PieceType.CHARIOT, PieceColor.BLACK);
        board[0][8] = new Piece(PieceType.CHARIOT, PieceColor.BLACK);
        board[2][1] = new Piece(PieceType.CANNON, PieceColor.BLACK);
        board[2][7] = new Piece(PieceType.CANNON, PieceColor.BLACK);
        for (int i = 0; i < 5; i++) {
            board[3][i * 2] = new Piece(PieceType.SOLDIER, PieceColor.BLACK);
        }
    }

    public Piece getPiece(Position pos) {
        if (!pos.isValid()) return null;
        return board[pos.getRow()][pos.getCol()];
    }

    public void setPiece(Position pos, Piece piece) {
        if (pos.isValid()) {
            board[pos.getRow()][pos.getCol()] = piece;
        }
    }

    public ChessBoard deepCopy() {
        ChessBoard copy = new ChessBoard();
        // 清除初始化棋盘的所有棋子
        for (int row = 0; row < 10; row++) {
            for (int col = 0; col < 9; col++) {
                copy.board[row][col] = null;
            }
        }
        // 复制当前棋盘的所有棋子
        for (int row = 0; row < 10; row++) {
            for (int col = 0; col < 9; col++) {
                Piece piece = board[row][col];
                if (piece != null) {
                    copy.board[row][col] = new Piece(piece.getType(), piece.getColor());
                }
            }
        }
        copy.currentTurn = this.currentTurn;
        return copy;
    }

    public String toFen() {
        StringBuilder fen = new StringBuilder();
        for (int row = 0; row < 10; row++) {
            for (int col = 0; col < 9; col++) {
                Piece piece = board[row][col];
                if (piece == null) {
                    fen.append('.');
                } else {
                    fen.append(getPieceChar(piece));
                }
            }
            if (row < 9) fen.append('/');
        }
        fen.append(currentTurn == PieceColor.RED ? " w" : " b");
        return fen.toString();
    }

    private char getPieceChar(Piece piece) {
        char c;
        switch (piece.getType()) {
            case GENERAL: c = 'k'; break;
            case ADVISOR: c = 'a'; break;
            case ELEPHANT: c = 'e'; break;
            case HORSE: c = 'h'; break;
            case CHARIOT: c = 'r'; break;
            case CANNON: c = 'c'; break;
            case SOLDIER: c = 'p'; break;
            default: c = '.';
        }
        return piece.getColor() == PieceColor.RED ? Character.toUpperCase(c) : c;
    }
}