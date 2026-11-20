import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowRight,
  Award,
  BookOpen,
  Compass,
  Flame,
  Layers,
  Mic,
  Sparkles,
  Target,
} from 'lucide-react';
import { AppPersistedState, AppSection, Skill, SkillCategory } from '../types';
import { GACHA_CREST_IMAGE, PUBLIC_SPEAKING_SKILLS, SKILL_CATEGORIES } from '../data/skills';
import { calculateStreak, getLevelInfo, getRemainingGachaDraws } from '../utils/storage';
import { SkillCard } from './SkillCard';

interface HomeViewProps {
  state: AppPersistedState;
  onPullSkill: (category: SkillCategory | 'random') => Skill | null;
  onSelectSkillAndNavigate: (skillId: string, target: AppSection) => void;
  onNavigate: (target: AppSection) => void;
}

export function HomeView({
  state,
  onPullSkill,
  onSelectSkillAndNavigate,
  onNavigate,
}: HomeViewProps) {
  const [discoveryMode, setDiscoveryMode] = useState<'random' | 'category'>('random');
  const [selectedCategory, setSelectedCategory] = useState<SkillCategory>('Narrative Craft');
  const [isDrawing, setIsDrawing] = useState(false);
  const [revealedSkill, setRevealedSkill] = useState<Skill | null>(null);
  const [crestFailed, setCrestFailed] = useState(false);

  const remainingDraws = getRemainingGachaDraws(state.gacha);
  const unlockedSkills = PUBLIC_SPEAKING_SKILLS.filter((s) =>
    state.unlockedSkillIds.includes(s.id)
  );
  const lockedSkills = PUBLIC_SPEAKING_SKILLS.filter(
    (s) => !state.unlockedSkillIds.includes(s.id)
  );
  const lockedInCategory = lockedSkills.filter((s) => s.category === selectedCategory);
  const streak = calculateStreak(state.journalEntries);
  const levelInfo = getLevelInfo(state.xp);

  const activeSkill =
    PUBLIC_SPEAKING_SKILLS.find((s) => s.id === state.activeSkillId) ||
    unlockedSkills[unlockedSkills.length - 1] ||
    null;

  const displaySkill = revealedSkill || activeSkill;

  const canPull =
    remainingDraws > 0 &&
    lockedSkills.length > 0 &&
    (discoveryMode === 'random' || lockedInCategory.length > 0);

  function handleDraw() {
    if (!canPull || isDrawing) return;
    setIsDrawing(true);
    setTimeout(() => {
      const drawn = onPullSkill(discoveryMode === 'random' ? 'random' : selectedCategory);
      if (drawn) {
        setRevealedSkill(drawn);
      }
      setIsDrawing(false);
    }, 450);
  }

  return (
    <div className="space-y-8">
      {/* Hero Split: Daily Gacha Chamber + Active Focus Card */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-stretch">
        {/* Left: Gacha Discovery Chamber */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-800/90 bg-[#0F1629] p-6 sm:p-8 lg:col-span-7">
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-indigo-400">
                  Public Speaking Deck · Daily Discovery
                </p>
                <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl text-balance">
                  Unlock Today&apos;s Speaking Skill
                </h1>
              </div>

              <div className="text-right font-mono text-xs text-slate-300 tabular-nums">
                <p className="text-slate-400">Daily Draws</p>
                <p className="mt-0.5 text-base font-semibold text-white">
                  {remainingDraws} remaining
                </p>
              </div>
            </div>

            <p className="max-w-2xl text-sm leading-relaxed text-slate-300">
              Draw a skill card to add it to your training deck, learn core frameworks with the AI
              coach, and record your daily challenge. Complete a practice journal entry to earn a
              bonus draw (up to {state.gacha.maxDailyCap} per day).
            </p>

            {/* Discovery Mode Segmented Control */}
            <div className="space-y-3">
              <div className="inline-flex rounded-lg border border-slate-800 bg-[#070B19] p-1">
                <button
                  type="button"
                  onClick={() => setDiscoveryMode('random')}
                  className={`rounded-md px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                    discoveryMode === 'random'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Random Discovery
                </button>
                <button
                  type="button"
                  onClick={() => setDiscoveryMode('category')}
                  className={`rounded-md px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                    discoveryMode === 'category'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Select Category
                </button>
              </div>

              {discoveryMode === 'category' && (
                <div className="flex flex-wrap gap-2">
                  {SKILL_CATEGORIES.map((category) => {
                    const remainingCount = lockedSkills.filter(
                      (s) => s.category === category
                    ).length;
                    const active = selectedCategory === category;
                    return (
                      <button
                        key={category}
                        type="button"
                        onClick={() => setSelectedCategory(category)}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap tabular-nums ${
                          active
                            ? 'border-blue-500/70 bg-blue-500/15 text-blue-200'
                            : 'border-slate-800 bg-[#070B19]/70 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                        }`}
                      >
                        {category} ({remainingCount})
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Gacha Visual Chamber & Pull Action */}
          <div className="mt-6 flex flex-col items-center justify-between gap-6 rounded-xl border border-slate-800/80 bg-[#070B19]/75 p-5 sm:flex-row">
            <div className="flex items-center gap-4">
              <motion.div
                animate={
                  isDrawing
                    ? { scale: [1, 1.08, 0.96, 1.02], rotate: [0, 6, -6, 0] }
                    : { scale: 1, rotate: 0 }
                }
                transition={{ duration: 0.45 }}
                className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-indigo-500/30 bg-[#0F1629]"
              >
                {!crestFailed ? (
                  <img
                    src={GACHA_CREST_IMAGE}
                    alt="SkillGacha prism emblem"
                    referrerPolicy="no-referrer"
                    onError={() => setCrestFailed(true)}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-950 to-slate-900">
                    <Sparkles className="h-7 w-7 text-indigo-400" aria-hidden="true" />
                  </div>
                )}
              </motion.div>

              <div>
                <p className="font-display text-base font-semibold text-white">
                  {lockedSkills.length === 0
                    ? 'Full Deck Unlocked'
                    : discoveryMode === 'random'
                    ? `${lockedSkills.length} Public Speaking cards left in pool`
                    : `${lockedInCategory.length} cards left in ${selectedCategory}`}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {lockedSkills.length === 0
                    ? 'You have collected all 10 core Public Speaking skills.'
                    : remainingDraws === 0
                    ? 'Daily draws used. Complete a practice session to earn +1 bonus draw.'
                    : 'Each draw guarantees a new uncollected skill card.'}
                </p>
              </div>
            </div>

            <div className="flex w-full shrink-0 sm:w-auto">
              {lockedSkills.length === 0 ? (
                <button
                  type="button"
                  onClick={() => onNavigate('library')}
                  className="w-full rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 sm:w-auto whitespace-nowrap"
                >
                  Browse Full Deck
                </button>
              ) : (
                <button
                  type="button"
                  disabled={!canPull || isDrawing}
                  onClick={handleDraw}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500 sm:w-auto whitespace-nowrap"
                >
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                  <span>{isDrawing ? 'Unlocking...' : 'Pull Skill Card'}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right: Revealed Card or Active Focus Skill */}
        <div className="flex flex-col rounded-xl border border-slate-800/90 bg-[#0F1629] p-6 lg:col-span-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-white">
              {revealedSkill ? 'New Card Unlocked' : activeSkill ? 'Active Focus Skill' : 'Your Training Deck'}
            </h2>
            {displaySkill && (
              <span className="font-mono text-xs text-slate-400 tabular-nums">
                {unlockedSkills.length}/{PUBLIC_SPEAKING_SKILLS.length} collected
              </span>
            )}
          </div>

          <AnimatePresence mode="wait">
            {displaySkill ? (
              <motion.div
                key={displaySkill.id}
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25 }}
                className="flex flex-1 flex-col justify-between"
              >
                <SkillCard
                  skill={displaySkill}
                  isUnlocked={true}
                  isCompleted={state.completedSkillIds.includes(displaySkill.id)}
                  compact={true}
                  onTrain={(s) => onSelectSkillAndNavigate(s.id, 'training')}
                  onPractice={(s) => onSelectSkillAndNavigate(s.id, 'studio')}
                />
              </motion.div>
            ) : (
              <motion.div
                key="empty-focus"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 bg-[#070B19]/60 p-8 text-center"
              >
                <Compass className="mb-3 h-8 w-8 text-indigo-400/80" aria-hidden="true" />
                <p className="font-display text-base font-semibold text-white">
                  Pull your first skill card
                </p>
                <p className="mt-1.5 max-w-xs text-xs leading-relaxed text-slate-400">
                  Use the Daily Gacha chamber to unlock your first Public Speaking skill and start
                  guided AI training.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* 4-Column KPI Strip Below Hero */}
      <section aria-label="Learning progress summary" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-800/80 bg-[#0F1629] p-4 sm:p-5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Skills Unlocked</span>
            <Layers className="h-4 w-4 text-blue-400" aria-hidden="true" />
          </div>
          <p className="mt-2 font-mono text-2xl font-semibold text-white tabular-nums">
            {unlockedSkills.length} / {PUBLIC_SPEAKING_SKILLS.length}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {state.completedSkillIds.length} mastered
          </p>
        </div>

        <div className="rounded-xl border border-slate-800/80 bg-[#0F1629] p-4 sm:p-5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Challenges Done</span>
            <Target className="h-4 w-4 text-indigo-400" aria-hidden="true" />
          </div>
          <p className="mt-2 font-mono text-2xl font-semibold text-white tabular-nums">
            {state.journalEntries.length}
          </p>
          <p className="mt-1 text-xs text-slate-400">Recorded sessions</p>
        </div>

        <div className="rounded-xl border border-slate-800/80 bg-[#0F1629] p-4 sm:p-5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Learning Streak</span>
            <Flame className="h-4 w-4 text-violet-400" aria-hidden="true" />
          </div>
          <p className="mt-2 font-mono text-2xl font-semibold text-white tabular-nums">
            {streak} {streak === 1 ? 'day' : 'days'}
          </p>
          <p className="mt-1 text-xs text-slate-400">Daily consistency</p>
        </div>

        <div className="rounded-xl border border-slate-800/80 bg-[#0F1629] p-4 sm:p-5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Experience</span>
            <Award className="h-4 w-4 text-blue-400" aria-hidden="true" />
          </div>
          <p className="mt-2 font-mono text-2xl font-semibold text-white tabular-nums">
            {state.xp} XP
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Level {levelInfo.level} · {levelInfo.rankTitle}
          </p>
        </div>
      </section>

      {/* Unlocked Deck & Learning Journey */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold text-white">
              Your Unlocked Skill Cards
            </h2>
            <p className="text-xs text-slate-400">
              Select any unlocked skill to review AI lessons or record a speaking challenge.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('library')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-400 transition-colors hover:text-blue-300"
          >
            <span>Open Skill Library</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>

        {unlockedSkills.length === 0 ? (
          <div className="rounded-xl border border-slate-800/80 bg-[#0F1629] p-8 text-center">
            <p className="font-display text-base font-semibold text-white">
              No skill cards unlocked yet
            </p>
            <p className="mx-auto mt-1.5 max-w-md text-xs leading-relaxed text-slate-400">
              Click &ldquo;Pull Skill Card&rdquo; above to draw your first Public Speaking card and
              begin the training loop.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-indigo-400" aria-hidden="true" />
                1. Unlock Card
              </span>
              <span className="inline-flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5 text-blue-400" aria-hidden="true" />
                2. Learn with AI
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Mic className="h-3.5 w-3.5 text-violet-400" aria-hidden="true" />
                3. Practice &amp; Reflect
              </span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {unlockedSkills.map((skill) => (
              <SkillCard
                key={skill.id}
                skill={skill}
                isUnlocked={true}
                isCompleted={state.completedSkillIds.includes(skill.id)}
                isActive={state.activeSkillId === skill.id}
                compact={true}
                onTrain={(s) => onSelectSkillAndNavigate(s.id, 'training')}
                onPractice={(s) => onSelectSkillAndNavigate(s.id, 'studio')}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
