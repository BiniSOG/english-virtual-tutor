import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Premium plans',
  description: 'Lisan Premium from 299 ETB a month. Pay with telebirr, CBE Birr, M-Pesa, Amole or card.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
