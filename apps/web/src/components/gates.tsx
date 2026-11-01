'use client';

import { Crown, Lock, LogIn } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { Button, Card } from './ui';

export function PremiumGate({ title = 'This is Premium content', text }: { title?: string; text?: string }) {
  return (
    <Card className="relative overflow-hidden p-8 text-center sm:p-12">
      <div className="absolute inset-0 -z-0 bg-gradient-to-br from-gold-50 via-white to-brand-50" />
      <div className="relative">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-gold-300 to-gold-500 shadow-lg shadow-gold-500/30">
          <Crown className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-2xl font-extrabold text-slate-900">{title}</h2>
        <p className="mx-auto mt-2 max-w-md text-slate-600">
          {text ?? 'Unlock every course, unlimited AI speaking & writing feedback and full IELTS mock tests — from just 299 ETB/month. Pay easily with telebirr, CBE Birr or card.'}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button href="/pricing" variant="gold" size="lg">
            <Crown className="h-5 w-5" /> See Premium plans
          </Button>
        </div>
      </div>
    </Card>
  );
}

export function LoginGate({ title = 'Sign in to continue', text = 'Create a free account to use the AI tutor and save your progress.' }: { title?: string; text?: string }) {
  const pathname = usePathname();
  return (
    <Card className="p-8 text-center sm:p-12">
      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50">
        <Lock className="h-7 w-7 text-brand-600" />
      </div>
      <h2 className="text-2xl font-extrabold text-slate-900">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-slate-600">{text}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button href={`/register?next=${encodeURIComponent(pathname)}`} size="lg">
          Create free account
        </Button>
        <Button href={`/login?next=${encodeURIComponent(pathname)}`} variant="outline" size="lg">
          <LogIn className="h-4 w-4" /> Sign in
        </Button>
      </div>
    </Card>
  );
}
