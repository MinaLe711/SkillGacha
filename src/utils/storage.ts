import { AppPersistedState, GachaState, LearningJournalEntry } from '../types';

const STORAGE_KEY = 'skillgacha_ai_state_v1';

export function getTodayKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function createInitialState(): AppPersistedState {
  return {
    unlockedSkillIds: [],
    completedSkillIds: [],
    activeSkillId: null,
    lessonsBySkill: {},
    resourcesBySkill: {},
    challengesBySkill: {},
    completedChallengeIds: [],
    quizScoresBySkill: {},
    journalEntries: [],
    xp: 0,
    gacha: {
      lastResetDateKey: getTodayKey(),
      drawsUsedToday: 0,
      bonusDrawsEarnedToday: 0,
      dailyBaseAllowance: 2,
      maxDailyCap: 4,
    },
  };
}

export function loadPersistedState(): AppPersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialState();
    const parsed = JSON.parse(raw) as Partial<AppPersistedState>;
    const base = createInitialState();
    const today = getTodayKey();

    const gacha: GachaState = parsed.gacha
      ? parsed.gacha.lastResetDateKey === today
        ? { ...base.gacha, ...parsed.gacha }
        : {
            ...base.gacha,
            lastResetDateKey: today,
            drawsUsedToday: 0,
            bonusDrawsEarnedToday: 0,
          }
      : base.gacha;

    return {
      ...base,
      ...parsed,
      gacha,
    };
  } catch {
    return createInitialState();
  }
}

export function savePersistedState(state: AppPersistedState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors gracefully
  }
}

export function getRemainingGachaDraws(gacha: GachaState): number {
  const today = getTodayKey();
  if (gacha.lastResetDateKey !== today) {
    return gacha.dailyBaseAllowance;
  }
  const totalAllowed = Math.min(
    gacha.maxDailyCap,
    gacha.dailyBaseAllowance + gacha.bonusDrawsEarnedToday
  );
  return Math.max(0, totalAllowed - gacha.drawsUsedToday);
}

export function calculateStreak(entries: LearningJournalEntry[]): number {
  if (entries.length === 0) return 0;

  const uniqueDays = new Set(
    entries.map((entry) => {
      const dt = new Date(entry.dateIso);
      const y = dt.getFullYear();
      const m = String(dt.getMonth() + 1).padStart(2, '0');
      const d = String(dt.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    })
  );

  const today = new Date();
  const checkDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const formatKey = (dt: Date) => {
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const d = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // If no entry today, check if yesterday has an entry so streak stays alive until end of day
  if (!uniqueDays.has(formatKey(checkDate))) {
    checkDate.setDate(checkDate.getDate() - 1);
    if (!uniqueDays.has(formatKey(checkDate))) {
      return 0;
    }
  }

  let streak = 0;
  while (uniqueDays.has(formatKey(checkDate))) {
    streak += 1;
    checkDate.setDate(checkDate.getDate() - 1);
  }
  return streak;
}

export function calculateWeeklyActivity(entries: LearningJournalEntry[]) {
  const days: Array<{
    dateKey: string;
    label: string;
    minutes: number;
    sessions: number;
  }> = [];

  const today = new Date();
  for (let offset = 6; offset >= 0; offset -= 1) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - offset);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateKey = `${y}-${m}-${day}`;
    const label = d.toLocaleDateString('en-US', { weekday: 'short' });
    days.push({ dateKey, label, minutes: 0, sessions: 0 });
  }

  const byKey = new Map(days.map((item) => [item.dateKey, item]));
  for (const entry of entries) {
    const dt = new Date(entry.dateIso);
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    const key = `${y}-${m}-${day}`;
    const bucket = byKey.get(key);
    if (bucket) {
      bucket.sessions += 1;
      bucket.minutes += Math.max(1, Math.round((entry.durationSeconds || 60) / 60));
    }
  }

  return days;
}

export function getLevelInfo(xp: number) {
  const xpPerLevel = 300;
  const level = Math.floor(xp / xpPerLevel) + 1;
  const currentLevelXp = xp % xpPerLevel;
  const progressPercent = Math.round((currentLevelXp / xpPerLevel) * 100);
  const titles = [
    'Apprentice Speaker',
    'Stage Explorer',
    'Articulate Voice',
    'Narrative Architect',
    'Keynote Strategist',
    'Master Orator',
  ];
  const rankTitle = titles[Math.min(titles.length - 1, level - 1)];
  return {
    level,
    rankTitle,
    currentLevelXp,
    xpPerLevel,
    progressPercent,
  };
}
