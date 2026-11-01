'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2, Lightbulb, RotateCcw, Send, XCircle } from 'lucide-react';
import type { GradeResult, Question } from '@/lib/types';
import { cn } from '@/lib/utils';
import { BandRing } from './band-ring';
import { Button, Card, Progress } from './ui';

type Answers = Record<string, number | string>;

export function QuizForm({
  questions,
  onSubmit,
  submitting,
  submitLabel = 'Check answers',
}: {
  questions: Question[];
  onSubmit: (answers: Answers) => void;
  submitting?: boolean;
  submitLabel?: string;
}) {
  const [answers, setAnswers] = useState<Answers>({});
  const answered = useMemo(() => questions.filter((q) => answers[q.id] !== undefined && answers[q.id] !== '').length, [answers, questions]);
  const set = (id: string, v: number | string) => setAnswers((a) => ({ ...a, [id]: v }));

  return (
    <div className="space-y-4">
      {questions.map((q, i) => (
        <Card key={q.id} className="p-5 sm:p-6">
          <p className="flex gap-3 font-medium text-slate-900">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-xs font-bold text-white">{i + 1}</span>
            <span className="pt-0.5 leading-relaxed">{q.question}</span>
          </p>
          {q.options?.length ? (
            <div className={cn('mt-4 grid gap-2', q.options.length <= 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2')}>
              {q.options.map((opt, oi) => {
                const selected = answers[q.id] === oi;
                return (
                  <button
                    key={oi}
                    type="button"
                    onClick={() => set(q.id, oi)}
                    className={cn(
                      'flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left text-sm font-medium transition',
                      selected ? 'border-brand-600 bg-brand-50 text-brand-900' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50',
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold',
                        selected ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 text-slate-500',
                      )}
                    >
                      {String.fromCharCode(65 + oi)}
                    </span>
                    {opt}
                  </button>
                );
              })}
            </div>
          ) : (
            <input
              value={(answers[q.id] as string) ?? ''}
              onChange={(e) => set(q.id, e.target.value)}
              placeholder="Type your answer…"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              className="mt-4 h-12 w-full rounded-xl border-2 border-slate-200 px-4 font-medium text-slate-900 focus:border-brand-600 focus:outline-none sm:max-w-sm"
            />
          )}
        </Card>
      ))}
      <div className="sticky bottom-4 z-10">
        <Card className="flex items-center gap-4 p-4 shadow-lift">
          <div className="flex-1">
            <div className="mb-1.5 flex justify-between text-xs font-medium text-slate-500">
              <span>
                {answered} of {questions.length} answered
              </span>
              <span>{Math.round((answered / Math.max(1, questions.length)) * 100)}%</span>
            </div>
            <Progress value={(answered / Math.max(1, questions.length)) * 100} />
          </div>
          <Button onClick={() => onSubmit(answers)} loading={submitting} disabled={answered === 0}>
            <Send className="h-4 w-4" /> {submitLabel}
          </Button>
        </Card>
      </div>
    </div>
  );
}

export function QuizResults({ result, onRetry, extra }: { result: GradeResult; onRetry?: () => void; extra?: React.ReactNode }) {
  const msg =
    result.score >= 90 ? 'Outstanding! 🎉' : result.score >= 70 ? 'Great work! 👏' : result.score >= 50 ? 'Good effort — keep going! 💪' : "Let's review and try again 📚";
  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <div className="flex flex-col items-center gap-6 bg-gradient-to-br from-brand-50 via-white to-gold-50 p-6 sm:flex-row sm:p-8">
          <BandRing band={result.estimatedBand ?? result.band} label={result.estimatedBand != null ? 'Est. band' : 'Band'} />
          <div className="flex-1 text-center sm:text-left">
            <p className="text-sm font-semibold text-brand-700">Your result</p>
            <h2 className="text-3xl font-extrabold text-slate-900">
              {result.correct}/{result.total} correct · {result.score}%
            </h2>
            <p className="mt-1 text-slate-600">{msg}</p>
            {result.saved === false && <p className="mt-2 text-sm text-slate-500">Sign in to save your progress and track your band over time.</p>}
            {extra}
          </div>
          {onRetry && (
            <Button variant="outline" onClick={onRetry}>
              <RotateCcw className="h-4 w-4" /> Try again
            </Button>
          )}
        </div>
      </Card>

      <div className="space-y-3">
        {result.results.map((r, i) => (
          <Card key={r.id} className={cn('border-l-4 p-5', r.correct ? 'border-l-brand-500' : 'border-l-rose-500')}>
            <div className="flex gap-3">
              {r.correct ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" /> : <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" />}
              <div className="min-w-0 flex-1">
                <p className="font-medium text-slate-900">
                  {i + 1}. {r.question}
                </p>
                <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                  <span className={r.correct ? 'text-brand-700' : 'text-rose-600'}>
                    Your answer: <b>{display(r.given, r.options)}</b>
                  </span>
                  {!r.correct && (
                    <span className="text-brand-700">
                      Correct: <b>{display(r.correctAnswer, r.options, true)}</b>
                    </span>
                  )}
                </div>
                {r.explanation && (
                  <p className="mt-3 flex gap-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                    <Lightbulb className="h-4 w-4 shrink-0 text-gold-500" /> {r.explanation}
                  </p>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function display(v: number | string | null, options?: string[], isAnswer = false) {
  if (v === null || v === undefined || v === '') return '—';
  if (options?.length && typeof v === 'number') return options[v] ?? '—';
  if (options?.length && !isNaN(Number(v))) return options[Number(v)] ?? String(v);
  return isAnswer ? String(v).split('|')[0] : String(v);
}
