'use client';

import Link from 'next/link';
import { ArrowRight, BookOpen, CheckCircle2, Crown, Flame, Gauge, Mic, PenLine, Sparkles, Target, Trophy } from 'lucide-react';
import { BandRing } from '@/components/band-ring';
import { CourseCard, LevelBadge } from '@/components/cards';
import { RequireAuth } from '@/components/require-auth';
import { Badge, Button, Card, EmptyState, ErrorBox, Progress, Skeleton } from '@/components/ui';
import { useFetch } from '@/lib/hooks';
import { skillMeta } from '@/lib/skills';
import type { AttemptSummary, CourseSummary, Level, Skill, User } from '@/lib/types';
import { bandLabel, formatDate } from '@/lib/utils';

interface Dashboard {
  user: User & { level: Level | null };
  stats: { lessonsCompleted: number; practicesDone: number; streak: number; estimatedBand: number | null };
  skills: { skill: Skill; band: number | null; attempts: number }[];
  activity: { date: string; count: number }[];
  inProgress: { id: string; slug: string; title: string; skill: Skill; level: Level; done: number; total: number; progress: number; nextLesson: { id: string; title: string } | null }[];
  recommended: CourseSummary[];
  recent: AttemptSummary[];
}

function DashboardView() {
  const { data, loading, error, reload } = useFetch<Dashboard>('/me/dashboard');
  if (error) return <div className="container-page py-10"><ErrorBox message={error.message} onRetry={reload} /></div>;
  if (loading || !data)
    return (
      <div className="container-page grid gap-5 py-10 lg:grid-cols-3">
        <Skeleton className="h-48 lg:col-span-2" />
        <Skeleton className="h-48" />
        <Skeleton className="h-72 lg:col-span-3" />
      </div>
    );
  const { user, stats } = data;
  const first = user.name.split(' ')[0];
  const maxAct = Math.max(1, ...data.activity.map((a) => a.count));
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="container-page space-y-8 py-8 sm:py-10">
      {/* Hero */}
      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="relative overflow-hidden p-6 sm:p-8 lg:col-span-2">
          <div className="absolute -top-16 -right-16 h-56 w-56 rounded-full bg-brand-100 blur-3xl" />
          <div className="relative">
            <p className="text-sm font-medium text-slate-500">{greet},</p>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">{first} 👋</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {user.level && <LevelBadge level={user.level} />}
              {user.isPremium ? <Badge tone="gold"><Crown className="h-3 w-3" /> Premium until {formatDate(user.premiumUntil)}</Badge> : <Badge>Free plan</Badge>}
            </div>
            <div className="mt-6 grid grid-cols-3 gap-3">
              {[
                { icon: Flame, v: stats.streak, l: 'day streak', c: 'text-orange-500 bg-orange-50' },
                { icon: BookOpen, v: stats.lessonsCompleted, l: 'lessons done', c: 'text-sky-600 bg-sky-50' },
                { icon: Trophy, v: stats.practicesDone, l: 'exercises', c: 'text-violet-600 bg-violet-50' },
              ].map((s) => (
                <div key={s.l} className="rounded-2xl border border-slate-100 bg-white/70 p-3 sm:p-4">
                  <span className={`inline-flex rounded-lg p-1.5 ${s.c}`}><s.icon className="h-4 w-4" /></span>
                  <p className="mt-2 text-2xl font-extrabold text-slate-900">{s.v}</p>
                  <p className="text-xs text-slate-500">{s.l}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <Button href="/speaking" size="sm"><Mic className="h-4 w-4" /> Speak with AI</Button>
              <Button href="/writing" size="sm" variant="outline"><PenLine className="h-4 w-4" /> Write an essay</Button>
              <Button href="/tests" size="sm" variant="outline"><Sparkles className="h-4 w-4" /> AI test</Button>
            </div>
          </div>
        </Card>
        <Card className="flex flex-col items-center justify-center p-6 text-center">
          <BandRing band={stats.estimatedBand} size={140} label="Est. band" />
          <p className="mt-4 font-semibold text-slate-900">{bandLabel(stats.estimatedBand)}</p>
          <p className="text-sm text-slate-500">
            Target: <b className="text-slate-800">{user.targetBand?.toFixed(1) ?? '—'}</b>
            {stats.estimatedBand != null && user.targetBand != null && stats.estimatedBand < user.targetBand && ` · ${(user.targetBand - stats.estimatedBand).toFixed(1)} to go`}
          </p>
          {stats.estimatedBand == null && (
            <Button href="/tests?mode=LEVEL_CHECK" size="sm" variant="secondary" className="mt-4"><Gauge className="h-4 w-4" /> Take level check</Button>
          )}
        </Card>
      </div>

      {/* Skills & activity */}
      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <h2 className="font-bold text-slate-900">Skills breakdown</h2>
          <p className="text-sm text-slate-500">Average band from your last 10 attempts per skill</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {data.skills.map((s) => {
              const m = skillMeta(s.skill);
              return (
                <Link key={s.skill} href={`/practice?skill=${s.skill}`} className="group rounded-2xl border border-slate-100 p-4 transition hover:border-slate-200 hover:bg-slate-50/60">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 font-semibold text-slate-800"><m.icon className="h-4 w-4" style={{ color: m.color }} /> {m.label}</span>
                    <span className="text-sm font-bold text-slate-900">{s.band != null ? s.band.toFixed(1) : '—'}</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full" style={{ width: `${((s.band ?? 0) / 9) * 100}%`, backgroundColor: m.color }} />
                  </div>
                  <p className="mt-1.5 text-xs text-slate-500">{s.attempts ? `${s.attempts} attempts` : 'Not practised yet'}</p>
                </Link>
              );
            })}
          </div>
        </Card>
        <Card className="p-6">
          <h2 className="font-bold text-slate-900">Last 14 days</h2>
          <p className="text-sm text-slate-500">Lessons and exercises completed</p>
          <div className="mt-6 flex h-40 items-end gap-1.5" role="img" aria-label="Activity chart">
            {data.activity.map((a) => (
              <div key={a.date} className="group relative flex h-full flex-1 flex-col items-center justify-end">
                <div
                  className={`w-full rounded-md transition ${a.count ? 'bg-brand-500 group-hover:bg-brand-600' : 'bg-slate-100'}`}
                  style={{ height: `${a.count ? Math.max(10, (a.count / maxAct) * 100) : 6}%` }}
                />
                <span className="pointer-events-none absolute -top-7 hidden rounded-md bg-slate-900 px-1.5 py-0.5 text-[10px] whitespace-nowrap text-white group-hover:block">
                  {a.count} · {a.date.slice(5)}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[11px] text-slate-400">
            <span>{data.activity[0]?.date.slice(5)}</span>
            <span>Today</span>
          </div>
        </Card>
      </div>

      {/* Continue */}
      <section>
        <h2 className="mb-4 text-xl font-bold text-slate-900">Continue learning</h2>
        {data.inProgress.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {data.inProgress.slice(0, 4).map((c) => {
              const m = skillMeta(c.skill);
              return (
                <Card key={c.id} className="p-5">
                  <div className="flex items-start gap-4">
                    <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${m.bg}`}><m.icon className="h-6 w-6" style={{ color: m.color }} /></span>
                    <div className="min-w-0 flex-1">
                      <Link href={`/courses/${c.slug}`} className="font-bold text-slate-900 hover:text-brand-700">{c.title}</Link>
                      <p className="text-sm text-slate-500">{c.done} of {c.total} lessons</p>
                      <Progress value={c.progress} className="mt-3" />
                    </div>
                  </div>
                  {c.nextLesson ? (
                    <Link href={`/lessons/${c.nextLesson.id}`} className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-brand-50 hover:text-brand-800">
                      <span className="truncate">Next: {c.nextLesson.title}</span>
                      <ArrowRight className="h-4 w-4 shrink-0" />
                    </Link>
                  ) : (
                    <p className="mt-4 flex items-center gap-2 text-sm font-semibold text-brand-700"><CheckCircle2 className="h-4 w-4" /> Course completed</p>
                  )}
                </Card>
              );
            })}
          </div>
        ) : (
          <EmptyState icon={<BookOpen className="h-6 w-6" />} title="You haven't started a course yet" text="Pick a course for your level to begin." action={<Button href="/courses">Browse courses</Button>} />
        )}
      </section>

      {data.recommended.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-bold text-slate-900">Recommended for your level</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {data.recommended.map((c) => <CourseCard key={c.id} course={c} />)}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-4 text-xl font-bold text-slate-900">Recent results</h2>
        {data.recent.length ? (
          <Card className="divide-y divide-slate-100">
            {data.recent.map((a) => {
              const m = skillMeta(a.skill);
              return (
                <Link key={a.id} href={`/attempts/${a.id}`} className="flex items-center gap-4 px-5 py-4 transition hover:bg-slate-50">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${m.bg}`}><m.icon className="h-5 w-5" style={{ color: m.color }} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-900">{a.title ?? m.label}</p>
                    <p className="text-xs text-slate-500">{a.kind.replace('_', ' ').toLowerCase()} · {formatDate(a.createdAt, { dateStyle: 'medium', timeStyle: 'short' })}</p>
                  </div>
                  {a.band != null && <span className="rounded-lg bg-slate-900 px-2.5 py-1 text-sm font-bold text-white">{a.band.toFixed(1)}</span>}
                  {a.kind !== 'WRITING' && a.kind !== 'SPEAKING' && a.score != null && <span className="hidden text-sm font-semibold text-slate-600 sm:block">{Math.round(a.score)}%</span>}
                </Link>
              );
            })}
          </Card>
        ) : (
          <EmptyState icon={<Target className="h-6 w-6" />} title="No results yet" text="Complete an exercise or AI task to see your results here." action={<Button href="/practice">Start practising</Button>} />
        )}
      </section>

      {!user.isPremium && (
        <Card className="flex flex-col items-start gap-4 bg-gradient-to-r from-slate-900 to-slate-800 p-6 text-white sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="flex items-center gap-2 text-lg font-bold"><Crown className="h-5 w-5 text-gold-400" /> Reach your target band faster</p>
            <p className="text-sm text-slate-300">Premium unlocks every course and 30× more AI practice.</p>
          </div>
          <Button href="/pricing" variant="gold">See plans</Button>
        </Card>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <RequireAuth>
      <DashboardView />
    </RequireAuth>
  );
}

