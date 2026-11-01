'use client';

import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import { ArrowLeft, MailCheck } from 'lucide-react';
import { AuthShell } from '@/components/auth/auth-shell';
import { Button, Field, Input } from '@/components/ui';
import { api } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api('/auth/forgot-password', { body: { email } });
      setSent(true);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Forgot your password?" subtitle="Enter your account email and we'll send you a link to choose a new one.">
      {sent ? (
        <div className="rounded-2xl border border-brand-200 bg-brand-50/60 p-6 text-center animate-fade-up">
          <MailCheck className="mx-auto h-10 w-10 text-brand-600" />
          <h2 className="mt-3 text-lg font-bold text-slate-900">Check your inbox</h2>
          <p className="mt-1 text-sm text-slate-600">
            If an account exists for <b>{email}</b>, a reset link is on its way. It expires in 60 minutes.
          </p>
          <p className="mt-3 text-xs text-slate-500">Can&apos;t find it? Check your spam folder, or wait a minute and try again.</p>
          <Button variant="outline" className="mt-5" onClick={() => setSent(false)}>Send again</Button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-5">
          <Field label="Email">
            <Input type="email" required autoComplete="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </Field>
          <Button type="submit" className="w-full" size="lg" loading={loading}>Send reset link</Button>
        </form>
      )}
      <p className="mt-6 text-center text-sm text-slate-600">
        <Link href="/login" className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to sign in
        </Link>
      </p>
    </AuthShell>
  );
}
