import { PracticeQuestion } from '../common/types';

/** Defensive normalisation of LLM JSON so the client never receives malformed shapes. */
export const arr = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
export const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : v == null ? fallback : String(v));
export const band = (v: unknown): number => {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(9, Math.round(n * 2) / 2));
};

export function criteria(v: unknown, names: string[]) {
  const list = arr<{ name?: unknown; band?: unknown; feedback?: unknown }>(v);
  return names.map((name, i) => {
    const key = name.split(' ')[0].toLowerCase();
    const match = list.find((c) => str(c?.name).toLowerCase().includes(key)) ?? list[i];
    return { name, band: band(match?.band), feedback: str(match?.feedback) };
  });
}

export const fixes = (v: unknown) =>
  arr<Record<string, unknown>>(v)
    .map((m) => ({ original: str(m?.original), correction: str(m?.correction ?? m?.corrected), explanation: str(m?.explanation) }))
    .filter((m) => m.original || m.correction);

export const strings = (v: unknown) => arr<unknown>(v).map((s) => str(s)).filter(Boolean);

/**
 * Normalises generated questions: coerces option answers given as letters ("B"),
 * option text, or numeric strings into a 0-based index; drops broken items.
 */
export function questions(v: unknown): PracticeQuestion[] {
  const out: PracticeQuestion[] = [];
  for (const raw of arr<Record<string, unknown>>(v)) {
    const question = str(raw?.question).trim();
    if (!question) continue;
    const options = arr<unknown>(raw?.options).map((o) => str(o).trim()).filter(Boolean);
    const explanation = str(raw?.explanation) || undefined;
    const b = raw?.band != null && Number.isFinite(Number(raw.band)) ? Number(raw.band) : undefined;
    if (options.length >= 2) {
      let idx = -1;
      const a = raw?.answer;
      if (typeof a === 'number' || /^\d+$/.test(str(a).trim())) idx = Number(a);
      else if (/^[A-Fa-f]$/.test(str(a).trim())) idx = str(a).trim().toUpperCase().charCodeAt(0) - 65;
      else idx = options.findIndex((o) => o.toLowerCase() === str(a).trim().toLowerCase());
      if (idx < 0 || idx >= options.length) continue;
      out.push({ id: `q${out.length + 1}`, question, options, answer: idx, explanation, band: b });
    } else {
      const answer = str(raw?.answer).trim();
      if (!answer) continue;
      out.push({ id: `q${out.length + 1}`, question, answer, explanation, band: b });
    }
  }
  return out;
}
