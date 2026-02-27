import { useQuery } from '@tanstack/react-query';
import CrudPage from '../components/CrudPage';
import { usersApi, partiesApi, tablesApi, schoolsApi } from '../lib/api';
import { useAuthStore } from '../store/auth.store';

const roleLabel: Record<string, string> = {
  ADMIN: 'Admin',
  JEFE_CAMPANA: 'Jefe Campaña',
  JEFE_RECINTO: 'Jefe Recinto',
  DELEGADO: 'Delegado',
};

const roleBadgeClass: Record<string, string> = {
  ADMIN: 'bg-purple-100 text-purple-700',
  JEFE_CAMPANA: 'bg-blue-100 text-blue-700',
  JEFE_RECINTO: 'bg-teal-100 text-teal-700',
  DELEGADO: 'bg-green-100 text-green-700',
};

export default function UsersPage() {
  const { user } = useAuthStore();
  const { data: parties = [] } = useQuery({ queryKey: ['parties'], queryFn: partiesApi.getAll });
  const { data: tables = [] }  = useQuery({ queryKey: ['tables'],  queryFn: () => tablesApi.getAll() });
  const { data: schools = [] } = useQuery({ queryKey: ['schools'], queryFn: () => schoolsApi.getAll() });

  const roleOptions = user?.role === 'ADMIN'
    ? [
        { value: 'ADMIN',         label: 'Administrador' },
        { value: 'JEFE_CAMPANA',  label: 'Jefe de Campaña' },
        { value: 'JEFE_RECINTO',  label: 'Jefe de Recinto' },
        { value: 'DELEGADO',      label: 'Delegado' },
      ]
    : user?.role === 'JEFE_CAMPANA'
      ? [
          { value: 'JEFE_RECINTO', label: 'Jefe de Recinto' },
          { value: 'DELEGADO',     label: 'Delegado' },
        ]
      : [{ value: 'DELEGADO', label: 'Delegado' }];

  const fields = [
    { key: 'username',  label: 'Usuario',         required: true },
    { key: 'email',     label: 'Email',            type: 'email' as const, required: true },
    { key: 'fullName',  label: 'Nombre completo',  required: true },
    { key: 'password',  label: 'Contraseña',       type: 'password' as const },
    {
      key: 'role', label: 'Rol', type: 'select' as const,
      options: roleOptions,
    },
    {
      key: 'partyId', label: 'Partido', type: 'select' as const,
      options: (parties as any[]).map(p => ({ value: p.id, label: `${p.acronym} — ${p.name}` })),
    },
    {
      key: 'tableId', label: 'Mesa (Delegado)', type: 'select' as const,
      options: (tables as any[]).map(t => ({
        value: t.id,
        label: `${t.tableNumber}${t.school ? ` — ${t.school.recintoElectoral}` : ''}`,
      })),
    },
    {
      key: 'schoolId', label: 'Recinto (Jefe de Recinto)', type: 'select' as const,
      options: (schools as any[]).map(s => ({
        value: s.id,
        label: `[${s.codigoRecinto || '?'}] ${s.recintoElectoral}`,
      })),
    },
  ];

  return (
    <CrudPage
      title="Usuarios"
      description="Gestión de usuarios del sistema electoral"
      queryKey="users"
      fetchFn={usersApi.getAll}
      createFn={usersApi.create}
      updateFn={usersApi.update}
      deleteFn={usersApi.remove}
      canDelete={user?.role === 'ADMIN'}
      fields={fields}
      columns={[
        { key: 'username', label: 'Usuario', render: (v) => <span className="font-mono font-medium">{v}</span> },
        { key: 'fullName', label: 'Nombre' },
        {
          key: 'role', label: 'Rol',
          render: (v) => (
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${roleBadgeClass[v] || 'bg-slate-100 text-slate-600'}`}>
              {roleLabel[v] || v}
            </span>
          ),
        },
        {
          key: 'party', label: 'Partido',
          render: (_, row) => row.party
            ? <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-sm" style={{ backgroundColor: row.party.color }} /><span>{row.party.acronym}</span></div>
            : '—',
        },
        {
          key: 'table', label: 'Mesa',
          render: (_, row) => row.table
            ? <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded">{row.table.tableNumber}</span>
            : '—',
        },
        {
          key: 'school', label: 'Recinto',
          render: (_, row) => {
            // JEFE_RECINTO has school directly; DELEGADO inherits from table.school
            const s = row.school ?? row.table?.school;
            return s ? <span className="text-xs text-slate-500">{s.recintoElectoral}</span> : '—';
          },
        },
        {
          key: 'isActive', label: 'Estado',
          render: (v) => (
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${v ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {v ? 'Activo' : 'Inactivo'}
            </span>
          ),
        },
      ]}
    />
  );
}
