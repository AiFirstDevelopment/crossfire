import type {
  GameState,
  Player,
  ClientMessage,
  ServerMessage,
  GameResult,
  HintResponse,
} from './types';
import { generateCrosswordGrid, gridToClientGrid, checkProgress, countTotalCells } from './crossword';
import englishWords from 'an-array-of-english-words';

// Create a Set for O(1) word lookup
const validWords = new Set(englishWords.map(w => w.toUpperCase()));

export interface Env {
  GAME_ROOM: DurableObjectNamespace;
  MATCHMAKING: DurableObjectNamespace;
}

interface ConnectedPlayer extends Player {
  websocket: WebSocket;
}

export class GameRoom {
  private state: DurableObjectState;
  private players: Map<WebSocket, ConnectedPlayer>;
  private gameState: GameState;

  constructor(state: DurableObjectState, _env: Env) {
    this.state = state;
    this.players = new Map();
    this.gameState = this.createInitialGameState();
  }

  private createInitialGameState(): GameState {
    return {
      phase: 'waiting',
      players: {},
      playerWords: {},
      grids: {},
      progress: {},
      phaseStartedAt: Date.now(),
    };
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.headers.get('Upgrade') === 'websocket') {
      return this.handleWebSocket(request);
    }

    if (url.pathname === '/room/info') {
      return new Response(
        JSON.stringify({
          playerCount: this.players.size,
          maxPlayers: 2,
          phase: this.gameState.phase,
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response('Not found', { status: 404 });
  }

  async handleWebSocket(_request: Request): Promise<Response> {
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    server.accept();

    const playerId = crypto.randomUUID();
    const playerName = `Player ${this.players.size + 1}`;

    // Check if room is full or game already started
    if (this.players.size >= 2) {
      this.sendTo(server, { type: 'error', code: 'ROOM_FULL', message: 'Room is full' });
      server.close(1008, 'Room is full');
      return new Response(null, { status: 101, webSocket: client });
    }

    if (this.gameState.phase !== 'waiting') {
      this.sendTo(server, { type: 'error', code: 'GAME_IN_PROGRESS', message: 'Game already in progress' });
      server.close(1008, 'Game in progress');
      return new Response(null, { status: 101, webSocket: client });
    }

    // Add player
    const player: ConnectedPlayer = { websocket: server, id: playerId, name: playerName };
    this.players.set(server, player);
    this.gameState.players[playerId] = { id: playerId, name: playerName };

    // Send welcome
    this.sendTo(server, {
      type: 'welcome',
      playerId,
      playerName,
      playerCount: this.players.size,
    });

    // Notify others
    this.broadcast({ type: 'player-joined', playerId, playerName, playerCount: this.players.size }, server);

    // Check if game should start
    if (this.players.size === 2) {
      this.startSubmissionPhase();
    }

    // Handle messages
    server.addEventListener('message', (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data as string) as ClientMessage;
        this.handleMessage(server, message);
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    });

    // Handle disconnect
    server.addEventListener('close', () => {
      this.handlePlayerDisconnect(server);
    });

    return new Response(null, { status: 101, webSocket: client });
  }

  private handlePlayerDisconnect(ws: WebSocket) {
    const player = this.players.get(ws);
    if (!player) return;

    this.players.delete(ws);
    delete this.gameState.players[player.id];

    this.broadcast({ type: 'player-left', playerId: player.id, playerName: player.name, playerCount: this.players.size });

    // Handle disconnect during game
    if (this.gameState.phase === 'submitting' || this.gameState.phase === 'solving') {
      const remainingPlayer = Array.from(this.players.values())[0];
      if (remainingPlayer) {
        this.endGame(remainingPlayer.id, 'opponent-left');
      }
    }
  }

  private handleMessage(sender: WebSocket, message: ClientMessage) {
    const player = this.players.get(sender);
    if (!player) return;

    switch (message.type) {
      case 'submit-words':
        this.handleSubmitWords(player, message.words);
        break;
      case 'cell-update':
        this.handleCellUpdate(player, message.row, message.col, message.letter);
        break;
      case 'hint-request':
        this.handleHintRequest(player, message.hint);
        break;
      case 'forfeit':
        this.handleForfeit(player);
        break;
    }
  }

  private startSubmissionPhase() {
    this.gameState.phase = 'submitting';
    this.gameState.phaseStartedAt = Date.now();

    this.broadcast({
      type: 'game-start',
      phase: 'submitting',
      timeoutMs: 120000, // 2 minutes
    });

    // Set alarm for timeout
    this.state.storage.setAlarm(Date.now() + 120000);
  }

  private handleSubmitWords(player: ConnectedPlayer, words: string[]) {
    if (this.gameState.phase !== 'submitting') {
      this.sendTo(player.websocket, { type: 'error', code: 'INVALID_PHASE', message: 'Cannot submit words now' });
      return;
    }

    // Already submitted
    if (this.gameState.playerWords[player.id]) {
      this.sendTo(player.websocket, { type: 'error', code: 'ALREADY_SUBMITTED', message: 'Words already submitted' });
      return;
    }

    // Validate words
    const validationError = this.validateWords(words);
    if (validationError) {
      this.sendTo(player.websocket, { type: 'error', code: 'INVALID_WORDS', message: validationError });
      // Return player to form to fix the issue
      this.sendTo(player.websocket, {
        type: 'game-start',
        phase: 'submitting',
        timeoutMs: 120000,
      });
      return;
    }

    // Store words
    this.gameState.playerWords[player.id] = words.map(w => w.toUpperCase().trim());

    // Acknowledge
    this.sendTo(player.websocket, { type: 'words-accepted', wordCount: words.length });

    // Notify opponent
    this.broadcast({ type: 'opponent-submitted' }, player.websocket);

    // Check if both submitted
    const playerIds = Object.keys(this.gameState.players);
    const allSubmitted = playerIds.every(id => this.gameState.playerWords[id]);

    if (allSubmitted) {
      this.startGeneratingPhase();
    }
  }

  private validateWords(words: string[]): string | null {
    if (!Array.isArray(words) || words.length !== 4) {
      return 'Exactly 4 words required';
    }

    const seen = new Set<string>();
    for (const word of words) {
      if (typeof word !== 'string') {
        return 'Invalid word format';
      }

      const normalized = word.toUpperCase().trim();

      if (normalized.length < 3) {
        return `Word "${word}" is too short (minimum 3 letters)`;
      }

      if (normalized.length > 12) {
        return `Word "${word}" is too long (maximum 12 letters)`;
      }

      if (!/^[A-Z]+$/.test(normalized)) {
        return `Word "${word}" contains invalid characters`;
      }

      if (seen.has(normalized)) {
        return `Duplicate word: ${word}`;
      }

      // Check if word is in the English dictionary
      if (!validWords.has(normalized)) {
        return `"${word}" is not a valid English word`;
      }

      seen.add(normalized);
    }

    return null;
  }

  private startGeneratingPhase() {
    this.gameState.phase = 'generating';

    // Generate grids for each player's words
    const playerIds = Object.keys(this.gameState.players);

    for (const playerId of playerIds) {
      const words = this.gameState.playerWords[playerId];
      const result = generateCrosswordGrid(words);

      if (!result.success) {
        // Grid generation failed - let player resubmit
        this.gameState.phase = 'submitting';
        this.gameState.phaseStartedAt = Date.now();
        delete this.gameState.playerWords[playerId];

        const player = Array.from(this.players.values()).find(p => p.id === playerId);
        if (player) {
          // Send error then tell them to resubmit
          this.sendTo(player.websocket, { type: 'error', code: 'GRID_FAILED', message: result.error });
          this.sendTo(player.websocket, {
            type: 'game-start',
            phase: 'submitting',
            timeoutMs: 120000,
          });
        }
        // Reset alarm for new submission period
        this.state.storage.setAlarm(Date.now() + 120000);
        return;
      }

      this.gameState.grids[playerId] = result.grid;
    }

    // Initialize progress for each player
    for (const playerId of playerIds) {
      this.gameState.progress[playerId] = {
        playerId,
        filledCells: {},
        hintsUsed: 0,
        timePenaltyMs: 0,
      };
    }

    this.startSolvingPhase();
  }

  private startSolvingPhase() {
    this.gameState.phase = 'solving';
    this.gameState.phaseStartedAt = Date.now();

    // Send each player their opponent's grid (letters blanked)
    const playerIds = Object.keys(this.gameState.players);

    for (const playerId of playerIds) {
      const player = Array.from(this.players.values()).find(p => p.id === playerId);
      if (!player) continue;

      // Find opponent's grid
      const opponentId = playerIds.find(id => id !== playerId);
      if (!opponentId) continue;

      const opponentGrid = this.gameState.grids[opponentId];
      const clientGrid = gridToClientGrid(opponentGrid);

      this.sendTo(player.websocket, {
        type: 'grid-ready',
        grid: clientGrid,
        timeoutMs: 300000, // 5 minutes
      });
    }

    // Set alarm for timeout
    this.state.storage.setAlarm(Date.now() + 300000);
  }

  private handleCellUpdate(player: ConnectedPlayer, row: number, col: number, letter: string) {
    if (this.gameState.phase !== 'solving') {
      this.sendTo(player.websocket, { type: 'error', code: 'INVALID_PHASE', message: 'Cannot update cells now' });
      return;
    }

    // Find opponent's grid (the one this player is solving)
    const playerIds = Object.keys(this.gameState.players);
    const opponentId = playerIds.find(id => id !== player.id);
    if (!opponentId) return;

    const grid = this.gameState.grids[opponentId];
    const cell = grid.cells[row]?.[col];

    if (!cell) {
      this.sendTo(player.websocket, { type: 'error', code: 'INVALID_CELL', message: 'Invalid cell position' });
      return;
    }

    // Update progress
    const progress = this.gameState.progress[player.id];
    const key = `${row},${col}`;
    progress.filledCells[key] = letter.toUpperCase();

    // Check if correct
    const correct = cell.letter === letter.toUpperCase();
    this.sendTo(player.websocket, { type: 'cell-accepted', row, col, correct });

    // Check completion
    const check = checkProgress(grid, progress.filledCells);

    // Notify opponent of progress
    this.broadcast(
      { type: 'opponent-progress', completionPercent: Math.round((check.correct / check.total) * 100) },
      player.websocket
    );

    if (check.complete) {
      progress.completedAt = Date.now();
      this.checkForWinner();
    }
  }

  private handleHintRequest(player: ConnectedPlayer, hint: { type: string; wordIndex?: number; row?: number; col?: number }) {
    if (this.gameState.phase !== 'solving') {
      this.sendTo(player.websocket, { type: 'error', code: 'INVALID_PHASE', message: 'Cannot request hints now' });
      return;
    }

    const playerIds = Object.keys(this.gameState.players);
    const opponentId = playerIds.find(id => id !== player.id);
    if (!opponentId) return;

    const grid = this.gameState.grids[opponentId];
    const progress = this.gameState.progress[player.id];

    let response: HintResponse;

    if (hint.type === 'word-length' && hint.wordIndex !== undefined) {
      const word = grid.words.find(w => w.index === hint.wordIndex);
      if (word) {
        response = {
          type: 'word-length',
          wordIndex: hint.wordIndex,
          length: word.word.length,
          timePenaltyMs: 0,
        };
      } else {
        this.sendTo(player.websocket, { type: 'error', code: 'INVALID_HINT', message: 'Invalid word index' });
        return;
      }
    } else if (hint.type === 'reveal-letter' && hint.row !== undefined && hint.col !== undefined) {
      const cell = grid.cells[hint.row]?.[hint.col];
      if (cell) {
        progress.hintsUsed++;
        progress.timePenaltyMs += 15000;
        response = {
          type: 'reveal-letter',
          row: hint.row,
          col: hint.col,
          letter: cell.letter,
          timePenaltyMs: 15000,
        };
      } else {
        this.sendTo(player.websocket, { type: 'error', code: 'INVALID_HINT', message: 'Invalid cell position' });
        return;
      }
    } else {
      this.sendTo(player.websocket, { type: 'error', code: 'INVALID_HINT', message: 'Invalid hint type' });
      return;
    }

    this.sendTo(player.websocket, { type: 'hint-response', hint: response });
  }

  private handleForfeit(player: ConnectedPlayer) {
    if (this.gameState.phase !== 'solving') return;

    const playerIds = Object.keys(this.gameState.players);
    const opponentId = playerIds.find(id => id !== player.id);

    if (opponentId) {
      this.endGame(opponentId, 'opponent-left');
    }
  }

  private checkForWinner() {
    const playerIds = Object.keys(this.gameState.players);
    const completedPlayers = playerIds.filter(id => this.gameState.progress[id]?.completedAt);

    if (completedPlayers.length === 0) return;

    if (completedPlayers.length === 2) {
      // Both completed - check times
      const times = completedPlayers.map(id => {
        const progress = this.gameState.progress[id];
        return {
          id,
          time: (progress.completedAt! - this.gameState.phaseStartedAt) + progress.timePenaltyMs,
        };
      });

      times.sort((a, b) => a.time - b.time);

      if (Math.abs(times[0].time - times[1].time) < 100) {
        this.endGame(null, 'tie');
      } else {
        this.endGame(times[0].id, 'completed');
      }
    } else {
      // First to complete wins
      this.endGame(completedPlayers[0], 'completed');
    }
  }

  private endGame(winnerId: string | null, reason: 'completed' | 'timeout' | 'opponent-left' | 'tie') {
    this.gameState.phase = 'finished';
    this.gameState.winnerId = winnerId ?? undefined;
    this.gameState.winReason = reason;

    const playerIds = Object.keys(this.gameState.players);

    for (const playerId of playerIds) {
      const player = Array.from(this.players.values()).find(p => p.id === playerId);
      if (!player) continue;

      const opponentId = playerIds.find(id => id !== playerId);
      const myProgress = this.gameState.progress[playerId];
      const opponentProgress = opponentId ? this.gameState.progress[opponentId] : null;
      const opponentGrid = opponentId ? this.gameState.grids[opponentId] : null;

      const myTime = myProgress?.completedAt
        ? (myProgress.completedAt - this.gameState.phaseStartedAt) + myProgress.timePenaltyMs
        : Infinity;

      const oppTime = opponentProgress?.completedAt
        ? (opponentProgress.completedAt - this.gameState.phaseStartedAt) + opponentProgress.timePenaltyMs
        : Infinity;

      const myTotal = opponentGrid ? countTotalCells(opponentGrid) : 0;
      const myCheck = opponentGrid ? checkProgress(opponentGrid, myProgress?.filledCells || {}) : { correct: 0 };

      const oppGrid = this.gameState.grids[playerId];
      const oppTotal = oppGrid ? countTotalCells(oppGrid) : 0;
      const oppCheck = oppGrid ? checkProgress(oppGrid, opponentProgress?.filledCells || {}) : { correct: 0 };

      const result: GameResult = {
        winnerId,
        winReason: reason,
        yourTime: myTime === Infinity ? -1 : myTime,
        opponentTime: oppTime === Infinity ? -1 : oppTime,
        yourProgress: myTotal > 0 ? Math.round((myCheck.correct / myTotal) * 100) : 0,
        opponentProgress: oppTotal > 0 ? Math.round((oppCheck.correct / oppTotal) * 100) : 0,
      };

      this.sendTo(player.websocket, { type: 'game-over', result });
    }
  }

  async alarm() {
    // Handle phase timeouts
    if (this.gameState.phase === 'submitting') {
      // Submission timeout - whoever submitted wins, or it's a draw
      const submitted = Object.keys(this.gameState.playerWords);
      if (submitted.length === 1) {
        this.endGame(submitted[0], 'timeout');
      } else if (submitted.length === 0) {
        this.endGame(null, 'timeout');
      }
    } else if (this.gameState.phase === 'solving') {
      // Solving timeout - most progress wins
      const playerIds = Object.keys(this.gameState.players);
      let bestId: string | null = null;
      let bestProgress = -1;

      for (const id of playerIds) {
        const opponentId = playerIds.find(pid => pid !== id);
        if (!opponentId) continue;

        const grid = this.gameState.grids[opponentId];
        const progress = this.gameState.progress[id];
        const check = checkProgress(grid, progress?.filledCells || {});
        const percent = (check.correct / check.total) * 100;

        if (percent > bestProgress) {
          bestProgress = percent;
          bestId = id;
        } else if (percent === bestProgress) {
          bestId = null; // Tie
        }
      }

      this.endGame(bestId, bestId ? 'timeout' : 'tie');
    }
  }

  private sendTo(ws: WebSocket, message: ServerMessage) {
    try {
      ws.send(JSON.stringify(message));
    } catch (error) {
      console.error('Error sending to player:', error);
    }
  }

  private broadcast(message: ServerMessage, exclude?: WebSocket) {
    const messageStr = JSON.stringify(message);
    for (const [ws] of this.players) {
      if (ws !== exclude) {
        try {
          ws.send(messageStr);
        } catch (error) {
          console.error('Error broadcasting:', error);
        }
      }
    }
  }
}
