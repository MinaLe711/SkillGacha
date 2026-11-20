import { useMemo, useState } from 'react';
import { CheckCircle2, Lock, Search, Unlock, X } from 'lucide-react';
import { AppPersistedState, AppSection, Skill, SkillCategory } from '../types';
import { PUBLIC_SPEAKING_SKILLS, SKILL_CATEGORIES } from '../data/skills';
import { SkillCard } from './SkillCard';

interface SkillLibraryViewProps {
  state: AppPersistedState;
  onSelectSkillAndNavigate: (skillId: string, target: AppSection) => void;
  onNavigate: (target: AppSection) => void;
}

type StatusFilter = 'all' | 'unlocked' | 'locked' | 'completed';

export function SkillLibraryView({
  state,
  onSelectSkillAndNavigate,
  onNavigate,
}: SkillLibraryViewProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | SkillCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [inspectedSkill, setInspectedSkill] = useState<Skill | null>(null);

  const filteredSkills = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return PUBLIC_SPEAKING_SKILLS.filter((skill) => {
      const isUnlocked = state.unlockedSkillIds.includes(skill.id);
      const isCompleted = state.completedSkillIds.includes(skill.id);

      if (statusFilter === 'unlocked' && !isUnlocked) return false;
      if (statusFilter === 'locked' && isUnlocked) return false;
      if (statusFilter === 'completed' && !isCompleted) return false;

      if (categoryFilter !== 'all' && skill.category !== categoryFilter) return false;

      if (q) {
        const hay = `${skill.name} ${skill.category} ${skill.description} ${skill.learningObjectives.join(' ')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }

      return true;
    });
  }, [statusFilter, categoryFilter, searchQuery, state.unlockedSkillIds, state.completedSkillIds]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <p className="text-xs font-medium text-indigo-400">Public Speaking Curriculum</p>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Skill Library
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Explore all {PUBLIC_SPEAKING_SKILLS.length} collectible Public Speaking cards, their
            learning objectives, and your mastery status.
          </p>
        </div>

        <div className="flex items-center gap-4 font-mono text-xs text-slate-300 tabular-nums">
          <span>{state.unlockedSkillIds.length} unlocked</span>
          <span aria-hidden="true" className="text-slate-600">
            ·
          </span>
          <span>{state.completedSkillIds.length} completed</span>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          {/* Status segmented filter */}
          <div className="inline-flex rounded-lg border border-slate-800 bg-[#0F1629] p-1">
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'unlocked', label: 'Unlocked' },
                { id: 'completed', label: 'Completed' },
                { id: 'locked', label: 'Locked' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                  statusFilter === tab.id
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Category segmented filter */}
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setCategoryFilter('all')}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                categoryFilter === 'all'
                  ? 'border-blue-500/70 bg-blue-500/15 text-blue-200'
                  : 'border-slate-800 bg-[#0F1629] text-slate-400 hover:text-slate-200'
              }`}
            >
              All Categories
            </button>
            {SKILL_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  categoryFilter === cat
                    ? 'border-blue-500/70 bg-blue-500/15 text-blue-200'
                    : 'border-slate-800 bg-[#0F1629] text-slate-400 hover:text-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Search Input */}
        <div className="relative w-full lg:w-72">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search skills or objectives..."
            className="w-full rounded-lg border border-slate-800 bg-[#0F1629] py-2 pl-9 pr-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Cards Grid */}
      {filteredSkills.length === 0 ? (
        <div className="rounded-xl border border-slate-800/80 bg-[#0F1629] p-10 text-center">
          <p className="font-display text-base font-semibold text-white">
            No matching skill cards
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Adjust your filters or clear the search query to see more skills.
          </p>
          <button
            type="button"
            onClick={() => {
              setStatusFilter('all');
              setCategoryFilter('all');
              setSearchQuery('');
            }}
            className="mt-4 rounded-lg border border-slate-700 bg-[#151E36] px-4 py-2 text-xs font-semibold text-slate-200 hover:text-white"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredSkills.map((skill) => {
            const isUnlocked = state.unlockedSkillIds.includes(skill.id);
            const isCompleted = state.completedSkillIds.includes(skill.id);
            return (
              <SkillCard
                key={skill.id}
                skill={skill}
                isUnlocked={isUnlocked}
                isCompleted={isCompleted}
                isActive={state.activeSkillId === skill.id}
                onSelect={(s) => setInspectedSkill(s)}
                onTrain={(s) => onSelectSkillAndNavigate(s.id, 'training')}
                onPractice={(s) => onSelectSkillAndNavigate(s.id, 'studio')}
              />
            );
          })}
        </div>
      )}

      {/* Skill Detail Modal */}
      {inspectedSkill && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="skill-modal-title"
          onClick={() => setInspectedSkill(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl border border-slate-700/80 bg-[#0F1629] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-indigo-400">
                  {inspectedSkill.category} · {inspectedSkill.difficulty} · {inspectedSkill.rarity} ·{' '}
                  {inspectedSkill.estimatedMinutes} min
                </p>
                <h2
                  id="skill-modal-title"
                  className="mt-1 font-display text-2xl font-bold text-white"
                >
                  {inspectedSkill.name}
                </h2>
              </div>
              <button
                type="button"
                aria-label="Close skill details"
                onClick={() => setInspectedSkill(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-4 flex items-center gap-2 text-xs font-medium">
              {state.completedSkillIds.includes(inspectedSkill.id) ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                  <span className="text-emerald-300">Completed &amp; Logged</span>
                </>
              ) : state.unlockedSkillIds.includes(inspectedSkill.id) ? (
                <>
                  <Unlock className="h-4 w-4 text-blue-400" aria-hidden="true" />
                  <span className="text-blue-200">Unlocked in Your Deck</span>
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4 text-slate-400" aria-hidden="true" />
                  <span className="text-slate-300">Locked — Pull via Daily Gacha</span>
                </>
              )}
            </div>

            <p className="mt-4 text-sm leading-relaxed text-slate-300">
              {inspectedSkill.description}
            </p>

            <div className="mt-5 border-t border-slate-800 pt-4">
              <h3 className="text-xs font-semibold text-slate-400">Learning Objectives</h3>
              <ul className="mt-2.5 space-y-2 text-sm text-slate-200">
                {inspectedSkill.learningObjectives.map((obj, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <span className="text-indigo-400" aria-hidden="true">
                      —
                    </span>
                    <span>{obj}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-5 border-t border-slate-800 pt-4">
              <h3 className="text-xs font-semibold text-slate-400">Sample Practice Focus</h3>
              <p className="mt-1.5 text-sm text-slate-300">{inspectedSkill.starterPrompt}</p>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-slate-800 pt-4">
              {state.unlockedSkillIds.includes(inspectedSkill.id) ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      const id = inspectedSkill.id;
                      setInspectedSkill(null);
                      onSelectSkillAndNavigate(id, 'studio');
                    }}
                    className="rounded-lg border border-slate-700 bg-[#151E36] px-4 py-2 text-sm font-semibold text-slate-200 hover:text-white"
                  >
                    Open Practice Studio
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const id = inspectedSkill.id;
                      setInspectedSkill(null);
                      onSelectSkillAndNavigate(id, 'training');
                    }}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
                  >
                    Enter AI Training
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setInspectedSkill(null);
                    onNavigate('home');
                  }}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
                >
                  Go to Daily Gacha
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
