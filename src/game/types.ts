// Types for Chinese Chess game

export enum PieceType {
  GENERAL = 'GENERAL',
  ADVISOR = 'ADVISOR',
  ELEPHANT = 'ELEPHANT',
  HORSE = 'HORSE',
  CHARIOT = 'CHARIOT',
  CANNON = 'CANNON',
  SOLDIER = 'SOLDIER'
}

export enum PieceColor {
  RED = 'RED',
  BLACK = 'BLACK'
}

export enum GameState {
  WAITING = 'WAITING',
  PLAYING = 'PLAYING',
  RED_WIN = 'RED_WIN',
  BLACK_WIN = 'BLACK_WIN',
  DRAW = 'DRAW',
  TIMEOUT = 'TIMEOUT'
}

export interface Piece {
  type: PieceType;
  color: PieceColor;
}

export interface Position {
  row: number;
  col: number;
}

export interface Move {
  from: Position;
  to: Position;
}

export interface MoveRecord {
  move: Move;
  capturedPiece: Piece | null;
  turnBefore: PieceColor;
}

export interface ChatMessage {
  playerId: string;
  playerColor: string;
  message: string;
  timestamp: string;
}

// Message types for WebSocket communication
export interface ClientMessage {
  type: string;
  playerId?: string;
  roomName?: string;
  roomId?: string;
  from?: Position;
  to?: Position;
  message?: string;
  accepted?: boolean;
}

export interface ServerMessage {
  type: string;
  roomId?: string;
  roomName?: string;
  playerId?: string;
  color?: string;
  board?: BoardData;
  currentTurn?: string;
  gameState?: string;
  from?: Position;
  to?: Position;
  piece?: string;
  nextTurn?: string;
  inCheck?: boolean;
  winner?: string;
  reason?: string;
  playerColor?: string;
  message?: string;
  timestamp?: string;
  chatHistory?: ChatMessage[];
}

export interface BoardData {
  pieces: (Piece | null)[][];
  currentTurn: PieceColor;
}

// Game Room state for Durable Object
export interface GameRoomState {
  roomId: string;
  roomName: string;
  redPlayerId: string | null;
  blackPlayerId: string | null;
  board: (Piece | null)[][];
  currentTurn: PieceColor;
  gameState: GameState;
  moveHistory: MoveRecord[];
  chatMessages: ChatMessage[];
  pendingDrawRequest: string | null;
  pendingTakeBackRequest: string | null;
  lastActivityTime: number;
}

// Position history for repetition detection
export interface PositionRecord {
  fen: string;
  count: number;
}