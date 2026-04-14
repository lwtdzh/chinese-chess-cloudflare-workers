import { DurableObject, DurableObjectState, Request } from '@cloudflare/workers-types';
import { ChessBoard } from './game/ChessBoard';
import { MoveValidator } from './game/MoveValidator';
import { CheckDetector } from './game/CheckDetector';
import { MoveGenerator } from './game/MoveGenerator';
import { PieceColor, GameState, Move, MoveRecord, ChatMessage, ServerMessage, Piece } from './game/types';

interface Connection {
  webSocket: WebSocket;
  playerId: string;
}

export class GameRoomDO implements DurableObject {
  private state: DurableObjectState;
  private connections: Map<WebSocket, Connection> = new Map();

  // Game state
  private roomId: string = '';
  private roomName: string = '';
  private redPlayerId: string | null = null;
  private blackPlayerId: string | null = null;
  private board: ChessBoard | null = null;
  private gameState: GameState = GameState.WAITING;
  private moveHistory: MoveRecord[] = [];
  private chatMessages: ChatMessage[] = [];
  private pendingDrawRequest: string | null = null;
  private pendingTakeBackRequest: string | null = null;
  private lastActivityTime: number = Date.now();

  // Game logic
  private moveValidator: MoveValidator;
  private checkDetector: CheckDetector;
  private moveGenerator: MoveGenerator;

  // Track initialization
  private initializationPromise: Promise<void>;

  constructor(state: DurableObjectState) {
    this.state = state;
    this.moveValidator = new MoveValidator();
    this.checkDetector = new CheckDetector();
    this.moveGenerator = new MoveGenerator();

    // Restore state from storage on construction (handles hibernation)
    // Store the promise so fetch can wait for it
    this.initializationPromise = this.restoreState();
  }

  private async restoreState(): Promise<void> {
    try {
      const stored = await this.state.storage.get('gameState');
      if (stored) {
        const data = stored as any;
        this.roomId = data.roomId || '';
        this.roomName = data.roomName || '';
        this.redPlayerId = data.redPlayerId || null;
        this.blackPlayerId = data.blackPlayerId || null;
        this.gameState = data.gameState || GameState.WAITING;
        this.moveHistory = data.moveHistory || [];
        this.chatMessages = data.chatMessages || [];
        this.pendingDrawRequest = data.pendingDrawRequest || null;
        this.pendingTakeBackRequest = data.pendingTakeBackRequest || null;
        this.lastActivityTime = data.lastActivityTime || Date.now();

        // Restore board if we have pieces data
        if (data.boardData) {
          this.board = ChessBoard.deserialize(data.boardData);
        }
        console.log('Restored game state from storage:', {
          roomId: this.roomId,
          gameState: this.gameState,
          currentTurn: this.board?.currentTurn
        });
      }
    } catch (e) {
      console.error('Error restoring state:', e);
    }
  }

  private async saveState(): Promise<void> {
    try {
      await this.state.storage.put('gameState', {
        roomId: this.roomId,
        roomName: this.roomName,
        redPlayerId: this.redPlayerId,
        blackPlayerId: this.blackPlayerId,
        gameState: this.gameState,
        boardData: this.board ? this.board.serialize() : null,
        moveHistory: this.moveHistory,
        chatMessages: this.chatMessages,
        pendingDrawRequest: this.pendingDrawRequest,
        pendingTakeBackRequest: this.pendingTakeBackRequest,
        lastActivityTime: this.lastActivityTime
      });
    } catch (e) {
      console.error('Error saving state:', e);
    }
  }

  async fetch(request: Request): Promise<Response> {
    // Wait for state restoration to complete before handling any request
    await this.initializationPromise;

    const url = new URL(request.url);

    // Handle WebSocket upgrade
    const upgradeHeader = request.headers.get('Upgrade');
    if (upgradeHeader && upgradeHeader === 'websocket') {
      return this.handleWebSocket(request);
    }

    return new Response('Expected WebSocket', { status: 426 });
  }

  private async handleWebSocket(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const playerId = url.searchParams.get('playerId') || `player_${Date.now()}`;
    const roomName = url.searchParams.get('roomName') || '';

    // Set room info if this is the first connection
    if (!this.roomId && roomName) {
      this.roomId = roomName;
      this.roomName = roomName;
      await this.saveState();
    }

    // Create WebSocket pair
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    // Accept the WebSocket
    this.state.acceptWebSocket(server);

    // Store connection
    this.connections.set(server, { webSocket: server, playerId });

    console.log(`WebSocket connected: ${playerId} to room ${roomName}`);

    // Send connection confirmation
    server.send(JSON.stringify({
      type: 'CONNECTED',
      playerId: playerId,
      roomId: this.roomId
    }));

    // If this is a lobby connection (no room name yet), just keep connection open
    if (!roomName || roomName === 'lobby_main') {
      return new Response(null, { status: 101, webSocket: client });
    }

    // If room exists and player is already in it, send current state
    if (this.hasPlayer(playerId) && this.board) {
      // Broadcast OPPONENT_RECONNECTED to other players
      const myColor = this.getPlayerColor(playerId);
      if (myColor && this.gameState === GameState.PLAYING) {
        this.broadcast({
          type: 'OPPONENT_RECONNECTED',
          playerColor: myColor
        }, server); // Exclude the reconnecting player
      }

      server.send(JSON.stringify({
        type: 'REJOINED',
        roomId: this.roomId,
        playerId: playerId,
        color: this.getPlayerColor(playerId),
        board: this.board.serialize(),
        currentTurn: this.board.currentTurn,
        gameState: this.gameState,
        chatHistory: this.chatMessages
      }));
    }
    // If this is first player, auto-create room
    else if (!this.redPlayerId && !this.blackPlayerId) {
      this.redPlayerId = playerId;
      this.board = new ChessBoard();
      this.gameState = GameState.WAITING;
      this.lastActivityTime = Date.now();
      await this.saveState();

      server.send(JSON.stringify({
        type: 'ROOM_CREATED',
        roomId: this.roomId,
        roomName: this.roomName,
        playerId: playerId,
        color: 'RED'
      }));
    }
    // If player is trying to join an existing room
    else if (this.redPlayerId && !this.blackPlayerId && playerId !== this.redPlayerId) {
      this.blackPlayerId = playerId;
      this.lastActivityTime = Date.now();

      server.send(JSON.stringify({
        type: 'JOINED',
        roomId: this.roomId,
        playerId: playerId,
        color: 'BLACK'
      }));

      // Start the game
      if (this.board) {
        this.gameState = GameState.PLAYING;
        await this.saveState();

        const startMsg: ServerMessage = {
          type: 'GAME_START',
          roomId: this.roomId,
          board: this.board.serialize()
        };

        this.broadcast(startMsg);
      }
    }
    // Room is full or player already in room
    else if (this.redPlayerId === playerId) {
      server.send(JSON.stringify({
        type: 'JOINED',
        roomId: this.roomId,
        playerId: playerId,
        color: 'RED'
      }));
    }
    else {
      server.send(JSON.stringify({
        type: 'ERROR',
        message: '房间已满'
      }));
    }

    return new Response(null, { status: 101, webSocket: client });
  }

  private async handleMessage(ws: WebSocket, data: string): Promise<void> {
    try {
      const msg = JSON.parse(data);
      const connection = this.connections.get(ws);
      if (!connection) return;

      const playerId = connection.playerId;

      switch (msg.type) {
        case 'createRoom':
          await this.handleCreateRoom(ws, msg.roomName || '房间', playerId);
          break;
        case 'joinRoom':
          await this.handleJoinRoom(ws, msg.roomId, playerId);
          break;
        case 'move':
          await this.handleMove(ws, playerId, msg.from, msg.to);
          break;
        case 'resign':
          await this.handleResign(playerId);
          break;
        case 'drawRequest':
          await this.handleDrawRequest(playerId);
          break;
        case 'drawResponse':
          await this.handleDrawResponse(playerId, msg.accepted);
          break;
        case 'takeBackRequest':
          await this.handleTakeBackRequest(playerId);
          break;
        case 'takeBackResponse':
          await this.handleTakeBackResponse(playerId, msg.accepted);
          break;
        case 'chat':
          await this.handleChat(playerId, msg.message);
          break;
        case 'rejoin':
          this.handleRejoin(ws, msg.roomId, playerId);
          break;
        case 'restartGame':
          await this.handleRestartGame(playerId);
          break;
        case 'ping':
          // Ignore keepalive pings - no response needed
          break;
      }
    } catch (e) {
      console.error('Error handling message:', e);
    }
  }

  private async handleCreateRoom(ws: WebSocket, name: string, playerId: string): Promise<void> {
    if (this.roomId && this.redPlayerId && this.redPlayerId !== playerId) {
      // Room already exists with different player
      this.sendToWebSocket(ws, {
        type: 'ERROR',
        message: '房间名已存在，请使用其他名称'
      });
      return;
    }

    // If player is already the red player, just confirm
    if (this.redPlayerId === playerId) {
      this.sendToWebSocket(ws, {
        type: 'ROOM_CREATED',
        roomId: this.roomId,
        roomName: this.roomName,
        playerId: playerId,
        color: 'RED'
      });
      return;
    }

    this.roomId = name;
    this.roomName = name;
    this.redPlayerId = playerId;
    this.board = new ChessBoard();
    this.gameState = GameState.WAITING;
    this.lastActivityTime = Date.now();
    await this.saveState();

    this.sendToWebSocket(ws, {
      type: 'ROOM_CREATED',
      roomId: this.roomId,
      roomName: this.roomName,
      playerId: playerId,
      color: 'RED'
    });
  }

  private async handleJoinRoom(ws: WebSocket, roomId: string, playerId: string): Promise<void> {
    if (this.roomId !== roomId) {
      this.sendToWebSocket(ws, {
        type: 'ERROR',
        message: '房间不存在'
      });
      return;
    }

    if (this.redPlayerId === playerId) {
      // Already in room as red player
      this.sendToWebSocket(ws, {
        type: 'JOINED',
        roomId: this.roomId,
        playerId: playerId,
        color: 'RED'
      });
      return;
    }

    if (this.blackPlayerId && this.blackPlayerId !== playerId) {
      this.sendToWebSocket(ws, {
        type: 'ERROR',
        message: '房间已满'
      });
      return;
    }

    // Join as black player
    this.blackPlayerId = playerId;
    this.lastActivityTime = Date.now();

    this.sendToWebSocket(ws, {
      type: 'JOINED',
      roomId: this.roomId,
      playerId: playerId,
      color: 'BLACK'
    });

    // If room is full, start the game
    if (this.redPlayerId && this.blackPlayerId && this.board) {
      this.gameState = GameState.PLAYING;
      await this.saveState();

      const startMsg: ServerMessage = {
        type: 'GAME_START',
        roomId: this.roomId,
        board: this.board.serialize()
      };

      this.broadcast(startMsg);
    }
  }

  private async handleMove(ws: WebSocket, playerId: string, from: any, to: any): Promise<void> {
    if (!this.board || this.gameState !== GameState.PLAYING) return;

    const myColor = this.getPlayerColor(playerId);
    if (!myColor || this.board.currentTurn !== myColor) return;

    const move: Move = { from, to };

    if (!this.moveValidator.isValidMove(this.board, move, myColor)) {
      this.sendToWebSocket(ws, { type: 'INVALID_MOVE' });
      return;
    }

    const piece = this.board.getPiece(from);
    const capturedPiece = this.board.getPiece(to);

    // Store move for take back
    const record: MoveRecord = {
      move,
      capturedPiece,
      turnBefore: myColor
    };
    this.moveHistory.push(record);

    // Make the move
    this.board.setPiece(from, null);
    this.board.setPiece(to, piece);

    const nextTurn = myColor === PieceColor.RED ? PieceColor.BLACK : PieceColor.RED;
    this.board.currentTurn = nextTurn;
    this.lastActivityTime = Date.now();

    const inCheck = this.checkDetector.isInCheck(this.board, nextTurn);

    // Check for checkmate or stalemate
    if (this.moveGenerator.isCheckmate(this.board, nextTurn)) {
      this.gameState = myColor === PieceColor.RED ? GameState.RED_WIN : GameState.BLACK_WIN;
    } else if (this.moveGenerator.isStalemate(this.board, nextTurn)) {
      this.gameState = GameState.DRAW;
    }

    // Save state after move
    await this.saveState();

    const moveMsg: ServerMessage = {
      type: 'MOVE',
      from: move.from,
      to: move.to,
      piece: piece?.type,
      nextTurn: nextTurn,
      inCheck,
      gameState: this.gameState
    };

    this.broadcast(moveMsg);

    // If game ended, send GAME_OVER
    if (this.gameState !== GameState.PLAYING) {
      const winner = this.gameState === GameState.RED_WIN ? 'RED' :
                     this.gameState === GameState.BLACK_WIN ? 'BLACK' : 'DRAW';
      this.broadcast({
        type: 'GAME_OVER',
        winner,
        reason: this.gameState === GameState.DRAW ? 'STALEMATE' : 'CHECKMATE'
      });
    }
  }

  private async handleResign(playerId: string): Promise<void> {
    if (this.gameState !== GameState.PLAYING) return;

    const myColor = this.getPlayerColor(playerId);
    if (!myColor) return;

    this.gameState = myColor === PieceColor.RED ? GameState.BLACK_WIN : GameState.RED_WIN;
    await this.saveState();

    const winner = myColor === PieceColor.RED ? 'BLACK' : 'RED';
    this.broadcast({
      type: 'GAME_OVER',
      winner,
      reason: 'RESIGN'
    });
  }

  private async handleDrawRequest(playerId: string): Promise<void> {
    if (this.gameState !== GameState.PLAYING) return;
    if (!this.hasPlayer(playerId)) return;

    this.pendingDrawRequest = playerId;
    await this.saveState();

    const playerColor = this.getPlayerColor(playerId);
    this.broadcast({
      type: 'DRAW_REQUEST',
      playerId,
      playerColor: playerColor || undefined
    });
  }

  private async handleDrawResponse(playerId: string, accepted: boolean): Promise<void> {
    if (this.gameState !== GameState.PLAYING) return;
    if (!this.hasPlayer(playerId)) return;
    if (!this.pendingDrawRequest || this.pendingDrawRequest === playerId) return;

    this.pendingDrawRequest = null;

    if (accepted) {
      this.gameState = GameState.DRAW;
      await this.saveState();
      this.broadcast({
        type: 'GAME_OVER',
        winner: 'DRAW',
        reason: 'AGREED_DRAW'
      });
    } else {
      await this.saveState();
      this.broadcast({
        type: 'DRAW_DECLINED',
        playerId
      });
    }
  }

  private async handleTakeBackRequest(playerId: string): Promise<void> {
    if (this.gameState !== GameState.PLAYING) return;
    if (!this.hasPlayer(playerId)) return;
    if (this.moveHistory.length === 0) return;

    this.pendingTakeBackRequest = playerId;
    await this.saveState();

    const playerColor = this.getPlayerColor(playerId);
    this.broadcast({
      type: 'TAKE_BACK_REQUEST',
      playerId,
      playerColor: playerColor || undefined
    });
  }

  private async handleTakeBackResponse(playerId: string, accepted: boolean): Promise<void> {
    if (this.gameState !== GameState.PLAYING) return;
    if (!this.hasPlayer(playerId)) return;
    if (!this.pendingTakeBackRequest || this.pendingTakeBackRequest === playerId) return;

    this.pendingTakeBackRequest = null;

    if (accepted && this.moveHistory.length > 0 && this.board) {
      // Undo the last move
      const record = this.moveHistory.pop()!;
      const movingPiece = this.board.getPiece(record.move.to);

      this.board.setPiece(record.move.from, movingPiece);
      this.board.setPiece(record.move.to, record.capturedPiece);
      this.board.currentTurn = record.turnBefore;
      this.lastActivityTime = Date.now();
      await this.saveState();

      this.broadcast({
        type: 'TAKE_BACK',
        board: this.board.serialize()
      });
    } else {
      await this.saveState();
      this.broadcast({
        type: 'TAKE_BACK_DECLINED',
        playerId
      });
    }
  }

  private async handleChat(playerId: string, message: string): Promise<void> {
    if (!message || message.trim() === '') return;
    if (!this.hasPlayer(playerId)) return;

    const playerColor = this.getPlayerColor(playerId);
    const chatMsg: ChatMessage = {
      playerId,
      playerColor: playerColor || 'RED',
      message: message.trim(),
      timestamp: new Date().toISOString()
    };

    this.chatMessages.push(chatMsg);
    this.lastActivityTime = Date.now();
    await this.saveState();

    this.broadcast({
      type: 'CHAT',
      playerId,
      playerColor: playerColor || undefined,
      message: message.trim(),
      timestamp: chatMsg.timestamp
    });
  }

  private handleRejoin(ws: WebSocket, roomId: string, playerId: string): void {
    if (this.roomId !== roomId) {
      this.sendToWebSocket(ws, {
        type: 'ERROR',
        message: '房间不存在'
      });
      return;
    }

    if (!this.hasPlayer(playerId)) {
      this.sendToWebSocket(ws, {
        type: 'ERROR',
        message: '你不在这个房间中'
      });
      return;
    }

    if (!this.board) return;

    this.sendToWebSocket(ws, {
      type: 'REJOINED',
      roomId: this.roomId,
      playerId,
      color: this.getPlayerColor(playerId) || undefined,
      board: this.board.serialize(),
      currentTurn: this.board.currentTurn,
      gameState: this.gameState,
      chatHistory: this.chatMessages
    });
  }

  private async handleRestartGame(playerId: string): Promise<void> {
    // Only allow restart if game has ended (not PLAYING or WAITING)
    if (this.gameState === GameState.PLAYING || this.gameState === GameState.WAITING) {
      return;
    }

    // Only allow players in the room to restart
    if (!this.hasPlayer(playerId)) {
      return;
    }

    // Reset the board and game state
    this.board = new ChessBoard();
    this.gameState = GameState.PLAYING;
    this.moveHistory = [];
    this.pendingDrawRequest = null;
    this.pendingTakeBackRequest = null;
    this.lastActivityTime = Date.now();

    // Keep the same players and chat messages (optional - clear chat or keep it)
    // Let's keep chat messages for continuity

    await this.saveState();

    // Broadcast game restart to all players
    const startMsg: ServerMessage = {
      type: 'GAME_START',
      roomId: this.roomId,
      board: this.board.serialize()
    };

    this.broadcast(startMsg);
  }

  private getPlayerColor(playerId: string): PieceColor | null {
    if (playerId === this.redPlayerId) return PieceColor.RED;
    if (playerId === this.blackPlayerId) return PieceColor.BLACK;
    return null;
  }

  private hasPlayer(playerId: string): boolean {
    return playerId === this.redPlayerId || playerId === this.blackPlayerId;
  }

  private sendToWebSocket(ws: WebSocket, message: ServerMessage): void {
    try {
      ws.send(JSON.stringify(message));
    } catch (e) {
      console.error('Error sending message:', e);
    }
  }

  private broadcast(message: ServerMessage, excludeWs?: WebSocket): void {
    const data = JSON.stringify(message);
    for (const [ws] of this.connections) {
      if (ws === excludeWs) continue;
      try {
        ws.send(data);
      } catch (e) {
        console.error('Error broadcasting:', e);
      }
    }
  }

  // WebSocket Hibernation API handlers
  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    // Ensure state is restored before handling any message
    await this.initializationPromise;

    if (typeof message === 'string') {
      await this.handleMessage(ws, message);
    }
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean): Promise<void> {
    // Ensure state is restored
    await this.initializationPromise;

    const connection = this.connections.get(ws);
    this.connections.delete(ws);

    // Notify opponent of disconnect
    this.notifyOpponentDisconnect(connection);

    console.log(`WebSocket closed: code=${code}, reason=${reason}, wasClean=${wasClean}`);
  }

  async webSocketError(ws: WebSocket, error: any): Promise<void> {
    // Ensure state is restored
    await this.initializationPromise;

    const connection = this.connections.get(ws);
    this.connections.delete(ws);

    // Notify opponent of disconnect (error also means disconnect)
    this.notifyOpponentDisconnect(connection);

    console.error(`WebSocket error:`, error);
  }

  private notifyOpponentDisconnect(connection: Connection | undefined): void {
    if (connection && this.gameState === GameState.PLAYING) {
      const playerId = connection.playerId;
      const playerColor = this.getPlayerColor(playerId);
      if (playerColor) {
        // Broadcast to remaining connections
        this.broadcast({
          type: 'OPPONENT_DISCONNECTED',
          playerColor: playerColor
        });
      }
    }
  }
}