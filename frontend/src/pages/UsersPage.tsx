import { useQuery } from '@tanstack/react-query';
import CrudPage from '../components/CrudPage';
import { usersApi, partiesApi, tablesApi } from '../lib/api';
import { useAuthStore } from '../store/auth.store';

const roleLabel: Record<string, string> = {
  ADMIN: 'Admin',
  JEFE_CAMPANA: 'Jefe Campaña',
  DELEGADO: 'Delegado',
};

export default function UsersPage() {
  const { user } = useAuthStore();
  const { data: parties = [] } = useQuery({ queryKey: ['parties'], queryFn: partiesApi.getAll });
  const { data: tables = [] } = useQuery({ queryKey: ['tables'], queryFn: tablesApi.getAll });

  const fields = [
    { key: 'username', label: 'Usuario', required: true },
    { key: 'email', label: 'Email', type: 'email' as const, required: true },
    { key: 'fullName', label: 'Nombre completo', required: true },
    { key: 'password', label: 'Contraseña', type: 'password' as const },
    ...(user?.role === 'ADMIN' ? [{
      key: 'role', label: 'Rol', type: 'select' as const,
      options: [
        { value: 'ADMIN', label: 'Administrador' },
        { value: 'JEFE_CAMPANA', label: 'Jefe de Campaña' },
        { value: 'DELEGADO', label: 'Delegado' },
      ],
    }] : []),
    {
      key: 'partyId', label: 'Partido', type: 'select' as const,
      options: (parties as any[]).map(p => ({ value: p.id, label: `${p.acronym} - ${p.name}` })),
    },
    {
      key: 'tableId', label: 'Mesa', type: 'select' as const,
      options: (tables as any[]).map(t => ({ value: t.id, label: `${t.tableNumber} - ${t.location}` })),
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
        { key: 'role', label: 'Rol', render: (v) => (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            v === 'ADMIN' ? 'bg-purple-100 text-purple-700' :
            v === 'JEFE_CAMPANA' ? 'bg-blue-100 text-blue-700' :
            'bg-green-100 text-green-700'
          }`}>{roleLabel[v] || v}</span>
        )},
        { key: 'party', label: 'Partido', render: (_, row) => row.party ? (
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: row.party.color }} />
            <span>{row.party.acronym}</span>
          </div>
        ) : '—'},
        { key: 'table', label: 'Mesa', render: (_, row) => row.table ? (
          <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded">{row.table.tableNumber}</span>
        ) : '—'},
        { key: 'isActive', label: 'Estado', render: (v) => (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${v ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {v ? 'Activo' : 'Inactivo'}
          </span>
        )},
      ]}
    />
  );
}
