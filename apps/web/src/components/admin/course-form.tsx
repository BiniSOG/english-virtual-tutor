'use client';

import { useState } from 'react';
import { Button, Field, Input, Select, Switch, Textarea } from '@/components/ui';
import { useFetch } from '@/lib/hooks';
import { SKILLS } from '@/lib/skills';
import type { Level, Skill } from '@/lib/types';

export interface CourseInput {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  skill: Skill;
  levelId: string;
  isPremium: boolean;
  isPublished: boolean;
  order: number;
}

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

export function CourseForm({ initial, onSubmit, submitLabel = 'Save' }: { initial?: Partial<CourseInput>; onSubmit: (c: CourseInput) => Promise<void>; submitLabel?: string }) {
  const { data: levels } = useFetch<Level[]>('/levels');
  const [c, setC] = useState<CourseInput>({
    slug: '', title: '', subtitle: '', description: '', skill: 'GRAMMAR', levelId: '', isPremium: false, isPublished: true, order: 0, ...initial,
  } as CourseInput);
  const [saving, setSaving] = useState(false);
  const [slugTouched, setSlugTouched] = useState(!!initial?.slug);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit({ ...c, levelId: c.levelId || levels?.[0]?.id || '' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <Field label="Title" className="sm:col-span-2">
        <Input required minLength={3} value={c.title} onChange={(e) => setC({ ...c, title: e.target.value, slug: slugTouched ? c.slug : slugify(e.target.value) })} />
      </Field>
      <Field label="URL slug" hint="lowercase-with-dashes">
        <Input required pattern="[a-z0-9-]+" value={c.slug} onChange={(e) => { setSlugTouched(true); setC({ ...c, slug: e.target.value }); }} />
      </Field>
      <Field label="Subtitle"><Input value={c.subtitle ?? ''} onChange={(e) => setC({ ...c, subtitle: e.target.value })} /></Field>
      <Field label="Description" className="sm:col-span-2"><Textarea required rows={3} value={c.description} onChange={(e) => setC({ ...c, description: e.target.value })} /></Field>
      <Field label="Skill">
        <Select value={c.skill} onChange={(e) => setC({ ...c, skill: e.target.value as Skill })}>{SKILLS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}</Select>
      </Field>
      <Field label="Level">
        <Select value={c.levelId} onChange={(e) => setC({ ...c, levelId: e.target.value })} required>
          <option value="">Select…</option>
          {levels?.map((l) => <option key={l.id} value={l.id}>{l.name} · Band {l.band}</option>)}
        </Select>
      </Field>
      <Field label="Sort order"><Input type="number" value={c.order} onChange={(e) => setC({ ...c, order: Number(e.target.value) })} /></Field>
      <div className="flex flex-wrap items-end gap-6 pb-2">
        <Switch checked={c.isPremium} onChange={(v) => setC({ ...c, isPremium: v })} label="Premium" />
        <Switch checked={c.isPublished} onChange={(v) => setC({ ...c, isPublished: v })} label="Published" />
      </div>
      <div className="sm:col-span-2"><Button type="submit" loading={saving}>{submitLabel}</Button></div>
    </form>
  );
}
