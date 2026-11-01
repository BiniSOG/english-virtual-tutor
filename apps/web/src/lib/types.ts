export type Role = 'STUDENT' | 'ADMIN';
export type Skill = 'GRAMMAR' | 'VOCABULARY' | 'READING' | 'LISTENING' | 'SPEAKING' | 'WRITING';
export type PracticeType = 'MULTIPLE_CHOICE' | 'FILL_BLANK' | 'LISTENING' | 'READING' | 'WRITING' | 'SPEAKING';

export interface Level {
  id: string;
  code: string;
  name: string;
  band: number;
  cefr: string;
  description: string;
  color: string;
  order: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  role: Role;
  premiumUntil: string | null;
  isPremium: boolean;
  levelId: string | null;
  level?: Level | null;
  targetBand: number | null;
  nativeLanguage: string | null;
  city: string | null;
  streak: number;
  isActive?: boolean;
  createdAt: string;
}

export interface CourseSummary {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string;
  skill: Skill;
  level: Level;
  coverImage: string | null;
  isPremium: boolean;
  isPublished?: boolean;
  lessonCount: number;
  locked: boolean;
}

export interface LessonSummary {
  id: string;
  title: string;
  summary: string | null;
  durationMin: number;
  order: number;
  isFree: boolean;
  locked: boolean;
  completed: boolean;
}

export interface CourseDetail extends Omit<CourseSummary, 'lessonCount'> {
  lessons: LessonSummary[];
}

export interface Lesson {
  id: string;
  title: string;
  summary: string | null;
  content: string;
  videoUrl: string | null;
  audioText: string | null;
  durationMin: number;
  completed: boolean;
  course: { id: string; slug: string; title: string; skill: Skill; level: Level; isPremium: boolean };
  prev: { id: string; title: string } | null;
  next: { id: string; title: string } | null;
  practices: { id: string; title: string; type: PracticeType; skill: Skill; locked: boolean }[];
}

export interface Question {
  id: string;
  question: string;
  options?: string[];
  answer?: number | string;
  explanation?: string;
  band?: number;
}

export interface PracticeSummary {
  id: string;
  title: string;
  description: string | null;
  skill: Skill;
  type: PracticeType;
  isPremium: boolean;
  timeLimitMin: number | null;
  questionCount: number;
  level: Level;
  locked: boolean;
  bestScore: number | null;
}

export interface Practice {
  id: string;
  title: string;
  description: string | null;
  instructions: string | null;
  skill: Skill;
  type: PracticeType;
  level: Level;
  levelId: string;
  lessonId?: string | null;
  isPremium: boolean;
  isPublished?: boolean;
  passage: string | null;
  prompt: string | null;
  questions: Question[];
  timeLimitMin: number | null;
  minWords: number | null;
}

export interface GradedQuestion {
  id: string;
  question: string;
  options?: string[];
  given: number | string | null;
  correctAnswer: number | string;
  correct: boolean;
  explanation?: string;
  band?: number;
}

export interface GradeResult {
  results: GradedQuestion[];
  correct: number;
  total: number;
  score: number;
  band: number;
  saved?: boolean;
  estimatedBand?: number | null;
  suggestedLevel?: Level | null;
}

export interface Criterion {
  name: string;
  band: number;
  feedback: string;
}

export interface WritingFeedback {
  attemptId?: string;
  overallBand: number;
  wordCount: number;
  criteria: Criterion[];
  strengths: string[];
  improvements: string[];
  mistakes: { original: string; correction: string; explanation: string }[];
  improvedVersion: string;
  amharicSummary: string | null;
}

export interface SpeakingFeedback {
  attemptId?: string;
  transcript: string;
  overallBand: number;
  criteria: Criterion[];
  pronunciation: { word: string; issue: string; tip: string }[];
  grammarFixes: { original: string; correction: string; explanation: string }[];
  strengths: string[];
  improvements: string[];
  modelAnswer: string;
  amharicSummary: string | null;
}

export interface Plan {
  id: string;
  name: string;
  slug: string;
  priceEtb: number;
  durationDays: number;
  description: string | null;
  features: string[];
  isActive: boolean;
  isPopular: boolean;
  order: number;
}

export interface Quota {
  used: number;
  limit: number;
  remaining: number;
  isPremium: boolean;
}

export interface AttemptSummary {
  id: string;
  kind: 'PRACTICE' | 'AI_TEST' | 'WRITING' | 'SPEAKING';
  skill: Skill;
  title: string | null;
  score: number | null;
  band: number | null;
  createdAt: string;
  practiceId?: string | null;
}
