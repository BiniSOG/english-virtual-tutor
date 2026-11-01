'use client';

import Link from 'next/link';
import { Activity, BookOpen, Bot, Crown, ListChecks, UserPlus, Users, Wallet } from 'lucide-react';
import { StatTile } from '@/components/admin/table';
import { Badge, Card, ErrorBox, PageHeader, Skeleton } from '@/components/ui';
import { useFetch } from '@/lib/hooks';
import { skillMeta } from '@/lib/skills';
import type { Skill } from '@/lib/types';
import { formatDate, formatEtb } from '@/lib/utils';

interface Stats {
  users: number; premium: number; newUsers: number; active7: number; courses: number; lessons: number; practices: number;
  attempts30: number; aiCalls30: number; revenueTotal: number; revenue30: number;
  bySkill: { skill: Skill; count: number }[];
  signupDays: { date: string; count: number }[];
  recentUsers: { id: string; name: string; email: string; createdAt: string; isPremium: boolean; level: { name: string } | null }[];
  recentPayments: { id: string; amount: number; paidAt: string; user: { name: string; email: string }; plan: { name: string } }[];
}

export default function AdminOverview() {
  const { data: s, loading, error, reload } = useFetch<Stats>('/admin/stats');
  if (error) return <ErrorBox message={error.message} onRetry={reload} />;
  if (loading || !s) return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-32" />)}</div>;
  const maxSignup = Math.max(1, ...s.signupDays.map((d) => d.count));
  const maxSkill = Math.max(1, ...s.bySkill.map((d) => d.count));
  const conv = s.users ? Math.round((s.premium / s.users) * 100) : 0;
  return (
    <div className="space-y-8">
      <PageHeader title="Overview" text="Your platform at a glance." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Total students" value={s.users.toLocaleString()} sub={`${s.newUsers} new in 30 days`} icon={<Users className="h-5 w-5" />} />
        <StatTile label="Premium members" value={s.premium.toLocaleString()} sub={`${conv}% conversion`} icon={<Crown className="h-5 w-5" />} tone="gold" />
        <StatTile label="Revenue (30 days)" value={formatEtb(s.revenue30)} sub={`${formatEtb(s.revenueTotal)} all time`} icon={<Wallet className="h-5 w-5" />} tone="violet" />
        <StatTile label="Active (7 days)" value={s.active7.toLocaleString()} sub={`${s.attempts30} attempts · ${s.aiCalls30} AI calls (30d)`} icon={<Activity className="h-5 w-5" />} tone="sky" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Link href="/admin/courses"><StatTile label="Courses" value={s.courses} sub={`${s.lessons} lessons`} icon={<BookOpen className="h-5 w-5" />} /></Link>
        <Link href="/admin/practices"><StatTile label="Practices" value={s.practices} icon={<ListChecks className="h-5 w-5" />} tone="rose" /></Link>
        <StatTile label="AI calls (30 days)" value={s.aiCalls30.toLocaleString()} icon={<Bot className="h-5 w-5" />} tone="violet" />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="font-bold text-slate-900">New sign-ups</h2>
          <p className="text-sm text-slate-500">Last 14 days</p>
          <div className="mt-6 flex h-44 items-end gap-1.5">
            {s.signupDays.map((d) => (
              <div key={d.date} className="group relative flex h-full flex-1 flex-col justify-end">
                <div className="rounded-md bg-brand-500 transition group-hover:bg-brand-600" style={{ height: `${d.count ? Math.max(6, (d.count / maxSignup) * 100) : 3}%`, opacity: d.count ? 1 : 0.25 }} />
                <span className="pointer-events-none absolute -top-6 left-1/2 hidden -translate-x-1/2 rounded bg-slate-900 px-1.5 py-0.5 text-[10px] whitespace-nowrap text-white group-hover:block">{d.count} · {d.date.slice(5)}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-6">
          <h2 className="font-bold text-slate-900">Practice by skill</h2>
          <p className="text-sm text-slate-500">Attempts in the last 30 days</p>
          <div className="mt-5 space-y-3">
            {s.bySkill.map((b) => {
              const m = skillMeta(b.skill);
              return (
                <div key={b.skill} className="flex items-center gap-3 text-sm">
                  <span className="w-24 shrink-0 font-medium text-slate-700">{m.label}</span>
                  <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full" style={{ width: `${(b.count / maxSkill) * 100}%`, backgroundColor: m.color }} />
                  </div>
                  <span className="w-10 text-right font-semibold text-slate-900 tabular-nums">{b.count}</span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-bold text-slate-900"><UserPlus className="h-5 w-5 text-brand-600" /> Latest students</h2>
            <Link href="/admin/users" className="text-sm font-semibold text-brand-700">View all</Link>
          </div>
          <div className="divide-y divide-slate-100">
            {s.recentUsers.map((u) => (
              <div key={u.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-900">{u.name}</p>
                  <p className="truncate text-xs text-slate-500">{u.email}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {u.isPremium && <Badge tone="gold">Premium</Badge>}
                  <span className="text-xs text-slate-400">{formatDate(u.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-bold text-slate-900"><Wallet className="h-5 w-5 text-violet-600" /> Latest payments</h2>
            <Link href="/admin/payments" className="text-sm font-semibold text-brand-700">View all</Link>
          </div>
          {s.recentPayments.length ? (
            <div className="divide-y divide-slate-100">
              {s.recentPayments.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">{p.user.name}</p>
                    <p className="text-xs text-slate-500">{p.plan.name} · {formatDate(p.paidAt)}</p>
                  </div>
                  <span className="font-bold text-slate-900">{formatEtb(p.amount)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-slate-500">No payments yet.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
