'use client';

import Link from 'next/link';
import { use, useState } from 'react';
import { toast } from 'sonner';
import { ArrowLeft, Clock } from 'lucide-react';
import { ListeningPlayer } from '@/components/audio-player';
import { LevelBadge } from '@/components/cards';
import { PremiumGate } from '@/components/gates';
import { Markdown } from '@/components/markdown';
import { QuizForm, QuizResults } from '@/components/quiz';
import { SpeakingTask } from '@/components/speaking-task';
import { Card, ErrorBox, Skeleton } from '@/components/ui';
import { WritingTask } from '@/components/writing-task';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useFetch } from '@/lib/hooks';
import { skillMeta, typeLabel } from '@/lib/skills';
import type { GradeResult, Practice } from '@/lib/types';

export default function PracticeRunner({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const { data: p, loading, error, reload } = useFetch<Practice>(`/practices/${id}`, [user?.isPremium]);
  const [result, setResult] = useState<GradeResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [round, setRound] = useState(0);

  if (error?.isPremium) return <div className="container-page max-w-3xl py-16"><PremiumGate title="This exercise is Premium" /></div>;
  if (error) return <div className="container-page py-10"><ErrorBox message={error.message} onRetry={reload} /></div>;
  if (loading || !p) return <div className="container-page max-w-4xl space-y-4 py-10"><Skeleton className="h-24" /><Skeleton className="h-96" /></div>;

  const s = skillMeta(p.skill);

  async function submit(answers: Record<string, number | string>) {
    setSubmitting(true);
    try {
      const r = await api<GradeResult>(`/practices/${id}/submit`, { body: { answers } });
      setResult(r);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  const header = (
    <div className="mb-6">
      <Link href="/practice" className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" /> Practice library
      </Link>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold" style={{ color: s.color }}>{s.label} · {typeLabel(p.type)}</span>
        <LevelBadge level={p.level} />
        {p.timeLimitMin && <span className="inline-flex items-center gap-1 text-sm text-slate-500"><Clock className="h-4 w-4" /> {p.timeLimitMin} min</span>}
      </div>
      <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">{p.title}</h1>
      {p.instructions && <p className="mt-2 text-slate-600">{p.instructions}</p>}
    </div>
  );

  if (p.type === 'WRITING') {
    return (
      <div className="container-page py-8">
        {header}
        <WritingTask
          prompt={p.prompt ?? ''}
          practiceId={p.id}
          minWords={p.minWords ?? 250}
          timeLimitMin={p.timeLimitMin ?? 40}
          taskType={(p.minWords ?? 250) < 200 ? 'TASK_1' : 'TASK_2'}
        />
      </div>
    );
  }

  if (p.type === 'SPEAKING') {
    const part = /you should say/i.test(p.prompt ?? '') ? 'PART_2' : p.level.band >= 7 ? 'PART_3' : 'PART_1';
    return (
      <div className="container-page max-w-4xl py-8">
        {header}
        <SpeakingTask prompt={p.prompt ?? ''} practiceId={p.id} part={part} prepSeconds={part === 'PART_2' ? 60 : 0} maxSeconds={(p.timeLimitMin ?? 3) * 60} />
      </div>
    );
  }

  const hasPassage = !!p.passage && (p.type === 'READING' || p.type === 'LISTENING');

  return (
    <div className="container-page py-8">
      {header}
      <div className={hasPassage ? 'grid gap-6 lg:grid-cols-2' : 'mx-auto max-w-3xl'}>
        {hasPassage && (
          <div className="lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:self-start lg:overflow-y-auto">
            {p.type === 'LISTENING' ? (
              <ListeningPlayer script={p.passage!} allowTranscript={!!result} />
            ) : (
              <Card className="p-6 sm:p-8">
                <Markdown className="prose-sm sm:prose-base">{p.passage!}</Markdown>
              </Card>
            )}
            {p.type === 'LISTENING' && !result && <p className="mt-3 text-sm text-slate-500">The transcript unlocks after you submit your answers.</p>}
          </div>
        )}
        <div>
          {result ? (
            <QuizResults result={result} onRetry={() => { setResult(null); setRound((r) => r + 1); }} />
          ) : (
            <QuizForm key={round} questions={p.questions} onSubmit={submit} submitting={submitting} />
          )}
        </div>
      </div>
    </div>
  );
}
