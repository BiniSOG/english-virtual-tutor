import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Practice library',
  description: 'Instant-feedback English exercises and IELTS-style reading, listening, writing and speaking tasks.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
