'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { use, useState } from 'react';
import { toast } from 'sonner';
import { ArrowLeft, Eye, GripVertical, Pencil, Plus, Sparkles, Trash2 } from 'lucide-react';
import { CourseForm, type CourseInput } from '@/components/admin/course-form';
import { Markdown } from '@/components/markdown';
import { Badge, Button, Card, EmptyState, ErrorBox, Field, Input, Modal, PageHeader, Skeleton, Switch, Textarea } from '@/components/ui';
import { api } from '@/lib/api';
import { useFetch } from '@/lib/hooks';
import type { Level, Skill } from '@/lib/types';

interface AdminLesson { id: string; title: string; summary: string | null; content: string; videoUrl: string | null; audioText: string | null; durationMin: number; order: number; isFree: boolean }
interface AdminCourseDetail extends CourseInput { id: string; level: Level; lessons: AdminLesson[]; skill: Skill }

export default function AdminCourseEditor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: course, loading, error, reload } = useFetch<AdminCourseDetail>(`/admin/courses/${id}`);
  const [editing, setEditing] = useState<AdminLesson | 'new' | null>(null);

  if (error) return <ErrorBox message={error.message} onRetry={reload} />;
  if (loading || !course) return <Skeleton className="h-96" />;

  async function saveCourse(c: CourseInput) {
    try {
      await api(`/admin/courses/${id}`, { method: 'PATCH', body: c });
      toast.success('Course saved');
      reload();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function deleteCourse() {
    if (!confirm(`Delete "${course!.title}" and all its lessons?`)) return;
    try {
      await api(`/admin/courses/${id}`, { method: 'DELETE' });
      toast.success('Course deleted');
      router.push('/admin/courses');
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function deleteLesson(l: AdminLesson) {
    if (!confirm(`Delete lesson "${l.title}"?`)) return;
    try {
      await api(`/admin/lessons/${l.id}`, { method: 'DELETE' });
      toast.success('Lesson deleted');
      reload();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function move(l: AdminLesson, dir: -1 | 1) {
    const list = [...course!.lessons];
    const i = list.findIndex((x) => x.id === l.id);
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    await Promise.all(list.map((x, k) => (x.order !== k + 1 ? api(`/admin/lessons/${x.id}`, { method: 'PATCH', body: { order: k + 1 } }) : null)));
    reload();
  }

  const { lessons, level: _level, id: _id, ...courseInput } = course;

  return (
    <div className="space-y-6">
      <Link href="/admin/courses" className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-900"><ArrowLeft className="h-4 w-4" /> Courses</Link>
      <PageHeader
        title={course.title}
        actions={
          <>
            <Button href={`/courses/${course.slug}`} variant="outline"><Eye className="h-4 w-4" /> Preview</Button>
            <Button variant="danger" onClick={deleteCourse}><Trash2 className="h-4 w-4" /> Delete</Button>
          </>
        }
      />
      <div className="grid gap-6 xl:grid-cols-5">
        <Card className="p-6 xl:col-span-2">
          <h2 className="mb-4 font-bold text-slate-900">Course details</h2>
          <CourseForm key={course.id + course.title} initial={{ ...courseInput, subtitle: courseInput.subtitle ?? '' }} onSubmit={saveCourse} />
        </Card>
        <Card className="p-6 xl:col-span-3">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold text-slate-900">Lessons ({lessons.length})</h2>
            <Button size="sm" onClick={() => setEditing('new')}><Plus className="h-4 w-4" /> Add lesson</Button>
          </div>
          {lessons.length ? (
            <div className="space-y-2">
              {lessons.map((l, i) => (
                <div key={l.id} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3 hover:bg-slate-50">
                  <div className="flex flex-col">
                    <button className="text-slate-400 hover:text-slate-700 disabled:opacity-30" disabled={i === 0} onClick={() => move(l, -1)} aria-label="Move up">▲</button>
                    <button className="text-slate-400 hover:text-slate-700 disabled:opacity-30" disabled={i === lessons.length - 1} onClick={() => move(l, 1)} aria-label="Move down">▼</button>
                  </div>
                  <GripVertical className="h-4 w-4 text-slate-300" />
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-xs font-bold text-white">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-900">{l.title}</p>
                    <p className="text-xs text-slate-500">{l.durationMin} min {l.audioText && '· 🎧 audio'} {l.videoUrl && '· 🎬 video'}</p>
                  </div>
                  {l.isFree && course.isPremium && <Badge tone="brand">Free preview</Badge>}
                  <Button size="icon" variant="ghost" onClick={() => setEditing(l)} aria-label="Edit"><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => deleteLesson(l)} aria-label="Delete"><Trash2 className="h-4 w-4 text-rose-500" /></Button>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No lessons yet" text="Add your first lesson — or let the AI draft one for you." action={<Button onClick={() => setEditing('new')}>Add lesson</Button>} />
          )}
        </Card>
      </div>
      {editing && (
        <LessonEditor
          courseId={id}
          lesson={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
        />
      )}
    </div>
  );
}

function LessonEditor({ courseId, lesson, onClose, onSaved }: { courseId: string; lesson: AdminLesson | null; onClose: () => void; onSaved: () => void }) {
  const [l, setL] = useState({
    title: lesson?.title ?? '',
    summary: lesson?.summary ?? '',
    content: lesson?.content ?? '',
    videoUrl: lesson?.videoUrl ?? '',
    audioText: lesson?.audioText ?? '',
    durationMin: lesson?.durationMin ?? 10,
    isFree: lesson?.isFree ?? false,
  });
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [topic, setTopic] = useState('');
  const [generating, setGenerating] = useState(false);

  async function generate() {
    if (!topic.trim()) return toast.error('Enter a topic first');
    setGenerating(true);
    try {
      const g = await api<{ title: string; summary: string; content: string; audioText: string | null; durationMin: number }>('/admin/ai/generate-lesson', { body: { courseId, topic } });
      setL((x) => ({ ...x, title: g.title, summary: g.summary, content: g.content, audioText: g.audioText ?? '', durationMin: g.durationMin || x.durationMin }));
      toast.success('Draft generated — review before saving');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setGenerating(false);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const body = { ...l, videoUrl: l.videoUrl || undefined, audioText: l.audioText || undefined, summary: l.summary || undefined };
    try {
      if (lesson) await api(`/admin/lessons/${lesson.id}`, { method: 'PATCH', body });
      else await api('/admin/lessons', { body: { ...body, courseId } });
      toast.success('Lesson saved');
      onSaved();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={lesson ? 'Edit lesson' : 'New lesson'} wide>
      <div className="mb-5 flex flex-col gap-2 rounded-2xl border border-violet-200 bg-violet-50/60 p-4 sm:flex-row sm:items-center">
        <Sparkles className="h-5 w-5 shrink-0 text-violet-600" />
        <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Topic for AI draft, e.g. 'Present perfect vs past simple'" className="bg-white" />
        <Button type="button" variant="dark" onClick={generate} loading={generating}>Generate with AI</Button>
      </div>
      <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <Field label="Title" className="sm:col-span-2"><Input required value={l.title} onChange={(e) => setL({ ...l, title: e.target.value })} /></Field>
        <Field label="Summary" className="sm:col-span-2"><Input value={l.summary} onChange={(e) => setL({ ...l, summary: e.target.value })} /></Field>
        <div className="sm:col-span-2">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">Content (Markdown)</span>
            <button type="button" className="text-sm font-semibold text-brand-700" onClick={() => setPreview((p) => !p)}>{preview ? 'Edit' : 'Preview'}</button>
          </div>
          {preview ? (
            <div className="max-h-[420px] overflow-y-auto rounded-xl border border-slate-200 p-5"><Markdown>{l.content || '_Nothing yet_'}</Markdown></div>
          ) : (
            <Textarea required rows={14} className="font-mono text-[13px]" value={l.content} onChange={(e) => setL({ ...l, content: e.target.value })} placeholder="# Lesson title&#10;&#10;Explain the topic with ## headings, tables, examples and > tips…" />
          )}
        </div>
        <Field label="Listening script (read aloud with TTS)" hint="Optional. Use 'Name: text' lines for dialogues." className="sm:col-span-2">
          <Textarea rows={4} value={l.audioText} onChange={(e) => setL({ ...l, audioText: e.target.value })} />
        </Field>
        <Field label="Video URL (YouTube)"><Input value={l.videoUrl} onChange={(e) => setL({ ...l, videoUrl: e.target.value })} placeholder="https://youtu.be/…" /></Field>
        <Field label="Duration (min)"><Input type="number" min={1} value={l.durationMin} onChange={(e) => setL({ ...l, durationMin: Number(e.target.value) })} /></Field>
        <div className="sm:col-span-2"><Switch checked={l.isFree} onChange={(v) => setL({ ...l, isFree: v })} label="Free preview (visible to everyone even in a Premium course)" /></div>
        <div className="flex gap-2 sm:col-span-2">
          <Button type="submit" loading={saving}>Save lesson</Button>
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </form>
    </Modal>
  );
}
