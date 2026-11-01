'use client';

import Link from 'next/link';
import { use, useState } from 'react';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, CheckCircle2, ChevronRight, Clock, Crown, Lock, Target } from 'lucide-react';
import { ListeningPlayer } from '@/components/audio-player';
import { LevelBadge } from '@/components/cards';
import { PremiumGate } from '@/components/gates';
import { Markdown } from '@/components/markdown';
import { Button, Card, ErrorBox, Skeleton } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useFetch } from '@/lib/hooks';
import { skillMeta, typeLabel } from '@/lib/skills';
import type { Lesson } from '@/lib/types';

function youtubeEmbed(url: string) {
  const m = url.match(/(?:youtu\.be\/|v=|embed\/)([\w-]{11})/);
  return m ? `https://www.youtube-nocookie.com/embed/${m[1]}` : null;
}

export default function LessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const { data: lesson, loading, error, reload, setData } = useFetch<Lesson>(`/lessons/${id}`, [user?.id, user?.isPremium]);
  const [completing, setCompleting] = useState(false);

  if (error?.isPremium)
    return (
      <div className="container-page max-w-3xl py-16">
        <PremiumGate title="This lesson is part of a Premium course" />
      </div>
    );
  if (error) return <div className="container-page py-10"><ErrorBox message={error.message} onRetry={reload} /></div>;
  if (loading || !lesson)
    return (
      <div className="container-page max-w-4xl space-y-4 py-10">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-[480px]" />
      </div>
    );

  const s = skillMeta(lesson.course.skill);
  const embed = lesson.videoUrl ? youtubeEmbed(lesson.videoUrl) : null;

  async function complete() {
    if (!user) {
      toast.info('Sign in to save your progress');
      return;
    }
    setCompleting(true);
    try {
      await api(`/lessons/${id}/complete`, { method: 'POST' });
      setData((l) => (l ? { ...l, completed: true } : l));
      toast.success('Lesson completed! 🎉');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setCompleting(false);
    }
  }

  return (
    <div className="container-page py-8 sm:py-10">
      <nav className="flex flex-wrap items-center gap-1 text-sm text-slate-500">
        <Link href="/courses" className="hover:text-slate-900">Courses</Link>
        <ChevronRight className="h-4 w-4" />
        <Link href={`/courses/${lesson.course.slug}`} className="hover:text-slate-900">{lesson.course.title}</Link>
      </nav>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_300px]">
        <article className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold" style={{ color: s.color }}>{s.label}</span>
            <LevelBadge level={lesson.course.level} />
            <span className="inline-flex items-center gap-1 text-sm text-slate-500"><Clock className="h-4 w-4" /> {lesson.durationMin} min</span>
          </div>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">{lesson.title}</h1>
          {lesson.summary && <p className="mt-2 text-lg text-slate-600">{lesson.summary}</p>}

          {embed && (
            <div className="mt-6 aspect-video overflow-hidden rounded-2xl bg-slate-900 shadow-lift">
              <iframe src={embed} title={lesson.title} className="h-full w-full" allow="accelerometer; encrypted-media; picture-in-picture" allowFullScreen />
            </div>
          )}
          {lesson.audioText && (
            <div className="mt-6">
              <ListeningPlayer script={lesson.audioText} title="Lesson audio" />
            </div>
          )}

          <Card className="mt-6 p-6 sm:p-10">
            <Markdown>{lesson.content}</Markdown>
          </Card>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {lesson.completed ? (
              <span className="inline-flex items-center gap-2 font-semibold text-brand-700"><CheckCircle2 className="h-5 w-5" /> Completed</span>
            ) : (
              <Button onClick={complete} loading={completing} size="lg"><CheckCircle2 className="h-5 w-5" /> Mark as complete</Button>
            )}
            <div className="flex gap-2">
              {lesson.prev && <Button href={`/lessons/${lesson.prev.id}`} variant="outline"><ArrowLeft className="h-4 w-4" /> Previous</Button>}
              {lesson.next && <Button href={`/lessons/${lesson.next.id}`} variant="dark">Next lesson <ArrowRight className="h-4 w-4" /></Button>}
            </div>
          </div>
        </article>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          {lesson.practices.length > 0 && (
            <Card className="p-5">
              <h3 className="flex items-center gap-2 font-bold text-slate-900"><Target className="h-5 w-5 text-brand-600" /> Practise this lesson</h3>
              <div className="mt-3 space-y-2">
                {lesson.practices.map((p) => (
                  <Link key={p.id} href={p.locked ? '/pricing' : `/practice/${p.id}`} className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 p-3 text-sm transition hover:border-brand-200 hover:bg-brand-50/50">
                    <span>
                      <span className="block font-semibold text-slate-800">{p.title}</span>
                      <span className="text-xs text-slate-500">{typeLabel(p.type)}</span>
                    </span>
                    {p.locked ? <Lock className="h-4 w-4 text-gold-500" /> : <ArrowRight className="h-4 w-4 text-brand-600" />}
                  </Link>
                ))}
              </div>
            </Card>
          )}
          <Card className="bg-gradient-to-br from-brand-600 to-brand-800 p-5 text-white">
            <h3 className="font-bold">Practise out loud 🎙️</h3>
            <p className="mt-1 text-sm text-brand-100">Use what you learned in a real conversation with the AI tutor.</p>
            <Button href="/speaking" variant="gold" size="sm" className="mt-4">Talk to Teacher Hana</Button>
          </Card>
          {!user?.isPremium && lesson.course.isPremium && (
            <Card className="p-5">
              <p className="flex items-center gap-2 font-bold text-slate-900"><Crown className="h-5 w-5 text-gold-500" /> Enjoying this free preview?</p>
              <p className="mt-1 text-sm text-slate-600">Unlock the full course and every Premium lesson.</p>
              <Button href="/pricing" variant="gold" size="sm" className="mt-4">Go Premium</Button>
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}
