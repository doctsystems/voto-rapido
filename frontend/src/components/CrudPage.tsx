import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '../lib/toast';

export interface Field {
  key: string;
  label: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'select' | 'color' | 'textarea';
  options?: { value: string; label: string }[];
  required?: boolean;
  placeholder?: string;
  colSpan?: boolean; // full width in 2-col grid
}

interface CrudPageProps {
  title: string;
  description?: string;
  queryKey: string;
  fetchFn: () => Promise<any[]>;
  createFn: (data: any) => Promise<any>;
  updateFn: (id: string, data: any) => Promise<any>;
  deleteFn: (id: string) => Promise<any>;
  fields: Field[];
  columns: { key: string; label: string; render?: (val: any, row: any) => React.ReactNode }[];
  canDelete?: boolean;
  canCreate?: boolean;
  extraActions?: (row: any, invalidate: () => void) => React.ReactNode;
}

export default function CrudPage({
  title, description, queryKey, fetchFn, createFn, updateFn, deleteFn,
  fields, columns, canDelete = true, canCreate = true, extraActions,
}: CrudPageProps) {
  const qc = useQueryClient();
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<any>({});
  const [search, setSearch] = useState('');

  const { data = [], isLoading } = useQuery({ queryKey: [queryKey], queryFn: fetchFn });
  const invalidate = () => qc.invalidateQueries({ queryKey: [queryKey] });

  const createMutation = useMutation({
    mutationFn: createFn,
    onSuccess: () => { toast.success('Registrado exitosamente'); invalidate(); closeModal(); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Error al crear'),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => updateFn(id, data),
    onSuccess: () => { toast.success('Actualizado'); invalidate(); closeModal(); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Error al actualizar'),
  });
  const deleteMutation = useMutation({
    mutationFn: deleteFn,
    onSuccess: () => { toast.success('Eliminado'); invalidate(); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Error al eliminar'),
  });

  const openCreate = () => { setForm({}); setModal('create'); };
  const openEdit = (row: any) => {
    const f: any = {};
    fields.forEach(field => {
      // For relational fields (e.g. partyId → party.id), extract .id
      const val = row[field.key];
      if (val && typeof val === 'object' && 'id' in val) f[field.key] = val.id;
      else f[field.key] = val ?? '';
    });
    setForm(f); setEditing(row); setModal('edit');
  };
  const closeModal = () => { setModal(null); setEditing(null); setForm({}); };

  const handleSave = () => {
    const data = { ...form };
    if (modal === 'edit' && data.password === '') delete data.password;
    for (const f of fields) {
      if (f.required && !data[f.key]) return toast.error(`${f.label} es obligatorio`);
    }
    if (modal === 'create') createMutation.mutate(data);
    else updateMutation.mutate({ id: editing.id, data });
  };

  const filtered = search
    ? (data as any[]).filter(row =>
        Object.values(row).some(v =>
          typeof v === 'string' && v.toLowerCase().includes(search.toLowerCase())
        )
      )
    : (data as any[]);

  const hasGrid = fields.some(f => f.colSpan);

  return (
    <div>
      {/* Page header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-black">{title}</h2>
          {description && <p className="text-sm text-body mt-0.5">{description}</p>}
        </div>
        {canCreate && (
          <button onClick={openCreate} className="btn-primary self-start sm:self-auto">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M12 4v16m8-8H4"/></svg>
            Nuevo {title}
          </button>
        )}
      </div>

      {/* Table card */}
      <div className="card">
        {/* Search + count bar */}
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-stroke">
          <div className="relative">
            <input
              type="text" placeholder={`Buscar en ${title.toLowerCase()}...`}
              value={search} onChange={e => setSearch(e.target.value)}
              className="input h-9 pl-8 text-xs max-w-xs"
            />
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-body" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </div>
          <span className="text-xs text-body whitespace-nowrap">{filtered.length} registro(s)</span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <svg className="w-8 h-8 animate-spin text-primary" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-body">
            <svg className="w-12 h-12 text-stroke mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
            <p className="text-sm">Sin registros{search ? ` para "${search}"` : ''}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="ta-table">
              <thead>
                <tr>
                  {columns.map(col => <th key={col.key+col.label}>{col.label}</th>)}
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row: any) => (
                  <tr key={row.id}>
                    {columns.map(col => (
                      <td key={col.key+col.label} className="text-black">
                        {col.render ? col.render(row[col.key], row) : String(row[col.key] ?? '—')}
                      </td>
                    ))}
                    <td>
                      <div className="flex items-center justify-end gap-3">
                        {extraActions?.(row, invalidate)}
                        <button onClick={() => openEdit(row)} className="text-xs font-medium text-primary hover:underline">
                          Editar
                        </button>
                        {canDelete && (
                          <button
                            onClick={() => { if (confirm('¿Eliminar este registro?')) deleteMutation.mutate(row.id); }}
                            className="text-xs font-medium text-meta-1 hover:underline"
                          >
                            Eliminar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="bg-white rounded-xl border border-black/[.06] shadow-default w-full max-w-lg max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between border-b border-stroke px-6 py-4">
              <h3 className="text-lg font-semibold text-black">
                {modal === 'create' ? `Nuevo ${title}` : `Editar ${title}`}
              </h3>
              <button onClick={closeModal} className="text-body hover:text-black">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>

            <div className={`p-6 ${hasGrid ? 'grid grid-cols-2 gap-4' : 'space-y-4'}`}>
              {fields.map(field => (
                <div key={field.key} className={hasGrid && field.colSpan ? 'col-span-2' : ''}>
                  <label className="label">
                    {field.label}
                    {field.required && <span className="text-meta-1 ml-0.5">*</span>}
                  </label>
                  {field.type === 'select' ? (
                    <select
                      value={form[field.key] || ''}
                      onChange={e => setForm({ ...form, [field.key]: e.target.value })}
                      className="input"
                    >
                      <option value="">— Seleccionar —</option>
                      {field.options?.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  ) : field.type === 'color' ? (
                    <div className="flex items-center gap-3">
                      <input type="color"
                        value={form[field.key] || '#3C50E0'}
                        onChange={e => setForm({ ...form, [field.key]: e.target.value })}
                        className="h-10 w-16 cursor-pointer rounded-xl border border-stroke"
                      />
                      <input type="text"
                        value={form[field.key] || ''}
                        onChange={e => setForm({ ...form, [field.key]: e.target.value })}
                        className="input flex-1"
                        placeholder="#3C50E0"
                      />
                    </div>
                  ) : field.type === 'textarea' ? (
                    <textarea
                      value={form[field.key] || ''}
                      onChange={e => setForm({ ...form, [field.key]: e.target.value })}
                      className="input resize-none"
                      rows={3}
                      placeholder={field.placeholder}
                    />
                  ) : (
                    <input
                      type={field.type || 'text'}
                      value={form[field.key] || ''}
                      onChange={e => setForm({ ...form, [field.key]: e.target.value })}
                      className="input"
                      placeholder={field.type === 'password' && modal === 'edit' ? 'Dejar vacío para no cambiar' : field.placeholder}
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-stroke px-6 py-4">
              <button onClick={closeModal} className="btn-secondary">Cancelar</button>
              <button
                onClick={handleSave}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="btn-primary"
              >
                {createMutation.isPending || updateMutation.isPending ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
