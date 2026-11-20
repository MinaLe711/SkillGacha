import { useState } from 'react';
import { CheckCircle2, Lock, Sparkles, Unlock } from 'lucide-react';
import { Skill, SkillRarity } from '../types';

interface SkillCardProps {
  skill: Skill;
  isUnlocked: boolean;
  isCompleted: boolean;
  isActive?: boolean;
  onSelect?: (skill: Skill) => void;
  onTrain?: (skill: Skill) => void;
  onPractice?: (skill: Skill) => void;
  compact?: boolean;
}

const RARITY_GLOW: Record<SkillRarity, string> = {
  Common: 'card-glow-common',
  Rare: 'card-glow-rare',
  Epic: 'card-glow-epic',
  Legendary: 'card-glow-legendary',
};

const RARITY_TEXT_COLOR: Record<SkillRarity, string> = {
  Common: 'text-slate-300',
  Rare: 'text-blue-400',
  Epic: 'text-violet-400',
  Legendary: 'text-indigo-300',
};

export function SkillCard({
  skill,
  isUnlocked,
  isCompleted,
  isActive = false,
  onSelect,
  onTrain,
  onPractice,
  compact = false,
}: SkillCardProps) {
  const [imgFailed, setImgFailed] = useState(false);

  const glowClass = isUnlocked
    ? RARITY_GLOW[skill.rarity]
    : 'border border-slate-800/80';

  return (
    <article
      className={`group relative flex flex-col overflow-hidden rounded-xl bg-[#0F1629] transition-transform duration-200 ${glowClass} ${
        isActive ? 'ring-2 ring-indigo-500/80' : ''
      } ${onSelect ? 'cursor-pointer hover:-translate-y-0.5' : ''}`}
      onClick={() => onSelect?.(skill)}
    >
      {/* Card Artwork Header */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#0A1022]">
        {!imgFailed ? (
          <img
            src={skill.imageUrl}
            alt={`${skill.name} skill card artwork`}
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            className={`h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03] ${
              !isUnlocked ? 'opacity-35 grayscale-[45%]' : 'opacity-90'
            }`}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-[#0F172A] via-[#151E36] to-[#1E1B4B] p-4 text-center">
            <Sparkles className="mb-2 h-7 w-7 text-indigo-400/70" aria-hidden="true" />
            <span className="font-display text-sm font-medium text-slate-300">{skill.name}</span>
          </div>
        )}

        {/* Measured Contrast Scrim */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0F1629] via-[#0F1629]/35 to-transparent" />

        {/* Status Text Line (Non-pill, explicit icon + label) */}
        <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-md bg-[#070B19]/80 px-2 py-1 text-xs font-medium backdrop-blur-sm">
          {isCompleted ? (
            <>
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
              <span className="text-emerald-300">Completed</span>
            </>
          ) : isUnlocked ? (
            <>
              <Unlock className="h-3.5 w-3.5 text-blue-400" aria-hidden="true" />
              <span className="text-blue-200">Unlocked</span>
            </>
          ) : (
            <>
              <Lock className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
              <span className="text-slate-300">Locked</span>
            </>
          )}
        </div>

        {/* Bottom Title Overlay on Art */}
        <div className="absolute inset-x-4 bottom-3">
          <p className="text-xs font-medium text-slate-300">
            <span>{skill.category}</span>
            <span aria-hidden="true" className="mx-1.5 text-slate-500">
              ·
            </span>
            <span className={RARITY_TEXT_COLOR[skill.rarity]}>{skill.rarity}</span>
          </p>
          <h3 className="mt-0.5 font-display text-xl font-semibold tracking-tight text-white">
            {skill.name}
          </h3>
        </div>
      </div>

      {/* Card Body */}
      <div className="flex flex-1 flex-col justify-between gap-4 p-4 sm:p-5">
        <div className="space-y-3">
          <div className="flex items-center gap-2 font-mono text-xs text-slate-400 tabular-nums">
            <span>{skill.difficulty}</span>
            <span aria-hidden="true">·</span>
            <span>{skill.estimatedMinutes} min</span>
          </div>

          <p className="text-sm leading-relaxed text-slate-300">{skill.description}</p>

          {!compact && (
            <div className="border-t border-slate-800/80 pt-3">
              <p className="mb-2 text-xs font-semibold text-slate-400">Learning Objectives</p>
              <ul className="space-y-1.5 text-xs leading-relaxed text-slate-300">
                {skill.learningObjectives.map((obj, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="mt-1 text-indigo-400" aria-hidden="true">
                      —
                    </span>
                    <span>{obj}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {(onTrain || onPractice) && (
          <div
            className="flex items-center gap-2 border-t border-slate-800/80 pt-3"
            onClick={(e) => e.stopPropagation()}
          >
            {isUnlocked ? (
              <>
                {onTrain && (
                  <button
                    type="button"
                    onClick={() => onTrain(skill)}
                    className="flex-1 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 whitespace-nowrap"
                  >
                    AI Training
                  </button>
                )}
                {onPractice && (
                  <button
                    type="button"
                    onClick={() => onPractice(skill)}
                    className="flex-1 rounded-lg border border-slate-700 bg-[#151E36] px-3 py-2 text-xs font-semibold text-slate-200 transition-colors hover:border-blue-500/50 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 whitespace-nowrap"
                  >
                    Practice
                  </button>
                )}
              </>
            ) : (
              <p className="text-xs text-slate-400">
                Unlock this card through the Daily Gacha on Home.
              </p>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
