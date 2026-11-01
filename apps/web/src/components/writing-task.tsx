'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, Loader2, Send } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { fmtTime } from '@/lib/hooks';
import type { WritingFeedback } from '@/lib/types';
import { cn, wordCount } from '@/lib/utils';
import { handleAiError } from './ai-error';
import { WritingFeedbackView } from './feedback';
import { LoginGate } from './gates';
import { Markdown } from './markdown';
import { Button, Card, Switch, Textarea } from './ui';

export function WritingTask({
  prompt,
  practiceId,
  taskType = 'TASK_2',
  minWords = 250,
  timeLimitMin = 40,
  draftKey,
}: {
  prompt: string;
  practiceId?: string;
  taskType?: 'TASK_1' | 'TASK_2' | 'GENERAL';
  minWords?: number;
  timeLimitMin?: number;
  draftKey?: string;
}) {
  const { user } = useAuth();
  const router = useRouter();
  const storageKey = `lisan_draft_${draftKey ?? practiceId ?? 'free'}`;
  const [essay, setEssay] = useState('');
  const [amharic, setAmharic] = useState(false);
  const [started, setStarted] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [loading, setLoading] = useState(false);
  const [fb, setFb] = useState<WritingFeedback | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) setEssay(saved);
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(storageKey, essay);
      } catch {
        /* ignore */
      }
    }, 400);
    return () => clearTimeout(t);
  }, [essay, storageKey]);

  useEffect(() => {
    if (!started || fb) return;
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [started, fb]);

  if (!user) return <LoginGate title="Sign in to get your writing scored" text="The AI examiner grades your essay with official IELTS band descriptors and shows you how to improve." />;

  const words = wordCount(essay);
  const remaining = timeLimitMin * 60 - elapsed;

  async function submit() {
    setLoading(true);
    try {
      const res = await api<WritingFeedback>('/ai/writing/evaluate', {
        body: { essay, prompt, taskType, practiceId, explainInAmharic: amharic },
      });
      setFb(res);
      setTimeout(() => document.getElementById('writing-feedback')?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (e) {
      handleAiError(e, router);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="p-6 lg:col-span-2">
          <p className="text-xs font-bold tracking-wider text-rose-600 uppercase">{taskType.replace('_', ' ')} · Task</p>
          <Markdown className="mt-3 prose-sm">{prompt}</Markdown>
          <div className="mt-5 space-y-1.5 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
            <p>✍️ Write at least <b>{minWords} words</b>.</p>
            <p>⏱️ Recommended time: <b>{timeLimitMin} minutes</b>.</p>
            <p>💾 Your draft saves automatically.</p>
          </div>
        </Card>
        <Card className="flex flex-col p-4 sm:p-5 lg:col-span-3">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className={cn('rounded-lg px-2.5 py-1 font-semibold', words >= minWords ? 'bg-brand-50 text-brand-700' : 'bg-slate-100 text-slate-600')}>
              {words} / {minWords} words
            </span>
            <span className={cn('inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-semibold tabular-nums', remaining < 0 ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-600')}>
              <Clock className="h-4 w-4" /> {started ? fmtTime(Math.abs(remaining)) : `${timeLimitMin}:00`} {remaining < 0 && 'over'}
            </span>
          </div>
          <Textarea
            value={essay}
            onChange={(e) => {
              setEssay(e.target.value);
              if (!started) setStarted(true);
            }}
            placeholder="Start writing your answer here…"
            className="min-h-[380px] flex-1 resize-y border-0 bg-slate-50/60 text-[15px] focus:ring-0"
            spellCheck={false}
          />
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <Switch checked={amharic} onChange={setAmharic} label="Explain in Amharic" />
            <Button onClick={submit} loading={loading} disabled={words < 30}>
              <Send className="h-4 w-4" /> Grade my writing
            </Button>
          </div>
          {loading && (
            <p className="mt-3 flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" /> The AI examiner is reading your essay… (about 10–20 seconds)
            </p>
          )}
        </Card>
      </div>
      <div id="writing-feedback">{fb && <WritingFeedbackView fb={fb} />}</div>
    </div>
  );
}
