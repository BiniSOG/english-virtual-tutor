'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from './logo';

export function Footer() {
  const pathname = usePathname();
  if (pathname.startsWith('/admin')) return null;
  return (
    <footer className="mt-24 border-t border-slate-200 bg-white">
      <div className="container-page grid gap-10 py-14 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-600">
            The AI English tutor built for Ethiopian learners. Practise speaking, writing, listening and grammar — and reach your IELTS target band.
          </p>
          <p className="font-ethiopic mt-3 text-sm text-slate-500">እንግሊዝኛን በልበ ሙሉነት ይናገሩ።</p>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-slate-900">Learn</h4>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li><Link href="/courses" className="hover:text-brand-700">Courses</Link></li>
            <li><Link href="/practice" className="hover:text-brand-700">Practice library</Link></li>
            <li><Link href="/speaking" className="hover:text-brand-700">AI Speaking tutor</Link></li>
            <li><Link href="/writing" className="hover:text-brand-700">AI Writing examiner</Link></li>
            <li><Link href="/tests" className="hover:text-brand-700">AI Tests & level check</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-slate-900">Account</h4>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li><Link href="/pricing" className="hover:text-brand-700">Premium plans</Link></li>
            <li><Link href="/dashboard" className="hover:text-brand-700">Dashboard</Link></li>
            <li><Link href="/register" className="hover:text-brand-700">Create account</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-100 py-6 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} Lisan · Made for learners in Ethiopia 🇪🇹 · IELTS is a registered trademark of the British Council, IDP and Cambridge; Lisan is not affiliated with them.
      </div>
    </footer>
  );
}
