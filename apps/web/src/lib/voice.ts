'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// ------------------------------------------------------------------ Recorder (MediaRecorder)

function pickMime(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
  return candidates.find((m) => MediaRecorder.isTypeSupported?.(m)) ?? '';
}

export type RecorderState = 'idle' | 'requesting' | 'recording' | 'stopped';

export function useRecorder(maxSeconds = 180) {
  const [state, setState] = useState<RecorderState>('idle');
  const [blob, setBlob] = useState<Blob | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const rec = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const raf = useRef<number | null>(null);
  const audioCtx = useRef<AudioContext | null>(null);
  const resolveStop = useRef<((b: Blob | null) => void) | null>(null);

  const cleanup = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    if (raf.current) cancelAnimationFrame(raf.current);
    stream.current?.getTracks().forEach((t) => t.stop());
    audioCtx.current?.close().catch(() => undefined);
    audioCtx.current = null;
    stream.current = null;
    setLevel(0);
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  const stop = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (!rec.current || rec.current.state === 'inactive') return resolve(null);
      resolveStop.current = resolve;
      rec.current.stop();
    });
  }, []);

  const start = useCallback(async () => {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('Your browser does not support audio recording. Please use Chrome, Edge or Safari.');
      return false;
    }
    setState('requesting');
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      stream.current = s;
      const mimeType = pickMime();
      const r = new MediaRecorder(s, mimeType ? { mimeType, audioBitsPerSecond: 48000 } : undefined);
      chunks.current = [];
      r.ondataavailable = (e) => e.data.size > 0 && chunks.current.push(e.data);
      r.onstop = () => {
        const b = new Blob(chunks.current, { type: r.mimeType || mimeType || 'audio/webm' });
        setBlob(b);
        setUrl((old) => {
          if (old) URL.revokeObjectURL(old);
          return URL.createObjectURL(b);
        });
        setState('stopped');
        cleanup();
        resolveStop.current?.(b);
        resolveStop.current = null;
      };
      rec.current = r;
      r.start(250);
      setSeconds(0);
      setState('recording');

      // live input level meter
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (Ctx) {
        const ctx = new Ctx();
        audioCtx.current = ctx;
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        ctx.createMediaStreamSource(s).connect(analyser);
        const buf = new Uint8Array(analyser.frequencyBinCount);
        const loop = () => {
          analyser.getByteTimeDomainData(buf);
          let sum = 0;
          for (const v of buf) sum += ((v - 128) / 128) ** 2;
          setLevel(Math.min(1, Math.sqrt(sum / buf.length) * 4));
          raf.current = requestAnimationFrame(loop);
        };
        loop();
      }

      timer.current = setInterval(() => {
        setSeconds((sec) => {
          if (sec + 1 >= maxSeconds) r.state !== 'inactive' && r.stop();
          return sec + 1;
        });
      }, 1000);
      return true;
    } catch {
      cleanup();
      setState('idle');
      setError('Microphone access was blocked. Please allow microphone permission and try again.');
      return false;
    }
  }, [cleanup, maxSeconds]);

  const reset = useCallback(() => {
    setBlob(null);
    setUrl((old) => {
      if (old) URL.revokeObjectURL(old);
      return null;
    });
    setSeconds(0);
    setState('idle');
  }, []);

  return { state, blob, url, seconds, level, error, start, stop, reset, mimeType: blob?.type || pickMime() || 'audio/webm' };
}

// ------------------------------------------------------------------ Live speech recognition (Web Speech API)

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
}

export function useSpeechRecognition(lang = 'en-US') {
  const [supported, setSupported] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [listening, setListening] = useState(false);
  const recog = useRef<SpeechRecognitionLike | null>(null);
  const finalText = useRef('');

  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };
    setSupported(!!(w.SpeechRecognition || w.webkitSpeechRecognition));
  }, []);

  const start = useCallback(() => {
    const w = window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) return;
    const r = new Ctor();
    r.lang = lang;
    r.continuous = true;
    r.interimResults = true;
    finalText.current = '';
    setTranscript('');
    r.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) finalText.current += res[0].transcript + ' ';
        else interim += res[0].transcript;
      }
      setTranscript((finalText.current + interim).trim());
    };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    try {
      r.start();
      recog.current = r;
      setListening(true);
    } catch {
      /* already started */
    }
  }, [lang]);

  const stop = useCallback(() => {
    recog.current?.stop();
    recog.current = null;
    setListening(false);
  }, []);

  return { supported, transcript, listening, start, stop, setTranscript };
}

// ------------------------------------------------------------------ Text-to-speech

export type Accent = 'en-GB' | 'en-US' | 'en-AU';

export function useVoices() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const load = () => setVoices(window.speechSynthesis.getVoices().filter((v) => v.lang.startsWith('en')));
    load();
    window.speechSynthesis.addEventListener('voiceschanged', load);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', load);
  }, []);
  return voices;
}

function bestVoice(accent: Accent, gender?: 'female' | 'male'): SpeechSynthesisVoice | undefined {
  const all = window.speechSynthesis.getVoices();
  const matches = all.filter((v) => v.lang.replace('_', '-').startsWith(accent));
  const pool = matches.length ? matches : all.filter((v) => v.lang.startsWith('en'));
  const preferred = pool.find((v) => /natural|neural|google|premium|enhanced/i.test(v.name));
  if (gender) {
    const g = pool.find((v) => (gender === 'female' ? /female|samantha|libby|sonia|aria|jenny|karen|serena/i : /male|daniel|ryan|guy|alex/i).test(v.name));
    if (g) return g;
  }
  return preferred ?? pool[0];
}

export function speak(text: string, opts: { rate?: number; accent?: Accent; gender?: 'female' | 'male'; onBoundary?: (charIndex: number) => void } = {}) {
  return new Promise<void>((resolve) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return resolve();
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const v = bestVoice(opts.accent ?? 'en-GB', opts.gender);
    if (v) u.voice = v;
    u.lang = v?.lang ?? opts.accent ?? 'en-GB';
    u.rate = opts.rate ?? 1;
    u.onend = () => resolve();
    u.onerror = () => resolve();
    if (opts.onBoundary) u.onboundary = (e) => opts.onBoundary!(e.charIndex);
    window.speechSynthesis.speak(u);
  });
}

export function stopSpeaking() {
  if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
}
