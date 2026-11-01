'use client';

import { useEffect } from 'react';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <p className="text-5xl">😕</p>
      <h1 className="mt-4 text-2xl font-bold text-slate-900">Something went wrong</h1>
      <p className="mt-2 max-w-md text-slate-600">An unexpected error happened on this page. Please try again — your progress is saved.</p>
      <div className="mt-8 flex gap-3">
        <Button onClick={reset}><RotateCcw className="h-4 w-4" /> Try again</Button>
        <Button href="/" variant="outline">Back home</Button>
      </div>
    </div>
  );
}
