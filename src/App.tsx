import { useEffect, useState } from 'react';
import { BookOpen, Compass, Home, Layers, Mic, TrendingUp } from 'lucide-react';
import {
  AppPersistedState,
  AppSection,
  DailyChallenge,
  LearningJournalEntry,
  LearningResource,
  Skill,
  SkillCategory,
  SkillLesson,
} from './types';
import { PUBLIC_SPEAKING_SKILLS } from './data/skills';
import {
  getRemainingGachaDraws,
  getTodayKey,
  loadPersistedState,
  savePersistedState,
} from './utils/storage';
import { HomeView } from './components/HomeView';
import { SkillLibraryView } from './components/SkillLibraryView';
import { TrainingRoomView } from './components/TrainingRoomView';
import { PracticeStudioView } from './components/PracticeStudioView';
import { ProgressJournalView } from './components/ProgressJournalView';

const NAV_ITEMS: Array<{ id: AppSection; label: string; icon: typeof Home }> = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'library', label: 'Library', icon: Layers },
  { id: 'training', label: 'Training', icon: BookOpen },
  { id: 'studio', label: 'Studio', icon: Mic },
  { id: 'progress', label: 'Progress', icon: TrendingUp },
];

export default function App() {
  const [state, setState] = useState<AppPersistedState>(() => loadPersistedState());
  const [activeSection, setActiveSection] = useState<AppSection>('home');

  useEffect(() => {
    savePersistedState(state);
  }, [state]);

  function handleNavigate(target: AppSection) {
    setActiveSection(target);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handlePullSkill(category: SkillCategory | 'random'): Skill | null {
    const remaining = getRemainingGachaDraws(state.gacha);
    if (remaining <= 0) return null;

    const locked = PUBLIC_SPEAKING_SKILLS.filter(
      (s) => !state.unlockedSkillIds.includes(s.id)
    );
    const pool =
      category === 'random'
        ? locked
        : locked.filter((s) => s.category === category);

    if (pool.length === 0) return null;

    const chosen = pool[Math.floor(Math.random() * pool.length)];
    const today = getTodayKey();

    setState((prev) => {
      const resetNeeded = prev.gacha.lastResetDateKey !== today;
      return {
        ...prev,
        unlockedSkillIds: [...prev.unlockedSkillIds, chosen.id],
        activeSkillId: chosen.id,
        xp: prev.xp + 25,
        gacha: {
          ...prev.gacha,
          lastResetDateKey: today,
          drawsUsedToday: resetNeeded ? 1 : prev.gacha.drawsUsedToday + 1,
          bonusDrawsEarnedToday: resetNeeded ? 0 : prev.gacha.bonusDrawsEarnedToday,
        },
      };
    });

    return chosen;
  }

  function handleSelectSkillAndNavigate(skillId: string, target: AppSection) {
    setState((prev) => ({ ...prev, activeSkillId: skillId }));
    handleNavigate(target);
  }

  function handleSelectActiveSkill(skillId: string) {
    setState((prev) => ({ ...prev, activeSkillId: skillId }));
  }

  function handleSaveLesson(skillId: string, lesson: SkillLesson) {
    setState((prev) => ({
      ...prev,
      lessonsBySkill: { ...prev.lessonsBySkill, [skillId]: lesson },
    }));
  }

  function handleSaveResources(skillId: string, resources: LearningResource[]) {
    setState((prev) => ({
      ...prev,
      resourcesBySkill: { ...prev.resourcesBySkill, [skillId]: resources },
    }));
  }

  function handleSaveChallenge(skillId: string, challenge: DailyChallenge) {
    setState((prev) => ({
      ...prev,
      challengesBySkill: { ...prev.challengesBySkill, [skillId]: challenge },
    }));
  }

  function handleSaveQuizScore(skillId: string, score: number) {
    setState((prev) => {
      const prevBest = prev.quizScoresBySkill[skillId] ?? 0;
      const bonusXp = score > prevBest ? (score - prevBest) * 15 : 0;
      return {
        ...prev,
        xp: prev.xp + bonusXp,
        quizScoresBySkill: {
          ...prev.quizScoresBySkill,
          [skillId]: Math.max(prevBest, score),
        },
      };
    });
  }

  function handleCompletePractice(entry: LearningJournalEntry, challengeId?: string) {
    const today = getTodayKey();
    setState((prev) => {
      const nextCompletedSkills = prev.completedSkillIds.includes(entry.skillId)
        ? prev.completedSkillIds
        : [...prev.completedSkillIds, entry.skillId];

      const nextCompletedChallenges =
        challengeId && !prev.completedChallengeIds.includes(challengeId)
          ? [...prev.completedChallengeIds, challengeId]
          : prev.completedChallengeIds;

      const resetNeeded = prev.gacha.lastResetDateKey !== today;
      const currentBonus = resetNeeded ? 0 : prev.gacha.bonusDrawsEarnedToday;
      const nextBonus = Math.min(
        prev.gacha.maxDailyCap - prev.gacha.dailyBaseAllowance,
        currentBonus + 1
      );

      return {
        ...prev,
        completedSkillIds: nextCompletedSkills,
        completedChallengeIds: nextCompletedChallenges,
        journalEntries: [entry, ...prev.journalEntries],
        xp: prev.xp + entry.xpEarned,
        gacha: {
          ...prev.gacha,
          lastResetDateKey: today,
          drawsUsedToday: resetNeeded ? 0 : prev.gacha.drawsUsedToday,
          bonusDrawsEarnedToday: Math.max(0, nextBonus),
        },
      };
    });
  }

  function handleDeleteJournalEntry(entryId: string) {
    setState((prev) => ({
      ...prev,
      journalEntries: prev.journalEntries.filter((e) => e.id !== entryId),
    }));
  }

  const primaryCtaTarget: AppSection =
    state.unlockedSkillIds.length > 0 && activeSection === 'home' ? 'studio' : 'home';
  const primaryCtaLabel =
    state.unlockedSkillIds.length > 0 && activeSection === 'home'
      ? 'Practice Studio'
      : 'Daily Pull';

  return (
    <div className="min-h-screen bg-[#070B19] text-slate-100 pb-20 md:pb-12">
      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-[#070B19]/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
          {/* Zone 1: Single-line Brand Title */}
          <button
            type="button"
            onClick={() => handleNavigate('home')}
            className="font-display text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
          >
            SkillGacha AI
          </button>

          {/* Zone 2: 5 concise single-line nav links */}
          <nav
            aria-label="Primary navigation"
            className="hidden md:flex items-center gap-7 text-sm font-medium"
          >
            {NAV_ITEMS.map((item) => {
              const active = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavigate(item.id)}
                  className={`relative py-1 transition-colors whitespace-nowrap shrink-0 ${
                    active ? 'text-white' : 'text-slate-400 hover:text-slate-100'
                  }`}
                >
                  {item.label}
                  {active && (
                    <span className="absolute inset-x-0 -bottom-[21px] h-0.5 bg-indigo-500" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="shrink-0">
            <button
              type="button"
              onClick={() => handleNavigate(primaryCtaTarget)}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-indigo-500 whitespace-nowrap shrink-0"
            >
              <Compass className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{primaryCtaLabel}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {activeSection === 'home' && (
          <HomeView
            state={state}
            onPullSkill={handlePullSkill}
            onSelectSkillAndNavigate={handleSelectSkillAndNavigate}
            onNavigate={handleNavigate}
          />
        )}
        {activeSection === 'library' && (
          <SkillLibraryView
            state={state}
            onSelectSkillAndNavigate={handleSelectSkillAndNavigate}
            onNavigate={handleNavigate}
          />
        )}
        {activeSection === 'training' && (
          <TrainingRoomView
            state={state}
            onSelectActiveSkill={handleSelectActiveSkill}
            onSaveLesson={handleSaveLesson}
            onSaveResources={handleSaveResources}
            onSaveChallenge={handleSaveChallenge}
            onSaveQuizScore={handleSaveQuizScore}
            onNavigate={handleNavigate}
          />
        )}
        {activeSection === 'studio' && (
          <PracticeStudioView
            state={state}
            onSelectActiveSkill={handleSelectActiveSkill}
            onSaveChallenge={handleSaveChallenge}
            onCompletePractice={handleCompletePractice}
            onNavigate={handleNavigate}
          />
        )}
        {activeSection === 'progress' && (
          <ProgressJournalView
            state={state}
            onDeleteJournalEntry={handleDeleteJournalEntry}
            onSelectSkillAndNavigate={handleSelectSkillAndNavigate}
            onNavigate={handleNavigate}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation (compact 56px, well below 15% mobile sticky cap) */}
      <nav
        aria-label="Mobile navigation"
        className="fixed inset-x-0 bottom-0 z-40 grid h-14 grid-cols-5 border-t border-slate-800/90 bg-[#070B19]/95 backdrop-blur-md md:hidden"
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNavigate(item.id)}
              className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${
                active ? 'text-indigo-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
