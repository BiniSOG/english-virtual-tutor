'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { use, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ArrowLeft, Eye, Plus, Sparkles, Trash2, X } from 'lucide-react';
import { Button, Card, Field, Input, PageHeader, Select, Skeleton, Switch, Textarea } from '@/components/ui';
import { api } from '@/lib/api';
import { useFetch } from '@/lib/hooks';
import { PRACTICE_TYPES, SKILLS } from '@/lib/skills';
import type { Level, Practice, PracticeType, Question, Skill } from '@/lib/types';
import { cn } from '@/lib/utils';

type Draft = {
  title: string; description: string; instructions: string; skill: Skill; type: PracticeType; levelId: string;
  isPremium: boolean; isPublished: boolean; passage: string; prompt: string; questions: Question[];
  timeLimitMin: number | ''; minWords: number | ''; lessonId?: string | null;
};

const EMPTY: Draft = {
  title: '', description: '', instructions: '', skill: 'GRAMMAR', type: 'MULTIPLE_CHOICE', levelId: '', isPremium: false, isPublished: true,
  passage: '', prompt: '', questions: [], timeLimitMin: '', minWords: '',
};

const needsQuestions = (t: PracticeType) => !['WRITING', 'SPEAKING'].includes(t);
const needsPassage = (t: PracticeType) => t === 'READING' || t === 'LISTENING';
const needsPrompt = (t: PracticeType) => t === 'WRITING' || t === 'SPEAKING';

export default function PracticeEditor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const isNew = id === 'new';
  const router = useRouter();
  const { data: levels } = useFetch<Level[]>('/levels');
  const { data: lessons } = useFetch<{ id: string; title: string; course: { title: string } }[]>('/admin/lessons');
  const { data: existing, loading } = useFetch<Practice>(isNew ? null : `/admin/practices/${id}`);
  const [d, setD] = useState<Draft>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiCount, setAiCount] = useState(8);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (existing)
      setD({
        title: existing.title, description: existing.description ?? '', instructions: existing.instructions ?? '', skill: existing.skill, type: existing.type,
        levelId: existing.levelId, isPremium: existing.isPremium, isPublished: existing.isPublished ?? true, passage: existing.passage ?? '', prompt: existing.prompt ?? '',
        questions: existing.questions ?? [], timeLimitMin: existing.timeLimitMin ?? '', minWords: existing.minWords ?? '', lessonId: existing.lessonId,
      });
  }, [existing]);

  useEffect(() => {
    if (isNew && levels?.length && !d.levelId) setD((x) => ({ ...x, levelId: levels[0].id }));
  }, [levels, isNew, d.levelId]);

  if (!isNew && (loading || !existing)) return <Skeleton className="h-96" />;

  const setQ = (i: number, patch: Partial<Question>) => setD((x) => ({ ...x, questions: x.questions.map((q, k) => (k === i ? { ...q, ...patch } : q)) }));
  const addQ = (mc: boolean) =>
    setD((x) => ({ ...x, questions: [...x.questions, { id: `q${x.questions.length + 1}`, question: '', ...(mc ? { options: ['', '', '', ''], answer: 0 } : { answer: '' }), explanation: '' }] }));

  async function generate() {
    if (!d.levelId) return toast.error('Choose a level first');
    setGenerating(true);
    try {
      const g = await api<{ title: string; description?: string; instructions?: string; passage?: string | null; prompt?: string | null; questions: Question[] }>(
        '/admin/ai/generate-practice',
        { body: { skill: d.skill, type: d.type, levelId: d.levelId, topic: aiTopic || undefined, count: aiCount } },
      );
      setD((x) => ({
        ...x,
        title: g.title || x.title,
        description: g.description ?? x.description,
        instructions: g.instructions ?? x.instructions,
        passage: g.passage ?? '',
        prompt: g.prompt ?? '',
        questions: g.questions ?? [],
      }));
      toast.success('AI draft ready — please review before saving');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setGenerating(false);
    }
  }

  async function save() {
    if (!d.title.trim()) return toast.error('Title is required');
    if (needsQuestions(d.type) && !d.questions.length) return toast.error('Add at least one question');
    if (needsPrompt(d.type) && !d.prompt.trim()) return toast.error('A task prompt is required');
    setSaving(true);
    const body = {
      ...d,
      timeLimitMin: d.timeLimitMin === '' ? undefined : Number(d.timeLimitMin),
      minWords: d.minWords === '' ? undefined : Number(d.minWords),
      passage: d.passage || undefined,
      prompt: d.prompt || undefined,
      lessonId: d.lessonId || null,
      questions: needsQuestions(d.type)
        ? d.questions.map((q, i) => ({
            id: `q${i + 1}`,
            question: q.question,
            ...(q.options?.length ? { options: q.options, answer: Number(q.answer) } : { answer: String(q.answer ?? '') }),
            explanation: q.explanation || undefined,
          }))
        : [],
    };
    try {
      if (isNew) {
        const created = await api<{ id: string }>('/admin/practices', { body });
        toast.success('Practice created');
        router.replace(`/admin/practices/${created.id}`);
      } else {
        await api(`/admin/practices/${id}`, { method: 'PATCH', body });
        toast.success('Saved');
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirm('Delete this practice?')) return;
    try {
      await api(`/admin/practices/${id}`, { method: 'DELETE' });
      toast.success('Deleted');
      router.push('/admin/practices');
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div className="space-y-6 pb-24">
      <Link href="/admin/practices" className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-900"><ArrowLeft className="h-4 w-4" /> Practices</Link>
      <PageHeader
        title={isNew ? 'New practice' : d.title || 'Edit practice'}
        actions={!isNew && (
          <>
            <Button href={`/practice/${id}`} variant="outline"><Eye className="h-4 w-4" /> Preview</Button>
            <Button variant="danger" onClick={remove}><Trash2 className="h-4 w-4" /> Delete</Button>
          </>
        )}
      />

      <Card className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Skill"><Select value={d.skill} onChange={(e) => setD({ ...d, skill: e.target.value as Skill })}>{SKILLS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}</Select></Field>
        <Field label="Type"><Select value={d.type} onChange={(e) => setD({ ...d, type: e.target.value as PracticeType })}>{PRACTICE_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}</Select></Field>
        <Field label="Level"><Select value={d.levelId} onChange={(e) => setD({ ...d, levelId: e.target.value })}>{levels?.map((l) => <option key={l.id} value={l.id}>{l.name} · Band {l.band}</option>)}</Select></Field>
        <div className="flex items-end gap-5 pb-2">
          <Switch checked={d.isPremium} onChange={(v) => setD({ ...d, isPremium: v })} label="Premium" />
          <Switch checked={d.isPublished} onChange={(v) => setD({ ...d, isPublished: v })} label="Live" />
        </div>
      </Card>

      <Card className="flex flex-col gap-3 border-violet-200 bg-gradient-to-r from-violet-50 to-white p-5 lg:flex-row lg:items-center">
        <div className="flex items-center gap-2 font-semibold text-violet-900"><Sparkles className="h-5 w-5" /> AI generator</div>
        <Input value={aiTopic} onChange={(e) => setAiTopic(e.target.value)} placeholder="Topic or focus (optional), e.g. 'phrasal verbs for work'" className="bg-white lg:flex-1" />
        {needsQuestions(d.type) && (
          <Select value={aiCount} onChange={(e) => setAiCount(Number(e.target.value))} className="bg-white lg:w-36">
            {[5, 8, 10, 15, 20].map((n) => <option key={n} value={n}>{n} questions</option>)}
          </Select>
        )}
        <Button variant="dark" onClick={generate} loading={generating}>Generate draft</Button>
      </Card>

      <Card className="grid gap-4 p-6 sm:grid-cols-2">
        <Field label="Title" className="sm:col-span-2"><Input value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} /></Field>
        <Field label="Short description"><Input value={d.description} onChange={(e) => setD({ ...d, description: e.target.value })} /></Field>
        <Field label="Instructions for students"><Input value={d.instructions} onChange={(e) => setD({ ...d, instructions: e.target.value })} /></Field>
        <Field label="Linked lesson (optional)" hint="Shown in the lesson's “Practise this lesson” panel">
          <Select value={d.lessonId ?? ''} onChange={(e) => setD({ ...d, lessonId: e.target.value || null })}>
            <option value="">— None —</option>
            {lessons?.map((l) => <option key={l.id} value={l.id}>{l.course.title} › {l.title}</option>)}
          </Select>
        </Field>
        <Field label="Time limit (min)"><Input type="number" min={1} value={d.timeLimitMin} onChange={(e) => setD({ ...d, timeLimitMin: e.target.value === '' ? '' : Number(e.target.value) })} /></Field>
        {d.type === 'WRITING' && <Field label="Minimum words"><Input type="number" min={50} value={d.minWords} onChange={(e) => setD({ ...d, minWords: e.target.value === '' ? '' : Number(e.target.value) })} /></Field>}
        {needsPassage(d.type) && (
          <Field label={d.type === 'LISTENING' ? 'Listening script (read aloud by TTS; use "Speaker: text" lines)' : 'Reading passage (Markdown)'} className="sm:col-span-2">
            <Textarea rows={10} value={d.passage} onChange={(e) => setD({ ...d, passage: e.target.value })} />
          </Field>
        )}
        {needsPrompt(d.type) && (
          <Field label={d.type === 'WRITING' ? 'Writing task prompt (Markdown, tables allowed)' : 'Speaking question / cue card'} className="sm:col-span-2">
            <Textarea rows={7} value={d.prompt} onChange={(e) => setD({ ...d, prompt: e.target.value })} />
          </Field>
        )}
      </Card>

      {needsQuestions(d.type) && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-slate-900">Questions ({d.questions.length})</h2>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => addQ(true)}><Plus className="h-4 w-4" /> Multiple choice</Button>
              <Button size="sm" variant="outline" onClick={() => addQ(false)}><Plus className="h-4 w-4" /> Gap fill</Button>
            </div>
          </div>
          {d.questions.map((q, i) => (
            <Card key={i} className="p-5">
              <div className="flex items-start gap-3">
                <span className="mt-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-xs font-bold text-white">{i + 1}</span>
                <div className="flex-1 space-y-3">
                  <Textarea rows={2} value={q.question} onChange={(e) => setQ(i, { question: e.target.value })} placeholder="Question text (use ____ for gaps)" />
                  {q.options ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {q.options.map((o, oi) => (
                        <div key={oi} className={cn('flex items-center gap-2 rounded-xl border-2 p-1.5 pl-3', Number(q.answer) === oi ? 'border-brand-500 bg-brand-50' : 'border-slate-200')}>
                          <input type="radio" name={`ans-${i}`} checked={Number(q.answer) === oi} onChange={() => setQ(i, { answer: oi })} className="accent-brand-600" aria-label="Correct answer" />
                          <input
                            value={o}
                            onChange={(e) => setQ(i, { options: q.options!.map((x, k) => (k === oi ? e.target.value : x)) })}
                            placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                            className="h-8 flex-1 bg-transparent text-sm focus:outline-none"
                          />
                          {q.options!.length > 2 && (
                            <button
                              onClick={() => setQ(i, { options: q.options!.filter((_, k) => k !== oi), answer: Number(q.answer) === oi ? 0 : Number(q.answer) > oi ? Number(q.answer) - 1 : q.answer })}
                              className="rounded p-1 text-slate-400 hover:text-rose-500"
                              aria-label="Remove option"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      ))}
                      {q.options.length < 6 && (
                        <button onClick={() => setQ(i, { options: [...q.options!, ''] })} className="rounded-xl border-2 border-dashed border-slate-200 p-2 text-sm text-slate-500 hover:border-slate-300">+ Option</button>
                      )}
                    </div>
                  ) : (
                    <Input value={String(q.answer ?? '')} onChange={(e) => setQ(i, { answer: e.target.value })} placeholder='Correct answer — separate alternatives with "|", e.g. "don&apos;t live|do not live"' />
                  )}
                  <Input value={q.explanation ?? ''} onChange={(e) => setQ(i, { explanation: e.target.value })} placeholder="Explanation shown after answering (recommended)" />
                </div>
                <Button size="icon" variant="ghost" onClick={() => setD((x) => ({ ...x, questions: x.questions.filter((_, k) => k !== i) }))} aria-label="Delete question">
                  <Trash2 className="h-4 w-4 text-rose-500" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <div className="fixed right-0 bottom-0 left-0 z-20 border-t border-slate-200 bg-white/95 p-4 backdrop-blur lg:left-[260px]">
        <div className="flex justify-end gap-2">
          <Button variant="ghost" href="/admin/practices">Cancel</Button>
          <Button onClick={save} loading={saving}>{isNew ? 'Create practice' : 'Save changes'}</Button>
        </div>
      </div>
    </div>
  );
}
