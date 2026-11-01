import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Profile & billing',
  description: 'Manage your Lisan profile and payments.',
  robots: { index: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
