import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Speaking tutor',
  description: 'Talk with an AI English teacher that hears your voice, corrects your grammar and pronunciation, and scores you on IELTS Speaking criteria.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
