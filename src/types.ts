export type AppSection = 'home' | 'library' | 'training' | 'studio' | 'progress';

export type SkillCategory =
  | 'Narrative Craft'
  | 'Vocal Presence'
  | 'Stage Poise'
  | 'Dynamic Dialogue';

export type SkillDifficulty = 'Beginner' | 'Intermediate' | 'Advanced';

export type SkillRarity = 'Common' | 'Rare' | 'Epic' | 'Legendary';

export interface Skill {
  id: string;
  name: string;
  category: SkillCategory;
  description: string;
  learningObjectives: string[];
  difficulty: SkillDifficulty;
  rarity: SkillRarity;
  estimatedMinutes: number;
  imageUrl: string;
  starterPrompt: string;
}

export interface TrainingTechnique {
  title: string;
  explanation: string;
  example: string;
}

export interface TrainingExercise {
  title: string;
  prompt: string;
  tip: string;
}

export interface ComprehensionQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface SkillLesson {
  skillId: string;
  summary: string;
  techniques: TrainingTechnique[];
  exercises: TrainingExercise[];
  comprehensionQuestions: ComprehensionQuestion[];
  generatedAt: string;
}

export interface LearningResource {
  title: string;
  authorOrOrg: string;
  sourceUrl: string;
  resourceType: 'Article' | 'Video' | 'Guide' | 'Course' | 'Research';
  shortDescription: string;
  verified: boolean;
}

export interface DailyChallenge {
  id: string;
  skillId: string;
  title: string;
  instructions: string;
  timeLimitSeconds: number;
  evaluationCriteria: string[];
  xpReward: number;
  dateKey: string;
}

export type AssessmentTier = 'Needs Focus' | 'Developing' | 'Strong' | 'Distinctive';

export interface QualitativeFeedbackDimension {
  rating: AssessmentTier;
  assessment: string;
  evidenceQuote: string;
  reasoning: string;
}

export interface SpeakingPaceFeedback {
  rating: AssessmentTier;
  measuredWpm: number | null;
  assessment: string;
  reasoning: string;
}

export interface FillerWordsFeedback {
  rating: AssessmentTier;
  count: number;
  detectedWords: string[];
  assessment: string;
  reasoning: string;
}

export interface PracticeFeedback {
  clarity: QualitativeFeedbackDimension;
  speechStructure: QualitativeFeedbackDimension;
  speakingPace: SpeakingPaceFeedback;
  fillerWords: FillerWordsFeedback;
  storytelling: QualitativeFeedbackDimension;
  vocabulary: QualitativeFeedbackDimension;
  suggestedImprovements: string[];
  overallSummary: string;
}

export interface LearningJournalEntry {
  id: string;
  dateIso: string;
  skillId: string;
  skillName: string;
  resources: LearningResource[];
  challengeTitle: string;
  challengeInstructions: string;
  recordingReference: string;
  durationSeconds: number;
  transcript: string;
  feedback: PracticeFeedback;
  selfReflection: string;
  keyTakeaways: string;
  nextGoal: string;
  xpEarned: number;
}

export interface GachaState {
  lastResetDateKey: string;
  drawsUsedToday: number;
  bonusDrawsEarnedToday: number;
  dailyBaseAllowance: number;
  maxDailyCap: number;
}

export interface AppPersistedState {
  unlockedSkillIds: string[];
  completedSkillIds: string[];
  activeSkillId: string | null;
  lessonsBySkill: Record<string, SkillLesson>;
  resourcesBySkill: Record<string, LearningResource[]>;
  challengesBySkill: Record<string, DailyChallenge>;
  completedChallengeIds: string[];
  quizScoresBySkill: Record<string, number>;
  journalEntries: LearningJournalEntry[];
  xp: number;
  gacha: GachaState;
}
