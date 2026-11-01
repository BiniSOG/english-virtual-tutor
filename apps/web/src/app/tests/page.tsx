'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { toast } from 'sonner';
import { ArrowRight, Gauge, Loader2, Sparkles, Wand2 } from 'lucide-react';
import { handleAiError } from '@/components/ai-error';
import { ListeningPlayer } from '@/components/audio-player';
import { LevelBadge } from '@/components/cards';
import { LoginGate } from '@/components/gates';
import { Markdown } from '@/components/markdown';
import { QuizForm, QuizResults } from '@/components/quiz';
import { Button, Card, Field, Input, PageHeader, Select } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useFetch } from '@/lib/hooks';
import { SKILLS } from '@/lib/skills';
import type { GradeResult, Level, Question, Skill } from '@/lib/types';
import { cn } from '@/lib/utils';

interface GeneratedTest {
  attemptId: string;
  mode: 'SKILL' | 'LEVEL_CHECK';
  skill: Skill;
  title: string;
  instructions?: string;
  passage: string | null;
  level: Level;
  questions: Question[];
}

const TEST_SKILLS = SKILLS.filter((s) => !['SPEAKING', 'WRITING'].includes(s.key));

function Tests() {
  const { user, refresh } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const { data: levels } = useFetch<Level[]>('/levels');
  const [mode, setMode] = useState<'SKILL' | 'LEVEL_CHECK'>(params.get('mode') === 'LEVEL_CHECK' ? 'LEVEL_CHECK' : 'SKILL');
  const [skill, setSkill] = useState<Skill>('GRAMMAR');
  const [levelCode, setLevelCode] = useState('');
  const [count, setCount] = useState(10);
  const [topic, setTopic] = useState('');
  const [generating, setGenerating] = useState(false);
  const [test, setTest] = useState<GeneratedTest | null>(null);
  const [result, setResult] = useState<GradeResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!user)
    return (
      <div className="container-page max-w-3xl py-16">
        <LoginGate title="Sign in to generate AI tests" text="Get unlimited fresh IELTS-style tests at your level, plus a free placement test that estimates your band." />
      </div>
    );

  async function generate() {
    setGenerating(true);
    setResult(null);
    try {
      const t = await api<GeneratedTest>('/ai/tests/generate', {
        body: { mode, skill, levelCode: levelCode || undefined, count: mode === 'LEVEL_CHECK' ? 15 : count, topic: topic || undefined },
      });
      setTest(t);
    } catch (e) {
      handleAiError(e, router);
    } finally {
      setGenerating(false);
    }
  }

  async function submit(answers: Record<string, number | string>) {
    if (!test) return;
    setSubmitting(true);
    try {
      setResult(await api<GradeResult>(`/ai/tests/${test.attemptId}/submit`, { body: { answers } }));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function adoptLevel(levelId: string) {
    try {
      await api('/auth/me', { method: 'PATCH', body: { levelId } });
      await refresh();
      toast.success('Your level has been updated!');
      router.push('/dashboard');
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  if (test) {
    return (
      <div className="container-page py-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="flex items-center gap-1.5 text-sm font-semibold text-violet-700"><Sparkles className="h-4 w-4" /> AI-generated {test.mode === 'LEVEL_CHECK' ? 'placement test' : 'test'}</p>
            <h1 className="mt-1 text-2xl font-extrabold text-slate-900 sm:text-3xl">{test.title}</h1>
            {test.instructions && <p className="mt-1 text-slate-600">{test.instructions}</p>}
          </div>
          <Button variant="outline" onClick={() => { setTest(null); setResult(null); }}>New test</Button>
        </div>
        <div className={test.passage ? 'grid gap-6 lg:grid-cols-2' : 'mx-auto max-w-3xl'}>
          {test.passage && (
            <div className="lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:self-start lg:overflow-y-auto">
              {test.skill === 'LISTENING' ? (
                <ListeningPlayer script={test.passage} allowTranscript={!!result} />
              ) : (
                <Card className="p-6 sm:p-8"><Markdown className="prose-sm sm:prose-base">{test.passage}</Markdown></Card>
              )}
            </div>
          )}
          <div>
            {result ? (
              <QuizResults
                result={result}
                extra={
                  result.suggestedLevel && (
                    <div className="mt-4 rounded-2xl border border-brand-200 bg-white p-4">
                      <p className="text-sm text-slate-600">Recommended level for you:</p>
                      <div className="mt-2 flex flex-wrap items-center gap-3">
                        <LevelBadge level={result.suggestedLevel} className="text-sm" />
                        <Button size="sm" onClick={() => adoptLevel(result.suggestedLevel!.id)}>
                          Set as my level <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )
                }
              />
            ) : (
              <QuizForm questions={test.questions} onSubmit={submit} submitting={submitting} submitLabel="Submit test" />
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-page py-10">
      <PageHeader eyebrow="AI tests" title="Unlimited tests, made for you" text="Gemini creates a brand-new IELTS-style test every time — at your level, on any topic you choose." />
      {params.get('welcome') && (
        <Card className="mt-6 border-brand-200 bg-brand-50/60 p-5">
          <p className="font-semibold text-brand-900">👋 Welcome to Lisan! Start with a quick 15-question level check so we can recommend the right courses for you.</p>
        </Card>
      )}
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {[
          { k: 'LEVEL_CHECK', icon: Gauge, title: 'Level check (placement)', text: '15 questions from Band 4 to Band 8. Get an estimated band and a recommended level.' },
          { k: 'SKILL', icon: Wand2, title: 'Skill test', text: 'Choose a skill, level and topic. Grammar, vocabulary, reading or listening.' },
        ].map((o) => (
          <button
            key={o.k}
            onClick={() => setMode(o.k as 'SKILL' | 'LEVEL_CHECK')}
            className={cn(
              'flex gap-4 rounded-2xl border-2 bg-white p-5 text-left transition',
              mode === o.k ? 'border-brand-600 shadow-lift' : 'border-slate-200 hover:border-slate-300',
            )}
          >
            <span className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-xl', mode === o.k ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600')}>
              <o.icon className="h-6 w-6" />
            </span>
            <span>
              <span className="block font-bold text-slate-900">{o.title}</span>
              <span className="text-sm text-slate-600">{o.text}</span>
            </span>
          </button>
        ))}
      </div>

      <Card className="mt-6 p-6">
        {mode === 'SKILL' && (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            <Field label="Skill">
              <Select value={skill} onChange={(e) => setSkill(e.target.value as Skill)}>
                {TEST_SKILLS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </Select>
            </Field>
            <Field label="Level">
              <Select value={levelCode} onChange={(e) => setLevelCode(e.target.value)}>
                <option value="">My level{user.level ? ` (${user.level.name})` : ''}</option>
                {levels?.map((l) => <option key={l.id} value={l.code}>{l.name} · Band {l.band}</option>)}
              </Select>
            </Field>
            <Field label="Questions">
              <Select value={count} onChange={(e) => setCount(Number(e.target.value))}>
                {[5, 10, 15, 20].map((n) => <option key={n} value={n}>{n}</option>)}
              </Select>
            </Field>
            <Field label="Topic (optional)">
              <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. tenses, health, Ethiopian history" maxLength={120} />
            </Field>
          </div>
        )}
        <div className={cn('flex flex-wrap items-center gap-4', mode === 'SKILL' && 'mt-6')}>
          <Button size="lg" onClick={generate} loading={generating}>
            <Sparkles className="h-5 w-5" /> {mode === 'LEVEL_CHECK' ? 'Start level check' : 'Generate my test'}
          </Button>
          {generating && <span className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Creating fresh questions just for you…</span>}
        </div>
      </Card>
    </div>
  );
}

export default function TestsPage() {
  return (
    <Suspense>
      <Tests />
    </Suspense>
  );
}
