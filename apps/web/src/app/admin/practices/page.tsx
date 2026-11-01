'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Crown, Plus } from 'lucide-react';
import { Table, Td, Th } from '@/components/admin/table';
import { LevelBadge } from '@/components/cards';
import { Badge, Button, Chip, EmptyState, ErrorBox, PageHeader, Skeleton } from '@/components/ui';
import { useFetch } from '@/lib/hooks';
import { SKILLS, skillMeta, typeLabel } from '@/lib/skills';
import type { Level, PracticeType, Skill } from '@/lib/types';
import { formatDate } from '@/lib/utils';

interface AdminPractice {
  id: string; title: string; skill: Skill; type: PracticeType; level: Level; isPremium: boolean; isPublished: boolean;
  questions: unknown[]; createdAt: string; lesson: { title: string } | null; _count: { attempts: number };
}

export default function AdminPractices() {
  const [skill, setSkill] = useState<Skill | ''>('');
  const { data, loading, error, reload } = useFetch<AdminPractice[]>(`/admin/practices${skill ? `?skill=${skill}` : ''}`);
  return (
    <div className="space-y-6">
      <PageHeader title="Practices & tests" text="Exercises for every skill. Use AI to draft new sets in seconds." actions={<Button href="/admin/practices/new"><Plus className="h-4 w-4" /> New practice</Button>} />
      <div className="flex gap-2 overflow-x-auto">
        <Chip active={!skill} onClick={() => setSkill('')}>All</Chip>
        {SKILLS.map((s) => <Chip key={s.key} active={skill === s.key} onClick={() => setSkill(s.key)}>{s.label}</Chip>)}
      </div>
      {error ? <ErrorBox message={error.message} onRetry={reload} /> : loading && !data ? <Skeleton className="h-96" /> : !data?.length ? (
        <EmptyState title="No practices yet" action={<Button href="/admin/practices/new">Create one</Button>} />
      ) : (
        <Table>
          <thead><tr><Th>Title</Th><Th>Skill / type</Th><Th>Level</Th><Th>Items</Th><Th>Attempts</Th><Th>Status</Th><Th>Created</Th></tr></thead>
          <tbody>
            {data.map((p) => {
              const m = skillMeta(p.skill);
              return (
                <tr key={p.id} className="hover:bg-slate-50">
                  <Td>
                    <Link href={`/admin/practices/${p.id}`} className="font-semibold text-slate-900 hover:text-brand-700">{p.title}</Link>
                    {p.lesson && <p className="text-xs text-slate-400">Lesson: {p.lesson.title}</p>}
                  </Td>
                  <Td className="whitespace-nowrap"><span className="inline-flex items-center gap-1.5"><m.icon className="h-4 w-4" style={{ color: m.color }} /> {m.label}</span><p className="text-xs text-slate-400">{typeLabel(p.type)}</p></Td>
                  <Td><LevelBadge level={p.level} /></Td>
                  <Td>{Array.isArray(p.questions) && p.questions.length ? p.questions.length : '—'}</Td>
                  <Td>{p._count.attempts}</Td>
                  <Td><div className="flex gap-1">{p.isPublished ? <Badge tone="brand">Live</Badge> : <Badge>Draft</Badge>}{p.isPremium && <Badge tone="gold"><Crown className="h-3 w-3" /></Badge>}</div></Td>
                  <Td className="whitespace-nowrap">{formatDate(p.createdAt)}</Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </div>
  );
}
