import { cn } from '@/lib/utils';

export function Table({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-soft', className)}>
      <table className="w-full text-left text-sm">{children}</table>
    </div>
  );
}
export function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <th className={cn('border-b border-slate-100 bg-slate-50/80 px-4 py-3 text-xs font-semibold tracking-wide whitespace-nowrap text-slate-500 uppercase', className)}>{children}</th>;
}
export function Td({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <td className={cn('border-b border-slate-100 px-4 py-3 align-middle text-slate-700', className)}>{children}</td>;
}

export function StatTile({ label, value, sub, icon, tone = 'brand' }: { label: string; value: React.ReactNode; sub?: string; icon: React.ReactNode; tone?: 'brand' | 'gold' | 'sky' | 'violet' | 'rose' }) {
  const tones = {
    brand: 'bg-brand-50 text-brand-700',
    gold: 'bg-gold-100 text-gold-600',
    sky: 'bg-sky-50 text-sky-700',
    violet: 'bg-violet-50 text-violet-700',
    rose: 'bg-rose-50 text-rose-700',
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <span className={cn('rounded-xl p-2', tones[tone])}>{icon}</span>
      </div>
      <p className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 tabular-nums">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}
