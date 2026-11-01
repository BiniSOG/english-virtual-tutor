'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Eye, EyeOff, XCircle } from 'lucide-react';
import { AuthShell } from '@/components/auth/auth-shell';
import { Button, Field, Input, Spinner } from '@/components/ui';
import { api, setToken } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

function strength(pw: string) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return Math.min(4, s);
}
const LABELS = ['Too short', 'Weak', 'Fair', 'Good', 'Strong'];
const COLORS = ['bg-rose-500', 'bg-rose-500', 'bg-gold-400', 'bg-brand-500', 'bg-brand-600'];

function ResetForm() {
  const params = useSearchParams();
  const router = useRouter();
  const { refresh } = useAuth();
  const token = params.get('token') ?? '';
  const [check, setCheck] = useState<{ valid: boolean; email: string | null } | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return setCheck({ valid: false, email: null });
    api<{ valid: boolean; email: string | null }>(`/auth/reset-password?token=${encodeURIComponent(token)}`)
      .then(setCheck)
      .catch(() => setCheck({ valid: false, email: null }));
  }, [token]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) return toast.error('The passwords do not match');
    setLoading(true);
    try {
      const res = await api<{ token: string }>('/auth/reset-password', { body: { token, password } });
      setToken(res.token);
      await refresh();
      toast.success('Password updated — you are signed in.');
      router.replace('/dashboard');
    } catch (err) {
      toast.error((err as Error).message);
      setLoading(false);
    }
  }

  if (!check) return <div className="flex justify-center py-10"><Spinner className="h-7 w-7" /></div>;

  if (!check.valid)
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
        <XCircle className="mx-auto h-10 w-10 text-rose-500" />
        <h2 className="mt-3 text-lg font-bold text-slate-900">This link has expired</h2>
        <p className="mt-1 text-sm text-slate-600">Reset links work once and expire after 60 minutes. Please request a new one.</p>
        <Button href="/forgot-password" className="mt-5">Request a new link</Button>
      </div>
    );

  const s = strength(password);
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {check.email && <p className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm text-slate-600">Account: <b className="text-slate-900">{check.email}</b></p>}
      <Field label="New password">
        <div className="relative">
          <Input type={show ? 'text' : 'password'} required minLength={8} autoComplete="new-password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} className="pr-11" />
          <button type="button" onClick={() => setShow((v) => !v)} className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 hover:text-slate-700" aria-label={show ? 'Hide password' : 'Show password'}>
            {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
        {password && (
          <span className="flex items-center gap-2">
            <span className="flex flex-1 gap-1">
              {[0, 1, 2, 3].map((i) => <span key={i} className={cn('h-1.5 flex-1 rounded-full', i < s ? COLORS[s] : 'bg-slate-200')} />)}
            </span>
            <span className="w-16 text-right text-xs font-medium text-slate-500">{LABELS[s]}</span>
          </span>
        )}
      </Field>
      <Field label="Confirm new password" error={confirm && confirm !== password ? 'Passwords do not match' : undefined}>
        <Input type={show ? 'text' : 'password'} required minLength={8} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </Field>
      <Button type="submit" className="w-full" size="lg" loading={loading} disabled={password.length < 8 || password !== confirm}>
        Set new password
      </Button>
      <p className="text-center text-xs text-slate-500">For your security, you&apos;ll be signed out on your other devices.</p>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthShell title="Choose a new password" subtitle="Use at least 8 characters. A mix of letters, numbers and symbols is strongest.">
      <Suspense>
        <ResetForm />
      </Suspense>
      <p className="mt-6 text-center text-sm text-slate-600">
        <Link href="/login" className="font-semibold text-brand-700 hover:underline">Back to sign in</Link>
      </p>
    </AuthShell>
  );
}
