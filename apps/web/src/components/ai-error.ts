'use client';

import { toast } from 'sonner';
import { ApiError } from '@/lib/api';

export function handleAiError(e: unknown, router?: { push: (href: string) => void }) {
  const err = e as ApiError;
  if (err?.isQuota || err?.isPremium) {
    toast.error(err.message, {
      action: router ? { label: 'Upgrade', onClick: () => router.push('/pricing') } : undefined,
      duration: 8000,
    });
    return;
  }
  toast.error(err?.message || 'Something went wrong');
}
