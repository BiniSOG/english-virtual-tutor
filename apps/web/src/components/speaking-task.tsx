'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Hourglass, Loader2, Mic, RotateCcw, Send, Square, Volume2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { fmtTime } from '@/lib/hooks';
import type { SpeakingFeedback } from '@/lib/types';
import { blobToBase64, cn } from '@/lib/utils';
import { speak, useRecorder, useSpeechRecognition } from '@/lib/voice';
import { handleAiError } from './ai-error';
import { SpeakingFeedbackView } from './feedback';
import { LoginGate } from './gates';
import { Button, Card, Switch } from './ui';

export function MicButton({ recording, level, onClick, disabled, size = 'lg' }: { recording: boolean; level: number; onClick: () => void; disabled?: boolean; size?: 'md' | 'lg' }) {
  const dim = size === 'lg' ? 'h-24 w-24' : 'h-16 w-16';
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={recording ? 'Stop recording' : 'Start recording'}
      className={cn(
        'relative flex items-center justify-center rounded-full text-white shadow-xl transition disabled:opacity-50',
        dim,
        recording ? 'bg-rose-600 shadow-rose-600/40 hover:bg-rose-700' : 'bg-brand-600 shadow-brand-600/40 hover:bg-brand-700',
      )}
    >
      {recording && (
        <>
          <span className="absolute inset-0 rounded-full bg-rose-500 animate-pulse-ring" />
          <span className="absolute inset-0 rounded-full bg-rose-400/40 transition-transform duration-75" style={{ transform: `scale(${1 + level * 0.6})` }} />
        </>
      )}
      {recording ? <Square className="relative h-8 w-8 fill-white" /> : <Mic className={cn('relative', size === 'lg' ? 'h-10 w-10' : 'h-7 w-7')} />}
    </button>
  );
}

export function SpeakingTask({
  prompt,
  practiceId,
  part = 'FREE',
  maxSeconds = 150,
  prepSeconds = 0,
}: {
  prompt: string;
  practiceId?: string;
  part?: 'PART_1' | 'PART_2' | 'PART_3' | 'FREE';
  maxSeconds?: number;
  prepSeconds?: number;
}) {
  const { user } = useAuth();
  const router = useRouter();
  const rec = useRecorder(maxSeconds);
  const sr = useSpeechRecognition();
  const [amharic, setAmharic] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fb, setFb] = useState<SpeakingFeedback | null>(null);
  const [prep, setPrep] = useState<number | null>(null);

  useEffect(() => {
    if (prep === null) return;
    if (prep <= 0) {
      setPrep(null);
      void startRec();
      return;
    }
    const t = setTimeout(() => setPrep((p) => (p ?? 1) - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prep]);

  useEffect(() => {
    if (rec.state === 'stopped' && sr.listening) sr.stop();
  }, [rec.state, sr]);

  if (!user) return <LoginGate title="Sign in to get AI speaking feedback" text="Your recording is analysed by Gemini AI for fluency, vocabulary, grammar and pronunciation." />;

  async function startRec() {
    setFb(null);
    const ok = await rec.start();
    if (ok && sr.supported) sr.start();
  }

  async function toggle() {
    if (rec.state === 'recording') {
      sr.stop();
      await rec.stop();
    } else {
      await startRec();
    }
  }

  async function submit() {
    if (!rec.blob) return;
    setLoading(true);
    try {
      const audio = await blobToBase64(rec.blob);
      const res = await api<SpeakingFeedback>('/ai/speaking/evaluate', {
        body: { audio, mimeType: rec.blob.type || rec.mimeType, prompt, practiceId, part, explainInAmharic: amharic },
      });
      setFb(res);
      setTimeout(() => document.getElementById('speaking-feedback')?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (e) {
      handleAiError(e, router);
    } finally {
      setLoading(false);
    }
  }

  const recording = rec.state === 'recording';

  return (
    <div className="space-y-6">
      <Card className="p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <p className="text-xs font-bold tracking-wider text-brand-700 uppercase">Your question</p>
          <button onClick={() => speak(prompt.replace(/[•\n]+/g, '. '), { rate: 0.95 })} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium text-brand-700 hover:bg-brand-50">
            <Volume2 className="h-4 w-4" /> Read aloud
          </button>
        </div>
        <p className="mt-2 text-lg leading-relaxed font-medium whitespace-pre-line text-slate-900">{prompt}</p>

        <div className="mt-8 flex flex-col items-center">
          {prep !== null ? (
            <div className="flex flex-col items-center">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gold-100 text-3xl font-extrabold text-gold-600">{prep}</div>
              <p className="mt-3 flex items-center gap-1.5 text-sm text-slate-600">
                <Hourglass className="h-4 w-4" /> Preparation time — make notes. Recording starts automatically.
              </p>
              <Button variant="ghost" size="sm" className="mt-2" onClick={() => setPrep(0)}>
                Skip & start now
              </Button>
            </div>
          ) : (
            <>
              <MicButton recording={recording} level={rec.level} onClick={toggle} disabled={loading || rec.state === 'requesting'} />
              <p className="mt-4 text-2xl font-bold text-slate-900 tabular-nums">{fmtTime(rec.seconds)}</p>
              <p className="text-sm text-slate-500">
                {recording ? 'Recording… tap to stop' : rec.state === 'stopped' ? 'Recording ready' : `Tap to record (max ${Math.round(maxSeconds / 60)} min)`}
              </p>
              {prepSeconds > 0 && rec.state === 'idle' && (
                <Button variant="outline" size="sm" className="mt-3" onClick={() => setPrep(prepSeconds)}>
                  <Hourglass className="h-4 w-4" /> Start with {prepSeconds}s preparation
                </Button>
              )}
            </>
          )}
          {rec.error && <p className="mt-3 text-sm text-rose-600">{rec.error}</p>}
          {(recording || sr.transcript) && sr.supported && (
            <div className="mt-5 w-full max-w-2xl rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
              <p className="mb-1 text-xs font-semibold text-slate-400 uppercase">Live captions</p>
              {sr.transcript || <span className="italic">Listening…</span>}
            </div>
          )}
        </div>

        {rec.state === 'stopped' && rec.url && (
          <div className="mt-6 flex flex-col items-center gap-4 border-t border-slate-100 pt-6">
            <audio controls src={rec.url} className="w-full max-w-md" />
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Switch checked={amharic} onChange={setAmharic} label="Explain in Amharic" />
              <Button variant="outline" onClick={() => { rec.reset(); sr.setTranscript(''); setFb(null); }} disabled={loading}>
                <RotateCcw className="h-4 w-4" /> Record again
              </Button>
              <Button onClick={submit} loading={loading}>
                <Send className="h-4 w-4" /> Get my band score
              </Button>
            </div>
            {loading && (
              <p className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" /> Teacher Hana is listening to your answer…
              </p>
            )}
          </div>
        )}
      </Card>
      <div id="speaking-feedback">{fb && <SpeakingFeedbackView fb={fb} audioUrl={rec.url} />}</div>
    </div>
  );
}
