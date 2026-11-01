'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Zap } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { Quota } from '@/lib/types';
import { cn } from '@/lib/utils';

/** Shows how many AI sessions remain today; refreshes after every AI call. */
export function QuotaBadge({ className }: { className?: string }) {
  const { user } = useAuth();
  const [q, setQ] = useState<Quota | null>(null);
  useEffect(() => {
    if (!user) return;
    const load = () => api<Quota>('/ai/quota').then(setQ).catch(() => undefined);
    load();
    window.addEventListener('lisan-ai-used', load);
    return () => window.removeEventListener('lisan-ai-used', load);
  }, [user]);
  if (!user || !q) return null;
  const low = q.remaining <= Math.max(2, q.limit * 0.2);
  return (
    <div className={cn('inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm', low ? 'border-gold-300 bg-gold-50 text-gold-600' : 'border-slate-200 bg-white text-slate-600', className)}>
      <Zap className="h-4 w-4" />
      <span>
        <b className="text-slate-900">{q.remaining}</b> of {q.limit} AI sessions left today
      </span>
      {!q.isPremium && (
        <Link href="/pricing" className="font-semibold text-brand-700 hover:underline">
          Get more
        </Link>
      )}
    </div>
  );
}
