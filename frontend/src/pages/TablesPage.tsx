import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '../lib/toast';
import { tablesApi, schoolsApi } from '../lib/api';

export default function TablesPage() {
  const qc = useQueryClient();

  // Schools para el selector
  const { data: schools = [] } = useQuery({
    queryKey: ['schools-all'],
    queryFn: () => schoolsApi.getAll(),
  });

  // Mesas — sin pasar argumentos para no recibir el QueryFunctionContext
  const { data: tables = [], isLoading } = useQuery({
    queryKey: ['tables'],
    queryFn: () => tablesApi.getAll(),
  });

  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState({ tableNumber: '', schoolId: '', totalVoters: '' });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['tables'] });

  const createMutation = useMutation({
    mutationFn: (data: any) => tablesApi.create(data),
    onSuccess: () => { toast.success('Mesa creada'); invalidate(); closeModal(); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Error al crear'),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => tablesApi.update(id, data),
    onSuccess: () => { toast.success('Mesa actualizada'); invalidate(); closeModal(); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Error al actualizar'),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => tablesApi.remove(id),
    onSuccess: () => { toast.success('Mesa eliminada'); invalidate(); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Error al eliminar'),
  });

  const openCreate = () => {
    setForm({ tableNumber: '', schoolId: '', totalVoters: '' });
    setEditing(null);
    setModal('create');
  };

  const openEdit = (row: any) => {
    setForm({
      tableNumber: row.tableNumber || '',
      // row.school es el objeto relación; extraemos su id para el select
      schoolId: row.school?.id || '',
      totalVoters: row.totalVoters != null ? String(row.totalVoters) : '',
    });
    setEditing(row);
    setModal('edit');
  };

  const closeModal = () => { setModal(null); setEditing(null); };

  const handleSave = () => {
    const payload = {
      tableNumber: form.tableNumber,
      schoolId: form.schoolId || undefined,
      totalVoters: form.totalVoters ? parseInt(form.totalVoters) : undefined,
    };
    if (!form.tableNumber) return toast.error('El número de mesa es obligatorio');
    if (modal === 'create') createMutation.mutate(payload);
    else updateMutation.mutate({ id: editing.id, data: payload });
  };

  const schoolOptions = (schools as any[]).map((s: any) => ({
    value: s.id,
    label: s.codigoRecinto ? `[${s.codigoRecinto}] ${s.recintoElectoral}` : s.recintoElectoral,
  }));

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-black">Mesas de Votación</h1>
          <p className="text-sm text-body mt-0.5">Mesas electorales agrupadas por recinto electoral</p>
        </div>
        <button onClick={openCreate} className="btn-primary">✚ Nueva Mesa</button>
      </div>

      {isLoading ? (
        <div className="card p-10 text-center text-bodydark">Cargando...</div>
      ) : (tables as any[]).length === 0 ? (
        <div className="card p-10 text-center text-slate-500">Sin mesas registradas</div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-whiten border-b border-stroke">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-body">Mesa</th>
                <th className="text-left px-4 py-3 font-semibold text-body">Recinto Electoral</th>
                <th className="text-right px-4 py-3 font-semibold text-body">Padrón</th>
                <th className="text-right px-4 py-3 font-semibold text-body">Delegados</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(tables as any[]).map((row: any) => (
                <tr key={row.id} className="hover:bg-whiten transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-mono font-bold text-primary bg-whiten px-2 py-0.5 rounded">
                      {row.tableNumber}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {row.school ? (
                      <div>
                        <div className="font-medium text-black">{row.school.recintoElectoral}</div>
                        {row.school.codigoRecinto && (
                          <div className="text-xs font-mono text-bodydark">#{row.school.codigoRecinto}</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-bodydark italic text-sm">Sin asignar</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {row.totalVoters != null
                      ? <span className="font-mono font-semibold text-primary">{row.totalVoters.toLocaleString()}</span>
                      : <span className="text-bodydark">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sm">
                    {Array.isArray(row.delegates) ? row.delegates.length : 0}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button onClick={() => openEdit(row)} className="text-primary hover:text-primary-700 text-xs font-semibold">Editar</button>
                      <button
                        onClick={() => { if (confirm(`¿Eliminar mesa ${row.tableNumber}?`)) deleteMutation.mutate(row.id); }}
                        className="text-meta-1 hover:text-red-700 text-xs font-semibold"
                      >Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal crear/editar */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-sm shadow-default border border-stroke w-full max-w-md">
            <div className="p-6 border-b border-stroke flex justify-between items-center">
              <h2 className="text-lg font-bold text-black">
                {modal === 'create' ? 'Nueva Mesa' : 'Editar Mesa'}
              </h2>
              <button onClick={closeModal} className="text-bodydark hover:text-body text-xl">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="label">Número de Mesa <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={form.tableNumber}
                  onChange={e => setForm({ ...form, tableNumber: e.target.value })}
                  className="input"
                  placeholder="Ej: M001"
                />
              </div>
              <div>
                <label className="label">Recinto Electoral</label>
                <select
                  value={form.schoolId}
                  onChange={e => setForm({ ...form, schoolId: e.target.value })}
                  className="input"
                >
                  <option value="">— Sin asignar —</option>
                  {schoolOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                {schoolOptions.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">⚠ No hay recintos registrados. Crea uno primero.</p>
                )}
              </div>
              <div>
                <label className="label">Total votantes habilitados (padrón)</label>
                <input
                  type="number"
                  min={0}
                  value={form.totalVoters}
                  onChange={e => setForm({ ...form, totalVoters: e.target.value })}
                  className="input"
                  placeholder="Ej: 300"
                />
              </div>
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
