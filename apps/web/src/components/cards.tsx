import Link from 'next/link';
import { ArrowRight, BookOpen, CheckCircle2, Clock, Crown, Lock } from 'lucide-react';
import { skillMeta, typeLabel } from '@/lib/skills';
import type { CourseSummary, Level, PracticeSummary } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Badge, Card } from './ui';

export function LevelBadge({ level, className }: { level: Pick<Level, 'name' | 'band' | 'color' | 'cefr'>; className?: string }) {
  return (
    <span
      className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold', className)}
      style={{ backgroundColor: `${level.color}14`, color: level.color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: level.color }} />
      {level.name} · Band {level.band}
    </span>
  );
}

export function CourseCard({ course }: { course: CourseSummary }) {
  const s = skillMeta(course.skill);
  const Icon = s.icon;
  return (
    <Link href={`/courses/${course.slug}`} className="group block h-full">
      <Card className="flex h-full flex-col overflow-hidden transition duration-200 group-hover:-translate-y-1 group-hover:shadow-lift">
        <div className="relative h-36 overflow-hidden" style={{ background: `linear-gradient(135deg, ${s.color}22, ${s.color}08)` }}>
          <div className="absolute inset-0 bg-grid opacity-60" />
          <Icon className="absolute -right-4 -bottom-6 h-36 w-36 opacity-15 transition duration-300 group-hover:scale-110" style={{ color: s.color }} />
          <div className="absolute top-4 left-4 flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm">
              <Icon className="h-5 w-5" style={{ color: s.color }} />
            </span>
            <span className="text-sm font-semibold" style={{ color: s.color }}>
              {s.label}
            </span>
          </div>
          <div className="absolute top-4 right-4">
            {course.isPremium ? (
              <Badge tone="gold">
                {course.locked ? <Lock className="h-3 w-3" /> : <Crown className="h-3 w-3" />} Premium
              </Badge>
            ) : (
              <Badge tone="brand">Free</Badge>
            )}
          </div>
        </div>
        <div className="flex flex-1 flex-col p-5">
          <LevelBadge level={course.level} />
          <h3 className="mt-3 text-lg leading-snug font-bold text-slate-900 group-hover:text-brand-700">{course.title}</h3>
          {course.subtitle && <p className="mt-1 line-clamp-2 text-sm text-slate-600">{course.subtitle}</p>}
          <div className="mt-auto flex items-center justify-between pt-5 text-sm text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <BookOpen className="h-4 w-4" /> {course.lessonCount} lessons
            </span>
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1 group-hover:text-brand-600" />
          </div>
        </div>
      </Card>
    </Link>
  );
}

export function PracticeCard({ p }: { p: PracticeSummary }) {
  const s = skillMeta(p.skill);
  const Icon = s.icon;
  return (
    <Link href={`/practice/${p.id}`} className="group block h-full">
      <Card className="flex h-full flex-col p-5 transition duration-200 group-hover:-translate-y-0.5 group-hover:shadow-lift">
        <div className="flex items-start justify-between gap-3">
          <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', s.bg)}>
            <Icon className="h-5 w-5" style={{ color: s.color }} />
          </span>
          <div className="flex flex-wrap justify-end gap-1.5">
            {p.bestScore != null && (
              <Badge tone="brand">
                <CheckCircle2 className="h-3 w-3" /> {Math.round(p.bestScore)}%
              </Badge>
            )}
            {p.isPremium && (
              <Badge tone="gold">
                {p.locked ? <Lock className="h-3 w-3" /> : <Crown className="h-3 w-3" />} Premium
              </Badge>
            )}
          </div>
        </div>
        <h3 className="mt-4 font-bold text-slate-900 group-hover:text-brand-700">{p.title}</h3>
        {p.description && <p className="mt-1 line-clamp-2 text-sm text-slate-600">{p.description}</p>}
        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-2 pt-4 text-xs text-slate-500">
          <LevelBadge level={p.level} />
          <span>{typeLabel(p.type)}</span>
          {p.questionCount > 0 && <span>{p.questionCount} questions</span>}
          {p.timeLimitMin && (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" /> {p.timeLimitMin} min
            </span>
          )}
        </div>
      </Card>
    </Link>
  );
}
