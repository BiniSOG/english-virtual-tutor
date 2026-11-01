'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { BookOpen } from 'lucide-react';
import { CourseCard } from '@/components/cards';
import { CatalogFilters, useDebounced } from '@/components/filters';
import { EmptyState, ErrorBox, PageHeader, Skeleton } from '@/components/ui';
import { useFetch } from '@/lib/hooks';
import type { CourseSummary, Skill } from '@/lib/types';

function Courses() {
  const params = useSearchParams();
  const router = useRouter();
  const skill = (params.get('skill') as Skill) || '';
  const level = params.get('level') || '';
  const [q, setQ] = useState('');
  const dq = useDebounced(q);

  const qs = new URLSearchParams();
  if (skill) qs.set('skill', skill);
  if (level) qs.set('level', level);
  if (dq) qs.set('q', dq);
  const { data, loading, error, reload } = useFetch<CourseSummary[]>(`/courses?${qs}`);

  const update = (next: { skill?: Skill | ''; level?: string; q?: string }) => {
    if (next.q !== undefined) return setQ(next.q);
    const p = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) v ? p.set(k, v) : p.delete(k);
    router.replace(`/courses?${p}`, { scroll: false });
  };

  return (
    <div className="container-page py-10">
      <PageHeader eyebrow="Courses" title="Learn step by step" text="Structured courses for every skill and level — from everyday English to Band 8 IELTS. Free lessons are open to everyone." />
      <div className="mt-8">
        <CatalogFilters skill={skill} level={level} q={q} onChange={update} />
      </div>
      <div className="mt-8">
        {error ? (
          <ErrorBox message={error.message} onRetry={reload} />
        ) : loading && !data ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-80" />
            ))}
          </div>
        ) : data?.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {data.map((c) => (
              <CourseCard key={c.id} course={c} />
            ))}
          </div>
        ) : (
          <EmptyState icon={<BookOpen className="h-6 w-6" />} title="No courses found" text="Try a different skill or level." />
        )}
      </div>
    </div>
  );
}

export default function CoursesPage() {
  return (
    <Suspense>
      <Courses />
    </Suspense>
  );
}
