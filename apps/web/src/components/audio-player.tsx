'use client';

import { useEffect, useState } from 'react';
import { Eye, EyeOff, Headphones, Pause, Play, RotateCcw } from 'lucide-react';
import { speak, stopSpeaking, type Accent } from '@/lib/voice';
import { cn } from '@/lib/utils';
import { Card } from './ui';

/**
 * Listening player powered by the browser's text-to-speech. Dialogues with "Speaker:" labels
 * are read line by line, alternating voices.
 */
export function ListeningPlayer({ script, allowTranscript = true, title = 'Listening audio' }: { script: string; allowTranscript?: boolean; title?: string }) {
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(0.95);
  const [accent, setAccent] = useState<Accent>('en-GB');
  const [showText, setShowText] = useState(false);
  const [plays, setPlays] = useState(0);
  const [line, setLine] = useState(-1);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    setSupported(typeof window !== 'undefined' && 'speechSynthesis' in window);
    return () => stopSpeaking();
  }, []);

  const lines = script
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);

  const play = async () => {
    setPlaying(true);
    setPlays((p) => p + 1);
    const speakers: string[] = [];
    let cancelled = false;
    const onCancel = () => (cancelled = true);
    window.addEventListener('lisan-stop-audio', onCancel, { once: true });
    for (let i = 0; i < lines.length; i++) {
      if (cancelled) break;
      setLine(i);
      const m = lines[i].match(/^([A-Z][\w .']{0,24}):\s*(.*)$/);
      let text = lines[i];
      let gender: 'female' | 'male' | undefined;
      if (m) {
        if (!speakers.includes(m[1])) speakers.push(m[1]);
        gender = speakers.indexOf(m[1]) % 2 === 0 ? 'female' : 'male';
        text = m[2];
      }
      await speak(text, { rate, accent, gender });
    }
    window.removeEventListener('lisan-stop-audio', onCancel);
    setLine(-1);
    setPlaying(false);
  };

  const stop = () => {
    window.dispatchEvent(new Event('lisan-stop-audio'));
    stopSpeaking();
    setPlaying(false);
    setLine(-1);
  };

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center gap-4 bg-gradient-to-r from-pink-50 via-white to-white p-5">
        <button
          onClick={playing ? stop : play}
          disabled={!supported}
          className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-pink-600 text-white shadow-lg shadow-pink-600/30 transition hover:bg-pink-700 disabled:opacity-50"
          aria-label={playing ? 'Stop' : 'Play'}
        >
          {playing && <span className="absolute inset-0 rounded-full bg-pink-500 animate-pulse-ring" />}
          {playing ? <Pause className="relative h-6 w-6" /> : <Play className="relative ml-0.5 h-6 w-6" />}
        </button>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 font-semibold text-slate-900">
            <Headphones className="h-4 w-4 text-pink-600" /> {title}
          </p>
          <p className="text-xs text-slate-500">
            {supported ? (playing ? 'Playing… listen carefully' : plays ? `Played ${plays}× — in the real test you hear it once` : 'Press play when you are ready') : 'Audio is not supported in this browser'}
          </p>
          {playing && (
            <div className="mt-2 flex h-5 items-end gap-0.5">
              {Array.from({ length: 28 }).map((_, i) => (
                <span key={i} className="w-1 animate-pulse rounded-full bg-pink-400" style={{ height: `${20 + ((i * 37) % 80)}%`, animationDelay: `${(i % 7) * 0.12}s` }} />
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <select value={accent} onChange={(e) => setAccent(e.target.value as Accent)} disabled={playing} className="h-9 rounded-lg border border-slate-200 bg-white px-2">
            <option value="en-GB">🇬🇧 British</option>
            <option value="en-US">🇺🇸 American</option>
            <option value="en-AU">🇦🇺 Australian</option>
          </select>
          <select value={rate} onChange={(e) => setRate(Number(e.target.value))} disabled={playing} className="h-9 rounded-lg border border-slate-200 bg-white px-2">
            <option value={0.75}>0.75×</option>
            <option value={0.95}>1×</option>
            <option value={1.15}>1.25×</option>
          </select>
          {plays > 0 && !playing && (
            <button onClick={play} className="flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-slate-700 hover:bg-slate-50">
              <RotateCcw className="h-4 w-4" /> Replay
            </button>
          )}
          {allowTranscript && (
            <button onClick={() => setShowText((s) => !s)} className="flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-slate-700 hover:bg-slate-50">
              {showText ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />} Transcript
            </button>
          )}
        </div>
      </div>
      {showText && (
        <div className="space-y-1.5 border-t border-slate-100 p-5 text-sm leading-relaxed text-slate-700">
          {lines.map((l, i) => (
            <p key={i} className={cn('rounded-lg px-2 py-1 transition', line === i && 'bg-pink-50 text-pink-900')}>
              {l}
            </p>
          ))}
        </div>
      )}
    </Card>
  );
}
