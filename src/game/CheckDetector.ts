import { ChessBoard } from './ChessBoard';
import { Piece, PieceColor, Position } from './types';

export class CheckDetector {
  isInCheck(board: ChessBoard, kingColor: PieceColor): boolean {
    const kingPos = this.findKingPosition(board, kingColor);
    if (kingPos === null) return false;

    // Check flying general (kings facing each other)
    if (this.isFlyingGeneral(board, kingPos, kingColor)) return true;

    const opponentColor = kingColor === PieceColor.RED ? PieceColor.BLACK : PieceColor.RED;

    // Check if any opponent piece can attack the king
    for (let row = 0; row < 10; row++) {
      for (let col = 0; col < 9; col++) {
        const pos: Position = { row, col };
        const piece = board.getPiece(pos);

        if (piece !== null && piece.color === opponentColor) {
          if (this.canAttack(board, pos, kingPos, piece)) return true;
        }
      }
    }

    return false;
  }

  private findKingPosition(board: ChessBoard, color: PieceColor): Position | null {
    for (let row = 0; row < 10; row++) {
      for (let col = 0; col < 9; col++) {
        const pos: Position = { row, col };
        const piece = board.getPiece(pos);

        if (piece !== null && piece.type === 'GENERAL' && piece.color === color) {
          return pos;
        }
      }
    }
    return null;
  }

  private isFlyingGeneral(board: ChessBoard, kingPos: Position, kingColor: PieceColor): boolean {
    const opponentColor = kingColor === PieceColor.RED ? PieceColor.BLACK : PieceColor.RED;
    const opponentKingPos = this.findKingPosition(board, opponentColor);

    if (opponentKingPos === null) return false;
    if (kingPos.col !== opponentKingPos.col) return false;

    // Check if there are any pieces between the two kings
    const minRow = Math.min(kingPos.row, opponentKingPos.row);
    const maxRow = Math.max(kingPos.row, opponentKingPos.row);

    for (let row = minRow + 1; row < maxRow; row++) {
      if (board.getPiece({ row, col: kingPos.col }) !== null) return false;
    }

    return true;
  }

  private canAttack(board: ChessBoard, from: Position, to: Position, attacker: Piece): boolean {
    const rowDiff = to.row - from.row;
    const colDiff = to.col - from.col;
    const absRowDiff = Math.abs(rowDiff);
    const absColDiff = Math.abs(colDiff);

    switch (attacker.type) {
      case 'GENERAL':
        return board.isInPalace(to, attacker.color) &&
               absRowDiff + absColDiff === 1;

      case 'ADVISOR':
        return board.isInPalace(to, attacker.color) &&
               absRowDiff === 1 && absColDiff === 1;

      case 'ELEPHANT':
        if (absRowDiff !== 2 || absColDiff !== 2) return false;
        if (attacker.color === PieceColor.RED && to.row < 5) return false;
        if (attacker.color === PieceColor.BLACK && to.row > 4) return false;
        const eyeRow = from.row + rowDiff / 2;
        const eyeCol = from.col + colDiff / 2;
        return board.getPiece({ row: eyeRow, col: eyeCol }) === null;

      case 'HORSE':
        if (!((absRowDiff === 2 && absColDiff === 1) || (absRowDiff === 1 && absColDiff === 2))) return false;
        let legRow: number, legCol: number;
        if (absRowDiff === 2) {
          legRow = from.row + rowDiff / 2;
          legCol = from.col;
        } else {
          legRow = from.row;
          legCol = from.col + colDiff / 2;
        }
        return board.getPiece({ row: legRow, col: legCol }) === null;

      case 'CHARIOT':
        if (from.row !== to.row && from.col !== to.col) return false;
        return this.countPiecesBetween(board, from, to) === 0;

      case 'CANNON':
        if (from.row !== to.row && from.col !== to.col) return false;
        return this.countPiecesBetween(board, from, to) === 1;

      case 'SOLDIER':
        const sRowDiff = to.row - from.row;
        const sColDiff = Math.abs(to.col - from.col);
        if (attacker.color === PieceColor.RED) {
          if (from.row > 4) {
            return sRowDiff === -1 && sColDiff === 0;
          } else {
            return (sRowDiff === -1 && sColDiff === 0) || (sRowDiff === 0 && sColDiff === 1);
          }
        } else {
          if (from.row < 5) {
            return sRowDiff === 1 && sColDiff === 0;
          } else {
            return (sRowDiff === 1 && sColDiff === 0) || (sRowDiff === 0 && sColDiff === 1);
          }
        }

      default:
        return false;
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