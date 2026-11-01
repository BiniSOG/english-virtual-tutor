import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Writing examiner',
  description: 'Get an instant IELTS band score, corrections and an improved version of your essay or letter.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
