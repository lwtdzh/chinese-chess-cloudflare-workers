import { ChessBoard } from './ChessBoard';
import { MoveValidator } from './MoveValidator';
import { CheckDetector } from './CheckDetector';
import { PieceColor, Position, Move, Piece } from './types';

export class MoveGenerator {
  private moveValidator: MoveValidator;
  private checkDetector: CheckDetector;

  constructor() {
    this.moveValidator = new MoveValidator();
    this.checkDetector = new CheckDetector();
  }

  getValidMoves(board: ChessBoard, from: Position, myColor: PieceColor): Position[] {
    const moves: Position[] = [];

    for (let row = 0; row < 10; row++) {
      for (let col = 0; col < 9; col++) {
        const to: Position = { row, col };
        const move: Move = { from, to };

        if (this.moveValidator.isValidMove(board, move, myColor)) {
          // Check if this move would leave the king in check
          if (!this.wouldBeInCheck(board, move, myColor)) {
            moves.push(to);
          }
        }
      }
    }

    return moves;
  }

  private wouldBeInCheck(board: ChessBoard, move: Move, myColor: PieceColor): boolean {
    // Create a temporary board
    const tempBoard = board.deepCopy();

    // Make the move on the temp board
    const piece = tempBoard.getPiece(move.from);
    tempBoard.setPiece(move.from, null);
    tempBoard.setPiece(move.to, piece);

    // Check if the king is in check
    return this.checkDetector.isInCheck(tempBoard, myColor);
  }

  isCheckmate(board: ChessBoard, color: PieceColor): boolean {
    // If not in check, not checkmate
    if (!this.checkDetector.isInCheck(board, color)) return false;

    // Check if any piece can make a legal move
    return !this.hasLegalMove(board, color);
  }

  isStalemate(board: ChessBoard, color: PieceColor): boolean {
    // If in check, not stalemate
    if (this.checkDetector.isInCheck(board, color)) return false;

    // Check if any piece can make a legal move
    return !this.hasLegalMove(board, color);
  }

  private hasLegalMove(board: ChessBoard, color: PieceColor): boolean {
    // Check all pieces of the given color
    for (let row = 0; row < 10; row++) {
      for (let col = 0; col < 9; col++) {
        const pos: Position = { row, col };
        const piece = board.getPiece(pos);

        if (piece !== null && piece.color === color) {
          const moves = this.getValidMoves(board, pos, color);
          if (moves.length > 0) return true;
        }
      }
    }

    return false;
  }

  // Detect perpetual check (continuous checking with no escape)
  isPerpetualCheck(board: ChessBoard, checkingColor: PieceColor, isInCheck: boolean): boolean {
    // This is a simplified version - in a full implementation, you'd need to track
    // the history of positions and check if the same checking position repeats
    // For now, we return false as this requires position history tracking
    return false;
  }
}