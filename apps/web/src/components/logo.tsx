import Link from 'next/link';
import { cn } from '@/lib/utils';

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={cn('h-9 w-9', className)} aria-hidden>
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#10b981" />
          <stop offset="1" stopColor="#047857" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="12" fill="url(#lg)" />
      <path d="M12 11v14.5a3.5 3.5 0 0 0 3.5 3.5H27" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" fill="none" />
      <circle cx="27.5" cy="14" r="4" fill="#fbbf24" />
      <path d="M20 19.5c2 1.6 4.6 1.6 6.6 0" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export function Logo({ className, light }: { className?: string; light?: boolean }) {
  return (
    <Link href="/" className={cn('flex items-center gap-2.5', className)} aria-label="Lisan home">
      <LogoMark />
      <span className="leading-none">
        <span className={cn('block text-lg font-extrabold tracking-tight', light ? 'text-white' : 'text-slate-900')}>Lisan</span>
        <span className={cn('font-ethiopic block text-[11px] font-medium', light ? 'text-brand-200' : 'text-brand-700')}>ልሳን · English Tutor</span>
      </span>
    </Link>
  );
}
