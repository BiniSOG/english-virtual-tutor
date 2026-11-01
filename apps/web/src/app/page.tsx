import Link from 'next/link';
import {
  ArrowRight,
  BadgeCheck,
  Bot,
  CheckCircle2,
  Crown,
  GraduationCap,
  Languages,
  LineChart,
  Mic,
  PenLine,
  Smartphone,
  Sparkles,
  Volume2,
  Wallet,
} from 'lucide-react';
import { buttonClass } from '@/components/ui/button-class';
import { SKILLS } from '@/lib/skills';

const LEVELS = [
  { name: 'Foundation', band: '4.0', cefr: 'A2', color: '#f59e0b', text: 'Everyday English basics' },
  { name: 'Pre-Intermediate', band: '5.0', cefr: 'B1', color: '#10b981', text: 'Confident daily communication' },
  { name: 'Intermediate', band: '6.0', cefr: 'B2', color: '#3b82f6', text: 'University entry level' },
  { name: 'Upper-Intermediate', band: '7.0', cefr: 'C1', color: '#8b5cf6', text: 'Scholarships & careers' },
  { name: 'Advanced', band: '8.0+', cefr: 'C2', color: '#ef4444', text: 'Near-native precision' },
];

const FAQ = [
  ['Is Lisan free?', 'Yes. You can browse courses as a guest, study all free lessons and practise with free exercises. A free account gives you daily AI speaking and writing sessions. Premium unlocks everything with generous AI limits.'],
  ['How does the AI speaking tutor work?', 'You speak into your phone or computer microphone. Google Gemini listens to your actual audio — not just text — and scores you on the four IELTS speaking criteria, including pronunciation, with tips designed for Ethiopian speakers.'],
  ['Can I get explanations in Amharic?', 'Yes. Turn on “Explain in Amharic” and the AI tutor adds a short explanation in Amharic to every piece of feedback.'],
  ['How do I pay for Premium?', 'We use Chapa, so you can pay in Birr with telebirr, CBE Birr, M-Pesa, Amole or a bank card. Premium is activated instantly.'],
  ['Is this the official IELTS?', 'No. Lisan is an independent preparation platform. Our AI estimates your band using the public IELTS band descriptors so you know exactly where you stand before the real exam.'],
];

export default function HomePage() {
  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_70%)]" />
        <div className="absolute -top-40 left-1/2 h-[520px] w-[920px] -translate-x-1/2 rounded-full bg-gradient-to-r from-brand-200/50 via-emerald-100/40 to-gold-100/50 blur-3xl" />
        <div className="container-page relative grid items-center gap-14 pt-14 pb-20 lg:grid-cols-2 lg:pt-24 lg:pb-28">
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white/80 px-3 py-1 text-sm font-medium text-brand-800 shadow-sm">
              <Sparkles className="h-4 w-4 text-gold-500" /> Powered by Gemini AI · Built for Ethiopia 🇪🇹
            </span>
            <h1 className="mt-6 text-4xl leading-[1.08] font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Speak English with <span className="text-gradient">confidence.</span>
              <br /> Reach your IELTS band.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600">
              Lisan is your personal AI English teacher. Practise speaking out loud, get your essays graded like a real IELTS examiner, and follow
              courses from Band 4 to Band 8 — with tips made for Amharic, Afaan Oromo and Tigrinya speakers.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register" className={buttonClass('primary', 'lg')}>
                Start learning free <ArrowRight className="h-5 w-5" />
              </Link>
              <Link href="/speaking" className={buttonClass('outline', 'lg')}>
                <Mic className="h-5 w-5 text-brand-600" /> Try the AI tutor
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-600">
              {['No credit card needed', 'Pay with telebirr', 'Works on any phone'].map((t) => (
                <span key={t} className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-brand-600" /> {t}
                </span>
              ))}
            </div>
          </div>

          {/* Hero visual: mock AI conversation */}
          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <div className="absolute -top-12 -right-4 z-10 hidden rotate-6 rounded-2xl bg-white p-3 shadow-lift sm:block animate-float">
              <p className="text-xs font-semibold text-slate-500">Writing Task 2</p>
              <p className="text-2xl font-extrabold text-brand-700">Band 7.0</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-lift sm:p-6">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="relative flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white">
                  <Bot className="h-5 w-5" />
                  <span className="absolute right-0 bottom-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-400" />
                </div>
                <div>
                  <p className="font-bold text-slate-900">Teacher Hana</p>
                  <p className="text-xs text-slate-500">AI speaking tutor · IELTS Part 1</p>
                </div>
                <span className="ml-auto rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-600">● Live</span>
              </div>
              <div className="space-y-3 py-5 text-sm">
                <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-slate-100 px-4 py-2.5 text-slate-800">
                  Let&apos;s talk about your hometown. Where are you from, and what do you like about it?
                </div>
                <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-brand-600 px-4 py-2.5 text-white">
                  I am from Bahir Dar. I like it because the lake Tana is very beautiful and peoples are friendly.
                </div>
                <div className="rounded-2xl border border-gold-200 bg-gold-50 px-4 py-3 text-slate-700">
                  <p className="mb-1 flex items-center gap-1.5 text-xs font-bold text-gold-600">
                    <Sparkles className="h-3.5 w-3.5" /> Quick correction
                  </p>
                  <p>
                    <span className="text-rose-600 line-through">the lake Tana</span> → <b className="text-brand-700">Lake Tana</b>,{' '}
                    <span className="text-rose-600 line-through">peoples are</span> → <b className="text-brand-700">people are</b>
                  </p>
                </div>
                <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-slate-100 px-4 py-2.5 text-slate-800">
                  Lovely! What do people usually do there at the weekend? <Volume2 className="inline h-4 w-4 text-brand-600" />
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
                <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-rose-600 text-white">
                  <span className="absolute inset-0 rounded-full bg-rose-500 animate-pulse-ring" />
                  <Mic className="relative h-5 w-5" />
                </div>
                <div className="flex h-8 flex-1 items-center gap-1">
                  {Array.from({ length: 32 }).map((_, i) => (
                    <span key={i} className="w-1 animate-pulse rounded-full bg-rose-400" style={{ height: `${25 + ((i * 53) % 75)}%`, animationDelay: `${(i % 6) * 0.15}s` }} />
                  ))}
                </div>
                <span className="text-sm font-semibold text-slate-600 tabular-nums">0:12</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SKILLS */}
      <section className="container-page py-16">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold tracking-wide text-brand-700 uppercase">Every skill, one platform</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">Courses & practice for all IELTS skills</h2>
          <p className="mt-3 text-slate-600">Structured lessons, instant-feedback exercises and AI-generated tests for grammar, vocabulary, reading, listening, speaking and writing.</p>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SKILLS.map((s) => {
            const Icon = s.icon;
            return (
              <Link
                key={s.key}
                href={`/courses?skill=${s.key}`}
                className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-soft transition hover:-translate-y-1 hover:shadow-lift"
              >
                <Icon className="absolute -right-6 -bottom-6 h-32 w-32 opacity-[0.07] transition group-hover:scale-110" style={{ color: s.color }} />
                <span className={`flex h-12 w-12 items-center justify-center rounded-xl ${s.bg}`}>
                  <Icon className="h-6 w-6" style={{ color: s.color }} />
                </span>
                <h3 className="mt-4 text-lg font-bold text-slate-900">{s.label}</h3>
                <p className="mt-1 text-sm text-slate-600">{s.blurb}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold" style={{ color: s.color }}>
                  Explore <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* AI FEATURES */}
      <section className="bg-slate-900 py-20 text-white">
        <div className="container-page">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold tracking-wide text-brand-300 uppercase">Your virtual teacher</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">An examiner, a tutor and a coach — available 24/7</h2>
          </div>
          <div className="mt-14 grid gap-6 lg:grid-cols-3">
            {[
              { icon: Mic, title: 'Voice conversation tutor', text: 'Talk naturally with Teacher Hana. Gemini hears your real voice, replies out loud and corrects grammar and pronunciation as you go.', color: 'from-emerald-400 to-brand-600' },
              { icon: PenLine, title: 'IELTS writing examiner', text: 'Submit Task 1 or Task 2 and get a band score for each criterion, line-by-line corrections and an improved model version.', color: 'from-rose-400 to-rose-600' },
              { icon: GraduationCap, title: 'AI tests & level check', text: 'Unlimited fresh grammar, vocabulary, reading and listening tests at your level — plus a placement test that estimates your band.', color: 'from-gold-300 to-gold-600' },
            ].map((f) => (
              <div key={f.title} className="rounded-3xl border border-white/10 bg-white/5 p-7 backdrop-blur">
                <span className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${f.color}`}>
                  <f.icon className="h-6 w-6 text-white" />
                </span>
                <h3 className="mt-5 text-xl font-bold">{f.title}</h3>
                <p className="mt-2 leading-relaxed text-slate-300">{f.text}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Languages, t: 'Amharic explanations' },
              { icon: LineChart, t: 'Band tracking per skill' },
              { icon: Smartphone, t: 'Mobile-first, low data' },
              { icon: BadgeCheck, t: 'Official band descriptors' },
            ].map((x) => (
              <div key={x.t} className="flex items-center gap-3 rounded-2xl bg-white/5 px-5 py-4 text-sm font-medium text-slate-200">
                <x.icon className="h-5 w-5 text-brand-300" /> {x.t}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* LEVELS */}
      <section className="container-page py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold tracking-wide text-brand-700 uppercase">IELTS-based levels</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">A clear path from Band 4 to Band 8</h2>
          <p className="mt-3 text-slate-600">Take the free AI level check, and we&apos;ll place you on the right step.</p>
        </div>
        <div className="mt-12 grid items-end gap-3 sm:grid-cols-5">
          {LEVELS.map((l, i) => (
            <div key={l.name} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft" style={{ minHeight: 150 + i * 28 }}>
              <span className="inline-block rounded-lg px-2 py-1 text-xs font-bold text-white" style={{ backgroundColor: l.color }}>
                Band {l.band}
              </span>
              <h3 className="mt-3 font-bold text-slate-900">{l.name}</h3>
              <p className="text-xs font-semibold text-slate-400">CEFR {l.cefr}</p>
              <p className="mt-2 text-sm text-slate-600">{l.text}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link href="/tests?mode=LEVEL_CHECK" className={buttonClass('dark', 'lg')}>
            Find my level — free <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* PAYMENTS */}
      <section className="container-page">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 via-brand-600 to-emerald-500 p-8 text-white sm:p-12">
          <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-gold-300/30 blur-3xl" />
          <div className="relative grid items-center gap-8 lg:grid-cols-2">
            <div>
              <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Premium from 299 Birr a month</h2>
              <p className="mt-3 max-w-lg text-brand-50">
                Unlock every course, unlimited AI feedback and full IELTS mock tests. Pay in seconds with the methods you already use.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {['telebirr', 'CBE Birr', 'M-Pesa', 'Amole', 'Visa / Mastercard'].map((p) => (
                  <span key={p} className="rounded-full bg-white/15 px-3 py-1 text-sm font-medium backdrop-blur">
                    {p}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-3 lg:justify-end">
              <Link href="/pricing" className={buttonClass('gold', 'lg')}>
                <Crown className="h-5 w-5" /> See plans
              </Link>
              <Link href="/courses" className={buttonClass('outline', 'lg', 'border-white/30 bg-white/10 text-white hover:bg-white/20 hover:border-white/50')}>
                <Wallet className="h-5 w-5" /> Browse free lessons
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="container-page py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-3xl font-extrabold tracking-tight text-slate-900">Questions & answers</h2>
          <div className="mt-10 space-y-3">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-soft open:shadow-lift">
                <summary className="flex cursor-pointer list-none items-center justify-between font-semibold text-slate-900">
                  {q}
                  <span className="ml-4 text-xl text-brand-600 transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 leading-relaxed text-slate-600">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
