import { cn } from '@/lib/utils';

/** Circular IELTS band indicator (0–9). */
export function BandRing({ band, size = 120, label = 'Band', className }: { band: number | null | undefined; size?: number; label?: string; className?: string }) {
  const value = band ?? 0;
  const stroke = size * 0.09;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value / 9));
  const color = value >= 7 ? '#059669' : value >= 5.5 ? '#f59e0b' : '#ef4444';
  return (
    <div className={cn('relative inline-flex items-center justify-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#e2e8f0" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
        />
      </svg>
      <div className="absolute text-center">
        <div className="font-extrabold text-slate-900" style={{ fontSize: size * 0.28, lineHeight: 1 }}>
          {band == null ? '–' : value.toFixed(1)}
        </div>
        <div className="mt-1 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">{label}</div>
      </div>
    </div>
  );
}

export function CriteriaBars({ criteria }: { criteria: { name: string; band: number; feedback: string }[] }) {
  return (
    <div className="space-y-4">
      {criteria.map((c) => (
        <div key={c.name}>
          <div className="mb-1.5 flex items-center justify-between text-sm">
            <span className="font-semibold text-slate-800">{c.name}</span>
            <span className="rounded-md bg-slate-900 px-2 py-0.5 text-xs font-bold text-white">{Number(c.band).toFixed(1)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-emerald-400" style={{ width: `${(c.band / 9) * 100}%` }} />
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{c.feedback}</p>
        </div>
      ))}
    </div>
  );
}
