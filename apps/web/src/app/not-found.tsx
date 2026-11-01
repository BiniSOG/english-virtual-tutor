import Link from 'next/link';
import { buttonClass } from '@/components/ui/button-class';

export default function NotFound() {
  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <p className="text-7xl font-extrabold text-brand-600">404</p>
      <h1 className="mt-4 text-2xl font-bold text-slate-900">This page went to a coffee ceremony ☕</h1>
      <p className="mt-2 text-slate-600">We couldn&apos;t find the page you were looking for.</p>
      <Link href="/" className={buttonClass('primary', 'md', 'mt-8')}>Back home</Link>
    </div>
  );
}
