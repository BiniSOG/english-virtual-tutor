import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Create your free account',
  description: 'Start learning English for free with an AI tutor built for Ethiopian learners.',
  robots: { index: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
