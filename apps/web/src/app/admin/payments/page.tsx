'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { RefreshCw } from 'lucide-react';
import { Table, Td, Th } from '@/components/admin/table';
import { Badge, Button, Chip, EmptyState, ErrorBox, PageHeader, Skeleton } from '@/components/ui';
import { api } from '@/lib/api';
import { useFetch } from '@/lib/hooks';
import { formatDate, formatEtb } from '@/lib/utils';

interface AdminPayment {
  id: string; txRef: string; amount: number; status: 'PENDING' | 'SUCCESS' | 'FAILED'; provider: string; createdAt: string; paidAt: string | null;
  user: { id: string; name: string; email: string }; plan: { name: string };
}

export default function AdminPayments() {
  const [status, setStatus] = useState('');
  const { data, loading, error, reload } = useFetch<AdminPayment[]>(`/admin/payments${status ? `?status=${status}` : ''}`);
  const [busy, setBusy] = useState<string | null>(null);
  const total = data?.filter((p) => p.status === 'SUCCESS').reduce((s, p) => s + p.amount, 0) ?? 0;

  async function verify(txRef: string) {
    setBusy(txRef);
    try {
      const r = await api<{ status: string }>(`/admin/payments/${txRef}/verify`, { method: 'POST' });
      toast.success(`Status: ${r.status}`);
      reload();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Payments" text={`Chapa transactions. Successful in view: ${formatEtb(total)}`} />
      <div className="flex gap-2">
        {['', 'SUCCESS', 'PENDING', 'FAILED'].map((s) => <Chip key={s} active={status === s} onClick={() => setStatus(s)}>{s ? s.toLowerCase() : 'All'}</Chip>)}
      </div>
      {error ? <ErrorBox message={error.message} onRetry={reload} /> : loading && !data ? <Skeleton className="h-96" /> : !data?.length ? <EmptyState title="No payments" /> : (
        <Table>
          <thead><tr><Th>Student</Th><Th>Plan</Th><Th>Amount</Th><Th>Status</Th><Th>Reference</Th><Th>Date</Th><Th /></tr></thead>
          <tbody>
            {data.map((p) => (
              <tr key={p.id}>
                <Td><p className="font-semibold text-slate-900">{p.user.name}</p><p className="text-xs text-slate-500">{p.user.email}</p></Td>
                <Td>{p.plan.name}</Td>
                <Td className="font-semibold whitespace-nowrap">{formatEtb(p.amount)}</Td>
                <Td><Badge tone={p.status === 'SUCCESS' ? 'brand' : p.status === 'PENDING' ? 'gold' : 'rose'}>{p.status.toLowerCase()}</Badge></Td>
                <Td className="font-mono text-xs">{p.txRef}<br /><span className="text-slate-400">{p.provider}</span></Td>
                <Td className="whitespace-nowrap">{formatDate(p.paidAt ?? p.createdAt, { dateStyle: 'medium', timeStyle: 'short' })}</Td>
                <Td>{p.status === 'PENDING' && <Button size="sm" variant="outline" loading={busy === p.txRef} onClick={() => verify(p.txRef)}><RefreshCw className="h-4 w-4" /> Verify</Button>}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
