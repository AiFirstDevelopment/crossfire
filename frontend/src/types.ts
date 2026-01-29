// Game phases
export type GamePhase =
  | 'connecting'
  | 'matchmaking'
  | 'waiting'
  | 'submitting'
  | 'generating'
  | 'solving'
  | 'finished';

// Client grid (letters blanked)
export interface ClientCell {
  wordIndices: number[];
  isIntersection: boolean;
}

export interface ClientWordPlacement {
  startRow: number;
  startCol: number;
  direction: 'across' | 'down';
  index: number;
  length: number;
  category: string; // Word category hint (e.g., "fruit", "animal")
}

export interface ClientGrid {
  width: number;
  height: number;
  cells: (ClientCell | null)[][];
  words: ClientWordPlacement[];
}

// Game result
export interface GameResult {
  winnerId: string | null;
  winReason: 'completed' | 'timeout' | 'opponent-left' | 'tie';
  yourTime: number;
  opponentTime: number;
  yourProgress: number;
  opponentProgress: number;
  solution: Record<string, string>; // "row,col" -> correct letter (for showing completed grid)
}

// Hint types
export interface HintResponse {
  type: 'word-length' | 'reveal-letter';
  wordIndex?: number;
  length?: number;
  row?: number;
  col?: number;
  letter?: string;
  timePenaltyMs: number;
}

// Server messages
export type ServerMessage =
  | { type: 'welcome'; playerId: string; playerName: string; playerCount?: number; queueSize?: number; onlineCount?: number; activeGames?: number; totalGamesPlayed?: number; totalPlayers?: number; returningUsers?: number }
  | { type: 'player-joined'; playerId: string; playerName: string; playerCount: number }
  | { type: 'player-left'; playerId: string; playerName: string; playerCount: number }
  | { type: 'queue-joined'; position: number }
  | { type: 'stats-update'; queueSize: number; onlineCount: number; activeGames: number; totalGamesPlayed: number; totalPlayers: number; returningUsers?: number }
  | { type: 'match-found'; roomId: string; opponent: { id: string; name: string } }
  | { type: 'game-start'; phase: 'submitting'; timeoutMs: number }
  | { type: 'words-accepted'; wordCount: number }
  | { type: 'opponent-submitted' }
  | { type: 'grid-ready'; grid: ClientGrid; timeoutMs: number; preFilledCells: Record<string, string> }
  | { type: 'cell-accepted'; row: number; col: number; correct: boolean }
  | { type: 'hint-response'; hint: HintResponse }
  | { type: 'opponent-progress'; completionPercent: number }
  | { type: 'game-over'; result: GameResult }
  | { type: 'opponent-wants-rematch' }
  | { type: 'rematch-starting' }
  | { type: 'error'; code: string; message: string };

// Client messages
export type ClientMessage =
  | { type: 'join-queue' }
  | { type: 'leave-queue' }
  | { type: 'submit-words'; words: string[] }
  | { type: 'cell-update'; row: number; col: number; letter: string }
  | { type: 'hint-request'; hint: { type: string; wordIndex?: number; row?: number; col?: number } }
  | { type: 'forfeit' }
  | { type: 'play-again' }
  | { type: 'leave-room' };
