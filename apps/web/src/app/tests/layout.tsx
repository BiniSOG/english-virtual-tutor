import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI tests & level check',
  description: 'Unlimited AI-generated English tests and a free placement test that estimates your IELTS band.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
