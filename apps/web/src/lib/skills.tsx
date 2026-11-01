import { BookOpenText, Ear, Mic, PenLine, Puzzle, Sparkles, type LucideIcon } from 'lucide-react';
import type { PracticeType, Skill } from './types';

export const SKILLS: { key: Skill; label: string; icon: LucideIcon; color: string; bg: string; text: string; blurb: string }[] = [
  { key: 'GRAMMAR', label: 'Grammar', icon: Puzzle, color: '#8b5cf6', bg: 'bg-violet-50', text: 'text-violet-700', blurb: 'Accuracy for every sentence' },
  { key: 'VOCABULARY', label: 'Vocabulary', icon: Sparkles, color: '#f59e0b', bg: 'bg-amber-50', text: 'text-amber-700', blurb: 'Words & collocations that score' },
  { key: 'READING', label: 'Reading', icon: BookOpenText, color: '#0ea5e9', bg: 'bg-sky-50', text: 'text-sky-700', blurb: 'Skim, scan and understand' },
  { key: 'LISTENING', label: 'Listening', icon: Ear, color: '#ec4899', bg: 'bg-pink-50', text: 'text-pink-700', blurb: 'Accents, numbers and detail' },
  { key: 'SPEAKING', label: 'Speaking', icon: Mic, color: '#10b981', bg: 'bg-emerald-50', text: 'text-emerald-700', blurb: 'Fluency & pronunciation with AI' },
  { key: 'WRITING', label: 'Writing', icon: PenLine, color: '#ef4444', bg: 'bg-rose-50', text: 'text-rose-700', blurb: 'IELTS Task 1 & 2 with AI scoring' },
];

export const skillMeta = (s: Skill) => SKILLS.find((x) => x.key === s) ?? SKILLS[0];

export const PRACTICE_TYPES: { key: PracticeType; label: string }[] = [
  { key: 'MULTIPLE_CHOICE', label: 'Multiple choice' },
  { key: 'FILL_BLANK', label: 'Gap fill' },
  { key: 'READING', label: 'Reading passage' },
  { key: 'LISTENING', label: 'Listening' },
  { key: 'WRITING', label: 'Writing task' },
  { key: 'SPEAKING', label: 'Speaking task' },
];

export const typeLabel = (t: PracticeType) => PRACTICE_TYPES.find((x) => x.key === t)?.label ?? t;

export function SkillIcon({ skill, className = 'h-5 w-5' }: { skill: Skill; className?: string }) {
  const m = skillMeta(skill);
  const Icon = m.icon;
  return <Icon className={className} style={{ color: m.color }} />;
}
