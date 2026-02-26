import CrudPage from '../components/CrudPage';
import { schoolsApi } from '../lib/api';

export default function SchoolsPage() {
  return (
    <CrudPage
      title="Unidades Educativas"
      description="Recintos electorales donde se instalan las mesas de votación"
      queryKey="schools"
      fetchFn={schoolsApi.getAll}
      createFn={schoolsApi.create}
      updateFn={schoolsApi.update}
      deleteFn={schoolsApi.remove}
      fields={[
        { key: 'name',          label: 'Nombre de la unidad educativa', required: true },
        { key: 'code',          label: 'Código SIE / interno' },
        { key: 'address',       label: 'Dirección' },
        { key: 'parish',        label: 'Parroquia / OTB' },
        { key: 'municipality',  label: 'Municipio' },
        { key: 'province',      label: 'Departamento / Provincia' },
        { key: 'phone',         label: 'Teléfono' },
        { key: 'principalName', label: 'Director(a)' },
      ]}
      columns={[
        {
          key: 'code',
          label: 'Código',
          render: (v) => v
            ? <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded">{v}</span>
            : '—',
        },
        { key: 'name', label: 'Nombre', render: (v) => <span className="font-medium">{v}</span> },
        { key: 'municipality',  label: 'Municipio' },
        { key: 'province',      label: 'Departamento' },
        { key: 'principalName', label: 'Director(a)', render: (v) => v || '—' },
        {
          key: 'tables',
          label: 'Mesas',
          render: (v) => (
            <span className="font-mono font-semibold text-brand-700">
              {Array.isArray(v) ? v.length : 0}
            </span>
          ),
        },
        {
          key: 'isActive',
          label: 'Estado',
          render: (v) => (
            <span className={`text-xs px-2 py-0.5 rounded-full ${v ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
              {v ? 'Activa' : 'Inactiva'}
            </span>
          ),
        },
      ]}
    />
  );
}
