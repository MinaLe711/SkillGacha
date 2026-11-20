import { useMemo, useState } from 'react';
import {
  Award,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  Flame,
  Layers,
  Mic,
  Search,
  Sparkles,
  Target,
  Trash2,
} from 'lucide-react';
import { AppPersistedState, AppSection } from '../types';
import { PUBLIC_SPEAKING_SKILLS } from '../data/skills';
import {
  calculateStreak,
  calculateWeeklyActivity,
  getLevelInfo,
} from '../utils/storage';

interface ProgressJournalViewProps {
  state: AppPersistedState;
  onDeleteJournalEntry: (entryId: string) => void;
  onSelectSkillAndNavigate: (skillId: string, target: AppSection) => void;
  onNavigate: (target: AppSection) => void;
}

export function ProgressJournalView({
  state,
  onDeleteJournalEntry,
  onSelectSkillAndNavigate,
  onNavigate,
}: ProgressJournalViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [skillFilter, setSkillFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(
    state.journalEntries[0]?.id ?? null
  );

  const streak = calculateStreak(state.journalEntries);
  const levelInfo = getLevelInfo(state.xp);
  const weeklyActivity = useMemo(
    () => calculateWeeklyActivity(state.journalEntries),
    [state.journalEntries]
  );

  const totalPracticeSeconds = state.journalEntries.reduce(
    (acc, item) => acc + (item.durationSeconds || 60),
    0
  );
  const totalMinutes = Math.round(totalPracticeSeconds / 60);
  const maxWeeklyMinutes = Math.max(10, ...weeklyActivity.map((d) => d.minutes));

  const filteredEntries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return state.journalEntries.filter((entry) => {
      if (skillFilter !== 'all' && entry.skillId !== skillFilter) return false;
      if (!q) return true;
      const hay = `${entry.skillName} ${entry.challengeTitle} ${entry.transcript} ${entry.selfReflection} ${entry.keyTakeaways} ${entry.nextGoal}`.toLowerCase();
      return hay.includes(q);
    });
  }, [state.journalEntries, searchQuery, skillFilter]);

  return (
    <div className="space-y-8">
      {/* Header & Level Bar */}
      <div className="flex flex-col gap-5 border-b border-slate-800/80 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-medium text-indigo-400">Analytics &amp; Reflection Log</p>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Progress &amp; Learning Journal
          </h1>
        </div>

        <div className="w-full max-w-sm rounded-xl border border-slate-800 bg-[#0F1629] p-4">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-white">
              Level {levelInfo.level} · {levelInfo.rankTitle}
            </span>
            <span className="font-mono text-indigo-300 tabular-nums">{state.xp} XP</span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300"
              style={{ width: `${levelInfo.progressPercent}%` }}
            />
          </div>
          <p className="mt-1.5 font-mono text-[11px] text-slate-400 tabular-nums">
            {levelInfo.currentLevelXp} / {levelInfo.xpPerLevel} XP to Level {levelInfo.level + 1}
          </p>
        </div>
      </div>

      {/* KPI Grid */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <div className="rounded-xl border border-slate-800/80 bg-[#0F1629] p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Skills Unlocked</span>
            <Layers className="h-4 w-4 text-blue-400" aria-hidden="true" />
          </div>
          <p className="mt-2 font-mono text-2xl font-semibold text-white tabular-nums">
            {state.unlockedSkillIds.length} / {PUBLIC_SPEAKING_SKILLS.length}
          </p>
        </div>

        <div className="rounded-xl border border-slate-800/80 bg-[#0F1629] p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Challenges Done</span>
            <Target className="h-4 w-4 text-indigo-400" aria-hidden="true" />
          </div>
          <p className="mt-2 font-mono text-2xl font-semibold text-white tabular-nums">
            {state.journalEntries.length}
          </p>
        </div>

        <div className="rounded-xl border border-slate-800/80 bg-[#0F1629] p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Learning Streak</span>
            <Flame className="h-4 w-4 text-violet-400" aria-hidden="true" />
          </div>
          <p className="mt-2 font-mono text-2xl font-semibold text-white tabular-nums">
            {streak} {streak === 1 ? 'day' : 'days'}
          </p>
        </div>

        <div className="rounded-xl border border-slate-800/80 bg-[#0F1629] p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Practice Time</span>
            <Clock className="h-4 w-4 text-blue-400" aria-hidden="true" />
          </div>
          <p className="mt-2 font-mono text-2xl font-semibold text-white tabular-nums">
            {totalMinutes} min
          </p>
        </div>

        <div className="col-span-2 rounded-xl border border-slate-800/80 bg-[#0F1629] p-4 lg:col-span-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Total XP</span>
            <Award className="h-4 w-4 text-indigo-400" aria-hidden="true" />
          </div>
          <p className="mt-2 font-mono text-2xl font-semibold text-white tabular-nums">
            {state.xp}
          </p>
        </div>
      </section>

      {/* Weekly Learning Activity + Skill Progress Breakdown */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Weekly Learning Activity Chart */}
        <div className="rounded-xl border border-slate-800/90 bg-[#0F1629] p-6 lg:col-span-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-base font-semibold text-white">
                Weekly Learning Activity
              </h2>
              <p className="text-xs text-slate-400">Practice minutes over the past 7 days</p>
            </div>
            <span className="font-mono text-xs text-blue-300 tabular-nums">
              {weeklyActivity.reduce((a, b) => a + b.sessions, 0)} sessions
            </span>
          </div>

          <div className="mt-6 flex h-44 items-end justify-between gap-2 border-b border-slate-800 pb-2">
            {weeklyActivity.map((day) => {
              const pct = day.minutes > 0 ? Math.max(10, Math.round((day.minutes / maxWeeklyMinutes) * 100)) : 4;
              return (
                <div
                  key={day.dateKey}
                  className="flex flex-1 flex-col items-center justify-end gap-2 h-full"
                >
                  <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                    {day.minutes > 0 ? `${day.minutes}m` : ''}
                  </span>
                  <div className="flex w-full flex-1 items-end justify-center">
                    <div
                      title={`${day.label}: ${day.minutes} min (${day.sessions} sessions)`}
                      className={`w-full max-w-[32px] rounded-t-md transition-all duration-300 ${
                        day.minutes > 0
                          ? 'bg-gradient-to-t from-blue-600 to-indigo-400'
                          : 'bg-slate-800/70'
                      }`}
                      style={{ height: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex justify-between gap-2">
            {weeklyActivity.map((day) => (
              <span
                key={day.dateKey}
                className="flex-1 text-center font-mono text-[11px] text-slate-400"
              >
                {day.label}
              </span>
            ))}
          </div>
        </div>

        {/* Skill Progress Matrix */}
        <div className="rounded-xl border border-slate-800/90 bg-[#0F1629] p-6 lg:col-span-7">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-base font-semibold text-white">
                Public Speaking Skill Progress
              </h2>
              <p className="text-xs text-slate-400">
                Track progression from Card Unlocked → Lesson Trained → Challenge Completed
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {PUBLIC_SPEAKING_SKILLS.map((skill) => {
              const unlocked = state.unlockedSkillIds.includes(skill.id);
              const trained = Boolean(state.lessonsBySkill[skill.id]);
              const practiced = state.completedSkillIds.includes(skill.id);
              const pct = practiced ? 100 : trained ? 65 : unlocked ? 30 : 0;
              const statusLabel = practiced
                ? 'Mastered'
                : trained
                ? 'Trained'
                : unlocked
                ? 'Unlocked'
                : 'Locked';

              return (
                <div
                  key={skill.id}
                  className="rounded-lg border border-slate-800/80 bg-[#070B19]/75 p-3"
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    {unlocked ? (
                      <button
                        type="button"
                        onClick={() => onSelectSkillAndNavigate(skill.id, 'training')}
                        className="truncate font-semibold text-white hover:text-indigo-300"
                      >
                        {skill.name}
                      </button>
                    ) : (
                      <span className="truncate font-medium text-slate-500">{skill.name}</span>
                    )}
                    <span className="shrink-0 font-mono text-[11px] text-slate-400 tabular-nums">
                      {statusLabel}
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className={`h-full rounded-full ${
                        practiced
                          ? 'bg-emerald-400'
                          : trained
                          ? 'bg-indigo-500'
                          : unlocked
                          ? 'bg-blue-500'
                          : 'bg-transparent'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Learning Journal History */}
      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-xl font-bold text-white">Learning Journal</h2>
            <p className="text-xs text-slate-400">
              Search and review your saved transcripts, AI assessments, resources, and reflections.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Filter journal by skill"
              value={skillFilter}
              onChange={(e) => setSkillFilter(e.target.value)}
              className="rounded-lg border border-slate-800 bg-[#0F1629] px-3 py-2 text-xs font-medium text-slate-200 focus:border-indigo-500 focus:outline-none"
            >
              <option value="all">All Skills</option>
              {PUBLIC_SPEAKING_SKILLS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>

            <div className="relative w-full sm:w-64">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search journal entries..."
                className="w-full rounded-lg border border-slate-800 bg-[#0F1629] py-2 pl-8 pr-3 text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {state.journalEntries.length === 0 ? (
          <div className="rounded-xl border border-slate-800/80 bg-[#0F1629] p-10 text-center">
            <Mic className="mx-auto mb-3 h-8 w-8 text-indigo-400" aria-hidden="true" />
            <p className="font-display text-base font-semibold text-white">
              Your Learning Journal is empty
            </p>
            <p className="mx-auto mt-1.5 max-w-md text-xs leading-relaxed text-slate-400">
              Complete a challenge in the Practice Studio and save your reflection to build a
              searchable history of your growth.
            </p>
            <button
              type="button"
              onClick={() =>
                onNavigate(state.unlockedSkillIds.length > 0 ? 'studio' : 'home')
              }
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              <span>
                {state.unlockedSkillIds.length > 0
                  ? 'Go to Practice Studio'
                  : 'Unlock First Skill'}
              </span>
            </button>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="rounded-xl border border-slate-800/80 bg-[#0F1629] p-8 text-center text-xs text-slate-400">
            No journal entries match your current filter.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredEntries.map((entry) => {
              const isExpanded = expandedId === entry.id;
              const dateLabel = new Date(entry.dateIso).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              });

              return (
                <article
                  key={entry.id}
                  className="overflow-hidden rounded-xl border border-slate-800/90 bg-[#0F1629]"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                    className="flex w-full flex-wrap items-center justify-between gap-4 p-5 text-left transition-colors hover:bg-[#151E36]/60"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-xs text-indigo-400 tabular-nums">
                        {dateLabel} · {entry.skillName} · +{entry.xpEarned} XP
                      </p>
                      <h3 className="mt-1 truncate font-display text-base font-semibold text-white">
                        {entry.challengeTitle}
                      </h3>
                      <p className="mt-1 truncate text-xs text-slate-400">
                        Takeaway: {entry.keyTakeaways}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 font-mono text-xs text-slate-400 tabular-nums">
                      <span>{entry.recordingReference}</span>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-slate-300" aria-hidden="true" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-slate-300" aria-hidden="true" />
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="space-y-5 border-t border-slate-800 bg-[#070B19]/60 p-5">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <div>
                          <p className="text-xs font-semibold text-slate-400">Self-Reflection</p>
                          <p className="mt-1 text-sm text-slate-200">{entry.selfReflection}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-400">Key Takeaways</p>
                          <p className="mt-1 text-sm text-slate-200">{entry.keyTakeaways}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-400">
                            Next Improvement Goal
                          </p>
                          <p className="mt-1 text-sm text-indigo-200">{entry.nextGoal}</p>
                        </div>
                      </div>

                      <div className="border-t border-slate-800/80 pt-4">
                        <p className="text-xs font-semibold text-slate-400">
                          AI Feedback Synthesis
                        </p>
                        <p className="mt-1 text-sm leading-relaxed text-slate-300">
                          {entry.feedback.overallSummary}
                        </p>
                        <div className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-3 lg:grid-cols-6">
                          <div>
                            <span className="text-slate-400">Clarity: </span>
                            <span className="font-semibold text-white">
                              {entry.feedback.clarity.rating}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400">Structure: </span>
                            <span className="font-semibold text-white">
                              {entry.feedback.speechStructure.rating}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400">Pace: </span>
                            <span className="font-semibold text-white">
                              {entry.feedback.speakingPace.measuredWpm !== null
                                ? `${entry.feedback.speakingPace.measuredWpm} WPM`
                                : entry.feedback.speakingPace.rating}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400">Fillers: </span>
                            <span className="font-semibold text-white">
                              {entry.feedback.fillerWords.count}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400">Storytelling: </span>
                            <span className="font-semibold text-white">
                              {entry.feedback.storytelling.rating}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400">Vocabulary: </span>
                            <span className="font-semibold text-white">
                              {entry.feedback.vocabulary.rating}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="border-t border-slate-800/80 pt-4">
                        <p className="text-xs font-semibold text-slate-400">Saved Transcript</p>
                        <p className="mt-1.5 whitespace-pre-line text-xs leading-relaxed text-slate-300">
                          {entry.transcript}
                        </p>
                      </div>

                      {entry.resources.length > 0 && (
                        <div className="border-t border-slate-800/80 pt-4">
                          <p className="text-xs font-semibold text-slate-400">
                            Referenced Learning Resources
                          </p>
                          <div className="mt-2 flex flex-wrap gap-4">
                            {entry.resources
                              .filter((r) => r.verified && r.sourceUrl)
                              .map((r, i) => (
                                <a
                                  key={i}
                                  href={r.sourceUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                                >
                                  <span>{r.title}</span>
                                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                                </a>
                              ))}
                          </div>
                        </div>
                      )}

                      <div className="flex justify-end border-t border-slate-800/80 pt-3">
                        <button
                          type="button"
                          onClick={() => onDeleteJournalEntry(entry.id)}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-400 hover:text-rose-300"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Delete Entry</span>
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
