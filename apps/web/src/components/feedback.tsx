'use client';

import { useState } from 'react';
import { ArrowRight, Check, Copy, Languages, Lightbulb, Sparkles, ThumbsUp, Volume2 } from 'lucide-react';
import type { SpeakingFeedback, WritingFeedback } from '@/lib/types';
import { bandLabel } from '@/lib/utils';
import { speak } from '@/lib/voice';
import { BandRing, CriteriaBars } from './band-ring';
import { Card } from './ui';

function ListCard({ title, icon, items, tone }: { title: string; icon: React.ReactNode; items: string[]; tone: 'brand' | 'gold' }) {
  if (!items?.length) return null;
  return (
    <Card className="p-5">
      <h3 className="mb-3 flex items-center gap-2 font-bold text-slate-900">
        {icon} {title}
      </h3>
      <ul className="space-y-2">
        {items.map((s, i) => (
          <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-slate-700">
            <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${tone === 'brand' ? 'bg-brand-500' : 'bg-gold-500'}`} />
            {s}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function Corrections({ title, items }: { title: string; items: { original: string; correction: string; explanation: string }[] }) {
  if (!items?.length) return null;
  return (
    <Card className="p-5">
      <h3 className="mb-4 font-bold text-slate-900">{title}</h3>
      <div className="space-y-3">
        {items.map((m, i) => (
          <div key={i} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3.5">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="rounded-md bg-rose-100 px-2 py-0.5 text-rose-700 line-through decoration-rose-400">{m.original}</span>
              <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
              <span className="rounded-md bg-brand-100 px-2 py-0.5 font-medium text-brand-800">{m.correction}</span>
            </div>
            <p className="mt-2 text-sm text-slate-600">{m.explanation}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function Amharic({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <Card className="border-gold-200 bg-gold-50/60 p-5">
      <h3 className="mb-2 flex items-center gap-2 font-bold text-slate-900">
        <Languages className="h-5 w-5 text-gold-600" /> በአማርኛ ማብራሪያ
      </h3>
      <p className="font-ethiopic leading-loose text-slate-800">{text}</p>
    </Card>
  );
}

function Header({ band, title, subtitle }: { band: number; title: string; subtitle: string }) {
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col items-center gap-6 bg-gradient-to-br from-brand-50 via-white to-gold-50 p-6 sm:flex-row sm:p-8">
        <BandRing band={band} size={136} label="Overall" />
        <div className="text-center sm:text-left">
          <p className="text-sm font-semibold text-brand-700">{title}</p>
          <h2 className="text-3xl font-extrabold text-slate-900">
            Band {band.toFixed(1)} · {bandLabel(band)}
          </h2>
          <p className="mt-1 text-slate-600">{subtitle}</p>
        </div>
      </div>
    </Card>
  );
}

export function WritingFeedbackView({ fb }: { fb: WritingFeedback }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-5 animate-fade-up">
      <Header band={fb.overallBand} title="AI examiner result" subtitle={`${fb.wordCount} words · assessed with IELTS writing band descriptors`} />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="mb-4 font-bold text-slate-900">Band by criterion</h3>
          <CriteriaBars criteria={fb.criteria} />
        </Card>
        <div className="space-y-5">
          <ListCard title="Strengths" icon={<ThumbsUp className="h-5 w-5 text-brand-600" />} items={fb.strengths} tone="brand" />
          <ListCard title="How to improve" icon={<Lightbulb className="h-5 w-5 text-gold-500" />} items={fb.improvements} tone="gold" />
        </div>
      </div>
      <Amharic text={fb.amharicSummary} />
      <Corrections title="Corrections" items={fb.mistakes} />
      {fb.improvedVersion && (
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 font-bold text-slate-900">
              <Sparkles className="h-5 w-5 text-violet-500" /> Improved version (one band higher)
            </h3>
            <button
              onClick={() => {
                navigator.clipboard.writeText(fb.improvedVersion);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-slate-600 hover:bg-slate-100"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <p className="text-sm leading-relaxed whitespace-pre-line text-slate-700">{fb.improvedVersion}</p>
        </Card>
      )}
    </div>
  );
}

export function SpeakingFeedbackView({ fb, audioUrl }: { fb: SpeakingFeedback; audioUrl?: string | null }) {
  return (
    <div className="space-y-5 animate-fade-up">
      <Header band={fb.overallBand} title="AI speaking examiner" subtitle="Assessed on fluency, vocabulary, grammar and pronunciation" />
      <Card className="p-5">
        <h3 className="mb-2 font-bold text-slate-900">What we heard</h3>
        <p className="rounded-xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-700 italic">“{fb.transcript || '…'}”</p>
        {audioUrl && <audio controls src={audioUrl} className="mt-3 w-full" />}
      </Card>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="mb-4 font-bold text-slate-900">Band by criterion</h3>
          <CriteriaBars criteria={fb.criteria} />
        </Card>
        <div className="space-y-5">
          <ListCard title="Strengths" icon={<ThumbsUp className="h-5 w-5 text-brand-600" />} items={fb.strengths} tone="brand" />
          <ListCard title="How to improve" icon={<Lightbulb className="h-5 w-5 text-gold-500" />} items={fb.improvements} tone="gold" />
        </div>
      </div>
      <Amharic text={fb.amharicSummary} />
      {fb.pronunciation?.length > 0 && (
        <Card className="p-5">
          <h3 className="mb-4 font-bold text-slate-900">Pronunciation coach</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {fb.pronunciation.map((p, i) => (
              <div key={i} className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-slate-900">{p.word}</span>
                  <button onClick={() => speak(p.word, { rate: 0.8 })} className="rounded-lg p-1.5 text-brand-700 hover:bg-brand-50" aria-label={`Hear ${p.word}`}>
                    <Volume2 className="h-5 w-5" />
                  </button>
                </div>
                <p className="mt-1 text-sm text-rose-700">{p.issue}</p>
                <p className="mt-1 text-sm text-slate-600">💡 {p.tip}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
      <Corrections title="Grammar fixes" items={fb.grammarFixes} />
      {fb.modelAnswer && (
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-bold text-slate-900">
              <Sparkles className="h-5 w-5 text-violet-500" /> Band 8 model answer
            </h3>
            <button onClick={() => speak(fb.modelAnswer, { rate: 0.95 })} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium text-brand-700 hover:bg-brand-50">
              <Volume2 className="h-4 w-4" /> Listen
            </button>
          </div>
          <p className="text-sm leading-relaxed text-slate-700">{fb.modelAnswer}</p>
        </Card>
      )}
    </div>
  );
}
