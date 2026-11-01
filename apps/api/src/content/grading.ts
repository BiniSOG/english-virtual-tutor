import { PracticeQuestion } from '../common/types';

export type AnswerMap = Record<string, number | string | null | undefined>;

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

const normalize = (s: string) =>
  s
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[.,!?;:"]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

export function isCorrect(q: PracticeQuestion, given: unknown): boolean {
  if (given === null || given === undefined || given === '') return false;
  if (Array.isArray(q.options) && q.options.length > 0 && typeof q.answer === 'number') {
    return Number(given) === q.answer;
  }
  const accepted = String(q.answer).split('|').map(normalize);
  return accepted.includes(normalize(String(given)));
}

export function gradeQuestions(questions: PracticeQuestion[], answers: AnswerMap) {
  const results: GradedQuestion[] = questions.map((q) => {
    const given = answers?.[q.id] ?? null;
    return {
      id: q.id,
      question: q.question,
      options: q.options,
      given: given as number | string | null,
      correctAnswer: q.answer,
      correct: isCorrect(q, given),
      explanation: q.explanation,
      band: q.band,
    };
  });
  const correct = results.filter((r) => r.correct).length;
  const total = results.length || 1;
  const score = Math.round((correct / total) * 100);
  return { results, correct, total: results.length, score, band: scoreToBand(score) };
}

/** Rough mapping of a percentage on an objective practice to an IELTS-style band. */
export function scoreToBand(score: number): number {
  const table: [number, number][] = [
    [97, 9], [92, 8.5], [87, 8], [80, 7.5], [73, 7], [65, 6.5],
    [57, 6], [48, 5.5], [40, 5], [32, 4.5], [24, 4], [15, 3.5],
  ];
  for (const [min, band] of table) if (score >= min) return band;
  return 3;
}

/** Strip answers/explanations so they never reach the client before submission. */
export function sanitizeQuestions(questions: PracticeQuestion[]) {
  return questions.map(({ answer: _a, explanation: _e, ...q }) => q);
}
