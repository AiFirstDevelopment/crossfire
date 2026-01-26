import type { GamePhase, ClientGrid, GameResult, ServerMessage, ClientMessage, HintResponse } from './types';

export interface GameState {
  phase: GamePhase;
  playerId: string | null;
  playerName: string | null;
  opponentName: string | null;
  roomId: string | null;
  grid: ClientGrid | null;
  filledCells: Record<string, string>; // "row,col" -> letter
  cellCorrectness: Record<string, boolean>; // "row,col" -> correct
  opponentProgress: number;
  submissionTimeoutMs: number;
  solvingTimeoutMs: number;
  phaseStartedAt: number;
  result: GameResult | null;
  error: string | null;
}

type StateChangeHandler = (state: GameState) => void;

export class GameClient {
  private ws: WebSocket | null = null;
  private state: GameState;
  private stateHandlers: Set<StateChangeHandler> = new Set();
  private isProduction: boolean;

  constructor() {
    this.isProduction = window.location.hostname !== 'localhost';
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    return {
      phase: 'connecting',
      playerId: null,
      playerName: null,
      opponentName: null,
      roomId: null,
      grid: null,
      filledCells: {},
      cellCorrectness: {},
      opponentProgress: 0,
      submissionTimeoutMs: 60000,
      solvingTimeoutMs: 300000,
      phaseStartedAt: Date.now(),
      result: null,
      error: null,
    };
  }

  private getWsUrl(path: string): string {
    if (this.isProduction) {
      return `wss://crossfire-worker.joelstevick.workers.dev${path}`;
    }
    return `ws://localhost:8787${path}`;
  }

  onStateChange(handler: StateChangeHandler): () => void {
    this.stateHandlers.add(handler);
    handler(this.state); // Immediately call with current state
    return () => this.stateHandlers.delete(handler);
  }

  private updateState(partial: Partial<GameState>) {
    this.state = { ...this.state, ...partial };
    this.stateHandlers.forEach(h => h(this.state));
  }

  getState(): GameState {
    return this.state;
  }

  // Connect to matchmaking
  findMatch() {
    this.updateState({ phase: 'connecting', error: null });

    const url = this.getWsUrl('/api/matchmaking');
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.updateState({ phase: 'matchmaking' });
      this.send({ type: 'join-queue' });
    };

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data) as ServerMessage;
      this.handleMatchmakingMessage(message);
    };

    this.ws.onerror = () => {
      this.updateState({ phase: 'connecting', error: 'Connection failed' });
    };

    this.ws.onclose = () => {
      // If we got a match, we'll reconnect to game room
      if (this.state.phase === 'matchmaking') {
        this.updateState({ error: 'Disconnected from matchmaking' });
      }
    };
  }

  private handleMatchmakingMessage(message: ServerMessage) {
    switch (message.type) {
      case 'welcome':
        this.updateState({
          playerId: message.playerId,
          playerName: message.playerName,
        });
        break;

      case 'queue-joined':
        this.updateState({ phase: 'matchmaking' });
        break;

      case 'match-found':
        this.updateState({
          roomId: message.roomId,
          opponentName: message.opponent.name,
        });
        // Disconnect from matchmaking and connect to game room
        this.ws?.close();
        this.connectToRoom(message.roomId);
        break;

      case 'error':
        this.updateState({ error: message.message });
        break;
    }
  }

  // Connect directly to a room (for testing or rejoining)
  connectToRoom(roomId: string) {
    this.updateState({ phase: 'connecting', roomId, error: null });

    const url = this.getWsUrl(`/api/room/join?roomId=${roomId}`);
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.updateState({ phase: 'waiting' });
    };

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data) as ServerMessage;
      this.handleGameMessage(message);
    };

    this.ws.onerror = () => {
      this.updateState({ error: 'Connection failed' });
    };

    this.ws.onclose = () => {
      if (this.state.phase !== 'finished') {
        this.updateState({ error: 'Disconnected from game' });
      }
    };
  }

  private handleGameMessage(message: ServerMessage) {
    switch (message.type) {
      case 'welcome':
        this.updateState({
          playerId: message.playerId,
          playerName: message.playerName,
          phase: 'waiting',
        });
        break;

      case 'player-joined':
        if (message.playerId !== this.state.playerId) {
          this.updateState({ opponentName: message.playerName });
        }
        break;

      case 'player-left':
        // Opponent left - game will end via game-over message
        break;

      case 'game-start':
        this.updateState({
          phase: 'submitting',
          submissionTimeoutMs: message.timeoutMs,
          phaseStartedAt: Date.now(),
        });
        break;

      case 'words-accepted':
        // Words accepted, waiting for opponent
        break;

      case 'opponent-submitted':
        // Opponent has submitted their words
        break;

      case 'grid-ready':
        // Pre-fill first letters and mark them correct
        const firstLetterCorrectness: Record<string, boolean> = {};
        for (const key of Object.keys(message.firstLetters)) {
          firstLetterCorrectness[key] = true;
        }
        this.updateState({
          phase: 'solving',
          grid: message.grid,
          solvingTimeoutMs: message.timeoutMs,
          phaseStartedAt: Date.now(),
          filledCells: message.firstLetters,
          cellCorrectness: firstLetterCorrectness,
          error: null,
        });
        break;

      case 'cell-accepted':
        const key = `${message.row},${message.col}`;
        this.updateState({
          cellCorrectness: {
            ...this.state.cellCorrectness,
            [key]: message.correct,
          },
        });
        break;

      case 'hint-response':
        this.handleHintResponse(message.hint);
        break;

      case 'opponent-progress':
        this.updateState({ opponentProgress: message.completionPercent });
        break;

      case 'game-over':
        this.updateState({
          phase: 'finished',
          result: message.result,
        });
        break;

      case 'error':
        this.updateState({ error: message.message });
        break;
    }
  }

  private handleHintResponse(hint: HintResponse) {
    if (hint.type === 'reveal-letter' && hint.row !== undefined && hint.col !== undefined && hint.letter) {
      const key = `${hint.row},${hint.col}`;
      this.updateState({
        filledCells: {
          ...this.state.filledCells,
          [key]: hint.letter,
        },
        cellCorrectness: {
          ...this.state.cellCorrectness,
          [key]: true,
        },
      });
      // Also send the cell update to server so it tracks progress correctly
      this.send({ type: 'cell-update', row: hint.row, col: hint.col, letter: hint.letter });
    }
  }

  private send(message: ClientMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  submitWords(words: string[]) {
    this.send({ type: 'submit-words', words });
  }

  updateCell(row: number, col: number, letter: string) {
    const key = `${row},${col}`;
    this.updateState({
      filledCells: {
        ...this.state.filledCells,
        [key]: letter.toUpperCase(),
      },
    });
    this.send({ type: 'cell-update', row, col, letter });
  }

  requestHint(type: 'word-length' | 'reveal-letter', options: { wordIndex?: number; row?: number; col?: number }) {
    this.send({
      type: 'hint-request',
      hint: { type, ...options },
    });
  }

  forfeit() {
    this.send({ type: 'forfeit' });
  }

  disconnect() {
    this.ws?.close();
    this.ws = null;
  }

  reset() {
    this.disconnect();
    this.state = this.createInitialState();
    this.stateHandlers.forEach(h => h(this.state));
  }
}
