import { ChessBoard } from './ChessBoard';
import { Piece, PieceColor, Position, Move } from './types';

export class MoveValidator {
  isValidMove(board: ChessBoard, move: Move, currentTurn: PieceColor): boolean {
    const from = move.from;
    const to = move.to;

    const piece = board.getPiece(from);
    if (piece === null || piece.color !== currentTurn) return false;
    if (!board.isValidPosition(to)) return false;

    const targetPiece = board.getPiece(to);
    if (targetPiece !== null && targetPiece.color === currentTurn) return false;

    switch (piece.type) {
      case 'GENERAL': return this.validateGeneralMove(board, from, to, piece.color);
      case 'ADVISOR': return this.validateAdvisorMove(board, from, to, piece.color);
      case 'ELEPHANT': return this.validateElephantMove(board, from, to, piece.color);
      case 'HORSE': return this.validateHorseMove(board, from, to);
      case 'CHARIOT': return this.validateChariotMove(board, from, to);
      case 'CANNON': return this.validateCannonMove(board, from, to);
      case 'SOLDIER': return this.validateSoldierMove(from, to, piece.color);
      default: return false;
    }
  }

  private validateGeneralMove(board: ChessBoard, from: Position, to: Position, color: PieceColor): boolean {
    if (!board.isInPalace(to, color)) return false;
    const rowDiff = Math.abs(to.row - from.row);
    const colDiff = Math.abs(to.col - from.col);
    return (rowDiff + colDiff === 1);
  }

  private validateAdvisorMove(board: ChessBoard, from: Position, to: Position, color: PieceColor): boolean {
    if (!board.isInPalace(to, color)) return false;
    const rowDiff = Math.abs(to.row - from.row);
    const colDiff = Math.abs(to.col - from.col);
    return (rowDiff === 1 && colDiff === 1);
  }

  private validateElephantMove(board: ChessBoard, from: Position, to: Position, color: PieceColor): boolean {
    // Cannot cross river
    if (color === PieceColor.RED && to.row < 5) return false;
    if (color === PieceColor.BLACK && to.row > 4) return false;

    const rowDiff = to.row - from.row;
    const colDiff = to.col - from.col;

    if (Math.abs(rowDiff) !== 2 || Math.abs(colDiff) !== 2) return false;

    // Check blocking piece at elephant eye
    const eyeRow = from.row + rowDiff / 2;
    const eyeCol = from.col + colDiff / 2;

    return board.getPiece({ row: eyeRow, col: eyeCol }) === null;
  }

  private validateHorseMove(board: ChessBoard, from: Position, to: Position): boolean {
    const rowDiff = Math.abs(to.row - from.row);
    const colDiff = Math.abs(to.col - from.col);

    if (!((rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2))) return false;

    // Check blocking piece at horse leg
    let legRow: number, legCol: number;
    if (rowDiff === 2) {
      legRow = from.row + (to.row - from.row) / 2;
      legCol = from.col;
    } else {
      legRow = from.row;
      legCol = from.col + (to.col - from.col) / 2;
    }

    return board.getPiece({ row: legRow, col: legCol }) === null;
  }

  private validateChariotMove(board: ChessBoard, from: Position, to: Position): boolean {
    if (from.row !== to.row && from.col !== to.col) return false;
    return this.countPiecesBetween(board, from, to) === 0;
  }

  private validateCannonMove(board: ChessBoard, from: Position, to: Position): boolean {
    if (from.row !== to.row && from.col !== to.col) return false;

    const piecesBetween = this.countPiecesBetween(board, from, to);
    const targetPiece = board.getPiece(to);

    if (targetPiece === null) {
      // Moving without capture - must have no pieces in between
      return piecesBetween === 0;
    } else {
      // Capturing - must have exactly one piece in between (cannon platform)
      return piecesBetween === 1;
    }
  }

  private validateSoldierMove(from: Position, to: Position, color: PieceColor): boolean {
    const rowDiff = to.row - from.row;
    const colDiff = Math.abs(to.col - from.col);

    if (color === PieceColor.RED) {
      if (from.row > 4) {
        // Before crossing river - can only move forward
        return (rowDiff === -1 && colDiff === 0);
      } else {
        // After crossing river - can move forward or sideways
        return ((rowDiff === -1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1));
      }
    } else {
      if (from.row < 5) {
        return (rowDiff === 1 && colDiff === 0);
      } else {
        return ((rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1));
      }
    }
  }

  private countPiecesBetween(board: ChessBoard, from: Position, to: Position): number {
    let count = 0;

    if (from.row === to.row) {
      const minCol = Math.min(from.col, to.col);
      const maxCol = Math.max(from.col, to.col);
      for (let col = minCol + 1; col < maxCol; col++) {
        if (board.getPiece({ row: from.row, col }) !== null) count++;
      }
    } else {
      const minRow = Math.min(from.row, to.row);
      const maxRow = Math.max(from.row, to.row);
      for (let row = minRow + 1; row < maxRow; row++) {
        if (board.getPiece({ row, col: from.col }) !== null) count++;
      }
    }

    return count;
  }
}