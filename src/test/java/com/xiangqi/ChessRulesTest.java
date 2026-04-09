package com.xiangqi;

import com.xiangqi.game.ChessBoard;
import com.xiangqi.model.*;
import com.xiangqi.rules.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

import java.util.List;

public class ChessRulesTest {

    private MoveValidator moveValidator;
    private CheckDetector checkDetector;
    private MoveGenerator moveGenerator;
    private ChessBoard board;

    @BeforeEach
    void setUp() {
        moveValidator = new MoveValidator();
        checkDetector = new CheckDetector();
        moveGenerator = new MoveGenerator(moveValidator, checkDetector);
        board = new ChessBoard();
    }

    @Test
    void testInitialBoardState() {
        // 验证初始棋盘状态
        assertNotNull(board.getPiece(new Position(9, 4))); // 红帅
        assertEquals(PieceColor.RED, board.getPiece(new Position(9, 4)).getColor());
        assertNotNull(board.getPiece(new Position(0, 4))); // 黑将
        assertEquals(PieceColor.BLACK, board.getPiece(new Position(0, 4)).getColor());
        assertEquals(PieceColor.RED, board.getCurrentTurn());
    }

    @Test
    void testGeneralMove() {
        // 测试帅/将的正常移动
        // 初始棋盘(9,3)有仕，所以需要先移开仕或测试空棋盘
        ChessBoard testBoard = new ChessBoard();
        testBoard.setPiece(new Position(9, 3), null); // 移开仕
        
        Move move = new Move(new Position(9, 4), new Position(9, 3));
        assertTrue(moveValidator.isValidMove(testBoard, move, PieceColor.RED));
    }

    @Test
    void testGeneralOutOfPalace() {
        // 测试帅/将不能出九宫
        Move move = new Move(new Position(9, 4), new Position(9, 2));
        assertFalse(moveValidator.isValidMove(board, move, PieceColor.RED));
    }

    @Test
    void testHorseMoveWithBlocking() {
        // 测试蹩马腿：马在(9,1)，马腿在(8,1)，如果(8,1)有棋子则不能跳到(7,2)
        ChessBoard testBoard = new ChessBoard();
        // 在马腿位置放一个棋子
        testBoard.setPiece(new Position(8, 1), new Piece(PieceType.SOLDIER, PieceColor.RED));
        
        Move blockedMove = new Move(new Position(9, 1), new Position(7, 2));
        assertFalse(moveValidator.isValidMove(testBoard, blockedMove, PieceColor.RED));
        
        // 移除马腿棋子后应该可以移动
        testBoard.setPiece(new Position(8, 1), null);
        assertTrue(moveValidator.isValidMove(testBoard, blockedMove, PieceColor.RED));
    }

    @Test
    void testElephantMoveWithBlocking() {
        // 测试塞象眼：象在(9,2)，象眼在(8,3)
        Move move = new Move(new Position(9, 2), new Position(7, 4));
        // 象眼位置(8,3)应该是空的
        assertNull(board.getPiece(new Position(8, 3)));
        assertTrue(moveValidator.isValidMove(board, move, PieceColor.RED));
        
        // 在象眼位置放棋子 blocking
        ChessBoard testBoard = new ChessBoard();
        testBoard.setPiece(new Position(8, 3), new Piece(PieceType.SOLDIER, PieceColor.RED));
        assertFalse(moveValidator.isValidMove(testBoard, move, PieceColor.RED));
    }

    @Test
    void testElephantCannotCrossRiver() {
        // 测试象不能过河：红象不能到 row < 5
        Position elephantPos = new Position(9, 2);
        Move crossRiverMove = new Move(elephantPos, new Position(7, 0));
        // (7,0) 是合法的（row 7 >= 5），但 (7,4) 也是合法的
        // 测试真正过河的位置 row=4
        Move invalidMove = new Move(elephantPos, new Position(7, 4));
        // 这个移动是合法的（row 7 >= 5），但我们需要测试 row < 5
        // 象走田字，从(9,2)最远到(7,4)或(7,0)，都在己方
        // 测试从(7,4)继续走到(5,2)（row 5 是边界，合法）
        // 测试从(7,4)走到(5,6)（合法）
        // 真正测试：红象不能到 row < 5 的位置
        // 从(7,4)走田字会到(5,2)或(5,6)或(9,2)或(9,6)，都在 row >= 5
        // 所以红象永远无法过河，验证初始位置的象不能直接到 row < 5
        assertTrue(moveValidator.isValidMove(board, invalidMove, PieceColor.RED));
        
        // 验证红象不能到 row=4 的位置（需要两步，但单步验证规则）
        // 从(7,4)到(5,2)是合法的，但从(5,2)到(3,4)会过河（row 3 < 5）
        ChessBoard testBoard = new ChessBoard();
        testBoard.setPiece(new Position(5, 2), new Piece(PieceType.ELEPHANT, PieceColor.RED));
        Move crossMove = new Move(new Position(5, 2), new Position(3, 4));
        assertFalse(moveValidator.isValidMove(testBoard, crossMove, PieceColor.RED));
    }

    @Test
    void testFlyingGeneral() {
        // 测试将帅对面规则
        // 创建一个简化棋盘，只有两个将/帅在同一列且中间无子
        ChessBoard testBoard = new ChessBoard();
        // 清除所有棋子
        for (int row = 0; row < 10; row++) {
            for (int col = 0; col < 9; col++) {
                testBoard.setPiece(new Position(row, col), null);
            }
        }
        testBoard.setPiece(new Position(0, 4), new Piece(PieceType.GENERAL, PieceColor.BLACK));
        testBoard.setPiece(new Position(9, 4), new Piece(PieceType.GENERAL, PieceColor.RED));
        
        assertTrue(checkDetector.isInCheck(testBoard, PieceColor.RED));
        assertTrue(checkDetector.isInCheck(testBoard, PieceColor.BLACK));
    }

    @Test
    void testCheckDetection() {
        // 测试将军检测
        ChessBoard testBoard = new ChessBoard();
        // 清除所有棋子
        for (int row = 0; row < 10; row++) {
            for (int col = 0; col < 9; col++) {
                testBoard.setPiece(new Position(row, col), null);
            }
        }
        testBoard.setPiece(new Position(9, 4), new Piece(PieceType.GENERAL, PieceColor.RED));
        testBoard.setPiece(new Position(0, 0), new Piece(PieceType.CHARIOT, PieceColor.BLACK));
        // 车在(0,0)，帅在(9,4)，不在同一行/列，不将军
        assertFalse(checkDetector.isInCheck(testBoard, PieceColor.RED));
        
        // 车移到同一列
        testBoard.setPiece(new Position(0, 0), null);
        testBoard.setPiece(new Position(0, 4), new Piece(PieceType.CHARIOT, PieceColor.BLACK));
        assertTrue(checkDetector.isInCheck(testBoard, PieceColor.RED));
    }

    @Test
    void testLegalMovePreventsSelfCheck() {
        // 测试合法走法不能导致自己被将军（使用MoveGenerator.isLegalMove）
        ChessBoard testBoard = new ChessBoard();
        // 清除所有棋子
        for (int row = 0; row < 10; row++) {
            for (int col = 0; col < 9; col++) {
                testBoard.setPiece(new Position(row, col), null);
            }
        }
        testBoard.setPiece(new Position(9, 4), new Piece(PieceType.GENERAL, PieceColor.RED));
        testBoard.setPiece(new Position(0, 4), new Piece(PieceType.CHARIOT, PieceColor.BLACK));
        testBoard.setCurrentTurn(PieceColor.RED);
        
        // 帅不能移到被将军的位置（使用MoveGenerator的isLegalMove逻辑）
        Move move = new Move(new Position(9, 4), new Position(8, 4));
        // MoveValidator只检查基本规则，不检查将军
        assertTrue(moveValidator.isValidMove(testBoard, move, PieceColor.RED));
        // 但MoveGenerator的合法走法生成会过滤掉会导致被将军的走法
        List<Move> legalMoves = moveGenerator.generateLegalMoves(testBoard, PieceColor.RED);
        // 验证legalMoves中不包含会导致自己被将军的走法
        boolean containsBadMove = legalMoves.stream().anyMatch(m -> 
            m.getFrom().getRow() == 9 && m.getFrom().getCol() == 4 && 
            m.getTo().getRow() == 8 && m.getTo().getCol() == 4
        );
        assertFalse(containsBadMove, "合法走法不应包含会导致自己被将军的走法");
    }

    @Test
    void testSoldierMoveBeforeCrossingRiver() {
        // 测试兵过河前只能前进
        Move move = new Move(new Position(6, 0), new Position(5, 0));
        assertTrue(moveValidator.isValidMove(board, move, PieceColor.RED));
        
        Move sideMove = new Move(new Position(6, 0), new Position(6, 1));
        assertFalse(moveValidator.isValidMove(board, sideMove, PieceColor.RED));
    }

    @Test
    void testCannonCapture() {
        // 测试炮翻山吃子
        ChessBoard testBoard = new ChessBoard();
        for (int row = 0; row < 10; row++) {
            for (int col = 0; col < 9; col++) {
                testBoard.setPiece(new Position(row, col), null);
            }
        }
        testBoard.setPiece(new Position(5, 4), new Piece(PieceType.CANNON, PieceColor.RED));
        testBoard.setPiece(new Position(5, 5), new Piece(PieceType.SOLDIER, PieceColor.RED)); // 炮架
        testBoard.setPiece(new Position(5, 6), new Piece(PieceType.SOLDIER, PieceColor.BLACK)); // 目标
        
        Move captureMove = new Move(new Position(5, 4), new Position(5, 6));
        assertTrue(moveValidator.isValidMove(testBoard, captureMove, PieceColor.RED));
    }

    @Test
    void testCheckmate() {
        // 测试将杀检测逻辑能正常执行
        ChessBoard testBoard = new ChessBoard();
        for (int row = 0; row < 10; row++) {
            for (int col = 0; col < 9; col++) {
                testBoard.setPiece(new Position(row, col), null);
            }
        }
        testBoard.setPiece(new Position(9, 4), new Piece(PieceType.GENERAL, PieceColor.RED));
        testBoard.setPiece(new Position(0, 4), new Piece(PieceType.CHARIOT, PieceColor.BLACK));
        testBoard.setCurrentTurn(PieceColor.RED);
        
        // 验证isCheckmate方法能正常调用并返回正确结果
        boolean inCheck = checkDetector.isInCheck(testBoard, PieceColor.RED);
        boolean isCheckmate = moveGenerator.isCheckmate(testBoard, PieceColor.RED);
        assertTrue(inCheck, "应该检测到将军");
        // 帅可以移动，所以不是将杀
        assertFalse(isCheckmate, "帅有路可逃，不是将杀");
    }

    @Test
    void testStalemate() {
        // 测试困毙检测逻辑能正常执行
        ChessBoard testBoard = new ChessBoard();
        for (int row = 0; row < 10; row++) {
            for (int col = 0; col < 9; col++) {
                testBoard.setPiece(new Position(row, col), null);
            }
        }
        testBoard.setPiece(new Position(9, 4), new Piece(PieceType.GENERAL, PieceColor.RED));
        testBoard.setCurrentTurn(PieceColor.RED);
        
        // 验证isStalemate方法能正常调用并返回正确结果
        boolean inCheck = checkDetector.isInCheck(testBoard, PieceColor.RED);
        boolean isStalemate = moveGenerator.isStalemate(testBoard, PieceColor.RED);
        assertFalse(inCheck, "不应该被将军");
        assertFalse(isStalemate, "帅有路可走，不是困毙");
    }
}