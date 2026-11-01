'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bot, Keyboard, Languages, Loader2, RotateCcw, Send, Sparkles, Volume2, VolumeX } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { Quota } from '@/lib/types';
import { blobToBase64, cn } from '@/lib/utils';
import { speak, stopSpeaking, useRecorder, useSpeechRecognition, type Accent } from '@/lib/voice';
import { handleAiError } from './ai-error';
import { LoginGate } from './gates';
import { MicButton } from './speaking-task';
import { Button, Card, Select, Switch } from './ui';

interface Msg {
  role: 'user' | 'model';
  text: string;
  corrections?: { original: string; corrected: string; explanation: string }[];
  pronunciationTip?: string | null;
  amharicHelp?: string | null;
}

const SCENARIOS = [
  { key: 'free', label: '💬 Free conversation', greet: (n: string) => `Hi ${n}! I'm Teacher Hana. What would you like to talk about today? You can tell me about your day, your studies or your plans.` },
  { key: 'ielts_part1', label: '🎓 IELTS Speaking Part 1', greet: () => `Good morning. My name is Hana and I'll be your examiner today. Let's begin with some questions about you. Can you tell me where you are from?` },
  { key: 'ielts_part2', label: '🗂️ IELTS Speaking Part 2', greet: () => `In this part, I'm going to give you a topic and I'd like you to talk about it for one to two minutes. Are you ready to receive your cue card?` },
  { key: 'ielts_part3', label: '🧠 IELTS Speaking Part 3', greet: () => `Let's discuss some more general questions. To start: why do you think so many young people today want to study abroad?` },
  { key: 'job_interview', label: '💼 Job interview', greet: (n: string) => `Welcome, ${n}, and thank you for coming in today. Could you start by telling me a little about yourself and why you applied for this position?` },
  { key: 'travel', label: '✈️ Travel & airport', greet: () => `Good evening and welcome to Bole International Airport. May I see your passport and ticket, please? Where are you flying to today?` },
  { key: 'university', label: '🏛️ University life', greet: () => `Hi! I'm your scholarship interviewer. Can you tell me which program you're applying for and why it interests you?` },
];

export function VoiceTutor() {
  const { user } = useAuth();
  const router = useRouter();
  const [scenario, setScenario] = useState('free');
  const [messages, setMessages] = useState<Msg[]>([]);
  const [amharic, setAmharic] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [accent, setAccent] = useState<Accent>('en-GB');
  const [typing, setTyping] = useState(false);
  const [text, setText] = useState('');
  const [thinking, setThinking] = useState(false);
  const [quota, setQuota] = useState<Quota | null>(null);
  const rec = useRecorder(90);
  const sr = useSpeechRecognition();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    const sc = SCENARIOS.find((s) => s.key === scenario)!;
    const greet = sc.greet(user.name.split(' ')[0]);
    setMessages([{ role: 'model', text: greet }]);
    if (autoSpeak) speak(greet, { accent, gender: 'female' });
    return () => stopSpeaking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenario, user?.id]);

  useEffect(() => {
    if (user) api<Quota>('/ai/quota').then(setQuota).catch(() => undefined);
  }, [user, messages.length]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, thinking]);

  if (!user) return <LoginGate title="Sign in to talk with Teacher Hana" text="Have real spoken conversations with an AI tutor that listens to your voice and corrects you kindly." />;

  async function send(payload: { message?: string; audio?: string; mimeType?: string }) {
    setThinking(true);
    const history = messages.slice(-20).map(({ role, text }) => ({ role, text }));
    const pending: Msg = { role: 'user', text: payload.message || '🎙️ …' };
    setMessages((m) => [...m, pending]);
    try {
      const res = await api<{
        transcript: string;
        reply: string;
        corrections: Msg['corrections'];
        pronunciationTip: string | null;
        amharicHelp: string | null;
      }>('/ai/tutor/chat', { body: { history, ...payload, scenario, explainInAmharic: amharic } });
      setMessages((m) => [
        ...m.slice(0, -1),
        { role: 'user', text: res.transcript || payload.message || '(audio)', corrections: res.corrections, pronunciationTip: res.pronunciationTip },
        { role: 'model', text: res.reply, amharicHelp: res.amharicHelp },
      ]);
      if (autoSpeak) speak(res.reply, { accent, gender: 'female' });
    } catch (e) {
      setMessages((m) => m.slice(0, -1));
      handleAiError(e, router);
    } finally {
      setThinking(false);
    }
  }

  async function toggleMic() {
    if (rec.state === 'recording') {
      sr.stop();
      const blob = await rec.stop();
      if (!blob || blob.size < 1500) return;
      const audio = await blobToBase64(blob);
      const live = sr.transcript;
      rec.reset();
      sr.setTranscript('');
      await send({ audio, mimeType: blob.type, message: live || undefined });
    } else {
      stopSpeaking();
      const ok = await rec.start();
      if (ok && sr.supported) sr.start();
    }
  }

  async function sendText(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    const t = text.trim();
    setText('');
    await send({ message: t });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <Card className="flex h-[calc(100vh-14rem)] min-h-[560px] flex-col overflow-hidden">
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
          <div className="relative flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white">
            <Bot className="h-5 w-5" />
            <span className="absolute right-0 bottom-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-slate-900">Teacher Hana</p>
            <p className="truncate text-xs text-slate-500">{thinking ? 'Thinking…' : SCENARIOS.find((s) => s.key === scenario)?.label}</p>
          </div>
          <button onClick={() => setAutoSpeak((a) => !a)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" title={autoSpeak ? 'Mute tutor voice' : 'Unmute tutor voice'}>
            {autoSpeak ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50/50 p-4 sm:p-6">
          {messages.map((m, i) => (
            <div key={i} className={cn('flex flex-col gap-2', m.role === 'user' ? 'items-end' : 'items-start')}>
              <div
                className={cn(
                  'group relative max-w-[88%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed shadow-sm',
                  m.role === 'user' ? 'rounded-tr-sm bg-brand-600 text-white' : 'rounded-tl-sm bg-white text-slate-800',
                )}
              >
                {m.text}
                {m.role === 'model' && (
                  <button onClick={() => speak(m.text, { accent, gender: 'female' })} className="ml-2 inline-flex align-middle text-brand-600 opacity-60 hover:opacity-100" aria-label="Replay">
                    <Volume2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              {m.corrections && m.corrections.length > 0 && (
                <div className="max-w-[88%] rounded-2xl border border-gold-200 bg-gold-50 px-4 py-3 text-sm text-slate-700">
                  <p className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-gold-600"><Sparkles className="h-3.5 w-3.5" /> Corrections</p>
                  {m.corrections.map((c, j) => (
                    <p key={j} className="mb-1">
                      <span className="text-rose-600 line-through">{c.original}</span> → <b className="text-brand-700">{c.corrected}</b>
                      <span className="block text-xs text-slate-500">{c.explanation}</span>
                    </p>
                  ))}
                </div>
              )}
              {m.pronunciationTip && (
                <div className="max-w-[88%] rounded-2xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm text-sky-900">🗣️ {m.pronunciationTip}</div>
              )}
              {m.amharicHelp && (
                <div className="font-ethiopic max-w-[88%] rounded-2xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm text-violet-900">
                  <Languages className="mr-1 inline h-4 w-4" /> {m.amharicHelp}
                </div>
              )}
            </div>
          ))}
          {thinking && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Teacher Hana is listening…
            </div>
          )}
          <div ref={endRef} />
        </div>

        <div className="border-t border-slate-100 bg-white p-4">
          {(rec.state === 'recording' || sr.transcript) && (
            <p className="mb-3 truncate rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600 italic">{sr.transcript || 'Listening…'}</p>
          )}
          {rec.error && <p className="mb-3 text-sm text-rose-600">{rec.error}</p>}
          {typing ? (
            <form onSubmit={sendText} className="flex gap-2">
              <button type="button" onClick={() => setTyping(false)} className="rounded-xl border border-slate-200 px-3 text-slate-600" aria-label="Use voice">
                🎙️
              </button>
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type your answer…"
                className="h-12 flex-1 rounded-xl border border-slate-200 px-4 focus:border-brand-500 focus:outline-none"
                disabled={thinking}
                autoFocus
              />
              <Button type="submit" size="icon" className="h-12 w-12" disabled={thinking || !text.trim()} aria-label="Send">
                <Send className="h-5 w-5" />
              </Button>
            </form>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <button onClick={() => setTyping(true)} className="rounded-xl p-3 text-slate-500 hover:bg-slate-100" title="Type instead">
                <Keyboard className="h-5 w-5" />
              </button>
              <div className="flex flex-col items-center">
                <MicButton size="md" recording={rec.state === 'recording'} level={rec.level} onClick={toggleMic} disabled={thinking || rec.state === 'requesting'} />
                <span className="mt-1.5 text-xs font-medium text-slate-500">
                  {rec.state === 'recording' ? `Tap to send · ${rec.seconds}s` : thinking ? 'Please wait…' : 'Tap and speak'}
                </span>
              </div>
              <button
                onClick={() => {
                  stopSpeaking();
                  const sc = SCENARIOS.find((s) => s.key === scenario)!;
                  setMessages([{ role: 'model', text: sc.greet(user.name.split(' ')[0]) }]);
                }}
                className="rounded-xl p-3 text-slate-500 hover:bg-slate-100"
                title="Restart conversation"
              >
                <RotateCcw className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
      </Card>

      <div className="space-y-4">
        <Card className="space-y-4 p-5">
          <div>
            <p className="mb-1.5 text-sm font-semibold text-slate-700">Scenario</p>
            <Select value={scenario} onChange={(e) => setScenario(e.target.value)}>
              {SCENARIOS.map((s) => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </Select>
          </div>
          <div>
            <p className="mb-1.5 text-sm font-semibold text-slate-700">Tutor accent</p>
            <Select value={accent} onChange={(e) => setAccent(e.target.value as Accent)}>
              <option value="en-GB">🇬🇧 British</option>
              <option value="en-US">🇺🇸 American</option>
              <option value="en-AU">🇦🇺 Australian</option>
            </Select>
          </div>
          <Switch checked={amharic} onChange={setAmharic} label="Help in Amharic" />
        </Card>
        {quota && (
          <Card className="p-5">
            <p className="text-sm font-semibold text-slate-700">AI sessions today</p>
            <p className="mt-1 text-2xl font-extrabold text-slate-900">
              {quota.remaining} <span className="text-sm font-medium text-slate-500">of {quota.limit} left</span>
            </p>
            {!quota.isPremium && (
              <Button href="/pricing" variant="gold" size="sm" className="mt-3 w-full">Get more with Premium</Button>
            )}
          </Card>
        )}
        <Card className="p-5 text-sm text-slate-600">
          <p className="mb-2 font-semibold text-slate-900">Tips</p>
          <ul className="list-disc space-y-1 pl-4">
            <li>Speak in full sentences — aim for 15–30 seconds.</li>
            <li>Don’t worry about mistakes. Hana will correct you gently.</li>
            <li>Use headphones to avoid echo.</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
