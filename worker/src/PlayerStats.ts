export interface Env {
  PLAYER_STATS: DurableObjectNamespace;
  LEADERBOARD: DurableObjectNamespace;
}

// Achievement definitions
export const ACHIEVEMENTS: Record<string, { id: string; name: string; description: string }> = {
  first_win: { id: 'first_win', name: 'First Blood', description: 'Win your first game' },
  win_streak_3: { id: 'win_streak_3', name: 'Hot Streak', description: 'Win 3 games in a row' },
  win_streak_5: { id: 'win_streak_5', name: 'On Fire', description: 'Win 5 games in a row' },
  win_streak_10: { id: 'win_streak_10', name: 'Unstoppable', description: 'Win 10 games in a row' },
  daily_streak_3: { id: 'daily_streak_3', name: 'Dedicated', description: 'Play 3 days in a row' },
  daily_streak_7: { id: 'daily_streak_7', name: 'Committed', description: 'Play 7 days in a row' },
  daily_streak_30: { id: 'daily_streak_30', name: 'Addicted', description: 'Play 30 days in a row' },
  speed_demon: { id: 'speed_demon', name: 'Speed Demon', description: 'Win a game in under 60 seconds' },
  no_hints: { id: 'no_hints', name: 'Pure Skill', description: 'Win without using any hints' },
  ten_wins: { id: 'ten_wins', name: 'Getting Good', description: 'Win 10 games' },
  fifty_wins: { id: 'fifty_wins', name: 'Veteran', description: 'Win 50 games' },
  hundred_wins: { id: 'hundred_wins', name: 'Legend', description: 'Win 100 games' },
};

// Daily challenge types
export type ChallengeType = 'win_no_hints' | 'win_fast' | 'win_games' | 'play_games';

export interface DailyChallenge {
  type: ChallengeType;
  description: string;
  target: number;
  reward: string;
}

// Generate daily challenge based on date
export function getDailyChallenge(date: string): DailyChallenge {
  // Use date string to generate consistent challenge for the day
  const hash = date.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const challenges: DailyChallenge[] = [
    { type: 'win_no_hints', description: 'Win a game without using hints', target: 1, reward: 'Pure Skill badge' },
    { type: 'win_fast', description: 'Win a game in under 2 minutes', target: 1, reward: 'Speed bonus' },
    { type: 'win_games', description: 'Win 3 games today', target: 3, reward: 'Triple threat' },
    { type: 'play_games', description: 'Play 5 games today', target: 5, reward: 'Dedicated player' },
  ];
  return challenges[hash % challenges.length];
}

function getDateString(timestamp?: number): string {
  const date = timestamp ? new Date(timestamp) : new Date();
  return date.toISOString().split('T')[0]; // YYYY-MM-DD
}

function isConsecutiveDay(lastDate: string, currentDate: string): boolean {
  const last = new Date(lastDate);
  const current = new Date(currentDate);
  const diffTime = current.getTime() - last.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays === 1;
}

function isSameDay(date1: string, date2: string): boolean {
  return date1 === date2;
}

// Head-to-head record against a specific opponent
export interface H2HRecord {
  opponentId: string;
  opponentName: string;
  wins: number;
  losses: number;
  lastPlayed: number;
}

// All h2h records for a player (keyed by opponent ID)
export type H2HRecords = Record<string, H2HRecord>;

interface PlayerData {
  wins: number;
  losses: number;
  gamesPlayed: number;
  createdAt: number;
  lastWinAt?: number;
  lastLossAt?: number;
  lastVisitAt?: number;
  lastPlayDate?: string; // YYYY-MM-DD for daily streak tracking
  visitCount?: number;
  // Streak tracking
  currentWinStreak: number;
  bestWinStreak: number;
  dailyStreak: number;
  bestDailyStreak: number;
  // Achievements (array of achievement IDs)
  achievements: string[];
  // Daily challenge progress
  dailyChallengeDate?: string; // Date of current challenge (YYYY-MM-DD)
  dailyChallengeProgress: number;
  dailyChallengeCompleted: boolean;
  dailyGamesPlayed: number; // Games played today
  dailyWins: number; // Wins today
  dailyWinsNoHints: number; // Wins without hints today
  dailyFastWins: number; // Wins under 2 min today
  // Game stats for achievements
  fastestWin?: number; // milliseconds
  totalHintsUsed: number;
}

function createDefaultPlayerData(): PlayerData {
  return {
    wins: 0,
    losses: 0,
    gamesPlayed: 0,
    createdAt: Date.now(),
    currentWinStreak: 0,
    bestWinStreak: 0,
    dailyStreak: 1,
    bestDailyStreak: 1,
    achievements: [],
    dailyChallengeProgress: 0,
    dailyChallengeCompleted: false,
    dailyGamesPlayed: 0,
    dailyWins: 0,
    dailyWinsNoHints: 0,
    dailyFastWins: 0,
    totalHintsUsed: 0,
  };
}

export class PlayerStats {
  private state: DurableObjectState;

  constructor(state: DurableObjectState, _env: Env) {
    this.state = state;
  }

  private checkAndAwardAchievements(data: PlayerData): string[] {
    const newAchievements: string[] = [];
    const existing = new Set(data.achievements);

    // Win count achievements
    if (data.wins >= 1 && !existing.has('first_win')) {
      newAchievements.push('first_win');
    }
    if (data.wins >= 10 && !existing.has('ten_wins')) {
      newAchievements.push('ten_wins');
    }
    if (data.wins >= 50 && !existing.has('fifty_wins')) {
      newAchievements.push('fifty_wins');
    }
    if (data.wins >= 100 && !existing.has('hundred_wins')) {
      newAchievements.push('hundred_wins');
    }

    // Win streak achievements
    if (data.currentWinStreak >= 3 && !existing.has('win_streak_3')) {
      newAchievements.push('win_streak_3');
    }
    if (data.currentWinStreak >= 5 && !existing.has('win_streak_5')) {
      newAchievements.push('win_streak_5');
    }
    if (data.currentWinStreak >= 10 && !existing.has('win_streak_10')) {
      newAchievements.push('win_streak_10');
    }

    // Daily streak achievements
    if (data.dailyStreak >= 3 && !existing.has('daily_streak_3')) {
      newAchievements.push('daily_streak_3');
    }
    if (data.dailyStreak >= 7 && !existing.has('daily_streak_7')) {
      newAchievements.push('daily_streak_7');
    }
    if (data.dailyStreak >= 30 && !existing.has('daily_streak_30')) {
      newAchievements.push('daily_streak_30');
    }

    // Add new achievements to data
    data.achievements.push(...newAchievements);
    return newAchievements;
  }

  private updateDailyStreak(data: PlayerData, today: string): void {
    if (!data.lastPlayDate) {
      data.dailyStreak = 1;
      data.lastPlayDate = today;
      return;
    }

    if (isSameDay(data.lastPlayDate, today)) {
      // Already played today, no change
      return;
    }

    if (isConsecutiveDay(data.lastPlayDate, today)) {
      // Consecutive day - increment streak
      data.dailyStreak += 1;
      if (data.dailyStreak > data.bestDailyStreak) {
        data.bestDailyStreak = data.dailyStreak;
      }
    } else {
      // Streak broken - reset to 1
      data.dailyStreak = 1;
    }
    data.lastPlayDate = today;
  }

  private resetDailyCountersIfNeeded(data: PlayerData, today: string): void {
    if (data.dailyChallengeDate !== today) {
      // New day - reset daily counters
      data.dailyChallengeDate = today;
      data.dailyChallengeProgress = 0;
      data.dailyChallengeCompleted = false;
      data.dailyGamesPlayed = 0;
      data.dailyWins = 0;
      data.dailyWinsNoHints = 0;
      data.dailyFastWins = 0;
    }
  }

  private checkDailyChallengeCompletion(data: PlayerData, today: string): boolean {
    if (data.dailyChallengeCompleted) return false;

    const challenge = getDailyChallenge(today);
    let completed = false;

    switch (challenge.type) {
      case 'win_no_hints':
        completed = data.dailyWinsNoHints >= challenge.target;
        break;
      case 'win_fast':
        completed = data.dailyFastWins >= challenge.target;
        break;
      case 'win_games':
        completed = data.dailyWins >= challenge.target;
        break;
      case 'play_games':
        completed = data.dailyGamesPlayed >= challenge.target;
        break;
    }

    if (completed) {
      data.dailyChallengeCompleted = true;
    }
    return completed;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const today = getDateString();

    // GET /stats - Get player stats
    if (request.method === 'GET' && url.pathname === '/stats') {
      const data = await this.state.storage.get<PlayerData>('data');

      if (!data) {
        const challenge = getDailyChallenge(today);
        return new Response(JSON.stringify({
          exists: false,
          wins: 0,
          losses: 0,
          gamesPlayed: 0,
          currentWinStreak: 0,
          bestWinStreak: 0,
          dailyStreak: 0,
          bestDailyStreak: 0,
          achievements: [],
          dailyChallenge: challenge,
          dailyChallengeProgress: 0,
          dailyChallengeCompleted: false,
        }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Reset daily counters if needed
      this.resetDailyCountersIfNeeded(data, today);
      await this.state.storage.put('data', data);

      const challenge = getDailyChallenge(today);
      let challengeProgress = 0;
      switch (challenge.type) {
        case 'win_no_hints':
          challengeProgress = data.dailyWinsNoHints;
          break;
        case 'win_fast':
          challengeProgress = data.dailyFastWins;
          break;
        case 'win_games':
          challengeProgress = data.dailyWins;
          break;
        case 'play_games':
          challengeProgress = data.dailyGamesPlayed;
          break;
      }

      return new Response(JSON.stringify({
        exists: true,
        wins: data.wins,
        losses: data.losses ?? 0,
        gamesPlayed: data.gamesPlayed ?? 0,
        currentWinStreak: data.currentWinStreak ?? 0,
        bestWinStreak: data.bestWinStreak ?? 0,
        dailyStreak: data.dailyStreak ?? 0,
        bestDailyStreak: data.bestDailyStreak ?? 0,
        achievements: data.achievements ?? [],
        dailyChallenge: challenge,
        dailyChallengeProgress: challengeProgress,
        dailyChallengeCompleted: data.dailyChallengeCompleted ?? false,
        fastestWin: data.fastestWin,
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // POST /register - Register a new player
    if (request.method === 'POST' && url.pathname === '/register') {
      const existing = await this.state.storage.get<PlayerData>('data');
      if (existing) {
        return new Response(JSON.stringify({
          exists: true,
          wins: existing.wins,
          currentWinStreak: existing.currentWinStreak ?? 0,
          dailyStreak: existing.dailyStreak ?? 0,
        }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const data: PlayerData = createDefaultPlayerData();
      data.lastPlayDate = today;
      await this.state.storage.put('data', data);

      return new Response(JSON.stringify({
        exists: true,
        wins: 0,
        created: true,
        currentWinStreak: 0,
        dailyStreak: 1,
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // POST /record-win - Record a win
    if (request.method === 'POST' && url.pathname === '/record-win') {
      let data = await this.state.storage.get<PlayerData>('data');
      let body: { hintsUsed?: number; timeMs?: number } = {};

      try {
        body = await request.json();
      } catch {
        // No body or invalid JSON
      }

      if (!data) {
        data = createDefaultPlayerData();
      }

      // Ensure all fields exist
      data.currentWinStreak = data.currentWinStreak ?? 0;
      data.bestWinStreak = data.bestWinStreak ?? 0;
      data.dailyStreak = data.dailyStreak ?? 1;
      data.bestDailyStreak = data.bestDailyStreak ?? 1;
      data.achievements = data.achievements ?? [];
      data.gamesPlayed = data.gamesPlayed ?? 0;
      data.dailyGamesPlayed = data.dailyGamesPlayed ?? 0;
      data.dailyWins = data.dailyWins ?? 0;
      data.dailyWinsNoHints = data.dailyWinsNoHints ?? 0;
      data.dailyFastWins = data.dailyFastWins ?? 0;
      data.totalHintsUsed = data.totalHintsUsed ?? 0;

      // Reset daily counters if new day
      this.resetDailyCountersIfNeeded(data, today);

      // Update daily streak
      this.updateDailyStreak(data, today);

      // Update win counters
      data.wins += 1;
      data.gamesPlayed += 1;
      data.lastWinAt = Date.now();
      data.currentWinStreak += 1;
      data.dailyGamesPlayed += 1;
      data.dailyWins += 1;

      // Track hints used
      const hintsUsed = body.hintsUsed ?? 0;
      data.totalHintsUsed += hintsUsed;

      // Check for no-hints win
      if (hintsUsed === 0) {
        data.dailyWinsNoHints += 1;
        // Award no_hints achievement
        if (!data.achievements.includes('no_hints')) {
          data.achievements.push('no_hints');
        }
      }

      // Check for fast win (under 60 seconds for speed_demon, under 2 min for daily challenge)
      const timeMs = body.timeMs ?? 0;
      if (timeMs > 0) {
        if (!data.fastestWin || timeMs < data.fastestWin) {
          data.fastestWin = timeMs;
        }
        if (timeMs < 60000 && !data.achievements.includes('speed_demon')) {
          data.achievements.push('speed_demon');
        }
        if (timeMs < 120000) {
          data.dailyFastWins += 1;
        }
      }

      // Update best win streak
      if (data.currentWinStreak > data.bestWinStreak) {
        data.bestWinStreak = data.currentWinStreak;
      }

      // Check and award achievements
      const newAchievements = this.checkAndAwardAchievements(data);

      // Check daily challenge completion
      const challengeJustCompleted = this.checkDailyChallengeCompletion(data, today);

      await this.state.storage.put('data', data);

      const challenge = getDailyChallenge(today);

      return new Response(JSON.stringify({
        wins: data.wins,
        currentWinStreak: data.currentWinStreak,
        bestWinStreak: data.bestWinStreak,
        dailyStreak: data.dailyStreak,
        newAchievements,
        achievements: data.achievements,
        dailyChallengeCompleted: data.dailyChallengeCompleted,
        dailyChallengeJustCompleted: challengeJustCompleted,
        dailyChallenge: challenge,
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // POST /record-loss - Record a loss
    if (request.method === 'POST' && url.pathname === '/record-loss') {
      let data = await this.state.storage.get<PlayerData>('data');

      if (!data) {
        data = createDefaultPlayerData();
      }

      // Ensure all fields exist
      data.currentWinStreak = data.currentWinStreak ?? 0;
      data.losses = data.losses ?? 0;
      data.gamesPlayed = data.gamesPlayed ?? 0;
      data.dailyGamesPlayed = data.dailyGamesPlayed ?? 0;

      // Reset daily counters if new day
      this.resetDailyCountersIfNeeded(data, today);

      // Update daily streak
      this.updateDailyStreak(data, today);

      // Update loss counters
      data.losses += 1;
      data.gamesPlayed += 1;
      data.lastLossAt = Date.now();
      data.dailyGamesPlayed += 1;

      // Reset win streak on loss
      data.currentWinStreak = 0;

      // Check daily challenge completion (play_games challenge)
      const challengeJustCompleted = this.checkDailyChallengeCompletion(data, today);

      await this.state.storage.put('data', data);

      const challenge = getDailyChallenge(today);

      return new Response(JSON.stringify({
        losses: data.losses,
        currentWinStreak: 0,
        dailyStreak: data.dailyStreak,
        dailyChallengeCompleted: data.dailyChallengeCompleted,
        dailyChallengeJustCompleted: challengeJustCompleted,
        dailyChallenge: challenge,
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // POST /visit - Record a visit (for returning user tracking)
    if (request.method === 'POST' && url.pathname === '/visit') {
      let data = await this.state.storage.get<PlayerData>('data');
      const isReturning = data !== undefined && (data.visitCount ?? 0) > 0;

      if (!data) {
        data = createDefaultPlayerData();
        data.visitCount = 1;
        data.lastVisitAt = Date.now();
        data.lastPlayDate = today;
      } else {
        data.visitCount = (data.visitCount ?? 0) + 1;
        data.lastVisitAt = Date.now();

        // Update daily streak on visit
        this.updateDailyStreak(data, today);

        // Check and award daily streak achievements
        this.checkAndAwardAchievements(data);
      }

      await this.state.storage.put('data', data);

      const challenge = getDailyChallenge(today);

      return new Response(JSON.stringify({
        isReturning,
        visitCount: data.visitCount,
        wins: data.wins,
        currentWinStreak: data.currentWinStreak ?? 0,
        dailyStreak: data.dailyStreak ?? 1,
        dailyChallenge: challenge,
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // GET /achievements - Get all achievements info
    if (request.method === 'GET' && url.pathname === '/achievements') {
      return new Response(JSON.stringify(ACHIEVEMENTS), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // GET /h2h - Get all head-to-head records for this player
    if (request.method === 'GET' && url.pathname === '/h2h') {
      const h2hRecords = await this.state.storage.get<H2HRecords>('h2h') ?? {};
      return new Response(JSON.stringify(h2hRecords), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // POST /update-h2h - Update head-to-head record against an opponent
    if (request.method === 'POST' && url.pathname === '/update-h2h') {
      try {
        const body = await request.json() as { opponentId: string; opponentName: string; won: boolean };
        const { opponentId, opponentName, won } = body;

        if (!opponentId || !opponentName) {
          return new Response(JSON.stringify({ error: 'Missing opponentId or opponentName' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        const h2hRecords = await this.state.storage.get<H2HRecords>('h2h') ?? {};
        const normalizedId = opponentId.toLowerCase();

        const existing = h2hRecords[normalizedId] ?? {
          opponentId: normalizedId,
          opponentName,
          wins: 0,
          losses: 0,
          lastPlayed: 0,
        };

        if (won) {
          existing.wins += 1;
        } else {
          existing.losses += 1;
        }
        existing.lastPlayed = Date.now();
        existing.opponentName = opponentName; // Update name in case it changed

        h2hRecords[normalizedId] = existing;
        await this.state.storage.put('h2h', h2hRecords);

        return new Response(JSON.stringify({
          success: true,
          record: existing,
        }), {
          headers: { 'Content-Type': 'application/json' },
        });
      } catch {
        return new Response(JSON.stringify({ error: 'Invalid request body' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response('Not Found', { status: 404 });
  }
}
