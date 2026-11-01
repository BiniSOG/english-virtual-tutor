'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Table, Td, Th } from '@/components/admin/table';
import { Button, ErrorBox, Field, Input, Modal, PageHeader, Skeleton, Textarea } from '@/components/ui';
import { api } from '@/lib/api';
import { useFetch } from '@/lib/hooks';
import type { Level } from '@/lib/types';

type AdminLevel = Level & { _count: { courses: number; practices: number; users: number } };
const BLANK = { code: '', name: '', band: 5, cefr: 'B1', description: '', color: '#3b82f6', order: 1 };

export default function AdminLevels() {
  const { data, loading, error, reload } = useFetch<AdminLevel[]>('/admin/levels');
  const [edit, setEdit] = useState<(typeof BLANK & { id?: string }) | null>(null);
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!edit) return;
    setSaving(true);
    const { id, ...body } = edit;
    try {
      if (id) await api(`/admin/levels/${id}`, { method: 'PATCH', body });
      else await api('/admin/levels', { body });
      toast.success('Level saved');
      setEdit(null);
      reload();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(l: AdminLevel) {
    if (!confirm(`Delete level "${l.name}"?`)) return;
    try {
      await api(`/admin/levels/${l.id}`, { method: 'DELETE' });
      toast.success('Deleted');
      reload();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Levels" text="IELTS-based levels used to organise courses and practices." actions={<Button onClick={() => setEdit({ ...BLANK, order: (data?.length ?? 0) + 1 })}><Plus className="h-4 w-4" /> New level</Button>} />
      {error ? <ErrorBox message={error.message} onRetry={reload} /> : loading && !data ? <Skeleton className="h-72" /> : (
        <Table>
          <thead><tr><Th>#</Th><Th>Level</Th><Th>Band</Th><Th>CEFR</Th><Th>Courses</Th><Th>Practices</Th><Th>Students</Th><Th /></tr></thead>
          <tbody>
            {data?.map((l) => (
              <tr key={l.id}>
                <Td>{l.order}</Td>
                <Td><span className="inline-flex items-center gap-2 font-semibold text-slate-900"><span className="h-3 w-3 rounded-full" style={{ backgroundColor: l.color }} /> {l.name}</span><p className="max-w-sm truncate text-xs text-slate-500">{l.description}</p></Td>
                <Td>{l.band}</Td>
                <Td>{l.cefr}</Td>
                <Td>{l._count.courses}</Td>
                <Td>{l._count.practices}</Td>
                <Td>{l._count.users}</Td>
                <Td className="whitespace-nowrap">
                  <Button size="icon" variant="ghost" onClick={() => setEdit({ id: l.id, code: l.code, name: l.name, band: l.band, cefr: l.cefr, description: l.description, color: l.color, order: l.order })} aria-label="Edit"><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(l)} aria-label="Delete"><Trash2 className="h-4 w-4 text-rose-500" /></Button>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Edit level' : 'New level'}>
        {edit && (
          <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
            <Field label="Name"><Input required value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
            <Field label="Code" hint="UPPER_SNAKE_CASE"><Input required pattern="[A-Z0-9_]+" value={edit.code} onChange={(e) => setEdit({ ...edit, code: e.target.value.toUpperCase() })} /></Field>
            <Field label="IELTS band"><Input type="number" step={0.5} min={0} max={9} required value={edit.band} onChange={(e) => setEdit({ ...edit, band: Number(e.target.value) })} /></Field>
            <Field label="CEFR"><Input required value={edit.cefr} onChange={(e) => setEdit({ ...edit, cefr: e.target.value })} /></Field>
            <Field label="Colour"><Input type="color" value={edit.color} onChange={(e) => setEdit({ ...edit, color: e.target.value })} className="p-1" /></Field>
            <Field label="Order"><Input type="number" value={edit.order} onChange={(e) => setEdit({ ...edit, order: Number(e.target.value) })} /></Field>
            <Field label="Description" className="sm:col-span-2"><Textarea required rows={3} value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></Field>
            <div className="sm:col-span-2"><Button type="submit" loading={saving}>Save</Button></div>
          </form>
        )}
      </Modal>
    </div>
  );
}
