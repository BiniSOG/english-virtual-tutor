'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { Sparkles, Target } from 'lucide-react';
import { PracticeCard } from '@/components/cards';
import { CatalogFilters, useDebounced } from '@/components/filters';
import { Button, EmptyState, ErrorBox, PageHeader, Skeleton } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useFetch } from '@/lib/hooks';
import type { PracticeSummary, Skill } from '@/lib/types';

function PracticeList() {
  const params = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const skill = (params.get('skill') as Skill) || '';
  const level = params.get('level') || '';
  const [q, setQ] = useState('');
  const dq = useDebounced(q);
  const qs = new URLSearchParams();
  if (skill) qs.set('skill', skill);
  if (level) qs.set('level', level);
  if (dq) qs.set('q', dq);
  const { data, loading, error, reload } = useFetch<PracticeSummary[]>(`/practices?${qs}`, [user?.id]);

  const update = (next: { skill?: Skill | ''; level?: string; q?: string }) => {
    if (next.q !== undefined) return setQ(next.q);
    const p = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) v ? p.set(k, v) : p.delete(k);
    router.replace(`/practice?${p}`, { scroll: false });
  };

  return (
    <div className="container-page py-10">
      <PageHeader
        eyebrow="Practice library"
        title="Practise every skill"
        text="Instant-feedback exercises for grammar, vocabulary, reading and listening — plus AI-graded speaking and writing tasks."
        actions={
          <Button href="/tests" variant="dark">
            <Sparkles className="h-4 w-4 text-gold-300" /> Generate an AI test
          </Button>
        }
      />
      <div className="mt-8">
        <CatalogFilters skill={skill} level={level} q={q} onChange={update} />
      </div>
      <div className="mt-8">
        {error ? (
          <ErrorBox message={error.message} onRetry={reload} />
        ) : loading && !data ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-52" />)}
          </div>
        ) : data?.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.map((p) => <PracticeCard key={p.id} p={p} />)}
          </div>
        ) : (
          <EmptyState icon={<Target className="h-6 w-6" />} title="No exercises here yet" text="Try another filter, or generate a fresh AI test." action={<Button href="/tests">Create AI test</Button>} />
        )}
      </div>
    </div>
  );
}

export default function PracticePage() {
  return (
    <Suspense>
      <PracticeList />
    </Suspense>
  );
}
