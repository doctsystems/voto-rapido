import CrudPage from '../components/CrudPage';
import { electionTypesApi } from '../lib/api';

export default function ElectionTypesPage() {
  return (
    <CrudPage
      title="Tipos de Elección"
      description="Define los cargos en disputa (Gobernador, Alcalde, Concejal, Asambleísta, etc.)"
      queryKey="election-types"
      fetchFn={electionTypesApi.getAll}
      createFn={electionTypesApi.create}
      updateFn={electionTypesApi.update}
      deleteFn={electionTypesApi.remove}
      fields={[
        { key: 'name', label: 'Nombre del cargo', required: true },
        { key: 'description', label: 'Descripción' },
        { key: 'order', label: 'Orden de presentación', type: 'number' },
      ]}
      columns={[
        { key: 'order', label: '#', render: (v) => <span className="font-mono text-slate-400">{v || 0}</span> },
        { key: 'name', label: 'Tipo de Elección', render: (v) => <span className="font-semibold">{v}</span> },
        { key: 'description', label: 'Descripción', render: (v) => v || '—' },
        { key: 'isActive', label: 'Estado', render: (v) => (
          <span className={`text-xs px-2 py-0.5 rounded-full ${v ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
            {v ? 'Activo' : 'Inactivo'}
          </span>
        )},
      ]}
    />
  );
}
