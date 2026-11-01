'use client';

import Link from 'next/link';
import { use } from 'react';
import { ArrowLeft, CheckCircle2, Clock, Crown, Lock, PlayCircle } from 'lucide-react';
import { LevelBadge } from '@/components/cards';
import { Badge, Button, Card, ErrorBox, Progress, Skeleton } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useFetch } from '@/lib/hooks';
import { skillMeta } from '@/lib/skills';
import type { CourseDetail } from '@/lib/types';
import { cn } from '@/lib/utils';

export default function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { user } = useAuth();
  const { data: course, loading, error, reload } = useFetch<CourseDetail>(`/courses/${slug}`, [user?.id, user?.isPremium]);

  if (error) return <div className="container-page py-10"><ErrorBox message={error.message} onRetry={reload} /></div>;
  if (loading || !course)
    return (
      <div className="container-page space-y-4 py-10">
        <Skeleton className="h-56" />
        <Skeleton className="h-96" />
      </div>
    );

  const s = skillMeta(course.skill);
  const Icon = s.icon;
  const done = course.lessons.filter((l) => l.completed).length;
  const pct = course.lessons.length ? Math.round((done / course.lessons.length) * 100) : 0;
  const nextLesson = course.lessons.find((l) => !l.completed && !l.locked) ?? course.lessons.find((l) => !l.locked);
  const totalMin = course.lessons.reduce((a, l) => a + l.durationMin, 0);

  return (
    <div>
      <section className="relative overflow-hidden border-b border-slate-200" style={{ background: `linear-gradient(135deg, ${s.color}18, #fff 60%)` }}>
        <div className="absolute inset-0 bg-grid opacity-50" />
        <Icon className="absolute top-6 -right-10 h-72 w-72 opacity-[0.06]" style={{ color: s.color }} />
        <div className="container-page relative py-10 sm:py-14">
          <Link href="/courses" className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" /> All courses
          </Link>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: s.color }}>
              <Icon className="h-4 w-4" /> {s.label}
            </span>
            <LevelBadge level={course.level} />
            {course.isPremium ? <Badge tone="gold"><Crown className="h-3 w-3" /> Premium</Badge> : <Badge tone="brand">Free course</Badge>}
          </div>
          <h1 className="mt-3 max-w-3xl text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">{course.title}</h1>
          {course.subtitle && <p className="mt-2 text-lg text-slate-600">{course.subtitle}</p>}
          <p className="mt-4 max-w-2xl leading-relaxed text-slate-600">{course.description}</p>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            {nextLesson && (
              <Button href={`/lessons/${nextLesson.id}`} size="lg">
                <PlayCircle className="h-5 w-5" /> {done ? 'Continue learning' : 'Start course'}
              </Button>
            )}
            {course.locked && (
              <Button href="/pricing" variant="gold" size="lg">
                <Crown className="h-5 w-5" /> Unlock all lessons
              </Button>
            )}
            <span className="text-sm text-slate-500">
              {course.lessons.length} lessons · {totalMin} min
            </span>
          </div>
          {user && done > 0 && (
            <div className="mt-6 max-w-md">
              <div className="mb-1 flex justify-between text-sm font-medium text-slate-600">
                <span>Your progress</span>
                <span>{pct}%</span>
              </div>
              <Progress value={pct} />
            </div>
          )}
        </div>
      </section>

      <section className="container-page py-10">
        <h2 className="mb-4 text-xl font-bold text-slate-900">Lessons</h2>
        <Card className="divide-y divide-slate-100">
          {course.lessons.map((l, i) => {
            const inner = (
              <div className={cn('flex items-center gap-4 p-4 sm:p-5', !l.locked && 'transition hover:bg-slate-50')}>
                <span
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold',
                    l.completed ? 'bg-brand-600 text-white' : l.locked ? 'bg-slate-100 text-slate-400' : 'bg-slate-900 text-white',
                  )}
                >
                  {l.completed ? <CheckCircle2 className="h-5 w-5" /> : l.locked ? <Lock className="h-4 w-4" /> : i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={cn('font-semibold', l.locked ? 'text-slate-500' : 'text-slate-900')}>{l.title}</p>
                  {l.summary && <p className="truncate text-sm text-slate-500">{l.summary}</p>}
                </div>
                <div className="hidden shrink-0 items-center gap-3 text-sm text-slate-500 sm:flex">
                  {l.isFree && course.isPremium && <Badge tone="brand">Free preview</Badge>}
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-4 w-4" /> {l.durationMin} min
                  </span>
                </div>
              </div>
            );
            return l.locked ? (
              <Link key={l.id} href="/pricing" title="Premium lesson">
                {inner}
              </Link>
            ) : (
              <Link key={l.id} href={`/lessons/${l.id}`}>
                {inner}
              </Link>
            );
          })}
        </Card>
      </section>
    </div>
  );
}
