import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Courses',
  description: 'Level-based English and IELTS courses for Ethiopian learners: grammar, vocabulary, reading, listening, speaking and writing.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
