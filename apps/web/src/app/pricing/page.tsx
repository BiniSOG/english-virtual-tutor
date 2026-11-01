'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Check, Crown, ShieldCheck, Sparkles, X } from 'lucide-react';
import { Badge, Button, Card, ErrorBox, PageHeader, Skeleton } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useFetch } from '@/lib/hooks';
import type { Plan } from '@/lib/types';
import { cn, formatDate } from '@/lib/utils';

const COMPARE: [string, boolean | string, boolean | string][] = [
  ['Free courses & lessons', true, true],
  ['Free practice exercises', true, true],
  ['Premium courses (IELTS Writing, Speaking, Reading, Listening…)', false, true],
  ['Premium exercises & mock tasks', false, true],
  ['AI speaking, writing & tutor sessions per day', '10', '300'],
  ['AI-generated tests & level check', true, true],
  ['Amharic explanations', true, true],
  ['Progress analytics & band estimate', true, true],
];

export default function PricingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { data: plans, loading, error, reload } = useFetch<Plan[]>('/plans');
  const [buying, setBuying] = useState<string | null>(null);

  async function buy(plan: Plan) {
    if (!user) {
      router.push('/register?next=/pricing');
      return;
    }
    setBuying(plan.id);
    try {
      const res = await api<{ checkoutUrl: string }>('/billing/checkout', { body: { planId: plan.id } });
      window.location.href = res.checkoutUrl;
    } catch (e) {
      toast.error((e as Error).message);
      setBuying(null);
    }
  }

  return (
    <div className="container-page py-12">
      <PageHeader eyebrow="Premium" title="Invest in your English" text="Simple plans in Ethiopian Birr. Pay securely with telebirr, CBE Birr, M-Pesa, Amole or card via Chapa. No automatic renewals." />
      {user?.isPremium && (
        <Card className="mt-6 flex items-center gap-3 border-gold-200 bg-gold-50 p-5">
          <Crown className="h-6 w-6 text-gold-500" />
          <p className="text-slate-800">
            You are Premium until <b>{formatDate(user.premiumUntil)}</b>. Buying another plan extends your access.
          </p>
        </Card>
      )}

      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        {error && <ErrorBox message={error.message} onRetry={reload} />}
        {loading && !plans && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-[460px]" />)}
        {plans?.map((p) => {
          const perMonth = Math.round((p.priceEtb / p.durationDays) * 30);
          return (
            <Card
              key={p.id}
              className={cn('relative flex flex-col p-7', p.isPopular && 'border-2 border-brand-600 shadow-lift lg:-translate-y-3')}
            >
              {p.isPopular && (
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-brand-600 px-3 py-1 text-xs font-bold text-white shadow">
                  <Sparkles className="mr-1 inline h-3 w-3" /> Most popular
                </span>
              )}
              <h3 className="text-lg font-bold text-slate-900">{p.name}</h3>
              {p.description && <p className="mt-1 text-sm text-slate-500">{p.description}</p>}
              <p className="mt-6 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold tracking-tight text-slate-900">{p.priceEtb.toLocaleString()}</span>
                <span className="font-semibold text-slate-500">ETB</span>
              </p>
              <p className="text-sm text-slate-500">
                {p.durationDays} days · ≈ {perMonth} ETB / month
              </p>
              <ul className="mt-6 space-y-3 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2.5 text-slate-700">
                    <Check className="h-5 w-5 shrink-0 text-brand-600" /> {f}
                  </li>
                ))}
              </ul>
              <Button className="mt-8 w-full" size="lg" variant={p.isPopular ? 'primary' : 'dark'} onClick={() => buy(p)} loading={buying === p.id}>
                <Crown className="h-5 w-5" /> {user ? 'Get ' + p.name : 'Sign up & subscribe'}
              </Button>
            </Card>
          );
        })}
      </div>

      <div className="mt-6 flex items-center justify-center gap-2 text-sm text-slate-500">
        <ShieldCheck className="h-4 w-4 text-brand-600" /> Payments are processed securely by Chapa. We never see your PIN or card details.
      </div>

      <Card className="mt-14 overflow-hidden">
        <div className="grid grid-cols-[1fr_80px_80px] gap-2 border-b border-slate-100 bg-slate-50 px-5 py-4 text-sm font-bold text-slate-900 sm:grid-cols-[1fr_120px_120px]">
          <span>Compare</span>
          <span className="text-center">Free</span>
          <span className="text-center"><Badge tone="gold"><Crown className="h-3 w-3" /> Premium</Badge></span>
        </div>
        {COMPARE.map(([label, free, prem]) => (
          <div key={label} className="grid grid-cols-[1fr_80px_80px] items-center gap-2 border-b border-slate-100 px-5 py-3.5 text-sm last:border-0 sm:grid-cols-[1fr_120px_120px]">
            <span className="text-slate-700">{label}</span>
            {[free, prem].map((v, i) => (
              <span key={i} className="flex justify-center">
                {typeof v === 'string' ? <b className="text-slate-900">{v}</b> : v ? <Check className="h-5 w-5 text-brand-600" /> : <X className="h-5 w-5 text-slate-300" />}
              </span>
            ))}
          </div>
        ))}
      </Card>
    </div>
  );
}
