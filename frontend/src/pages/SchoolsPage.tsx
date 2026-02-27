import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { schoolsApi } from '../lib/api';

const DEFAULTS = {
  departamento: 'Tarija',
  provincia: 'Arce',
  municipio: 'Bermejo',
  asientoElectoral: 'Bermejo',
  localidad: 'Bermejo',
  circunscripcion: 42,
};

export default function SchoolsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [selected, setSelected] = useState<any>(null);
  const [form, setForm] = useState<any>({});

  const { data: schools = [], isLoading } = useQuery({
    queryKey: ['schools', search],
    queryFn: () => schoolsApi.getAll(search || undefined),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['schools'] });

  const createMutation = useMutation({
    mutationFn: schoolsApi.create,
    onSuccess: () => { toast.success('Recinto creado'); invalidate(); setModal(null); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Error'),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => schoolsApi.update(id, data),
    onSuccess: () => { toast.success('Recinto actualizado'); invalidate(); setModal(null); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Error'),
  });
  const deleteMutation = useMutation({
    mutationFn: schoolsApi.remove,
    onSuccess: () => { toast.success('Recinto eliminado'); invalidate(); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Error'),
  });

  const openCreate = () => { setForm({ ...DEFAULTS }); setModal('create'); };
  const openEdit = (s: any) => {
    setSelected(s);
    setForm({
      recintoElectoral: s.recintoElectoral, codigoRecinto: s.codigoRecinto || '',
      departamento: s.departamento || '', provincia: s.provincia || '',
      municipio: s.municipio || '', asientoElectoral: s.asientoElectoral || '',
      localidad: s.localidad || '', circunscripcion: s.circunscripcion || '',
    });
    setModal('edit');
  };

  const fields = [
    { key: 'codigoRecinto',    label: 'Código Recinto' },
    { key: 'recintoElectoral', label: 'Recinto Electoral', required: true },
    { key: 'departamento',     label: 'Departamento' },
    { key: 'provincia',        label: 'Provincia' },
    { key: 'municipio',        label: 'Municipio' },
    { key: 'asientoElectoral', label: 'Asiento Electoral' },
    { key: 'localidad',        label: 'Localidad' },
    { key: 'circunscripcion',  label: 'Circunscripción', type: 'number' },
  ];

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-brand-800">Recintos Electorales</h1>
          <p className="text-slate-500 text-sm mt-0.5">Gestión de recintos donde se instalan las mesas de votación</p>
        </div>
        <button onClick={openCreate} className="btn-primary">✚ Nuevo Recinto</button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text" placeholder="🔍 Buscar por nombre, código o municipio..."
          value={search} onChange={e => setSearch(e.target.value)}
          className="input max-w-sm"
        />
      </div>

      {isLoading ? (
        <div className="card p-10 text-center text-slate-400">Cargando...</div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Código', 'Recinto Electoral', 'Municipio', 'Circ.', 'Mesas', 'Estado', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-semibold text-slate-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(schools as any[]).map((s: any) => (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs bg-slate-50 text-slate-500">{s.codigoRecinto || '—'}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{s.recintoElectoral}</td>
                  <td className="px-4 py-3 text-slate-500">{s.municipio || '—'}</td>
                  <td className="px-4 py-3 text-slate-500 font-mono">{s.circunscripcion || '—'}</td>
                  <td className="px-4 py-3 font-mono font-semibold text-brand-700">
                    {Array.isArray(s.tables) ? s.tables.length : 0}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${s.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                      {s.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(s)} className="text-brand-500 hover:text-brand-700 text-xs font-medium">Editar</button>
                      <button
                        onClick={() => { if (confirm(`¿Eliminar "${s.recintoElectoral}"?`)) deleteMutation.mutate(s.id); }}
                        className="text-red-400 hover:text-red-600 text-xs font-medium">Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
              {(schools as any[]).length === 0 && (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">No se encontraron recintos.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white">
              <h2 className="font-display font-bold text-lg text-brand-800">
                {modal === 'create' ? 'Nuevo Recinto Electoral' : 'Editar Recinto'}
              </h2>
              <button onClick={() => setModal(null)} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              {fields.map(f => (
                <div key={f.key} className={f.key === 'recintoElectoral' ? 'col-span-2' : ''}>
                  <label className="label">{f.label}{f.required && <span className="text-red-500 ml-0.5">*</span>}</label>
                  <input
                    type={f.type || 'text'}
                    value={form[f.key] ?? ''}
                    onChange={e => setForm({ ...form, [f.key]: f.type === 'number' ? parseInt(e.target.value) || '' : e.target.value })}
                    className="input"
                  />
                </div>
              ))}
            </div>
            <div className="px-6 pb-6 flex justify-end gap-3">
              <button onClick={() => setModal(null)} className="btn-secondary">Cancelar</button>
              <button
                onClick={() => modal === 'create' ? createMutation.mutate(form) : updateMutation.mutate({ id: selected.id, data: form })}
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
