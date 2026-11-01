'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Crown, KeyRound, Search, ShieldCheck, Trash2, UserX } from 'lucide-react';
import { Table, Td, Th } from '@/components/admin/table';
import { useDebounced } from '@/components/filters';
import { Badge, Button, Chip, EmptyState, ErrorBox, Input, Modal, PageHeader, Select, Skeleton } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useFetch } from '@/lib/hooks';
import type { AttemptSummary, Level, Role } from '@/lib/types';
import { formatDate, formatEtb } from '@/lib/utils';

interface AdminUser {
  id: string; email: string; name: string; phone: string | null; role: Role; premiumUntil: string | null; isActive: boolean; isPremium: boolean;
  city: string | null; nativeLanguage: string | null; targetBand: number | null; streak: number; lastActiveAt: string | null; createdAt: string;
  level: { id: string; name: string; band: number } | null;
  _count?: { attempts: number; progress: number; aiUsage?: number };
  attempts?: AttemptSummary[];
  payments?: { id: string; amount: number; status: string; createdAt: string; plan: { name: string } }[];
}

const FILTERS = [
  { k: '', l: 'All' },
  { k: 'premium', l: 'Premium' },
  { k: 'free', l: 'Free' },
  { k: 'admin', l: 'Admins' },
  { k: 'suspended', l: 'Suspended' },
];

export default function AdminUsers() {
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('');
  const dq = useDebounced(q);
  const { data, loading, error, reload } = useFetch<AdminUser[]>(`/admin/users?q=${encodeURIComponent(dq)}&filter=${filter}`);
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <PageHeader title="Students" text="Manage accounts, premium access and roles." />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative sm:w-80">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or email…" className="h-10 w-full rounded-full border border-slate-200 bg-white pr-4 pl-10 text-sm focus:border-brand-500 focus:outline-none" />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {FILTERS.map((f) => <Chip key={f.k} active={filter === f.k} onClick={() => setFilter(f.k)}>{f.l}</Chip>)}
        </div>
      </div>
      {error ? <ErrorBox message={error.message} onRetry={reload} /> : loading && !data ? <Skeleton className="h-96" /> : !data?.length ? (
        <EmptyState title="No students found" />
      ) : (
        <Table>
          <thead>
            <tr><Th>Student</Th><Th>Plan</Th><Th>Level</Th><Th>Activity</Th><Th>Joined</Th><Th /></tr>
          </thead>
          <tbody>
            {data.map((u) => (
              <tr key={u.id} className="cursor-pointer hover:bg-slate-50" onClick={() => setSelected(u.id)}>
                <Td>
                  <p className="font-semibold text-slate-900">{u.name} {u.role === 'ADMIN' && <Badge tone="violet">Admin</Badge>} {!u.isActive && <Badge tone="rose">Suspended</Badge>}</p>
                  <p className="text-xs text-slate-500">{u.email}</p>
                </Td>
                <Td>{u.isPremium ? <Badge tone="gold"><Crown className="h-3 w-3" /> until {formatDate(u.premiumUntil)}</Badge> : <Badge>Free</Badge>}</Td>
                <Td>{u.level?.name ?? '—'}</Td>
                <Td className="whitespace-nowrap text-xs">{u._count?.attempts ?? 0} attempts · {u._count?.progress ?? 0} lessons<br /><span className="text-slate-400">Last: {formatDate(u.lastActiveAt)}</span></Td>
                <Td className="whitespace-nowrap">{formatDate(u.createdAt)}</Td>
                <Td><Button size="sm" variant="ghost">Manage</Button></Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      {selected && <UserModal id={selected} onClose={() => setSelected(null)} onChanged={reload} />}
    </div>
  );
}

function UserModal({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => void }) {
  const { user: me } = useAuth();
  const { data: u, setData, loading } = useFetch<AdminUser>(`/admin/users/${id}`);
  const { data: levels } = useFetch<Level[]>('/levels');
  const [busy, setBusy] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');

  async function resetPassword() {
    if (newPassword.length < 8) return toast.error('Password must be at least 8 characters');
    await patch({ newPassword }, 'pw');
    setNewPassword('');
  }

  async function patch(body: Record<string, unknown>, label: string) {
    setBusy(label);
    try {
      const updated = await api<AdminUser>(`/admin/users/${id}`, { method: 'PATCH', body });
      setData((prev) => (prev ? { ...prev, ...updated } : prev));
      onChanged();
      toast.success('Saved');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (!confirm('Delete this account permanently? This cannot be undone.')) return;
    setBusy('delete');
    try {
      await api(`/admin/users/${id}`, { method: 'DELETE' });
      toast.success('Account deleted');
      onChanged();
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
      setBusy(null);
    }
  }

  return (
    <Modal open onClose={onClose} title={u?.name ?? 'Student'} wide>
      {loading || !u ? <Skeleton className="h-64" /> : (
        <div className="space-y-6">
          <div className="grid gap-3 text-sm sm:grid-cols-3">
            {[
              ['Email', u.email], ['Phone', u.phone ?? '—'], ['City', u.city ?? '—'],
              ['First language', u.nativeLanguage ?? '—'], ['Target band', u.targetBand?.toFixed(1) ?? '—'], ['Streak', `${u.streak} days`],
              ['AI calls (all time)', String(u._count?.aiUsage ?? 0)], ['Lessons completed', String(u._count?.progress ?? 0)], ['Joined', formatDate(u.createdAt)],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">{k}</p><p className="truncate font-semibold text-slate-900">{v}</p></div>
            ))}
          </div>

          <div className="rounded-2xl border border-gold-200 bg-gold-50/50 p-4">
            <p className="font-semibold text-slate-900">
              Premium: {u.isPremium ? <>active until <b>{formatDate(u.premiumUntil)}</b></> : 'not active'}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {[30, 90, 365].map((d) => (
                <Button key={d} size="sm" variant="gold" loading={busy === `g${d}`} onClick={() => patch({ grantPremiumDays: d }, `g${d}`)}>
                  <Crown className="h-4 w-4" /> +{d} days
                </Button>
              ))}
              {u.premiumUntil && <Button size="sm" variant="outline" loading={busy === 'revoke'} onClick={() => patch({ grantPremiumDays: 0 }, 'revoke')}>Revoke</Button>}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm"><span className="font-medium text-slate-700">Level</span>
              <Select value={u.level?.id ?? ''} onChange={(e) => e.target.value && patch({ levelId: e.target.value }, 'level')}>
                <option value="">—</option>
                {levels?.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </Select>
            </label>
            <label className="space-y-1.5 text-sm"><span className="font-medium text-slate-700">Role</span>
              <Select value={u.role} disabled={u.id === me?.id} onChange={(e) => patch({ role: e.target.value }, 'role')}>
                <option value="STUDENT">Student</option>
                <option value="ADMIN">Admin</option>
              </Select>
            </label>
          </div>

          <div className="rounded-2xl border border-slate-200 p-4">
            <p className="flex items-center gap-2 font-semibold text-slate-900"><KeyRound className="h-4 w-4" /> Reset password</p>
            <p className="mt-0.5 text-xs text-slate-500">Set a temporary password and share it with the student securely. They can change it in Profile.</p>
            <div className="mt-3 flex gap-2">
              <Input type="text" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New password (min 8 characters)" autoComplete="off" />
              <Button variant="dark" loading={busy === 'pw'} onClick={resetPassword}>Set</Button>
            </div>
          </div>

          {u.attempts && u.attempts.length > 0 && (
            <div>
              <h3 className="mb-2 font-bold text-slate-900">Recent attempts</h3>
              <div className="divide-y divide-slate-100 rounded-xl border border-slate-100">
                {u.attempts.slice(0, 8).map((a) => (
                  <div key={a.id} className="flex items-center justify-between px-3 py-2 text-sm">
                    <span className="truncate">{a.title ?? a.skill} <span className="text-xs text-slate-400">· {formatDate(a.createdAt)}</span></span>
                    <span className="font-semibold">{a.band != null ? `Band ${a.band}` : a.score != null ? `${Math.round(a.score)}%` : '—'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {u.payments && u.payments.length > 0 && (
            <div>
              <h3 className="mb-2 font-bold text-slate-900">Payments</h3>
              <div className="divide-y divide-slate-100 rounded-xl border border-slate-100">
                {u.payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between px-3 py-2 text-sm">
                    <span>{p.plan.name} · {formatEtb(p.amount)}</span>
                    <span className="flex items-center gap-2 text-xs text-slate-500">{formatDate(p.createdAt)} <Badge tone={p.status === 'SUCCESS' ? 'brand' : p.status === 'PENDING' ? 'gold' : 'rose'}>{p.status}</Badge></span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {u.id !== me?.id && (
            <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-5">
              <Button variant="outline" size="sm" loading={busy === 'active'} onClick={() => patch({ isActive: !u.isActive }, 'active')}>
                {u.isActive ? <><UserX className="h-4 w-4" /> Suspend account</> : <><ShieldCheck className="h-4 w-4" /> Reactivate</>}
              </Button>
              <Button variant="danger" size="sm" loading={busy === 'delete'} onClick={remove}><Trash2 className="h-4 w-4" /> Delete</Button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
