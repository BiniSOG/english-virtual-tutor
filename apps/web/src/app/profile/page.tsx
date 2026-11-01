'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Crown, Receipt } from 'lucide-react';
import { RequireAuth } from '@/components/require-auth';
import { Badge, Button, Card, EmptyState, Field, Input, PageHeader, Select } from '@/components/ui';
import { api, setToken } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useFetch } from '@/lib/hooks';
import type { Level } from '@/lib/types';
import { formatDate, formatEtb } from '@/lib/utils';

const LANGS = ['Amharic', 'Afaan Oromo', 'Tigrinya', 'Somali', 'Sidamo', 'Wolaytta', 'Other'];

interface PaymentRow { id: string; txRef: string; amount: number; status: string; createdAt: string; plan: { name: string } }

function Profile() {
  const { user, refresh } = useAuth();
  const { data: levels } = useFetch<Level[]>('/levels');
  const { data: payments } = useFetch<PaymentRow[]>('/billing/payments');
  const [form, setForm] = useState({ name: '', phone: '', city: '', nativeLanguage: 'Amharic', targetBand: 6.5, levelId: '' });
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  const [saving, setSaving] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  useEffect(() => {
    if (user)
      setForm({
        name: user.name,
        phone: user.phone ?? '',
        city: user.city ?? '',
        nativeLanguage: user.nativeLanguage ?? 'Amharic',
        targetBand: user.targetBand ?? 6.5,
        levelId: user.levelId ?? '',
      });
  }, [user]);

  if (!user) return null;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api('/auth/me', { method: 'PATCH', body: { ...form, levelId: form.levelId || undefined, phone: form.phone || undefined, city: form.city || undefined } });
      await refresh();
      toast.success('Profile saved');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function changePw(e: React.FormEvent) {
    e.preventDefault();
    setSavingPw(true);
    try {
      const res = await api<{ token?: string }>('/auth/me/password', { body: pw });
      if (res.token) setToken(res.token); // other devices are signed out; keep this one signed in
      setPw({ currentPassword: '', newPassword: '' });
      toast.success('Password changed — other devices have been signed out');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSavingPw(false);
    }
  }

  return (
    <div className="container-page max-w-4xl space-y-6 py-10">
      <PageHeader title="Profile & billing" text={user.email} />
      <Card className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-slate-500">Membership</p>
          {user.isPremium ? (
            <p className="mt-1 flex items-center gap-2 text-lg font-bold text-slate-900"><Crown className="h-5 w-5 text-gold-500" /> Premium · until {formatDate(user.premiumUntil)}</p>
          ) : (
            <p className="mt-1 text-lg font-bold text-slate-900">Free plan</p>
          )}
        </div>
        <Button href="/pricing" variant={user.isPremium ? 'outline' : 'gold'}>{user.isPremium ? 'Extend Premium' : 'Upgrade to Premium'}</Button>
      </Card>

      <Card className="p-6">
        <h2 className="mb-5 text-lg font-bold text-slate-900">Learning profile</h2>
        <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required minLength={2} /></Field>
          <Field label="Phone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label="City"><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Addis Ababa" /></Field>
          <Field label="First language">
            <Select value={form.nativeLanguage} onChange={(e) => setForm({ ...form, nativeLanguage: e.target.value })}>{LANGS.map((l) => <option key={l}>{l}</option>)}</Select>
          </Field>
          <Field label="Current level">
            <Select value={form.levelId} onChange={(e) => setForm({ ...form, levelId: e.target.value })}>
              <option value="">—</option>
              {levels?.map((l) => <option key={l.id} value={l.id}>{l.name} (Band {l.band} · {l.cefr})</option>)}
            </Select>
          </Field>
          <Field label="Target IELTS band">
            <Select value={form.targetBand} onChange={(e) => setForm({ ...form, targetBand: Number(e.target.value) })}>
              {[5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9].map((b) => <option key={b} value={b}>{b.toFixed(1)}</option>)}
            </Select>
          </Field>
          <div className="sm:col-span-2"><Button type="submit" loading={saving}>Save changes</Button></div>
        </form>
      </Card>

      <Card className="p-6">
        <h2 className="mb-5 text-lg font-bold text-slate-900">Change password</h2>
        <form onSubmit={changePw} className="grid gap-4 sm:grid-cols-2">
          <Field label="Current password"><Input type="password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} required /></Field>
          <Field label="New password" hint="At least 8 characters"><Input type="password" minLength={8} value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} required /></Field>
          <div className="sm:col-span-2"><Button type="submit" variant="dark" loading={savingPw}>Update password</Button></div>
        </form>
      </Card>

      <Card className="p-6">
        <h2 className="mb-4 text-lg font-bold text-slate-900">Payment history</h2>
        {payments?.length ? (
          <div className="divide-y divide-slate-100">
            {payments.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <div>
                  <p className="font-semibold text-slate-900">{p.plan.name} · {formatEtb(p.amount)}</p>
                  <p className="font-mono text-xs text-slate-400">{p.txRef}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-slate-500">{formatDate(p.createdAt)}</span>
                  <Badge tone={p.status === 'SUCCESS' ? 'brand' : p.status === 'PENDING' ? 'gold' : 'rose'}>{p.status.toLowerCase()}</Badge>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon={<Receipt className="h-6 w-6" />} title="No payments yet" />
        )}
      </Card>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <RequireAuth>
      <Profile />
    </RequireAuth>
  );
}
