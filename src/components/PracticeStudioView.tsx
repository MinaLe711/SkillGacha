import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Clock,
  FileAudio,
  Mic,
  Pause,
  Play,
  RotateCcw,
  Save,
  Sparkles,
  Square,
  Upload,
  Video,
} from 'lucide-react';
import {
  AppPersistedState,
  AppSection,
  DailyChallenge,
  LearningJournalEntry,
  PracticeFeedback,
  Skill,
} from '../types';
import { PUBLIC_SPEAKING_SKILLS } from '../data/skills';
import { getTodayKey } from '../utils/storage';

interface PracticeStudioViewProps {
  state: AppPersistedState;
  onSelectActiveSkill: (skillId: string) => void;
  onSaveChallenge: (skillId: string, challenge: DailyChallenge) => void;
  onCompletePractice: (entry: LearningJournalEntry, challengeId?: string) => void;
  onNavigate: (target: AppSection) => void;
}

type CaptureMode = 'audio' | 'video' | 'upload';

function formatSeconds(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to encode audio file.'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read recording data.'));
    reader.readAsDataURL(blob);
  });
}

function RatingText({ rating }: { rating: string }) {
  const color =
    rating === 'Distinctive'
      ? 'text-emerald-300'
      : rating === 'Strong'
      ? 'text-blue-300'
      : rating === 'Developing'
      ? 'text-amber-300'
      : 'text-rose-300';
  return <span className={`font-semibold ${color}`}>{rating}</span>;
}

export function PracticeStudioView({
  state,
  onSelectActiveSkill,
  onSaveChallenge,
  onCompletePractice,
  onNavigate,
}: PracticeStudioViewProps) {
  const unlockedSkills = PUBLIC_SPEAKING_SKILLS.filter((s) =>
    state.unlockedSkillIds.includes(s.id)
  );
  const activeSkill: Skill | null =
    unlockedSkills.find((s) => s.id === state.activeSkillId) || unlockedSkills[0] || null;

  const challenge: DailyChallenge | null = activeSkill
    ? state.challengesBySkill[activeSkill.id] || {
        id: `${activeSkill.id}_${getTodayKey()}`,
        skillId: activeSkill.id,
        title: `${activeSkill.name} Daily Drill`,
        instructions: activeSkill.starterPrompt,
        timeLimitSeconds: 90,
        evaluationCriteria: activeSkill.learningObjectives,
        xpReward: 140,
        dateKey: getTodayKey(),
      }
    : null;

  const [captureMode, setCaptureMode] = useState<CaptureMode>('audio');
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [countdownActive, setCountdownActive] = useState(false);
  const [remainingTimer, setRemainingTimer] = useState(challenge?.timeLimitSeconds ?? 90);

  const [mediaBlob, setMediaBlob] = useState<Blob | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaKind, setMediaKind] = useState<'audio' | 'video'>('audio');
  const [recordingReference, setRecordingReference] = useState('');
  const [recordError, setRecordError] = useState<string | null>(null);

  const [transcript, setTranscript] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcribeError, setTranscribeError] = useState<string | null>(null);

  const [feedback, setFeedback] = useState<PracticeFeedback | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  const [selfReflection, setSelfReflection] = useState('');
  const [keyTakeaways, setKeyTakeaways] = useState('');
  const [nextGoal, setNextGoal] = useState('');
  const [savedEntryId, setSavedEntryId] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const timerIntervalRef = useRef<number | null>(null);
  const countdownIntervalRef = useRef<number | null>(null);

  const supportsMediaDevices =
    typeof navigator !== 'undefined' &&
    Boolean(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) &&
    typeof MediaRecorder !== 'undefined';

  // Ensure daily challenge exists for active skill if not yet generated
  useEffect(() => {
    if (!activeSkill) return;
    setRemainingTimer(challenge?.timeLimitSeconds ?? 90);
    setSavedEntryId(null);
    setFeedback(null);
    setAnalyzeError(null);
  }, [activeSkill?.id, challenge?.timeLimitSeconds]);

  // Cleanup URLs and streams on unmount
  useEffect(() => {
    return () => {
      if (mediaUrl) URL.revokeObjectURL(mediaUrl);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (timerIntervalRef.current) window.clearInterval(timerIntervalRef.current);
      if (countdownIntervalRef.current) window.clearInterval(countdownIntervalRef.current);
    };
  }, [mediaUrl]);

  // Countdown timer effect
  useEffect(() => {
    if (!countdownActive) {
      if (countdownIntervalRef.current) window.clearInterval(countdownIntervalRef.current);
      return;
    }
    countdownIntervalRef.current = window.setInterval(() => {
      setRemainingTimer((prev) => {
        if (prev <= 1) {
          setCountdownActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownIntervalRef.current) window.clearInterval(countdownIntervalRef.current);
    };
  }, [countdownActive]);

  async function generateFreshChallenge() {
    if (!activeSkill) return;
    try {
      const res = await fetch('/api/training/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skillName: activeSkill.name,
          category: activeSkill.category,
          difficulty: activeSkill.difficulty,
          description: activeSkill.description,
          dateKey: getTodayKey(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        onSaveChallenge(activeSkill.id, {
          id: `${activeSkill.id}_${getTodayKey()}`,
          skillId: activeSkill.id,
          title: data.title,
          instructions: data.instructions,
          timeLimitSeconds: data.timeLimitSeconds || 90,
          evaluationCriteria: data.evaluationCriteria || [],
          xpReward: data.xpReward || 150,
          dateKey: getTodayKey(),
        });
      }
    } catch {
      // Keep starter challenge fallback silently
    }
  }

  async function startRecording(kind: 'audio' | 'video') {
    if (!supportsMediaDevices) {
      setRecordError(
        'Audio/video recording is not supported in this browser. You can upload an audio file or type your transcript below.'
      );
      return;
    }

    setRecordError(null);
    setTranscribeError(null);
    setSavedEntryId(null);

    try {
      const constraints: MediaStreamConstraints =
        kind === 'video' ? { audio: true, video: true } : { audio: true };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (kind === 'video' && videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        void videoPreviewRef.current.play();
      }

      const preferredTypes =
        kind === 'video'
          ? ['video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4']
          : ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];

      const supportedMime = preferredTypes.find((t) => MediaRecorder.isTypeSupported(t));
      const recorder = supportedMime
        ? new MediaRecorder(stream, { mimeType: supportedMime })
        : new MediaRecorder(stream);

      chunksRef.current = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) {
          chunksRef.current.push(ev.data);
        }
      };

      recorder.onstop = () => {
        const finalMime = recorder.mimeType || (kind === 'video' ? 'video/webm' : 'audio/webm');
        const blob = new Blob(chunksRef.current, { type: finalMime });
        if (mediaUrl) URL.revokeObjectURL(mediaUrl);
        const url = URL.createObjectURL(blob);
        setMediaBlob(blob);
        setMediaUrl(url);
        setMediaKind(kind);
        setRecordingReference(
          `${kind === 'video' ? 'Video' : 'Audio'} Recording (${new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })})`
        );

        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = null;
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start(250);
      setIsRecording(true);
      setElapsedSeconds(0);
      setRemainingTimer(challenge?.timeLimitSeconds ?? 90);
      setCountdownActive(true);

      if (timerIntervalRef.current) window.clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = window.setInterval(() => {
        setElapsedSeconds((s) => s + 1);
      }, 1000);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Microphone or camera permission was denied.';
      setRecordError(
        `${msg} You can still upload a recording file or enter your spoken transcript directly.`
      );
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setCountdownActive(false);
    if (timerIntervalRef.current) {
      window.clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setRecordError(null);
    setTranscribeError(null);
    setSavedEntryId(null);

    if (mediaUrl) URL.revokeObjectURL(mediaUrl);
    const url = URL.createObjectURL(file);
    setMediaBlob(file);
    setMediaUrl(url);
    setMediaKind(file.type.startsWith('video/') ? 'video' : 'audio');
    setRecordingReference(file.name);

    // Try reading real duration from audio/video metadata
    const probe = document.createElement(file.type.startsWith('video/') ? 'video' : 'audio');
    probe.preload = 'metadata';
    probe.src = url;
    probe.onloadedmetadata = () => {
      if (Number.isFinite(probe.duration) && probe.duration > 0) {
        setElapsedSeconds(Math.round(probe.duration));
      }
    };
  }

  async function handleTranscribe() {
    if (!mediaBlob || isTranscribing) return;
    setIsTranscribing(true);
    setTranscribeError(null);
    try {
      const base64 = await blobToBase64(mediaBlob);
      const res = await fetch('/api/practice/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64: base64,
          mimeType: mediaBlob.type || 'audio/webm',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Transcription failed.');
      setTranscript(data.transcript || '');
    } catch (err) {
      setTranscribeError(
        err instanceof Error ? err.message : 'Unable to transcribe recording.'
      );
    } finally {
      setIsTranscribing(false);
    }
  }

  async function handleAnalyze() {
    if (!activeSkill || !challenge || !transcript.trim() || isAnalyzing) return;
    setIsAnalyzing(true);
    setAnalyzeError(null);
    try {
      const res = await fetch('/api/practice/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skillName: activeSkill.name,
          challengeTitle: challenge.title,
          challengeInstructions: challenge.instructions,
          evaluationCriteria: challenge.evaluationCriteria,
          transcript: transcript.trim(),
          durationSeconds: elapsedSeconds,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI performance analysis failed.');
      setFeedback(data as PracticeFeedback);
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : 'Analysis request failed.');
    } finally {
      setIsAnalyzing(false);
    }
  }

  function handleSaveJournal(e: React.FormEvent) {
    e.preventDefault();
    if (!activeSkill || !challenge || !feedback) return;

    const entryId = `journal_${Date.now()}`;
    const entry: LearningJournalEntry = {
      id: entryId,
      dateIso: new Date().toISOString(),
      skillId: activeSkill.id,
      skillName: activeSkill.name,
      resources: state.resourcesBySkill[activeSkill.id] || [],
      challengeTitle: challenge.title,
      challengeInstructions: challenge.instructions,
      recordingReference: recordingReference || 'Written Transcript Practice',
      durationSeconds: elapsedSeconds,
      transcript: transcript.trim(),
      feedback,
      selfReflection: selfReflection.trim() || 'Completed daily speaking drill.',
      keyTakeaways: keyTakeaways.trim() || feedback.overallSummary,
      nextGoal:
        nextGoal.trim() ||
        feedback.suggestedImprovements[0] ||
        `Continue refining ${activeSkill.name}.`,
      xpEarned: challenge.xpReward,
    };

    onCompletePractice(entry, challenge.id);
    setSavedEntryId(entryId);
  }

  if (!activeSkill || !challenge) {
    return (
      <div className="rounded-xl border border-slate-800/90 bg-[#0F1629] p-10 text-center">
        <Mic className="mx-auto mb-3 h-9 w-9 text-indigo-400" aria-hidden="true" />
        <h1 className="font-display text-2xl font-bold text-white">Practice Studio</h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-400">
          Unlock a Public Speaking skill card on Home first, then return here to record, transcribe,
          and analyze your speaking performance.
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

  const wordCount = transcript.trim() ? transcript.trim().split(/\s+/).filter(Boolean).length : 0;
  const liveWpm =
    elapsedSeconds >= 5 && wordCount > 0 ? Math.round((wordCount / elapsedSeconds) * 60) : null;

  return (
    <div className="space-y-6">
      {/* Header + Skill Selector */}
      <div className="flex flex-col gap-4 border-b border-slate-800/80 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-medium text-indigo-400">
            Practice Studio · {activeSkill.name}
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Record &amp; Analyze Your Delivery
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="studio-skill-select" className="text-xs font-medium text-slate-400">
            Skill:
          </label>
          <select
            id="studio-skill-select"
            value={activeSkill.id}
            onChange={(e) => onSelectActiveSkill(e.target.value)}
            className="rounded-lg border border-slate-700 bg-[#0F1629] px-3 py-2 text-sm font-medium text-white focus:border-indigo-500 focus:outline-none"
          >
            {unlockedSkills.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => onNavigate('training')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-[#0F1629] px-3.5 py-2 text-xs font-semibold text-slate-200 hover:text-white whitespace-nowrap"
          >
            <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Review Lesson</span>
          </button>
        </div>
      </div>

      {/* Challenge Context + Live Timer */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="rounded-xl border border-slate-800/90 bg-[#0F1629] p-6 lg:col-span-8">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-mono text-xs text-indigo-400 tabular-nums">
              Challenge · {challenge.timeLimitSeconds}s target · +{challenge.xpReward} XP
            </p>
            <button
              type="button"
              onClick={generateFreshChallenge}
              className="text-xs font-medium text-blue-400 hover:text-blue-300"
            >
              Generate Fresh AI Prompt
            </button>
          </div>
          <h2 className="mt-1.5 font-display text-lg font-bold text-white">{challenge.title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">{challenge.instructions}</p>

          <div className="mt-4 border-t border-slate-800/80 pt-3">
            <p className="text-xs font-semibold text-slate-400">Evaluation Criteria</p>
            <ul className="mt-2 grid grid-cols-1 gap-1.5 text-xs text-slate-300 sm:grid-cols-2">
              {challenge.evaluationCriteria.map((c, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-blue-400" aria-hidden="true">
                    —
                  </span>
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Practice Countdown Timer */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-800/90 bg-[#0F1629] p-6 lg:col-span-4">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Challenge Timer</span>
              <Clock className="h-4 w-4 text-blue-400" aria-hidden="true" />
            </div>
            <p
              className={`mt-3 font-mono text-4xl font-semibold tabular-nums ${
                remainingTimer === 0 ? 'text-amber-300' : 'text-white'
              }`}
            >
              {formatSeconds(remainingTimer)}
            </p>
            <p className="mt-1 font-mono text-xs text-slate-400 tabular-nums">
              Elapsed recorded: {formatSeconds(elapsedSeconds)}
            </p>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCountdownActive((v) => !v)}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-[#151E36] px-3 py-2 text-xs font-semibold text-white hover:border-indigo-500"
            >
              {countdownActive ? (
                <>
                  <Pause className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Start Timer</span>
                </>
              )}
            </button>
            <button
              type="button"
              aria-label="Reset countdown timer"
              onClick={() => {
                setCountdownActive(false);
                setRemainingTimer(challenge.timeLimitSeconds);
              }}
              className="inline-flex items-center justify-center rounded-lg border border-slate-700 bg-[#151E36] p-2 text-slate-300 hover:text-white"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </section>

      {/* Capture Stage + Transcript */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: Recorder / Upload */}
        <div className="space-y-4 rounded-xl border border-slate-800/90 bg-[#0F1629] p-6 lg:col-span-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-base font-semibold text-white">1. Capture Practice</h2>
            <div className="inline-flex rounded-lg border border-slate-800 bg-[#070B19] p-1">
              <button
                type="button"
                onClick={() => setCaptureMode('audio')}
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                  captureMode === 'audio'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Mic className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Audio</span>
              </button>
              <button
                type="button"
                onClick={() => setCaptureMode('video')}
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                  captureMode === 'video'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Video className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Video</span>
              </button>
              <button
                type="button"
                onClick={() => setCaptureMode('upload')}
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                  captureMode === 'upload'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Upload</span>
              </button>
            </div>
          </div>

          {captureMode === 'audio' && (
            <div className="rounded-xl border border-slate-800 bg-[#070B19] p-5 text-center">
              <p className="font-mono text-2xl font-semibold text-white tabular-nums">
                {formatSeconds(elapsedSeconds)}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {isRecording
                  ? 'Microphone active — speak clearly into your mic.'
                  : 'Press Record to capture your speaking practice.'}
              </p>

              <div className="mt-4 flex justify-center gap-3">
                {!isRecording ? (
                  <button
                    type="button"
                    onClick={() => startRecording('audio')}
                    className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500"
                  >
                    <Mic className="h-4 w-4" aria-hidden="true" />
                    <span>Record Audio</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-rose-500"
                  >
                    <Square className="h-4 w-4" aria-hidden="true" />
                    <span>Stop Recording</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {captureMode === 'video' && (
            <div className="space-y-3 rounded-xl border border-slate-800 bg-[#070B19] p-4">
              <div className="aspect-video overflow-hidden rounded-lg bg-slate-950">
                <video
                  ref={videoPreviewRef}
                  muted
                  playsInline
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm text-slate-300 tabular-nums">
                  {formatSeconds(elapsedSeconds)}
                </span>
                {!isRecording ? (
                  <button
                    type="button"
                    onClick={() => startRecording('video')}
                    className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
                  >
                    <Video className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Record Video</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500"
                  >
                    <Square className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Stop Video</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {captureMode === 'upload' && (
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 bg-[#070B19] p-6 text-center transition-colors hover:border-indigo-500">
              <FileAudio className="mb-2 h-7 w-7 text-indigo-400" aria-hidden="true" />
              <span className="text-xs font-semibold text-white">
                Choose an audio or video recording
              </span>
              <span className="mt-1 text-xs text-slate-400">
                Supports MP3, WAV, WebM, M4A, MP4
              </span>
              <input
                type="file"
                accept="audio/*,video/*"
                onChange={handleFileUpload}
                className="sr-only"
              />
            </label>
          )}

          {recordError && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-950/20 p-3 text-xs text-amber-200">
              {recordError}
            </div>
          )}

          {/* Playback + Transcribe Button */}
          {mediaUrl && (
            <div className="space-y-3 border-t border-slate-800 pt-4">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="truncate font-medium text-slate-200">{recordingReference}</span>
                <span className="font-mono tabular-nums">{formatSeconds(elapsedSeconds)}</span>
              </div>

              {mediaKind === 'video' ? (
                <video src={mediaUrl} controls className="w-full rounded-lg bg-black" />
              ) : (
                <audio src={mediaUrl} controls className="w-full" />
              )}

              <button
                type="button"
                disabled={isTranscribing}
                onClick={handleTranscribe}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-60"
              >
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{isTranscribing ? 'Transcribing Audio...' : 'Generate AI Transcript'}</span>
              </button>

              {transcribeError && (
                <p className="text-xs text-rose-400">{transcribeError}</p>
              )}
            </div>
          )}
        </div>

        {/* Right: Transcript Editor + Analyze Action */}
        <div className="flex flex-col justify-between space-y-4 rounded-xl border border-slate-800/90 bg-[#0F1629] p-6 lg:col-span-7">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-base font-semibold text-white">
                2. Speech Transcript
              </h2>
              <div className="flex items-center gap-3 font-mono text-xs text-slate-400 tabular-nums">
                <span>{wordCount} words</span>
                {liveWpm !== null && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="text-blue-300">{liveWpm} WPM measured</span>
                  </>
                )}
              </div>
            </div>

            <textarea
              rows={8}
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Your transcribed speech will appear here after recording, or type/paste your spoken delivery directly to test feedback..."
              className="w-full rounded-xl border border-slate-800 bg-[#070B19] p-4 text-sm leading-relaxed text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {analyzeError && (
            <div className="flex items-start gap-2 rounded-lg border border-rose-500/40 bg-rose-950/20 p-3 text-xs text-rose-200">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" aria-hidden="true" />
              <span>{analyzeError}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4">
            <p className="text-xs text-slate-400">
              AI evaluates transcript evidence without inventing unsupported scores.
            </p>
            <button
              type="button"
              disabled={!transcript.trim() || isAnalyzing}
              onClick={handleAnalyze}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
            >
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              <span>{isAnalyzing ? 'Analyzing Performance...' : 'Submit for AI Feedback'}</span>
            </button>
          </div>
        </div>
      </section>

      {/* AI Feedback Report + Journal Save */}
      {feedback && (
        <section className="space-y-6 rounded-xl border border-indigo-500/30 bg-[#0F1629] p-6">
          <div className="border-b border-slate-800 pb-4">
            <p className="text-xs font-medium text-indigo-400">Evidence-Backed Coaching Report</p>
            <h2 className="mt-1 font-display text-xl font-bold text-white">
              3. AI Performance Feedback
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              {feedback.overallSummary}
            </p>
          </div>

          {/* 6 Assessment Dimensions */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {(
              [
                { label: 'Clarity', item: feedback.clarity },
                { label: 'Speech Structure', item: feedback.speechStructure },
                { label: 'Storytelling', item: feedback.storytelling },
                { label: 'Vocabulary', item: feedback.vocabulary },
              ] as const
            ).map(({ label, item }) => (
              <div
                key={label}
                className="flex flex-col justify-between rounded-xl border border-slate-800 bg-[#070B19]/80 p-4"
              >
                <div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-300">{label}</span>
                    <RatingText rating={item.rating} />
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-slate-200">{item.assessment}</p>
                  <p className="mt-2 text-xs leading-relaxed text-slate-400">{item.reasoning}</p>
                </div>
                {item.evidenceQuote && (
                  <p className="mt-3 border-t border-slate-800/80 pt-2 text-xs text-indigo-300 italic">
                    Evidence: &ldquo;{item.evidenceQuote}&rdquo;
                  </p>
                )}
              </div>
            ))}

            {/* Speaking Pace */}
            <div className="flex flex-col justify-between rounded-xl border border-slate-800 bg-[#070B19]/80 p-4">
              <div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300">Speaking Pace</span>
                  <RatingText rating={feedback.speakingPace.rating} />
                </div>
                <p className="mt-2 font-mono text-sm font-semibold text-blue-300 tabular-nums">
                  {feedback.speakingPace.measuredWpm !== null
                    ? `${feedback.speakingPace.measuredWpm} WPM (measured)`
                    : 'Pace timing unavailable'}
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-200">
                  {feedback.speakingPace.assessment}
                </p>
              </div>
              <p className="mt-3 border-t border-slate-800/80 pt-2 text-xs text-slate-400">
                {feedback.speakingPace.reasoning}
              </p>
            </div>

            {/* Filler Words */}
            <div className="flex flex-col justify-between rounded-xl border border-slate-800 bg-[#070B19]/80 p-4">
              <div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300">Filler Words</span>
                  <RatingText rating={feedback.fillerWords.rating} />
                </div>
                <p className="mt-2 font-mono text-sm font-semibold text-white tabular-nums">
                  {feedback.fillerWords.count} detected
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-200">
                  {feedback.fillerWords.assessment}
                </p>
              </div>
              <div className="mt-3 border-t border-slate-800/80 pt-2 text-xs text-slate-400">
                {feedback.fillerWords.detectedWords.length > 0 ? (
                  <span>Words: {feedback.fillerWords.detectedWords.join(', ')}</span>
                ) : (
                  <span>{feedback.fillerWords.reasoning}</span>
                )}
              </div>
            </div>
          </div>

          {/* Suggested Improvements */}
          <div className="rounded-xl border border-slate-800 bg-[#070B19]/70 p-5">
            <h3 className="font-display text-sm font-semibold text-white">
              Suggested Improvements
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-200">
              {feedback.suggestedImprovements.map((tip, idx) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <span className="font-mono text-xs text-indigo-400 tabular-nums">
                    0{idx + 1}.
                  </span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Save to Learning Journal Form */}
          {savedEntryId ? (
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-emerald-500/40 bg-emerald-950/20 p-5">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 text-emerald-400" aria-hidden="true" />
                <div>
                  <p className="font-display text-base font-semibold text-white">
                    Session saved to your Learning Journal (+{challenge.xpReward} XP)
                  </p>
                  <p className="text-xs text-emerald-200/80">
                    Your streak and skill progress have been updated, and you earned a bonus Gacha
                    draw if under the daily cap.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onNavigate('progress')}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
                >
                  View in Journal
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('home')}
                  className="rounded-lg border border-slate-700 bg-[#0F1629] px-4 py-2 text-xs font-semibold text-slate-200 hover:text-white"
                >
                  Back to Home
                </button>
              </div>
            </div>
          ) : (
            <form
              onSubmit={handleSaveJournal}
              className="space-y-4 border-t border-slate-800 pt-5"
            >
              <h3 className="font-display text-base font-semibold text-white">
                4. Save Reflection &amp; Complete Challenge
              </h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label
                    htmlFor="self-reflection"
                    className="mb-1.5 block text-xs font-medium text-slate-300"
                  >
                    Self-Reflection
                  </label>
                  <textarea
                    id="self-reflection"
                    rows={3}
                    value={selfReflection}
                    onChange={(e) => setSelfReflection(e.target.value)}
                    placeholder="How did your pacing, posture, or energy feel?"
                    className="w-full rounded-lg border border-slate-800 bg-[#070B19] p-3 text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="key-takeaways"
                    className="mb-1.5 block text-xs font-medium text-slate-300"
                  >
                    Key Takeaways
                  </label>
                  <textarea
                    id="key-takeaways"
                    rows={3}
                    value={keyTakeaways}
                    onChange={(e) => setKeyTakeaways(e.target.value)}
                    placeholder="What worked well that you want to repeat?"
                    className="w-full rounded-lg border border-slate-800 bg-[#070B19] p-3 text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="next-goal"
                    className="mb-1.5 block text-xs font-medium text-slate-300"
                  >
                    Next Improvement Goal
                  </label>
                  <textarea
                    id="next-goal"
                    rows={3}
                    value={nextGoal}
                    onChange={(e) => setNextGoal(e.target.value)}
                    placeholder="One specific adjustment for your next take..."
                    className="w-full rounded-lg border border-slate-800 bg-[#070B19] p-3 text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
                >
                  <Save className="h-4 w-4" aria-hidden="true" />
                  <span>Complete &amp; Save to Journal (+{challenge.xpReward} XP)</span>
                </button>
              </div>
            </form>
          )}
        </section>
      )}
    </div>
  );
}
