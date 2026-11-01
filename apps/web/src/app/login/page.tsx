'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { AuthShell } from '@/components/auth/auth-shell';
import { Button, Field, Input } from '@/components/ui';
import { useAuth } from '@/lib/auth';

function LoginForm() {
  const { login, user, loading: authLoading } = useAuth();
  const submitted = useRef(false);
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && user && !submitted.current) router.replace(params.get('next')?.startsWith('/') ? params.get('next')! : user.role === 'ADMIN' ? '/admin' : '/dashboard');
  }, [authLoading, user, router, params]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    submitted.current = true;
    setLoading(true);
    try {
      const user = await login(email, password);
      toast.success(`Welcome back, ${user.name.split(' ')[0]}!`);
      const next = params.get('next');
      router.push(next && next.startsWith('/') ? next : user.role === 'ADMIN' ? '/admin' : '/dashboard');
    } catch (err) {
      submitted.current = false;
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <Field label="Email">
        <Input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
      </Field>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700">Password</span>
          <Link href="/forgot-password" className="text-sm font-semibold text-brand-700 hover:underline">Forgot password?</Link>
        </div>
        <Input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" aria-label="Password" />
      </div>
      <Button type="submit" className="w-full" size="lg" loading={loading}>
        Sign in
      </Button>
      <p className="text-center text-sm text-slate-600">
        New to Lisan?{' '}
        <Link href={`/register${params.get('next') ? `?next=${encodeURIComponent(params.get('next')!)}` : ''}`} className="font-semibold text-brand-700 hover:underline">
          Create a free account
        </Link>
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <AuthShell title="Welcome back 👋" subtitle="Sign in to continue your English journey.">
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
