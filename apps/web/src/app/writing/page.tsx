'use client';

import { useState } from 'react';
import { PenSquare, Shuffle } from 'lucide-react';
import { QuotaBadge } from '@/components/quota-badge';
import { Button, Chip, PageHeader, Textarea } from '@/components/ui';
import { WritingTask } from '@/components/writing-task';
import { pick, WRITING_BANK } from '@/lib/question-bank';

type Task = keyof typeof WRITING_BANK;
const META: Record<Task, { label: string; min: number; time: number }> = {
  TASK_2: { label: 'Academic Task 2 · Essay', min: 250, time: 40 },
  TASK_1: { label: 'Academic Task 1 · Report', min: 150, time: 20 },
  GENERAL: { label: 'General Training · Letter', min: 150, time: 20 },
};

export default function WritingPage() {
  const [task, setTask] = useState<Task>('TASK_2');
  const [prompt, setPrompt] = useState<string>(WRITING_BANK.TASK_2[0]);
  const [custom, setCustom] = useState(false);
  const [customText, setCustomText] = useState('');

  const effective = custom ? customText : prompt;
  return (
    <div className="container-page py-10">
      <PageHeader
        eyebrow="Writing studio"
        title="Your personal IELTS writing examiner"
        text="Write your answer and get an instant band score on all four criteria, corrections for every mistake and an improved version of your essay."
        actions={<QuotaBadge />}
      />
      <div className="mt-6 flex flex-wrap items-center gap-2">
        {(Object.keys(META) as Task[]).map((t) => (
          <Chip
            key={t}
            active={task === t && !custom}
            onClick={() => {
              setTask(t);
              setCustom(false);
              setPrompt(WRITING_BANK[t][0]);
            }}
          >
            {META[t].label}
          </Chip>
        ))}
        <Chip active={custom} onClick={() => setCustom(true)}>
          <PenSquare className="h-4 w-4" /> My own question
        </Chip>
        {!custom && (
          <Button variant="ghost" size="sm" onClick={() => setPrompt(pick(WRITING_BANK[task] as readonly string[], prompt))}>
            <Shuffle className="h-4 w-4" /> New question
          </Button>
        )}
      </div>
      {custom && (
        <Textarea
          className="mt-4 min-h-28"
          placeholder="Paste or type any IELTS writing question here…"
          value={customText}
          onChange={(e) => setCustomText(e.target.value)}
        />
      )}
      <div className="mt-6">
        <WritingTask
          key={`${task}-${custom ? 'custom' : prompt}`}
          prompt={effective || '(Write about any topic)'}
          taskType={task}
          minWords={META[task].min}
          timeLimitMin={META[task].time}
          draftKey={custom ? 'custom' : `${task}-${WRITING_BANK[task].indexOf(prompt as never)}`}
        />
      </div>
    </div>
  );
}
