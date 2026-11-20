import { useEffect, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Clock,
  Compass,
  ExternalLink,
  Globe,
  HelpCircle,
  MessageSquare,
  Mic,
  RefreshCw,
  Send,
  Sparkles,
} from 'lucide-react';
import {
  AppPersistedState,
  AppSection,
  DailyChallenge,
  LearningResource,
  Skill,
  SkillLesson,
} from '../types';
import { PUBLIC_SPEAKING_SKILLS } from '../data/skills';
import { getTodayKey } from '../utils/storage';

interface TrainingRoomViewProps {
  state: AppPersistedState;
  onSelectActiveSkill: (skillId: string) => void;
  onSaveLesson: (skillId: string, lesson: SkillLesson) => void;
  onSaveResources: (skillId: string, resources: LearningResource[]) => void;
  onSaveChallenge: (skillId: string, challenge: DailyChallenge) => void;
  onSaveQuizScore: (skillId: string, score: number) => void;
  onNavigate: (target: AppSection) => void;
}

type TrainingTab = 'lesson' | 'resources' | 'challenge';

export function TrainingRoomView({
  state,
  onSelectActiveSkill,
  onSaveLesson,
  onSaveResources,
  onSaveChallenge,
  onSaveQuizScore,
  onNavigate,
}: TrainingRoomViewProps) {
  const unlockedSkills = PUBLIC_SPEAKING_SKILLS.filter((s) =>
    state.unlockedSkillIds.includes(s.id)
  );

  const activeSkill: Skill | null =
    unlockedSkills.find((s) => s.id === state.activeSkillId) || unlockedSkills[0] || null;

  const [activeTab, setActiveTab] = useState<TrainingTab>('lesson');

  const [lessonLoading, setLessonLoading] = useState(false);
  const [lessonError, setLessonError] = useState<string | null>(null);

  const [resourcesLoading, setResourcesLoading] = useState(false);
  const [resourcesError, setResourcesError] = useState<string | null>(null);

  const [challengeLoading, setChallengeLoading] = useState(false);
  const [challengeError, setChallengeError] = useState<string | null>(null);

  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  const [coachMessages, setCoachMessages] = useState<Array<{ role: string; text: string }>>([]);
  const [coachInput, setCoachInput] = useState('');
  const [coachLoading, setCoachLoading] = useState(false);
  const [coachError, setCoachError] = useState<string | null>(null);

  const lesson = activeSkill ? state.lessonsBySkill[activeSkill.id] : undefined;
  const resources = activeSkill ? state.resourcesBySkill[activeSkill.id] : undefined;
  const challenge = activeSkill ? state.challengesBySkill[activeSkill.id] : undefined;

  async function fetchLesson(skill: Skill, force = false) {
    if (!force && state.lessonsBySkill[skill.id]) return;
    setLessonLoading(true);
    setLessonError(null);
    try {
      const res = await fetch('/api/training/lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skillName: skill.name,
          category: skill.category,
          difficulty: skill.difficulty,
          description: skill.description,
          learningObjectives: skill.learningObjectives,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate AI training lesson.');
      onSaveLesson(skill.id, {
        skillId: skill.id,
        summary: data.summary,
        techniques: data.techniques || [],
        exercises: data.exercises || [],
        comprehensionQuestions: data.comprehensionQuestions || [],
        generatedAt: new Date().toISOString(),
      });
      setSelectedAnswers({});
      setQuizSubmitted(false);
    } catch (err) {
      setLessonError(err instanceof Error ? err.message : 'Could not load lesson.');
    } finally {
      setLessonLoading(false);
    }
  }

  async function fetchResources(skill: Skill, force = false) {
    if (!force && state.resourcesBySkill[skill.id]) return;
    setResourcesLoading(true);
    setResourcesError(null);
    try {
      const res = await fetch('/api/training/resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skillName: skill.name,
          category: skill.category,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load grounded learning resources.');
      onSaveResources(skill.id, data.resources || []);
    } catch (err) {
      setResourcesError(err instanceof Error ? err.message : 'Could not load web resources.');
    } finally {
      setResourcesLoading(false);
    }
  }

  async function fetchChallenge(skill: Skill, force = false) {
    const today = getTodayKey();
    const existing = state.challengesBySkill[skill.id];
    if (!force && existing && existing.dateKey === today) return;

    setChallengeLoading(true);
    setChallengeError(null);
    try {
      const res = await fetch('/api/training/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skillName: skill.name,
          category: skill.category,
          difficulty: skill.difficulty,
          description: skill.description,
          dateKey: today,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate daily challenge.');
      onSaveChallenge(skill.id, {
        id: `${skill.id}_${today}`,
        skillId: skill.id,
        title: data.title,
        instructions: data.instructions,
        timeLimitSeconds: data.timeLimitSeconds || 90,
        evaluationCriteria: data.evaluationCriteria || [],
        xpReward: data.xpReward || 150,
        dateKey: today,
      });
    } catch (err) {
      setChallengeError(err instanceof Error ? err.message : 'Could not load daily challenge.');
    } finally {
      setChallengeLoading(false);
    }
  }

  useEffect(() => {
    if (!activeSkill) return;
    setSelectedAnswers({});
    setQuizSubmitted(false);
    setCoachMessages([]);
    setCoachError(null);

    void fetchLesson(activeSkill);
    void fetchResources(activeSkill);
    void fetchChallenge(activeSkill);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSkill?.id]);

  async function handleAskCoach(e: React.FormEvent) {
    e.preventDefault();
    if (!activeSkill || !coachInput.trim() || coachLoading) return;
    const question = coachInput.trim();
    setCoachInput('');
    setCoachError(null);
    const nextHistory = [...coachMessages, { role: 'Learner', text: question }];
    setCoachMessages(nextHistory);
    setCoachLoading(true);
    try {
      const res = await fetch('/api/training/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skillName: activeSkill.name,
          question,
          history: nextHistory,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Coach response failed.');
      setCoachMessages((prev) => [...prev, { role: 'Coach', text: data.reply }]);
    } catch (err) {
      setCoachError(err instanceof Error ? err.message : 'Could not reach AI Coach.');
    } finally {
      setCoachLoading(false);
    }
  }

  function handleSubmitQuiz() {
    if (!lesson || !activeSkill) return;
    let correct = 0;
    lesson.comprehensionQuestions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correctIndex) correct += 1;
    });
    setQuizSubmitted(true);
    onSaveQuizScore(activeSkill.id, correct);
  }

  if (!activeSkill) {
    return (
      <div className="rounded-xl border border-slate-800/90 bg-[#0F1629] p-10 text-center">
        <Compass className="mx-auto mb-3 h-9 w-9 text-indigo-400" aria-hidden="true" />
        <h1 className="font-display text-2xl font-bold text-white">AI Training Room</h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-400">
          Unlock at least one Public Speaking skill card through the Daily Gacha before starting an
          AI-guided training session.
        </p>
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500"
        >
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          <span>Go to Daily Gacha</span>
        </button>
      </div>
    );
  }

  const isChallengeDone =
    challenge && state.completedChallengeIds.includes(challenge.id);

  return (
    <div className="space-y-6">
      {/* Header & Skill Selector */}
      <div className="flex flex-col gap-4 border-b border-slate-800/80 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-medium text-indigo-400">
            {activeSkill.category} · {activeSkill.difficulty} · {activeSkill.estimatedMinutes} min
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
            AI Training: {activeSkill.name}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="training-skill-select" className="text-xs font-medium text-slate-400">
            Active Skill:
          </label>
          <select
            id="training-skill-select"
            value={activeSkill.id}
            onChange={(e) => onSelectActiveSkill(e.target.value)}
            className="rounded-lg border border-slate-700 bg-[#0F1629] px-3 py-2 text-sm font-medium text-white focus:border-indigo-500 focus:outline-none"
          >
            {unlockedSkills.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.category})
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => onNavigate('studio')}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-indigo-500 whitespace-nowrap"
          >
            <Mic className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Practice Studio</span>
          </button>
        </div>
      </div>

      {/* Sub-navigation Tabs */}
      <div className="inline-flex flex-wrap gap-1 rounded-lg border border-slate-800 bg-[#0F1629] p-1">
        <button
          type="button"
          onClick={() => setActiveTab('lesson')}
          className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
            activeTab === 'lesson'
              ? 'bg-indigo-600 text-white'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Lesson &amp; Comprehension</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('resources')}
          className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
            activeTab === 'resources'
              ? 'bg-indigo-600 text-white'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Globe className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Internet Resources</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('challenge')}
          className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
            activeTab === 'challenge'
              ? 'bg-indigo-600 text-white'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Daily Challenge &amp; AI Coach</span>
        </button>
      </div>

      {/* TAB 1: AI LESSON & COMPREHENSION */}
      {activeTab === 'lesson' && (
        <div className="space-y-6">
          {lessonLoading ? (
            <div className="space-y-4 rounded-xl border border-slate-800 bg-[#0F1629] p-6">
              <div className="h-5 w-48 animate-pulse rounded bg-slate-800" />
              <div className="h-4 w-full animate-pulse rounded bg-slate-800/80" />
              <div className="h-4 w-5/6 animate-pulse rounded bg-slate-800/80" />
              <div className="grid grid-cols-1 gap-4 pt-4 md:grid-cols-2">
                <div className="h-32 animate-pulse rounded-lg bg-slate-800/60" />
                <div className="h-32 animate-pulse rounded-lg bg-slate-800/60" />
              </div>
            </div>
          ) : lessonError ? (
            <div className="rounded-xl border border-rose-500/40 bg-rose-950/20 p-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" aria-hidden="true" />
                <div>
                  <h2 className="font-display text-base font-semibold text-white">
                    Could not generate training module
                  </h2>
                  <p className="mt-1 text-sm text-rose-200">{lessonError}</p>
                  <button
                    type="button"
                    onClick={() => fetchLesson(activeSkill, true)}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-rose-500"
                  >
                    <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Retry Generation</span>
                  </button>
                </div>
              </div>
            </div>
          ) : lesson ? (
            <div className="space-y-8">
              {/* Plain-Language Overview */}
              <section className="rounded-xl border border-slate-800/90 bg-[#0F1629] p-6">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="font-display text-lg font-semibold text-white">
                    Core Concept in Simple Language
                  </h2>
                  <button
                    type="button"
                    onClick={() => fetchLesson(activeSkill, true)}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white"
                  >
                    <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Regenerate</span>
                  </button>
                </div>
                <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-300">
                  {lesson.summary}
                </p>
              </section>

              {/* Techniques & Examples */}
              <section className="space-y-4">
                <h2 className="font-display text-lg font-semibold text-white">
                  Actionable Techniques &amp; Examples
                </h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {lesson.techniques.map((tech, idx) => (
                    <div
                      key={idx}
                      className="flex flex-col justify-between rounded-xl border border-slate-800/90 bg-[#0F1629] p-5"
                    >
                      <div>
                        <p className="font-mono text-xs text-indigo-400 tabular-nums">
                          0{idx + 1}. Technique
                        </p>
                        <h3 className="mt-1 font-display text-base font-semibold text-white">
                          {tech.title}
                        </h3>
                        <p className="mt-2 text-sm leading-relaxed text-slate-300">
                          {tech.explanation}
                        </p>
                      </div>
                      <div className="mt-4 border-t border-slate-800 pt-3">
                        <p className="text-xs font-semibold text-blue-300">Spoken Example</p>
                        <p className="mt-1 text-xs leading-relaxed text-slate-300 italic">
                          &ldquo;{tech.example}&rdquo;
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Short Solo Exercises */}
              <section className="space-y-4">
                <h2 className="font-display text-lg font-semibold text-white">
                  Quick Solo Drills
                </h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {lesson.exercises.map((ex, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-slate-800/90 bg-[#0F1629] p-5"
                    >
                      <h3 className="font-display text-base font-semibold text-white">
                        {ex.title}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-slate-300">{ex.prompt}</p>
                      <p className="mt-3 text-xs text-slate-400">
                        <span className="font-semibold text-indigo-300">Coach Tip: </span>
                        {ex.tip}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Comprehension Check */}
              <section className="rounded-xl border border-slate-800/90 bg-[#0F1629] p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="font-display text-lg font-semibold text-white">
                      Comprehension Check
                    </h2>
                    <p className="text-xs text-slate-400">
                      Verify your grasp of {activeSkill.name} before stepping into the Practice
                      Studio.
                    </p>
                  </div>
                  {typeof state.quizScoresBySkill[activeSkill.id] === 'number' && (
                    <span className="font-mono text-xs text-emerald-300 tabular-nums">
                      Best Score: {state.quizScoresBySkill[activeSkill.id]} /{' '}
                      {lesson.comprehensionQuestions.length}
                    </span>
                  )}
                </div>

                <div className="mt-5 space-y-6">
                  {lesson.comprehensionQuestions.map((q, qIdx) => {
                    const picked = selectedAnswers[qIdx];
                    return (
                      <div key={qIdx} className="border-t border-slate-800/80 pt-5 first:border-t-0 first:pt-0">
                        <p className="flex items-start gap-2 text-sm font-medium text-white">
                          <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-indigo-400" aria-hidden="true" />
                          <span>
                            {qIdx + 1}. {q.question}
                          </span>
                        </p>
                        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {q.options.map((opt, oIdx) => {
                            const isSelected = picked === oIdx;
                            const isCorrect = q.correctIndex === oIdx;
                            let btnStyle =
                              'border-slate-800 bg-[#070B19] text-slate-300 hover:border-slate-700';
                            if (quizSubmitted) {
                              if (isCorrect) {
                                btnStyle = 'border-emerald-500/70 bg-emerald-500/15 text-emerald-200';
                              } else if (isSelected && !isCorrect) {
                                btnStyle = 'border-rose-500/70 bg-rose-500/15 text-rose-200';
                              }
                            } else if (isSelected) {
                              btnStyle = 'border-indigo-500 bg-indigo-500/20 text-white';
                            }

                            return (
                              <button
                                key={oIdx}
                                type="button"
                                disabled={quizSubmitted}
                                onClick={() =>
                                  setSelectedAnswers((prev) => ({ ...prev, [qIdx]: oIdx }))
                                }
                                className={`rounded-lg border px-3.5 py-2.5 text-left text-xs leading-relaxed transition-colors ${btnStyle}`}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                        {quizSubmitted && (
                          <p className="mt-2.5 text-xs leading-relaxed text-slate-300">
                            <span className="font-semibold text-indigo-300">Explanation: </span>
                            {q.explanation}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4">
                  {!quizSubmitted ? (
                    <button
                      type="button"
                      disabled={
                        Object.keys(selectedAnswers).length <
                        lesson.comprehensionQuestions.length
                      }
                      onClick={handleSubmitQuiz}
                      className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
                    >
                      Check Answers
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedAnswers({});
                        setQuizSubmitted(false);
                      }}
                      className="rounded-lg border border-slate-700 bg-[#151E36] px-4 py-2 text-xs font-semibold text-slate-200 hover:text-white"
                    >
                      Retake Check
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setActiveTab('challenge')}
                    className="text-xs font-semibold text-blue-400 hover:text-blue-300"
                  >
                    Next: View Today&apos;s Challenge →
                  </button>
                </div>
              </section>
            </div>
          ) : null}
        </div>
      )}

      {/* TAB 2: GROUNDED INTERNET LEARNING RESOURCES */}
      {activeTab === 'resources' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-semibold text-white">
                Verified Internet Learning Resources
              </h2>
              <p className="text-xs text-slate-400">
                Retrieved via Google Search grounding. Only verified, active source URLs are linked.
              </p>
            </div>
            <button
              type="button"
              disabled={resourcesLoading}
              onClick={() => fetchResources(activeSkill, true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-[#0F1629] px-3.5 py-2 text-xs font-semibold text-slate-200 hover:text-white disabled:opacity-50"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${resourcesLoading ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
              <span>Refresh Search</span>
            </button>
          </div>

          {resourcesLoading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {[1, 2, 3, 4].map((n) => (
                <div
                  key={n}
                  className="h-36 animate-pulse rounded-xl border border-slate-800 bg-[#0F1629] p-5"
                />
              ))}
            </div>
          ) : resourcesError ? (
            <div className="rounded-xl border border-rose-500/40 bg-rose-950/20 p-6">
              <p className="text-sm text-rose-200">{resourcesError}</p>
              <button
                type="button"
                onClick={() => fetchResources(activeSkill, true)}
                className="mt-3 rounded-lg bg-rose-600 px-3.5 py-2 text-xs font-semibold text-white"
              >
                Retry Search
              </button>
            </div>
          ) : resources && resources.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {resources.map((res, idx) => (
                <article
                  key={idx}
                  className="flex flex-col justify-between rounded-xl border border-slate-800/90 bg-[#0F1629] p-5"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
                      <span>
                        {res.resourceType} · {res.authorOrOrg}
                      </span>
                      <span className={res.verified ? 'text-emerald-400' : 'text-amber-400'}>
                        {res.verified ? 'Verified source' : 'Source unavailable'}
                      </span>
                    </div>
                    <h3 className="mt-1.5 font-display text-base font-semibold text-white">
                      {res.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-300">
                      {res.shortDescription}
                    </p>
                  </div>

                  <div className="mt-4 border-t border-slate-800 pt-3">
                    {res.verified && res.sourceUrl ? (
                      <a
                        href={res.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-400 hover:text-blue-300"
                      >
                        <span>Open Resource</span>
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                      </a>
                    ) : (
                      <span className="text-xs text-slate-500">
                        External link unavailable — unverified URL omitted
                      </span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-slate-800 bg-[#0F1629] p-8 text-center text-sm text-slate-400">
              No resources loaded yet. Click Refresh Search to fetch grounded study links.
            </div>
          )}
        </div>
      )}

      {/* TAB 3: DAILY CHALLENGE & ASK AI COACH */}
      {activeTab === 'challenge' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Daily Challenge Card */}
          <section className="flex flex-col justify-between rounded-xl border border-slate-800/90 bg-[#0F1629] p-6 lg:col-span-7">
            {challengeLoading ? (
              <div className="space-y-4">
                <div className="h-6 w-2/3 animate-pulse rounded bg-slate-800" />
                <div className="h-20 w-full animate-pulse rounded bg-slate-800/70" />
              </div>
            ) : challengeError ? (
              <div className="space-y-3">
                <p className="text-sm text-rose-300">{challengeError}</p>
                <button
                  type="button"
                  onClick={() => fetchChallenge(activeSkill, true)}
                  className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white"
                >
                  Retry Challenge
                </button>
              </div>
            ) : challenge ? (
              <>
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-mono text-xs text-indigo-400 tabular-nums">
                      Daily Practical Challenge · {challenge.timeLimitSeconds}s · +{challenge.xpReward}{' '}
                      XP
                    </p>
                    <div className="flex items-center gap-1.5 text-xs font-medium">
                      {isChallengeDone ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                          <span className="text-emerald-300">Completed today</span>
                        </>
                      ) : (
                        <span className="text-slate-400">Pending practice</span>
                      )}
                    </div>
                  </div>

                  <h2 className="font-display text-xl font-bold text-white">{challenge.title}</h2>
                  <p className="text-sm leading-relaxed text-slate-300">
                    {challenge.instructions}
                  </p>

                  <div className="border-t border-slate-800 pt-4">
                    <h3 className="text-xs font-semibold text-slate-400">
                      AI Evaluation Criteria
                    </h3>
                    <ul className="mt-2.5 space-y-2 text-sm text-slate-200">
                      {challenge.evaluationCriteria.map((crit, idx) => (
                        <li key={idx} className="flex items-start gap-2.5">
                          <span className="text-blue-400" aria-hidden="true">
                            —
                          </span>
                          <span>{crit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-5">
                  <button
                    type="button"
                    onClick={() => fetchChallenge(activeSkill, true)}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white"
                  >
                    <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>New Prompt</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onNavigate('studio')}
                    className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
                  >
                    <Mic className="h-4 w-4" aria-hidden="true" />
                    <span>Open in Practice Studio</span>
                  </button>
                </div>
              </>
            ) : null}
          </section>

          {/* Inline AI Coach Q&A */}
          <section className="flex flex-col rounded-xl border border-slate-800/90 bg-[#0F1629] p-6 lg:col-span-5">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-indigo-400" aria-hidden="true" />
              <h2 className="font-display text-base font-semibold text-white">Ask AI Coach</h2>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Ask for concrete examples, phrasing alternatives, or prep advice on{' '}
              {activeSkill.name}.
            </p>

            <div className="mt-4 flex-1 space-y-3 overflow-y-auto rounded-lg border border-slate-800/80 bg-[#070B19] p-3.5 max-h-72 min-h-[180px]">
              {coachMessages.length === 0 ? (
                <p className="text-xs leading-relaxed text-slate-500">
                  Try asking: &ldquo;Give me a 20-second opening hook example for {activeSkill.name}
                  .&rdquo;
                </p>
              ) : (
                coachMessages.map((m, idx) => (
                  <div
                    key={idx}
                    className={`rounded-lg p-3 text-xs leading-relaxed ${
                      m.role === 'Learner'
                        ? 'ml-6 bg-indigo-600/20 text-indigo-100'
                        : 'mr-4 bg-[#151E36] text-slate-200'
                    }`}
                  >
                    <p className="mb-1 font-semibold text-slate-400">{m.role}</p>
                    <p className="whitespace-pre-line">{m.text}</p>
                  </div>
                ))
              )}
              {coachLoading && (
                <p className="text-xs text-indigo-300">Coach is formulating advice...</p>
              )}
            </div>

            {coachError && <p className="mt-2 text-xs text-rose-400">{coachError}</p>}

            <form onSubmit={handleAskCoach} className="mt-3 flex gap-2">
              <input
                type="text"
                value={coachInput}
                onChange={(e) => setCoachInput(e.target.value)}
                placeholder={`Ask about ${activeSkill.name}...`}
                className="flex-1 rounded-lg border border-slate-800 bg-[#070B19] px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!coachInput.trim() || coachLoading}
                aria-label="Send question to AI Coach"
                className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-3 py-2 text-white transition-colors hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500"
              >
                <Send className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
