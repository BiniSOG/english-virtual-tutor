'use client';

import { useState } from 'react';
import { MessagesSquare, Mic, Shuffle } from 'lucide-react';
import { SpeakingTask } from '@/components/speaking-task';
import { Button, Chip, PageHeader } from '@/components/ui';
import { VoiceTutor } from '@/components/voice-tutor';
import { pick, SPEAKING_BANK } from '@/lib/question-bank';
import { cn } from '@/lib/utils';

type Part = keyof typeof SPEAKING_BANK;

export default function SpeakingPage() {
  const [tab, setTab] = useState<'tutor' | 'test'>('tutor');
  const [part, setPart] = useState<Part>('PART_1');
  const [question, setQuestion] = useState<string>(SPEAKING_BANK.PART_1[0]);

  return (
    <div className="container-page py-10">
      <PageHeader
        eyebrow="Speaking studio"
        title="Speak English out loud — with AI that listens"
        text="Have a live voice conversation with Teacher Hana, or take an IELTS-style speaking test and get your band score with pronunciation coaching."
      />
      <div className="mt-6 inline-flex rounded-2xl bg-slate-100 p-1">
        {[
          { k: 'tutor', l: 'AI voice tutor', i: MessagesSquare },
          { k: 'test', l: 'IELTS speaking test', i: Mic },
        ].map((t) => (
          <button
            key={t.k}
            onClick={() => setTab(t.k as 'tutor' | 'test')}
            className={cn('inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition', tab === t.k ? 'bg-white text-slate-900 shadow' : 'text-slate-600')}
          >
            <t.i className="h-4 w-4" /> {t.l}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === 'tutor' ? (
          <VoiceTutor />
        ) : (
          <div className="mx-auto max-w-4xl">
            <div className="mb-5 flex flex-wrap items-center gap-2">
              {(['PART_1', 'PART_2', 'PART_3'] as Part[]).map((p) => (
                <Chip
                  key={p}
                  active={part === p}
                  onClick={() => {
                    setPart(p);
                    setQuestion(SPEAKING_BANK[p][0]);
                  }}
                >
                  {p.replace('_', ' ')}
                </Chip>
              ))}
              <Button variant="ghost" size="sm" onClick={() => setQuestion(pick(SPEAKING_BANK[part], question as never))}>
                <Shuffle className="h-4 w-4" /> New question
              </Button>
            </div>
            <SpeakingTask key={question} prompt={question} part={part} prepSeconds={part === 'PART_2' ? 60 : 0} maxSeconds={part === 'PART_2' ? 150 : 120} />
          </div>
        )}
      </div>
    </div>
  );
}
