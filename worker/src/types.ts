// Game phases
export type GamePhase =
  | 'waiting'
  | 'submitting'
  | 'generating'
  | 'solving'
  | 'finished';

// Player information
export interface Player {
  id: string;
  name: string;
}

// Word placement on grid
export interface WordPlacement {
  word: string;
  startRow: number;
  startCol: number;
  direction: 'across' | 'down';
  index: number;
}

// Single cell in the grid
export interface GridCell {
  letter: string;
  wordIndices: number[];
  isIntersection: boolean;
}

// Complete crossword grid
export interface CrosswordGrid {
  width: number;
  height: number;
  cells: (GridCell | null)[][];
  words: WordPlacement[];
}

// Grid sent to client (letters blanked for solving)
export interface ClientGrid {
  width: number;
  height: number;
  cells: (ClientCell | null)[][];
  words: ClientWordPlacement[];
}

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

// Player's solving progress
export interface PlayerProgress {
  playerId: string;
  filledCells: Record<string, string>; // "row,col" -> letter
  completedAt?: number;
  hintsUsed: number;
  timePenaltyMs: number;
}

// Complete game state
export interface GameState {
  phase: GamePhase;
  players: Record<string, Player>;
  playerWords: Record<string, string[]>; // playerId -> their 4 words
  grids: Record<string, CrosswordGrid>; // playerId -> grid made from their words
  progress: Record<string, PlayerProgress>; // playerId -> their solving progress
  phaseStartedAt: number;
  winnerId?: string;
  winReason?: 'completed' | 'timeout' | 'opponent-left' | 'tie';
  rematchRequests?: Set<string>; // playerIds who want to play again
}

// Hint types
export type HintType = 'word-length' | 'reveal-letter';

export interface HintRequest {
  type: HintType;
  wordIndex?: number;
  row?: number;
  col?: number;
}

export interface HintResponse {
  type: HintType;
  wordIndex?: number;
  length?: number;
  row?: number;
  col?: number;
  letter?: string;
  timePenaltyMs: number;
}

// Client -> Server messages
export type ClientMessage =
  | { type: 'submit-words'; words: string[] }
  | { type: 'cell-update'; row: number; col: number; letter: string }
  | { type: 'hint-request'; hint: HintRequest }
  | { type: 'forfeit' }
  | { type: 'play-again' }
  | { type: 'leave-room' };

// Server -> Client messages
export type ServerMessage =
  | { type: 'welcome'; playerId: string; playerName: string; playerCount: number }
  | { type: 'player-joined'; playerId: string; playerName: string; playerCount: number }
  | { type: 'player-left'; playerId: string; playerName: string; playerCount: number }
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

export interface GameResult {
  winnerId: string | null;
  winReason: 'completed' | 'timeout' | 'opponent-left' | 'tie';
  yourTime: number;
  opponentTime: number;
  yourProgress: number;
  opponentProgress: number;
  solution: Record<string, string>; // "row,col" -> correct letter (for showing completed grid)
}

// Matchmaking messages
export type MatchmakingClientMessage =
  | { type: 'join-queue' }
  | { type: 'leave-queue' };

export type MatchmakingServerMessage =
  | { type: 'welcome'; playerId: string; playerName: string; queueSize: number; onlineCount: number; activeGames: number; totalGamesPlayed: number; multiplayerGamesPlayed: number; totalPlayers: number; returningUsers: number }
  | { type: 'queue-joined'; position: number }
  | { type: 'stats-update'; queueSize: number; onlineCount: number; activeGames: number; totalGamesPlayed: number; multiplayerGamesPlayed: number; totalPlayers: number; returningUsers: number }
  | { type: 'match-found'; roomId: string; opponent: { id: string; name: string } }
  | { type: 'leaderboard-update'; leaderboard: Array<{ rank: number; playerId: string; wins: number }> }
  | { type: 'error'; code: string; message: string };

// Constants
export const SUBMISSION_TIMEOUT_MS = 90000; // 90 seconds
export const SOLVING_TIMEOUT_MS = 300000; // 5 minutes
export const HINT_REVEAL_PENALTY_MS = 15000; // 15 seconds
export const WORD_COUNT = 4;
export const MIN_WORD_LENGTH = 3;
export const MAX_WORD_LENGTH = 12;
