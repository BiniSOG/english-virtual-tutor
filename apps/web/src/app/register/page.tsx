'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { AuthShell } from '@/components/auth/auth-shell';
import { Button, Field, Input, Select } from '@/components/ui';
import { useAuth } from '@/lib/auth';

const LANGS = ['Amharic', 'Afaan Oromo', 'Tigrinya', 'Somali', 'Sidamo', 'Wolaytta', 'Other'];
const BANDS = [5, 5.5, 6, 6.5, 7, 7.5, 8];

function RegisterForm() {
  const { register, user, loading: authLoading } = useAuth();
  const submitted = useRef(false);
  const router = useRouter();
  const params = useSearchParams();
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', nativeLanguage: 'Amharic', targetBand: 6.5 });
  const [loading, setLoading] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: k === 'targetBand' ? Number(e.target.value) : e.target.value }));

  // Already signed in when opening this page → skip registration (but never after submitting the form).
  useEffect(() => {
    if (!authLoading && user && !submitted.current) router.replace('/dashboard');
  }, [authLoading, user, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    submitted.current = true;
    setLoading(true);
    try {
      await register({ ...form, phone: form.phone || undefined });
      toast.success('Account created — welcome to Lisan! 🎉');
      const next = params.get('next');
      router.push(next && next.startsWith('/') ? next : '/tests?mode=LEVEL_CHECK&welcome=1');
    } catch (err) {
      submitted.current = false;
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="Full name">
        <Input required minLength={2} value={form.name} onChange={set('name')} placeholder="e.g. Selam Tesfaye" autoComplete="name" />
      </Field>
      <Field label="Email">
        <Input type="email" required value={form.email} onChange={set('email')} placeholder="you@example.com" autoComplete="email" />
      </Field>
      <Field label="Password" hint="At least 8 characters">
        <Input type="password" required minLength={8} value={form.password} onChange={set('password')} placeholder="••••••••" autoComplete="new-password" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="First language">
          <Select value={form.nativeLanguage} onChange={set('nativeLanguage')}>
            {LANGS.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </Select>
        </Field>
        <Field label="Target IELTS band">
          <Select value={form.targetBand} onChange={set('targetBand')}>
            {BANDS.map((b) => (
              <option key={b} value={b}>
                {b.toFixed(1)}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Phone (optional)" hint="Used for payment receipts only">
        <Input type="tel" value={form.phone} onChange={set('phone')} placeholder="09…" autoComplete="tel" />
      </Field>
      <Button type="submit" className="w-full" size="lg" loading={loading}>
        Create free account
      </Button>
      <p className="text-center text-sm text-slate-600">
        Already have an account?{' '}
        <Link href="/login" className="font-semibold text-brand-700 hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}

export default function RegisterPage() {
  return (
    <AuthShell title="Start learning for free" subtitle="Create your account in 30 seconds. No payment needed.">
      <Suspense>
        <RegisterForm />
      </Suspense>
    </AuthShell>
  );
}
