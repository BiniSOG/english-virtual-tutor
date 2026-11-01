'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Check, Pencil, Plus } from 'lucide-react';
import { Badge, Button, Card, ErrorBox, Field, Input, Modal, PageHeader, Skeleton, Switch, Textarea } from '@/components/ui';
import { api } from '@/lib/api';
import { useFetch } from '@/lib/hooks';
import type { Plan } from '@/lib/types';
import { formatEtb } from '@/lib/utils';

type AdminPlan = Plan & { _count: { payments: number } };
const BLANK = { name: '', slug: '', priceEtb: 299, durationDays: 30, description: '', features: '', isActive: true, isPopular: false, order: 1 };

export default function AdminPlans() {
  const { data, loading, error, reload } = useFetch<AdminPlan[]>('/admin/plans');
  const [edit, setEdit] = useState<(typeof BLANK & { id?: string }) | null>(null);
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!edit) return;
    setSaving(true);
    const { id, features, ...rest } = edit;
    const body = { ...rest, features: features.split('\n').map((f) => f.trim()).filter(Boolean) };
    try {
      if (id) await api(`/admin/plans/${id}`, { method: 'PATCH', body });
      else await api('/admin/plans', { body });
      toast.success('Plan saved');
      setEdit(null);
      reload();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Subscription plans" text="Prices are in Ethiopian Birr. Disabling a plan hides it from the pricing page." actions={<Button onClick={() => setEdit({ ...BLANK, order: (data?.length ?? 0) + 1 })}><Plus className="h-4 w-4" /> New plan</Button>} />
      {error ? <ErrorBox message={error.message} onRetry={reload} /> : loading && !data ? <Skeleton className="h-72" /> : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {data?.map((p) => (
            <Card key={p.id} className={`p-6 ${!p.isActive ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{p.name}</h3>
                  <p className="text-sm text-slate-500">/{p.slug} · {p.durationDays} days</p>
                </div>
                <div className="flex gap-1">
                  {p.isPopular && <Badge tone="brand">Popular</Badge>}
                  {!p.isActive && <Badge tone="rose">Disabled</Badge>}
                </div>
              </div>
              <p className="mt-4 text-3xl font-extrabold text-slate-900">{formatEtb(p.priceEtb)}</p>
              <ul className="mt-4 space-y-1.5 text-sm text-slate-600">
                {p.features.map((f) => <li key={f} className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-brand-600" /> {f}</li>)}
              </ul>
              <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                <span className="text-sm text-slate-500">{p._count.payments} payments</span>
                <Button size="sm" variant="outline" onClick={() => setEdit({ id: p.id, name: p.name, slug: p.slug, priceEtb: p.priceEtb, durationDays: p.durationDays, description: p.description ?? '', features: p.features.join('\n'), isActive: p.isActive, isPopular: p.isPopular, order: p.order })}>
                  <Pencil className="h-4 w-4" /> Edit
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Edit plan' : 'New plan'}>
        {edit && (
          <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
            <Field label="Name"><Input required value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
            <Field label="Slug"><Input required pattern="[a-z0-9-]+" value={edit.slug} onChange={(e) => setEdit({ ...edit, slug: e.target.value })} /></Field>
            <Field label="Price (ETB)"><Input type="number" min={1} required value={edit.priceEtb} onChange={(e) => setEdit({ ...edit, priceEtb: Number(e.target.value) })} /></Field>
            <Field label="Duration (days)"><Input type="number" min={1} required value={edit.durationDays} onChange={(e) => setEdit({ ...edit, durationDays: Number(e.target.value) })} /></Field>
            <Field label="Description" className="sm:col-span-2"><Input value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></Field>
            <Field label="Features (one per line)" className="sm:col-span-2"><Textarea rows={5} value={edit.features} onChange={(e) => setEdit({ ...edit, features: e.target.value })} /></Field>
            <Field label="Order"><Input type="number" value={edit.order} onChange={(e) => setEdit({ ...edit, order: Number(e.target.value) })} /></Field>
            <div className="flex items-end gap-5 pb-2">
              <Switch checked={edit.isActive} onChange={(v) => setEdit({ ...edit, isActive: v })} label="Active" />
              <Switch checked={edit.isPopular} onChange={(v) => setEdit({ ...edit, isPopular: v })} label="Popular" />
            </div>
            <div className="sm:col-span-2"><Button type="submit" loading={saving}>Save plan</Button></div>
          </form>
        )}
      </Modal>
    </div>
  );
}
