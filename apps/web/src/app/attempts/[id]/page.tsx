'use client';

import Link from 'next/link';
import { use } from 'react';
import { ArrowLeft } from 'lucide-react';
import { SpeakingFeedbackView, WritingFeedbackView } from '@/components/feedback';
import { QuizResults } from '@/components/quiz';
import { RequireAuth } from '@/components/require-auth';
import { Card, ErrorBox, Skeleton } from '@/components/ui';
import { useFetch } from '@/lib/hooks';
import type { GradedQuestion, SpeakingFeedback, WritingFeedback } from '@/lib/types';
import { formatDate } from '@/lib/utils';

interface Attempt {
  id: string;
  kind: 'PRACTICE' | 'AI_TEST' | 'WRITING' | 'SPEAKING';
  title: string | null;
  score: number | null;
  band: number | null;
  answers: { essay?: string; prompt?: string } | null;
  feedback: unknown;
  createdAt: string;
  practiceId: string | null;
}

function AttemptView({ id }: { id: string }) {
  const { data: a, loading, error } = useFetch<Attempt>(`/me/attempts/${id}`);
  if (error) return <ErrorBox message={error.message} />;
  if (loading || !a) return <Skeleton className="h-96" />;

  let body: React.ReactNode = null;
  if (a.kind === 'WRITING') {
    body = (
      <div className="space-y-5">
        {a.answers?.prompt && <Card className="p-5"><p className="text-xs font-bold text-slate-500 uppercase">Task</p><p className="mt-1 whitespace-pre-line text-slate-800">{a.answers.prompt}</p></Card>}
        {a.answers?.essay && <Card className="p-5"><p className="text-xs font-bold text-slate-500 uppercase">Your answer</p><p className="mt-1 whitespace-pre-line text-slate-700">{a.answers.essay}</p></Card>}
        <WritingFeedbackView fb={a.feedback as WritingFeedback} />
      </div>
    );
  } else if (a.kind === 'SPEAKING') {
    body = (
      <div className="space-y-5">
        {a.answers?.prompt && <Card className="p-5"><p className="text-xs font-bold text-slate-500 uppercase">Question</p><p className="mt-1 whitespace-pre-line text-slate-800">{a.answers.prompt}</p></Card>}
        <SpeakingFeedbackView fb={a.feedback as SpeakingFeedback} />
      </div>
    );
  } else {
    const results = (a.feedback as GradedQuestion[]) ?? [];
    body = (
      <QuizResults
        result={{ results, correct: results.filter((r) => r.correct).length, total: results.length, score: Math.round(a.score ?? 0), band: a.band ?? 0 }}
      />
    );
  }
  return (
    <>
      <h1 className="text-2xl font-extrabold text-slate-900">{a.title ?? 'Result'}</h1>
      <p className="mb-6 text-sm text-slate-500">{formatDate(a.createdAt, { dateStyle: 'full', timeStyle: 'short' })}</p>
      {body}
    </>
  );
}

export default function AttemptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RequireAuth>
      <div className="container-page max-w-5xl py-8">
        <Link href="/dashboard" className="mb-5 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" /> Dashboard
        </Link>
        <AttemptView id={id} />
      </div>
    </RequireAuth>
  );
}
