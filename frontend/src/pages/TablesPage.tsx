import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import CrudPage, { Field } from "../components/CrudPage";
import { tablesApi, schoolsApi } from "../lib/api";

export default function TablesPage() {
  const { data: schools = [] } = useQuery({
    queryKey: ["schools-all"],
    queryFn: () => schoolsApi.getAll(),
  });

  const [filterSchoolId, setFilterSchoolId] = useState<string>("");

  const schoolOptions = (schools as any[]).map((s: any) => ({
    value: s.id,
    label: s.code
      ? `[${s.code}] ${s.name}`
      : s.name,
  }));

  const fields: Field[] = [
    { key: "number", label: "Número de Mesa", required: true, type: "number", placeholder: "Ej: 1" },
    { key: "schoolId", label: "Recinto Electoral", type: "select", options: schoolOptions },
    { key: "totalVoters", label: "Total votantes habilitados (padrón)", type: "number", placeholder: "Ej: 300" },
  ];

  const columns = [
    {
      key: "number",
      label: "Mesa",
      render: (v: any) => <span className="font-medium text-black">{v}</span>,
    },
    {
      key: "school",
      label: "Recinto Electoral",
      render: (v: any) =>
        v ? (
          <div>
            <div className="text-black">{v.name}</div>
            {v.code && (
              <div className="text-xs font-mono text-bodydark">
                #{v.code}
              </div>
            )}
          </div>
        ) : (
          <span className="text-bodydark italic text-sm">Sin asignar</span>
        ),
    },
    {
      key: "totalVoters",
      label: "Padrón",
      render: (v: any) =>
        v != null ? (
          <span className="text-black">{v.toLocaleString()}</span>
        ) : (
          <span className="text-bodydark">—</span>
        ),
    },
  ];

  return (
    <CrudPage
      title="Mesas de Votación"
      description="Mesas electorales agrupadas por recinto electoral"
      queryKey={["tables", filterSchoolId]}
      fetchFn={() => {
        if (!filterSchoolId) return Promise.resolve([]);
        return tablesApi.getAll(filterSchoolId);
      }}
      createFn={tablesApi.create}
      updateFn={tablesApi.update}
      deleteFn={tablesApi.remove}
      fields={fields}
      columns={columns}
      customEmptyState={
        !filterSchoolId ? (
          <div className="card p-10 text-center mt-6">
            <div className="text-4xl mb-3">🏢</div>
            <p className="text-body font-medium">
              Selecciona un recinto electoral para ver sus mesas
            </p>
          </div>
        ) : undefined
      }
      headerContent={
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
          <span className="text-body text-sm font-medium">Ver mesas de:</span>
          <select
            value={filterSchoolId}
            onChange={(e) => setFilterSchoolId(e.target.value)}
            className="rounded-xl border border-stroke bg-white px-3 py-2 text-sm text-black outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all w-full sm:w-auto sm:max-w-xs"
          >
            <option value="">Todos los recintos</option>
            {schoolOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {filterSchoolId && (
            <button
              onClick={() => setFilterSchoolId("")}
              className="text-xs text-body hover:text-meta-1 transition-colors whitespace-nowrap"
            >
              ✕ Limpiar
            </button>
          )}
        </div>
      }
    />
  );
}

