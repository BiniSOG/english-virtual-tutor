import { Role } from '@prisma/client';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  premiumUntil: Date | null;
  isPremium: boolean;
  levelId: string | null;
}

export interface PracticeQuestion {
  id: string;
  question: string;
  options?: string[];
  /** index of correct option for multiple choice, or accepted answer(s) separated by "|" for fill-in */
  answer: number | string;
  explanation?: string;
  band?: number;
}
