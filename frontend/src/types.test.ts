import { describe, it, expect } from 'vitest';
import type {
  GamePhase,
  ClientCell,
  ClientWordPlacement,
  ClientGrid,
  GameResult,
  HintResponse,
  ServerMessage,
  ClientMessage,
} from './types';

describe('Type Definitions', () => {
  describe('GamePhase Type', () => {
    it('should accept valid game phases', () => {
      const phases: GamePhase[] = [
        'connecting',
        'matchmaking',
        'waiting',
        'submitting',
        'generating',
        'solving',
        'finished',
      ];
      expect(phases.length).toBe(7);
    });
  });

  describe('ClientCell Type', () => {
    it('should create valid client cell objects', () => {
      const cell: ClientCell = {
        wordIndices: [1, 2],
        isIntersection: true,
      };

      expect(cell.wordIndices).toContain(1);
      expect(cell.wordIndices).toContain(2);
      expect(cell.isIntersection).toBe(true);
    });

    it('should support empty word indices', () => {
      const cell: ClientCell = {
        wordIndices: [],
        isIntersection: false,
      };

      expect(cell.wordIndices.length).toBe(0);
      expect(cell.isIntersection).toBe(false);
    });
  });

  describe('ClientWordPlacement Type', () => {
    it('should create valid word placement objects', () => {
      const word: ClientWordPlacement = {
        startRow: 0,
        startCol: 0,
        direction: 'across',
        index: 1,
        length: 5,
        category: 'fruit',
      };

      expect(word.startRow).toBe(0);
      expect(word.startCol).toBe(0);
      expect(word.direction).toBe('across');
      expect(word.index).toBe(1);
      expect(word.length).toBe(5);
      expect(word.category).toBe('fruit');
    });

    it('should support down direction', () => {
      const word: ClientWordPlacement = {
        startRow: 2,
        startCol: 3,
        direction: 'down',
        index: 2,
        length: 7,
        category: 'animal',
      };

      expect(word.direction).toBe('down');
    });
  });

  describe('ClientGrid Type', () => {
    it('should create valid grid objects', () => {
      const grid: ClientGrid = {
        width: 10,
        height: 10,
        cells: [],
        words: [],
      };

      expect(grid.width).toBe(10);
      expect(grid.height).toBe(10);
      expect(Array.isArray(grid.cells)).toBe(true);
      expect(Array.isArray(grid.words)).toBe(true);
    });

    it('should support cells with null values', () => {
      const grid: ClientGrid = {
        width: 2,
        height: 2,
        cells: [
          [{ wordIndices: [1], isIntersection: false }, null],
          [null, { wordIndices: [1], isIntersection: false }],
        ],
        words: [],
      };

      expect(grid.cells[0][1]).toBeNull();
      expect(grid.cells[1][0]).toBeNull();
    });
  });

  describe('GameResult Type', () => {
    it('should create result with player winner', () => {
      const result: GameResult = {
        winnerId: 'player1',
        winReason: 'completed',
        yourTime: 120000,
        opponentTime: 180000,
        yourProgress: 100,
        opponentProgress: 80,
        solution: { '0,0': 'A', '0,1': 'P' },
      };

      expect(result.winnerId).toBe('player1');
      expect(result.winReason).toBe('completed');
      expect(result.yourTime).toBe(120000);
      expect(result.opponentTime).toBe(180000);
    });

    it('should create result with tie', () => {
      const result: GameResult = {
        winnerId: null,
        winReason: 'tie',
        yourTime: 150000,
        opponentTime: 150000,
        yourProgress: 100,
        opponentProgress: 100,
        solution: {},
      };

      expect(result.winnerId).toBeNull();
      expect(result.winReason).toBe('tie');
    });

    it('should support timeout win reason', () => {
      const result: GameResult = {
        winnerId: 'player2',
        winReason: 'timeout',
        yourTime: 300000,
        opponentTime: 300000,
        yourProgress: 50,
        opponentProgress: 100,
        solution: {},
      };

      expect(result.winReason).toBe('timeout');
    });

    it('should support opponent-left win reason', () => {
      const result: GameResult = {
        winnerId: 'player1',
        winReason: 'opponent-left',
        yourTime: 50000,
        opponentTime: 50000,
        yourProgress: 50,
        opponentProgress: 25,
        solution: {},
      };

      expect(result.winReason).toBe('opponent-left');
    });
  });

  describe('HintResponse Type', () => {
    it('should create word-length hint response', () => {
      const hint: HintResponse = {
        type: 'word-length',
        wordIndex: 1,
        length: 5,
        timePenaltyMs: 5000,
      };

      expect(hint.type).toBe('word-length');
      expect(hint.wordIndex).toBe(1);
      expect(hint.length).toBe(5);
      expect(hint.timePenaltyMs).toBe(5000);
    });

    it('should create reveal-letter hint response', () => {
      const hint: HintResponse = {
        type: 'reveal-letter',
        row: 2,
        col: 3,
        letter: 'A',
        timePenaltyMs: 10000,
      };

      expect(hint.type).toBe('reveal-letter');
      expect(hint.row).toBe(2);
      expect(hint.col).toBe(3);
      expect(hint.letter).toBe('A');
    });
  });

  describe('ServerMessage Type', () => {
    it('should create welcome message', () => {
      const msg: ServerMessage = {
        type: 'welcome',
        playerId: 'player-123',
        playerName: 'John',
        activeGames: 5,
        totalGamesPlayed: 10,
      };

      expect(msg.type).toBe('welcome');
      expect(msg.playerId).toBe('player-123');
      expect(msg.playerName).toBe('John');
    });

    it('should create match-found message', () => {
      const msg: ServerMessage = {
        type: 'match-found',
        roomId: 'room-456',
        opponent: { id: 'player-456', name: 'Jane' },
      };

      expect(msg.type).toBe('match-found');
      expect(msg.roomId).toBe('room-456');
      expect(msg.opponent.name).toBe('Jane');
    });

    it('should create game-start message', () => {
      const msg: ServerMessage = {
        type: 'game-start',
        phase: 'submitting',
        timeoutMs: 60000,
      };

      expect(msg.type).toBe('game-start');
      expect(msg.phase).toBe('submitting');
      expect(msg.timeoutMs).toBe(60000);
    });

    it('should create error message', () => {
      const msg: ServerMessage = {
        type: 'error',
        code: 'INVALID_WORDS',
        message: 'Words do not form a valid crossword',
      };

      expect(msg.type).toBe('error');
      expect(msg.code).toBe('INVALID_WORDS');
      expect(msg.message).toBeTruthy();
    });

    it('should create cell-accepted message', () => {
      const msg: ServerMessage = {
        type: 'cell-accepted',
        row: 1,
        col: 2,
        correct: true,
      };

      expect(msg.type).toBe('cell-accepted');
      expect(msg.correct).toBe(true);
    });

    it('should create opponent-progress message', () => {
      const msg: ServerMessage = {
        type: 'opponent-progress',
        completionPercent: 75,
      };

      expect(msg.type).toBe('opponent-progress');
      expect(msg.completionPercent).toBe(75);
    });

    it('should create stats-update message', () => {
      const msg: ServerMessage = {
        type: 'stats-update',
        queueSize: 10,
        onlineCount: 50,
        activeGames: 20,
        totalGamesPlayed: 100,
        totalPlayers: 500,
      };

      expect(msg.type).toBe('stats-update');
      if (msg.type === 'stats-update') {
        expect(msg.queueSize).toBe(10);
        expect(msg.activeGames).toBe(20);
        expect(msg.totalPlayers).toBe(500);
      }
    });
  });

  describe('ClientMessage Type', () => {
    it('should create join-queue message', () => {
      const msg: ClientMessage = { type: 'join-queue' };
      expect(msg.type).toBe('join-queue');
    });

    it('should create submit-words message', () => {
      const msg: ClientMessage = {
        type: 'submit-words',
        words: ['APPLE', 'BANANA', 'ORANGE'],
      };

      expect(msg.type).toBe('submit-words');
      expect(msg.words.length).toBe(3);
      expect(msg.words[0]).toBe('APPLE');
    });

    it('should create cell-update message', () => {
      const msg: ClientMessage = {
        type: 'cell-update',
        row: 1,
        col: 2,
        letter: 'A',
      };

      expect(msg.type).toBe('cell-update');
      expect(msg.letter).toBe('A');
    });

    it('should create hint-request message', () => {
      const msg: ClientMessage = {
        type: 'hint-request',
        hint: { type: 'word-length', wordIndex: 1 },
      };

      expect(msg.type).toBe('hint-request');
      expect(msg.hint.type).toBe('word-length');
    });

    it('should create forfeit message', () => {
      const msg: ClientMessage = { type: 'forfeit' };
      expect(msg.type).toBe('forfeit');
    });

    it('should create play-again message', () => {
      const msg: ClientMessage = { type: 'play-again' };
      expect(msg.type).toBe('play-again');
    });

    it('should create leave-room message', () => {
      const msg: ClientMessage = { type: 'leave-room' };
      expect(msg.type).toBe('leave-room');
    });
  });

  describe('Type Consistency', () => {
    it('should support complex grid structures', () => {
      const complexGrid: ClientGrid = {
        width: 5,
        height: 5,
        cells: Array(5)
          .fill(null)
          .map(() =>
            Array(5)
              .fill(null)
              .map(() => ({
                wordIndices: [1, 2],
                isIntersection: true,
              }))
          ),
        words: Array(4)
          .fill(null)
          .map((_, i) => ({
            startRow: i,
            startCol: i,
            direction: i % 2 === 0 ? ('across' as const) : ('down' as const),
            index: i + 1,
            length: 5,
            category: 'test',
          })),
      };

      expect(complexGrid.cells.length).toBe(5);
      expect(complexGrid.words.length).toBe(4);
    });

    it('should support empty game result solution', () => {
      const result: GameResult = {
        winnerId: null,
        winReason: 'opponent-left',
        yourTime: 0,
        opponentTime: 0,
        yourProgress: 0,
        opponentProgress: 0,
        solution: {},
      };

      expect(Object.keys(result.solution).length).toBe(0);
    });
  });
});
