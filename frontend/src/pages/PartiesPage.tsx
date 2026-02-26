import CrudPage from '../components/CrudPage';
import { partiesApi } from '../lib/api';

export default function PartiesPage() {
  return (
    <CrudPage
      title="Partidos Políticos"
      description="Gestión de partidos participantes en las elecciones"
      queryKey="parties"
      fetchFn={partiesApi.getAll}
      createFn={partiesApi.create}
      updateFn={partiesApi.update}
      deleteFn={partiesApi.remove}
      fields={[
        { key: 'name', label: 'Nombre del partido', required: true },
        { key: 'acronym', label: 'Siglas', required: true },
        { key: 'color', label: 'Color (hex)', type: 'color' },
      ]}
      columns={[
        { key: 'acronym', label: 'Siglas', render: (v, row) => (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: row.color || '#999' }} />
            <span className="font-mono font-bold">{v}</span>
          </div>
        )},
        { key: 'name', label: 'Nombre' },
        { key: 'color', label: 'Color', render: (v) => v ? (
          <span className="font-mono text-xs">{v}</span>
        ) : '—'},
        { key: 'isActive', label: 'Estado', render: (v) => (
          <span className={`text-xs px-2 py-0.5 rounded-full ${v ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
            {v ? 'Activo' : 'Inactivo'}
          </span>
        )},
      ]}
    />
  );
}
