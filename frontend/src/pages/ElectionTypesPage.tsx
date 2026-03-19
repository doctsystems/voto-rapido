import CrudPage from '../components/CrudPage';
import { electionTypesApi } from '../lib/api';

export default function ElectionTypesPage() {
  return (
    <CrudPage
      title="Tipos de Elección"
      description="Cargos y categorías electorales disponibles en el sistema"
      queryKey={["election-types"]}
      fetchFn={electionTypesApi.getAll}
      createFn={electionTypesApi.create}
      updateFn={electionTypesApi.update}
      deleteFn={electionTypesApi.remove}
      fields={[
        { key: 'name', label: 'Nombre del cargo', required: true, placeholder: 'Ej: Gobernador' },
        { key: 'description', label: 'Descripción', type: 'textarea', placeholder: 'Descripción del cargo...' },
        { key: 'order', label: 'Orden de aparición', type: 'number', placeholder: '1' },
      ]}
      columns={[
        { key: 'order', label: '#', render: v => <span className="font-medium text-black">{v ?? '—'}</span> },
        { key: 'name', label: 'Cargo', render: v => <span className="font-medium text-black">{v}</span> },
      ]}
    />
  );
}
