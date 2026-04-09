import { Piece, PieceType, PieceColor, Position, BoardData } from './types';

export class ChessBoard {
  private board: (Piece | null)[][];
  private _currentTurn: PieceColor;

  constructor() {
    this.board = this.createEmptyBoard();
    this._currentTurn = PieceColor.RED;
    this.initializeBoard();
  }

  private createEmptyBoard(): (Piece | null)[][] {
    return Array(10).fill(null).map(() => Array(9).fill(null));
  }

  private initializeBoard(): void {
    // Red side (bottom)
    this.board[9][4] = { type: PieceType.GENERAL, color: PieceColor.RED };
    this.board[9][3] = { type: PieceType.ADVISOR, color: PieceColor.RED };
    this.board[9][5] = { type: PieceType.ADVISOR, color: PieceColor.RED };
    this.board[9][2] = { type: PieceType.ELEPHANT, color: PieceColor.RED };
    this.board[9][6] = { type: PieceType.ELEPHANT, color: PieceColor.RED };
    this.board[9][1] = { type: PieceType.HORSE, color: PieceColor.RED };
    this.board[9][7] = { type: PieceType.HORSE, color: PieceColor.RED };
    this.board[9][0] = { type: PieceType.CHARIOT, color: PieceColor.RED };
    this.board[9][8] = { type: PieceType.CHARIOT, color: PieceColor.RED };
    this.board[7][1] = { type: PieceType.CANNON, color: PieceColor.RED };
    this.board[7][7] = { type: PieceType.CANNON, color: PieceColor.RED };
    for (let i = 0; i < 5; i++) {
      this.board[6][i * 2] = { type: PieceType.SOLDIER, color: PieceColor.RED };
    }

    // Black side (top)
    this.board[0][4] = { type: PieceType.GENERAL, color: PieceColor.BLACK };
    this.board[0][3] = { type: PieceType.ADVISOR, color: PieceColor.BLACK };
    this.board[0][5] = { type: PieceType.ADVISOR, color: PieceColor.BLACK };
    this.board[0][2] = { type: PieceType.ELEPHANT, color: PieceColor.BLACK };
    this.board[0][6] = { type: PieceType.ELEPHANT, color: PieceColor.BLACK };
    this.board[0][1] = { type: PieceType.HORSE, color: PieceColor.BLACK };
    this.board[0][7] = { type: PieceType.HORSE, color: PieceColor.BLACK };
    this.board[0][0] = { type: PieceType.CHARIOT, color: PieceColor.BLACK };
    this.board[0][8] = { type: PieceType.CHARIOT, color: PieceColor.BLACK };
    this.board[2][1] = { type: PieceType.CANNON, color: PieceColor.BLACK };
    this.board[2][7] = { type: PieceType.CANNON, color: PieceColor.BLACK };
    for (let i = 0; i < 5; i++) {
      this.board[3][i * 2] = { type: PieceType.SOLDIER, color: PieceColor.BLACK };
    }
  }

  getPiece(pos: Position): Piece | null {
    if (!this.isValidPosition(pos)) return null;
    return this.board[pos.row][pos.col];
  }

  setPiece(pos: Position, piece: Piece | null): void {
    if (this.isValidPosition(pos)) {
      this.board[pos.row][pos.col] = piece;
    }
  }

  isValidPosition(pos: Position): boolean {
    return pos.row >= 0 && pos.row <= 9 && pos.col >= 0 && pos.col <= 8;
  }

  isInPalace(pos: Position, color: PieceColor): boolean {
    if (pos.col < 3 || pos.col > 5) return false;
    if (color === PieceColor.RED) return pos.row >= 7 && pos.row <= 9;
    return pos.row >= 0 && pos.row <= 2;
  }

  get currentTurn(): PieceColor {
    return this._currentTurn;
  }

  set currentTurn(turn: PieceColor) {
    this._currentTurn = turn;
  }

  deepCopy(): ChessBoard {
    const copy = new ChessBoard();
    // Clear initialized board
    for (let row = 0; row < 10; row++) {
      for (let col = 0; col < 9; col++) {
        copy.board[row][col] = null;
      }
    }
    // Copy current board
    for (let row = 0; row < 10; row++) {
      for (let col = 0; col < 9; col++) {
        const piece = this.board[row][col];
        if (piece) {
          copy.board[row][col] = { ...piece };
        }
      }
    }
    copy._currentTurn = this._currentTurn;
    return copy;
  }

  serialize(): BoardData {
    return {
      pieces: this.board.map(row => row.map(p => p ? { ...p } : null)),
      currentTurn: this._currentTurn
    };
  }

  static deserialize(data: BoardData): ChessBoard {
    const board = new ChessBoard();
    // Clear initialized board
    for (let row = 0; row < 10; row++) {
      for (let col = 0; col < 9; col++) {
        board.board[row][col] = null;
      }
    }
    // Copy from data
    for (let row = 0; row < 10; row++) {
      for (let col = 0; col < 9; col++) {
        board.board[row][col] = data.pieces[row][col];
      }
    }
    board._currentTurn = data.currentTurn;
    return board;
  }

  toFen(): string {
    let fen = '';
    for (let row = 0; row < 10; row++) {
      for (let col = 0; col < 9; col++) {
        const piece = this.board[row][col];
        if (piece === null) {
          fen += '.';
        } else {
          fen += this.getPieceChar(piece);
        }
      }
      if (row < 9) fen += '/';
    }
    fen += this._currentTurn === PieceColor.RED ? ' w' : ' b';
    return fen;
  }

  private getPieceChar(piece: Piece): string {
    let c: string;
    switch (piece.type) {
      case PieceType.GENERAL: c = 'k'; break;
      case PieceType.ADVISOR: c = 'a'; break;
      case PieceType.ELEPHANT: c = 'e'; break;
      case PieceType.HORSE: c = 'h'; break;
      case PieceType.CHARIOT: c = 'r'; break;
      case PieceType.CANNON: c = 'c'; break;
      case PieceType.SOLDIER: c = 'p'; break;
      default: c = '.';
    }
    return piece.color === PieceColor.RED ? c.toUpperCase() : c;
  }
}