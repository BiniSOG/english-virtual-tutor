import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'My dashboard',
  description: 'Your progress, band estimate and next lessons.',
  robots: { index: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
