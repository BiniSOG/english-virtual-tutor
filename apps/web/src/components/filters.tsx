'use client';

import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { useFetch } from '@/lib/hooks';
import { SKILLS } from '@/lib/skills';
import type { Level, Skill } from '@/lib/types';
import { Chip } from './ui';

export function CatalogFilters({
  skill,
  level,
  q,
  onChange,
  skills = SKILLS.map((s) => s.key),
}: {
  skill: Skill | '';
  level: string;
  q: string;
  onChange: (next: { skill?: Skill | ''; level?: string; q?: string }) => void;
  skills?: Skill[];
}) {
  const { data: levels } = useFetch<Level[]>('/levels');
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => onChange({ q: e.target.value })}
            placeholder="Search…"
            className="h-10 w-full rounded-full border border-slate-200 bg-white pr-4 pl-10 text-sm focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 focus:outline-none"
          />
        </div>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          <Chip active={!level} onClick={() => onChange({ level: '' })}>
            All levels
          </Chip>
          {levels?.map((l) => (
            <Chip key={l.id} active={level === l.code} onClick={() => onChange({ level: l.code })}>
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: l.color }} /> {l.name}
            </Chip>
          ))}
        </div>
      </div>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        <Chip active={!skill} onClick={() => onChange({ skill: '' })}>
          All skills
        </Chip>
        {SKILLS.filter((s) => skills.includes(s.key)).map((s) => {
          const Icon = s.icon;
          return (
            <Chip key={s.key} active={skill === s.key} onClick={() => onChange({ skill: s.key })}>
              <Icon className="h-4 w-4" /> {s.label}
            </Chip>
          );
        })}
      </div>
    </div>
  );
}

export function useDebounced<T>(value: T, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}
