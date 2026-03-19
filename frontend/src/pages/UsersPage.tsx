import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
import CrudPage from "../components/CrudPage";
import { usersApi, partiesApi, tablesApi, schoolsApi } from "../lib/api";
import { useAuthStore } from "../store/auth.store";

const roleBadge: Record<string, { label: string; cls: string }> = {
  ADMIN: { label: "Admin", cls: "bg-purple-100 text-purple-700" },
  JEFE_CAMPANA: { label: "Jefe Campaña", cls: "bg-blue-100 text-blue-700" },
  JEFE_RECINTO: { label: "Jefe Recinto", cls: "bg-teal-100 text-teal-700" },
  DELEGADO: { label: "Delegado", cls: "bg-green-100 text-green-700" },
};

export default function UsersPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === "ADMIN";
  const isJefeCampana = user?.role === "JEFE_CAMPANA";
  const isJefeRecinto = user?.role === "JEFE_RECINTO";
  const isAdminOrJefe = isAdmin || isJefeCampana;
  const canManageRow = (row: any) => {
    if (isAdmin) return true;
    if (isJefeCampana) return row.role === "JEFE_RECINTO";
    if (isJefeRecinto) return row.role === "DELEGADO";
    return false;
  };
  const jefeCampanaPartyId = isJefeCampana ? ((user as any)?.party?.id || "") : "";

  const [selectedSchoolId, setSelectedSchoolId] = useState<string>("");
  const [formRole, setFormRole] = useState<string>(
    isJefeCampana ? "JEFE_RECINTO" : isJefeRecinto ? "DELEGADO" : "",
  );

  // Table view filter
  const [filterSchool, setFilterSchool] = useState<string>(
    isAdminOrJefe ? "" : ((user as any)?.school?.id || "")
  );
  const [filterParty, setFilterParty] = useState<string>(
    isAdmin ? "" : ((user as any)?.party?.id || "")
  );

  if (user?.role === "DELEGADO") {
    return <Navigate to="/" replace />;
  }

  const { data: parties = [] } = useQuery({
    queryKey: ["parties"],
    queryFn: partiesApi.getAll,
  });
  const { data: schools = [] } = useQuery({
    queryKey: ["schools"],
    queryFn: () => schoolsApi.getAll(),
  });

  // School to filter tables: for JEFE_RECINTO -> always own school; others -> selectedSchoolId from form
  const tableFilterSchoolId = isJefeRecinto
    ? (user as any)?.school?.id
    : selectedSchoolId || undefined;

  const { data: allTables = [] } = useQuery({
    queryKey: ["tables", tableFilterSchoolId],
    queryFn: () => tablesApi.getAll(tableFilterSchoolId),
  });

  // ── Role options by actor role ──────────────────────────────────────────────
  const roleOptions = isAdmin
    ? [
      { value: "ADMIN", label: "Administrador" },
      { value: "JEFE_CAMPANA", label: "Jefe de Campaña" },
      { value: "JEFE_RECINTO", label: "Jefe de Recinto" },
      { value: "DELEGADO", label: "Delegado" },
    ]
    : isJefeCampana
      ? [{ value: "JEFE_RECINTO", label: "Jefe de Recinto" }]
      : [{ value: "DELEGADO", label: "Delegado" }];

  // ── Party options: Admin sees all; others locked to their party ─────────────
  const partyOptions = isAdmin
    ? (parties as any[]).map((p) => ({
      value: p.id,
      label: `${p.acronym} — ${p.name}`,
    }))
    : [
      {
        value: (user as any)?.party?.id,
        label: `${(user as any)?.party?.acronym} — ${(user as any)?.party?.name}`,
      },
    ];

  // ── School options: JEFE_RECINTO locked to own school; others see all ───────
  const schoolOptions = isJefeRecinto
    ? [
      {
        value: (user as any)?.school?.id,
        label: `[${(user as any)?.school?.codigoRecinto || "?"}] ${(user as any)?.school?.nombreRecinto}`,
      },
    ]
    : (schools as any[]).map((s) => ({
      value: s.id,
      label: `[${s.codigoRecinto || "?"}] ${s.nombreRecinto}`,
    }));

  // ── Table options: filtered by selected school (or own school for JEFE_RECINTO)
  const tableOptions = (allTables as any[]).map((t) => ({
    value: t.id,
    label: `${t.tableNumber}${t.school ? " — " + t.school.nombreRecinto : ""}`,
  }));

  const effectiveFormRole =
    formRole || (isJefeCampana ? "JEFE_RECINTO" : isJefeRecinto ? "DELEGADO" : "");

  // ── schoolId disabled rules:
  //   JEFE_RECINTO: always locked to own school
  //   JEFE_CAMPANA: editable only when creating a JEFE_RECINTO; otherwise disabled
  //   ADMIN: always editable
  const schoolDisabled = isJefeRecinto
    ? true
    : isJefeCampana
      ? effectiveFormRole !== "JEFE_RECINTO"
      : false;
  const tableDisabled = effectiveFormRole !== "DELEGADO";

  const sanitizeUserPayload = (data: any) => {
    const normalized = { ...data };
    if (normalized.role === "JEFE_RECINTO") {
      normalized.tableId = null;
    }
    if (normalized.role === "DELEGADO") {
      normalized.schoolId = normalized.schoolId || (isJefeRecinto ? (user as any)?.school?.id : null);
    }
    return normalized;
  };

  const createUser = (data: any) => usersApi.create(sanitizeUserPayload(data));
  const updateUser = (id: string, data: any) => usersApi.update(id, sanitizeUserPayload(data));

  const fields = [
    { key: "username", label: "Usuario", required: true },
    { key: "fullName", label: "Nombre completo", required: true },
    { key: "phone", label: "Teléfono", required: true },
    { key: "email", label: "Email", type: "email" as const },
    { key: "password", label: "Contraseña", type: "password" as const },
    {
      key: "role",
      label: "Rol",
      type: "select" as const,
      options: roleOptions,
      disabled: isJefeCampana || isJefeRecinto,
      onChange: (val: string) => {
        setFormRole(val);
        if (val !== "DELEGADO") {
          setSelectedSchoolId("");
        }
      },
    },
    {
      key: "partyId",
      label: "Partido",
      type: "select" as const,
      options: partyOptions,
      disabled: !isAdmin, // Only ADMIN can change party
    },
    {
      key: "schoolId",
      label: "Recinto asignado (Jefe Recinto)",
      type: "select" as const,
      options: schoolOptions,
      disabled: schoolDisabled,
      onChange: (val: string) => setSelectedSchoolId(val),
    },
    {
      key: "tableId",
      label: "Mesa asignada (Delegado)",
      type: "select" as const,
      options: tableOptions,
      disabled: tableDisabled,
      hidden: () => isJefeCampana || effectiveFormRole !== "DELEGADO",
    },
  ];

  // Default values injected for locked fields
  const defaultValues: Record<string, any> = {};
  if (isJefeRecinto) {
    defaultValues.role = "DELEGADO";
    defaultValues.partyId = (user as any)?.party?.id;
    defaultValues.schoolId = (user as any)?.school?.id;
  } else if (isJefeCampana) {
    defaultValues.role = "JEFE_RECINTO";
    defaultValues.partyId = (user as any)?.party?.id;
    // schoolId intentionally not pre-filled so JEFE_CAMPANA can select it when creating JEFE_RECINTO
  }

  const fetchUsersFiltered = async () => {
    const allUsers = await usersApi.getAll();
    const roleScopedUsers = allUsers.filter((u: any) => {
      if (isAdmin) return true;
      if (isJefeCampana) return u.role === "JEFE_RECINTO";
      if (isJefeRecinto) return u.role === "DELEGADO";
      return false;
    });

    if (!filterSchool && !filterParty) {
      // If Admin/Jefe needs to select at least one filter to see any records, return empty array when none selected
      if (isAdminOrJefe) return [];
      return roleScopedUsers;
    }

    return roleScopedUsers.filter((u: any) => {
      const uSchoolId = u.school?.id || u.table?.school?.id;
      const matchSchool = filterSchool ? uSchoolId === filterSchool : true;
      const matchParty = filterParty ? u.party?.id === filterParty : true;
      return matchSchool && matchParty;
    });
  };

  return (
    <CrudPage
      title="Usuarios"
      description="Gestión de usuarios del sistema electoral"
      queryKey={["users", filterSchool, filterParty]}
      fetchFn={fetchUsersFiltered}
      headerContent={
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
          {isAdminOrJefe && (
            <span className="text-body text-sm font-medium">Ver usuarios de:</span>
          )}
          <select
            value={filterParty}
            onChange={(e) => setFilterParty(e.target.value)}
            disabled={!isAdmin || isJefeCampana}
            className={`rounded-xl border border-stroke bg-white px-3 py-2 text-sm text-black outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all w-full sm:w-auto sm:max-w-xs ${!isAdmin || isJefeCampana ? "opacity-75 bg-slate-50 cursor-not-allowed" : ""}`}
          >
            {isAdmin && <option value="">Todos los partidos</option>}
            {(parties as any[]).map((p: any) => (
              <option key={p.id} value={p.id}>
                {p.acronym} — {p.name}
              </option>
            ))}
          </select>
          <select
            value={filterSchool}
            onChange={(e) => setFilterSchool(e.target.value)}
            disabled={!isAdminOrJefe}
            className={`rounded-xl border border-stroke bg-white px-3 py-2 text-sm text-black outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all w-full sm:w-auto sm:max-w-xs ${!isAdminOrJefe ? "opacity-75 bg-slate-50 cursor-not-allowed" : ""}`}
          >
            {isAdminOrJefe && <option value="">Todos los recintos</option>}
            {(schools as any[]).map((s: any) => (
              <option key={s.id} value={s.id}>
                {s.codigoRecinto ? `[${s.codigoRecinto}] ` : ""}
                {s.nombreRecinto}
              </option>
            ))}
          </select>
          {isAdminOrJefe && (filterSchool || (isAdmin && filterParty)) && (
            <button
              onClick={() => {
                setFilterSchool("");
                setFilterParty(isJefeCampana ? jefeCampanaPartyId : "");
              }}
              className="text-xs text-body hover:text-meta-1 transition-colors whitespace-nowrap"
            >
              ✕ Limpiar
            </button>
          )}
        </div>
      }
      customEmptyState={
        isAdminOrJefe && !filterSchool && !filterParty ? (
          <div className="card p-10 text-center mt-6">
            <div className="text-4xl mb-3">🏢</div>
            <p className="text-body font-medium">
              Selecciona un recinto o partido para ver sus usuarios
            </p>
          </div>
        ) : undefined
      }
      createFn={createUser}
      updateFn={updateUser}
      deleteFn={usersApi.remove}
      canDelete={isAdmin || isJefeCampana || isJefeRecinto}
      canEditRow={canManageRow}
      canDeleteRow={canManageRow}
      fields={fields}
      defaultValues={defaultValues}
      columns={[
        {
          key: "username",
          label: "Usuario",
          render: (v: string) => (
            <span className="font-medium text-black">{v}</span>
          )
        },
        { key: "fullName", label: "Nombre" },
        {
          key: "role",
          label: "Rol",
          render: (v: string) => {
            const r = roleBadge[v] || { label: v, cls: "bg-meta-2 text-black" };
            return <span className={`badge ${r.cls} whitespace-nowrap`}>{r.label}</span>;
          },
        },
        ...(isAdmin ? [{
          key: "party",
          label: "Partido",
          render: (_: any, row: any) =>
            row.party ? (
              <div className="flex items-center gap-1.5">
                <div
                  className="w-2.5 h-2.5 rounded-md"
                  style={{ backgroundColor: row.party.color }}
                />
                <span className="text-sm">{row.party.acronym}</span>
              </div>
            ) : (
              <span className="text-black text-sm">—</span>
            ),
        }] : []),
      ].filter(Boolean) as any[]}
    />
  );
}
