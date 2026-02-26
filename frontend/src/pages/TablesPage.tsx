import { useQuery } from '@tanstack/react-query';
import CrudPage from '../components/CrudPage';
import { tablesApi, schoolsApi } from '../lib/api';

export default function TablesPage() {
  const { data: schools = [] } = useQuery({
    queryKey: ['schools'],
    queryFn: schoolsApi.getAll,
  });

  return (
    <CrudPage
      title="Mesas de Votación"
      description="Mesas electorales agrupadas por unidad educativa"
      queryKey="tables"
      fetchFn={tablesApi.getAll}
      createFn={tablesApi.create}
      updateFn={tablesApi.update}
      deleteFn={tablesApi.remove}
      fields={[
        { key: 'tableNumber', label: 'Número de Mesa', required: true },
        {
          key: 'schoolId',
          label: 'Unidad Educativa',
          type: 'select',
          options: (schools as any[]).map((s: any) => ({
            value: s.id,
            label: s.code ? `[${s.code}] ${s.name}` : s.name,
          })),
        },
        { key: 'totalVoters', label: 'Total votantes habilitados', type: 'number' },
      ]}
      columns={[
        {
          key: 'tableNumber',
          label: 'Mesa',
          render: (v) => (
            <span className="font-mono font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded">
              {v}
            </span>
          ),
        },
        {
          key: 'school',
          label: 'Unidad Educativa',
          render: (_, row) =>
            row.school ? (
              <div>
                <div className="font-medium text-slate-800 text-sm">{row.school.name}</div>
                {row.school.code && (
                  <div className="text-xs font-mono text-slate-400">{row.school.code}</div>
                )}
              </div>
            ) : (
              <span className="text-slate-400 text-sm italic">Sin asignar</span>
            ),
        },
        {
          key: 'school',
          label: 'Ubicación',
          render: (_, row) =>
            row.school ? (
              <span className="text-sm text-slate-500">
                {[row.school.parish, row.school.municipality].filter(Boolean).join(', ')}
              </span>
            ) : '—',
        },
        {
          key: 'totalVoters',
          label: 'Votantes',
          render: (v) => v ? v.toLocaleString() : '—',
        },
        {
          key: 'delegates',
          label: 'Delegados',
          render: (v) => (
            <span className="font-mono text-sm">{Array.isArray(v) ? v.length : 0}</span>
          ),
        },
      ]}
    />
  );
}

