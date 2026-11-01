'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Crown, Plus } from 'lucide-react';
import { CourseForm, type CourseInput } from '@/components/admin/course-form';
import { Table, Td, Th } from '@/components/admin/table';
import { LevelBadge } from '@/components/cards';
import { Badge, Button, Chip, EmptyState, ErrorBox, Modal, PageHeader, Skeleton } from '@/components/ui';
import { api } from '@/lib/api';
import { useFetch } from '@/lib/hooks';
import { SKILLS, skillMeta } from '@/lib/skills';
import type { Level, Skill } from '@/lib/types';
import { formatDate } from '@/lib/utils';

interface AdminCourse { id: string; slug: string; title: string; skill: Skill; level: Level; isPremium: boolean; isPublished: boolean; updatedAt: string; _count: { lessons: number } }

export default function AdminCourses() {
  const router = useRouter();
  const [skill, setSkill] = useState<Skill | ''>('');
  const { data, loading, error, reload } = useFetch<AdminCourse[]>(`/admin/courses${skill ? `?skill=${skill}` : ''}`);
  const [creating, setCreating] = useState(false);

  async function create(c: CourseInput) {
    try {
      const created = await api<{ id: string }>('/admin/courses', { body: c });
      toast.success('Course created');
      router.push(`/admin/courses/${created.id}`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Courses & lessons" text="Create courses for each skill and level, then add lessons." actions={<Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> New course</Button>} />
      <div className="flex gap-2 overflow-x-auto">
        <Chip active={!skill} onClick={() => setSkill('')}>All</Chip>
        {SKILLS.map((s) => <Chip key={s.key} active={skill === s.key} onClick={() => setSkill(s.key)}>{s.label}</Chip>)}
      </div>
      {error ? <ErrorBox message={error.message} onRetry={reload} /> : loading && !data ? <Skeleton className="h-96" /> : !data?.length ? (
        <EmptyState title="No courses yet" action={<Button onClick={() => setCreating(true)}>Create the first course</Button>} />
      ) : (
        <Table>
          <thead><tr><Th>Course</Th><Th>Skill</Th><Th>Level</Th><Th>Lessons</Th><Th>Status</Th><Th>Updated</Th></tr></thead>
          <tbody>
            {data.map((c) => {
              const m = skillMeta(c.skill);
              return (
                <tr key={c.id} className="hover:bg-slate-50">
                  <Td><Link href={`/admin/courses/${c.id}`} className="font-semibold text-slate-900 hover:text-brand-700">{c.title}</Link><p className="text-xs text-slate-400">/{c.slug}</p></Td>
                  <Td><span className="inline-flex items-center gap-1.5"><m.icon className="h-4 w-4" style={{ color: m.color }} /> {m.label}</span></Td>
                  <Td><LevelBadge level={c.level} /></Td>
                  <Td>{c._count.lessons}</Td>
                  <Td>
                    <div className="flex gap-1">
                      {c.isPublished ? <Badge tone="brand">Published</Badge> : <Badge>Draft</Badge>}
                      {c.isPremium && <Badge tone="gold"><Crown className="h-3 w-3" /></Badge>}
                    </div>
                  </Td>
                  <Td className="whitespace-nowrap">{formatDate(c.updatedAt)}</Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
      <Modal open={creating} onClose={() => setCreating(false)} title="New course" wide>
        <CourseForm onSubmit={create} submitLabel="Create course" />
      </Modal>
    </div>
  );
}
