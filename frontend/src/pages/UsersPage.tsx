import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import CrudPage from '../components/CrudPage';
import { usersApi, partiesApi, tablesApi, schoolsApi } from '../lib/api';
import { useAuthStore } from '../store/auth.store';

const roleBadge: Record<string, { label: string; cls: string }> = {
  ADMIN: { label: 'Admin', cls: 'bg-purple-100 text-purple-700' },
  JEFE_CAMPANA: { label: 'Jefe Campaña', cls: 'bg-blue-100 text-blue-700' },
  JEFE_RECINTO: { label: 'Jefe Recinto', cls: 'bg-teal-100 text-teal-700' },
  DELEGADO: { label: 'Delegado', cls: 'bg-green-100 text-green-700' },
};

export default function UsersPage() {
  const { user } = useAuthStore();
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('');
  // tracks the role currently chosen in the form (to conditionally enable school for JEFE_CAMPANA)
  const [formRole, setFormRole] = useState<string>('');

  const isAdmin = user?.role === 'ADMIN';
  const isJefeCampana = user?.role === 'JEFE_CAMPANA';
  const isJefeRecinto = user?.role === 'JEFE_RECINTO';

  const { data: parties = [] } = useQuery({ queryKey: ['parties'], queryFn: partiesApi.getAll });
  const { data: schools = [] } = useQuery({ queryKey: ['schools'], queryFn: () => schoolsApi.getAll() });

  // School to filter tables: for JEFE_RECINTO -> always own school; others -> selectedSchoolId from form
  const tableFilterSchoolId = isJefeRecinto
    ? (user as any)?.school?.id
    : selectedSchoolId || undefined;

  const { data: allTables = [] } = useQuery({
    queryKey: ['tables', tableFilterSchoolId],
    queryFn: () => tablesApi.getAll(tableFilterSchoolId),
  });

  // ── Role options by actor role ──────────────────────────────────────────────
  const roleOptions = isAdmin
    ? [
      { value: 'ADMIN', label: 'Administrador' },
      { value: 'JEFE_CAMPANA', label: 'Jefe de Campaña' },
      { value: 'JEFE_RECINTO', label: 'Jefe de Recinto' },
      { value: 'DELEGADO', label: 'Delegado' },
    ]
    : isJefeCampana
      ? [
        { value: 'JEFE_RECINTO', label: 'Jefe de Recinto' },
        { value: 'DELEGADO', label: 'Delegado' },
      ]
      : [{ value: 'DELEGADO', label: 'Delegado' }];

  // ── Party options: Admin sees all; others locked to their party ─────────────
  const partyOptions = isAdmin
    ? (parties as any[]).map(p => ({ value: p.id, label: `${p.acronym} — ${p.name}` }))
    : [{ value: (user as any)?.party?.id, label: `${(user as any)?.party?.acronym} — ${(user as any)?.party?.name}` }];

  // ── School options: JEFE_RECINTO locked to own school; others see all ───────
  const schoolOptions = isJefeRecinto
    ? [{ value: (user as any)?.school?.id, label: `[${(user as any)?.school?.codigoRecinto || '?'}] ${(user as any)?.school?.recintoElectoral}` }]
    : (schools as any[]).map(s => ({ value: s.id, label: `[${s.codigoRecinto || '?'}] ${s.recintoElectoral}` }));

  // ── Table options: filtered by selected school (or own school for JEFE_RECINTO)
  const tableOptions = (allTables as any[]).map(t => ({
    value: t.id,
    label: `${t.tableNumber}${t.school ? ' — ' + t.school.recintoElectoral : ''}`,
  }));

  // ── schoolId disabled rules:
  //   JEFE_RECINTO: always locked to own school
  //   JEFE_CAMPANA: editable only when creating a JEFE_RECINTO; otherwise disabled
  //   ADMIN: always editable
  const schoolDisabled = isJefeRecinto
    ? true
    : isJefeCampana
      ? formRole !== 'JEFE_RECINTO'
      : false;

  const fields = [
    { key: 'username', label: 'Usuario', required: true },
    { key: 'fullName', label: 'Nombre completo', required: true },
    { key: 'phone', label: 'Teléfono', required: true },
    { key: 'email', label: 'Email', type: 'email' as const },
    { key: 'password', label: 'Contraseña', type: 'password' as const },
    {
      key: 'role', label: 'Rol',
      type: 'select' as const,
      options: roleOptions,
      disabled: isJefeRecinto, // JEFE_RECINTO always creates DELEGADO
      onChange: (val: string) => setFormRole(val),
    },
    {
      key: 'partyId', label: 'Partido',
      type: 'select' as const,
      options: partyOptions,
      disabled: !isAdmin, // Only ADMIN can change party
    },
    {
      key: 'schoolId', label: 'Recinto asignado (Jefe Recinto)',
      type: 'select' as const,
      options: schoolOptions,
      disabled: schoolDisabled,
      onChange: (val: string) => setSelectedSchoolId(val),
    },
    {
      key: 'tableId', label: 'Mesa asignada (Delegado)',
      type: 'select' as const,
      options: tableOptions,
    },
  ];

  // Default values injected for locked fields
  const defaultValues: Record<string, any> = {};
  if (isJefeRecinto) {
    defaultValues.role = 'DELEGADO';
    defaultValues.partyId = (user as any)?.party?.id;
    defaultValues.schoolId = (user as any)?.school?.id;
  } else if (isJefeCampana) {
    defaultValues.partyId = (user as any)?.party?.id;
    // schoolId intentionally not pre-filled so JEFE_CAMPANA can select it when creating JEFE_RECINTO
  }

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
      defaultValues={defaultValues}
      columns={[
        { key: 'username', label: 'Usuario', render: v => <span className="font-mono font-medium text-black">{v}</span> },
        { key: 'phone', label: 'Teléfono', render: (v: any) => v ? <span className="font-mono text-sm">{v}</span> : <span className="text-body text-xs">—</span> },
        { key: 'fullName', label: 'Nombre' },
        {
          key: 'role', label: 'Rol', render: v => {
            const r = roleBadge[v] || { label: v, cls: 'bg-meta-2 text-body' };
            return <span className={`badge ${r.cls}`}>{r.label}</span>;
          }
        },
        {
          key: 'party', label: 'Partido', render: (_, row) => row.party
            ? <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-md" style={{ backgroundColor: row.party.color }} /><span className="text-sm">{row.party.acronym}</span></div>
            : <span className="text-body text-sm">—</span>
        },
        {
          key: 'table', label: 'Mesa', render: (_, row) => row.table
            ? <span className="font-mono text-xs bg-whiten px-2 py-0.5 rounded border border-stroke">{row.table.tableNumber}</span>
            : <span className="text-body text-sm">—</span>
        },
        {
          key: 'school', label: 'Recinto', render: (_, row) => {
            const s = row.school ?? row.table?.school;
            return s ? <span className="text-xs text-body">{s.recintoElectoral}</span> : <span className="text-body">—</span>;
          }
        },
        {
          key: 'isActive', label: 'Estado', render: v =>
            <span className={`badge ${v ? 'badge-verified' : 'badge-danger'}`}>{v ? 'Activo' : 'Inactivo'}</span>
        },
      ]}
    />
  );
}
