'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { CheckCircle2, Crown, Loader2, XCircle } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatDate, formatEtb } from '@/lib/utils';

interface VerifyResult {
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  amount: number;
  plan: string;
  premiumUntil: string | null;
  txRef: string;
}

function Verify() {
  const params = useSearchParams();
  const txRef = params.get('tx_ref') || params.get('trx_ref');
  const { user, loading: authLoading, refresh } = useAuth();
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tries, setTries] = useState(0);

  useEffect(() => {
    if (!txRef || authLoading || !user) return;
    let cancelled = false;
    api<VerifyResult>(`/billing/verify/${encodeURIComponent(txRef)}`)
      .then(async (r) => {
        if (cancelled) return;
        setResult(r);
        if (r.status === 'SUCCESS') await refresh();
        else if (r.status === 'PENDING' && tries < 6) setTimeout(() => setTries((t) => t + 1), 3000);
      })
      .catch((e) => setError(e.message));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txRef, authLoading, user?.id, tries]);

  const content = () => {
    if (!txRef) return { icon: <XCircle className="h-14 w-14 text-rose-500" />, title: 'Missing payment reference', text: 'We could not find a payment to verify.' };
    if (error) return { icon: <XCircle className="h-14 w-14 text-rose-500" />, title: 'Verification problem', text: error };
    if (!result || result.status === 'PENDING')
      return { icon: <Loader2 className="h-14 w-14 animate-spin text-brand-600" />, title: 'Confirming your payment…', text: 'This usually takes a few seconds. Please don’t close this page.' };
    if (result.status === 'SUCCESS')
      return {
        icon: <CheckCircle2 className="h-14 w-14 text-brand-600" />,
        title: 'Welcome to Premium! 🎉',
        text: `${result.plan} plan · ${formatEtb(result.amount)}. Your access is active until ${formatDate(result.premiumUntil)}.`,
      };
    return { icon: <XCircle className="h-14 w-14 text-rose-500" />, title: 'Payment not completed', text: 'The payment was cancelled or failed. You have not been charged.' };
  };
  const c = content();
  return (
    <div className="container-page flex max-w-xl justify-center py-20">
      <Card className="w-full p-10 text-center">
        <div className="flex justify-center">{c.icon}</div>
        <h1 className="mt-5 text-2xl font-extrabold text-slate-900">{c.title}</h1>
        <p className="mt-2 text-slate-600">{c.text}</p>
        {txRef && <p className="mt-4 font-mono text-xs text-slate-400">Ref: {txRef}</p>}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {result?.status === 'SUCCESS' ? (
            <Button href="/dashboard" size="lg"><Crown className="h-5 w-5" /> Go to my dashboard</Button>
          ) : result?.status === 'FAILED' || error ? (
            <Button href="/pricing" size="lg">Try again</Button>
          ) : null}
        </div>
      </Card>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense>
      <Verify />
    </Suspense>
  );
}
