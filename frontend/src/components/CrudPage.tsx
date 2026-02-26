import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

interface Field {
  key: string;
  label: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'select' | 'color';
  options?: { value: string; label: string }[];
  required?: boolean;
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
}

export default function CrudPage({
  title, description, queryKey, fetchFn, createFn, updateFn, deleteFn,
  fields, columns, canDelete = true, canCreate = true,
}: CrudPageProps) {
  const qc = useQueryClient();
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<any>({});

  const { data = [], isLoading } = useQuery({ queryKey: [queryKey], queryFn: fetchFn });

  const invalidate = () => qc.invalidateQueries({ queryKey: [queryKey] });

  const createMutation = useMutation({
    mutationFn: createFn,
    onSuccess: () => { toast.success('Creado exitosamente'); invalidate(); closeModal(); },
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
    fields.forEach(field => { f[field.key] = row[field.key] ?? ''; });
    setForm(f); setEditing(row); setModal('edit');
  };
  const closeModal = () => { setModal(null); setEditing(null); setForm({}); };

  const handleSave = () => {
    // Remove empty password fields on update
    const data = { ...form };
    if (modal === 'edit' && data.password === '') delete data.password;
    if (modal === 'create') createMutation.mutate(data);
    else updateMutation.mutate({ id: editing.id, data });
  };

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-brand-800">{title}</h1>
          {description && <p className="text-slate-500 text-sm mt-0.5">{description}</p>}
        </div>
        {canCreate && (
          <button onClick={openCreate} className="btn-primary flex items-center gap-1.5">
            ✚ Nuevo
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="card p-10 text-center text-slate-400">Cargando...</div>
      ) : (data as any[]).length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-slate-500">Sin registros aún</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {columns.map(col => (
                  <th key={col.key} className="text-left px-4 py-3 font-semibold text-slate-600">{col.label}</th>
                ))}
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(data as any[]).map((row: any) => (
                <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                  {columns.map(col => (
                    <td key={col.key} className="px-4 py-3 text-slate-700">
                      {col.render ? col.render(row[col.key], row) : String(row[col.key] ?? '—')}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(row)} className="text-brand-500 hover:text-brand-700 text-xs font-medium">
                        Editar
                      </button>
                      {canDelete && (
                        <button
                          onClick={() => { if (confirm('¿Eliminar este registro?')) deleteMutation.mutate(row.id); }}
                          className="text-red-500 hover:text-red-700 text-xs font-medium"
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

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="font-display font-bold text-lg text-brand-800">
                {modal === 'create' ? `Nuevo ${title}` : `Editar ${title}`}
              </h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
            </div>
            <div className="p-6 space-y-4">
              {fields.map(field => (
                <div key={field.key}>
                  <label className="label">{field.label}</label>
                  {field.type === 'select' ? (
                    <select
                      value={form[field.key] || ''}
                      onChange={e => setForm({ ...form, [field.key]: e.target.value })}
                      className="input"
                    >
                      <option value="">Seleccionar...</option>
                      {field.options?.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.type || 'text'}
                      value={form[field.key] || ''}
                      onChange={e => setForm({ ...form, [field.key]: e.target.value })}
                      className="input"
                      placeholder={field.type === 'password' && modal === 'edit' ? 'Dejar vacío para no cambiar' : ''}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="px-6 pb-6 flex justify-end gap-3">
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
