import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { votesApi, reportsApi, schoolsApi, partiesApi } from "../lib/api";
import { useAuthStore } from "../store/auth.store";
import { toast } from "../lib/toast";

const STATUS_BADGE: Record<string, string> = {
  DRAFT:
    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-meta-2 text-body",
  SUBMITTED:
    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-blue-100 text-blue-700",
  VERIFIED:
    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-green-100 text-meta-3",
};
const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Borrador",
  SUBMITTED: "Enviado",
  VERIFIED: "Verificado",
};

export default function ReportsPage() {
  const { user } = useAuthStore();
  console.log("user: ", user);
  const isAdmin = user?.role === "ADMIN";
  const isJefeCampana = user?.role === "JEFE_CAMPANA";
  const isAdminOrJefe = isAdmin || isJefeCampana;
  const qc = useQueryClient();
  const [selected, setSelected] = useState<any | null>(null);
  const [filterSchool, setFilterSchool] = useState(
    isAdminOrJefe ? "" : ((user as any)?.school?.id || (user as any)?.table?.school?.id || "")
  );
  const [filterParty, setFilterParty] = useState(
    isAdminOrJefe ? "" : ((user as any)?.party?.id || "")
  );

  const { data: parties = [] } = useQuery({
    queryKey: ["parties"],
    queryFn: partiesApi.getAll,
  });
  const { data: schools = [] } = useQuery({
    queryKey: ["schools"],
    queryFn: () => schoolsApi.getAll(),
  });
  const { data: rawReports = [], isLoading } = useQuery({
    queryKey: ["reports", filterSchool, filterParty],
    queryFn: () => {
      // If Admin/Jefe and both filters are empty, don't fetch everything by default to avoid huge payloads
      if (isAdminOrJefe && !filterSchool && !filterParty) return Promise.resolve([]);
      // Otherwise fetch for the selected school (if any), then filter below for party
      return votesApi.getReports(filterSchool || undefined);
    },
  });

  // Client-side filtering for party (since API accepts school but not party in getReports currently)
  const reports = rawReports.filter((r: any) => {
    if (!filterParty) return true;
    return r.delegate?.party?.id === filterParty;
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["reports"] });

  const submitMutation = useMutation({
    mutationFn: (id: string) => votesApi.submitReport(id),
    onSuccess: () => {
      toast.success("Reporte enviado correctamente");
      invalidate();
    },
    onError: (e: any) =>
      toast.error(e.response?.data?.message || "Error al enviar"),
  });
  const verifyMutation = useMutation({
    mutationFn: (id: string) => votesApi.verifyReport(id),
    onSuccess: () => {
      toast.success("Reporte verificado");
      invalidate();
    },
    onError: (e: any) =>
      toast.error(e.response?.data?.message || "Error al verificar"),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => votesApi.deleteReport(id),
    onSuccess: () => {
      toast.success("Reporte eliminado. El delegado puede crear uno nuevo.");
      invalidate();
      setSelected(null);
    },
    onError: (e: any) =>
      toast.error(e.response?.data?.message || "Error al eliminar"),
  });

  // ADMIN can NOT verify or delete — only JEFE_CAMPANA and JEFE_RECINTO
  const role = user?.role ?? "";
  const canVerify = role === "JEFE_CAMPANA" || role === "JEFE_RECINTO";
  const canDelete = role === "JEFE_CAMPANA" || role === "JEFE_RECINTO";
  const canCreate = role === "DELEGADO" || role === "JEFE_RECINTO";
  const canSubmit = role === "DELEGADO" || role === "JEFE_RECINTO";

  const handleDelete = (id: string, label?: string) => {
    toast.confirm(
      `¿Eliminar reporte${label ? ` de ${label}` : ""}? El delegado podrá crear uno nuevo.`,
      () => deleteMutation.mutate(id),
      "Eliminar",
    );
  };

  return (
    <div>
      {/* ─── Header ─────────────────────────────────────────────── */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-black">
            Reportes de Votación
          </h2>
          <p className="text-body text-sm mt-0.5">
            {(reports as any[]).length} reporte(s) encontrado(s)
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={reportsApi.exportExcel}
            className="btn-secondary btn-sm"
          >
            📊 Excel
          </button>
          <button
            onClick={reportsApi.exportPdf}
            className="btn-secondary btn-sm"
          >
            📄 PDF
          </button>
          {canCreate && (
            <Link to="/reports/new" className="btn-primary btn-sm">
              + Nuevo Reporte
            </Link>
          )}
        </div>
      </div>

      {/* ─── Filter ─────────────────────────────────────────────── */}
      <div className="mb-4 flex items-center gap-3 flex-wrap">
        {isAdminOrJefe && (
          <span className="text-body text-sm font-medium">Ver reportes de:</span>
        )}
        <select
          value={filterParty}
          onChange={(e) => setFilterParty(e.target.value)}
          disabled={!isAdminOrJefe}
          className={`rounded-xl border border-stroke bg-white px-3 py-2 text-sm text-black outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all w-full max-w-xs ${!isAdminOrJefe ? "opacity-75 bg-slate-50 cursor-not-allowed" : ""}`}
        >
          {isAdminOrJefe && <option value="">Todos los partidos</option>}
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
          className={`rounded-xl border border-stroke bg-white px-3 py-2 text-sm text-black outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all w-full max-w-xs ${!isAdminOrJefe ? "opacity-75 bg-slate-50 cursor-not-allowed" : ""}`}
        >
          {isAdminOrJefe && <option value="">Todos los recintos</option>}
          {(schools as any[]).map((s: any) => (
            <option key={s.id} value={s.id}>
              {s.codigoRecinto ? `[${s.codigoRecinto}] ` : ""}
              {s.nombreRecinto}
            </option>
          ))}
        </select>
        {isAdminOrJefe && (filterSchool || filterParty) && (
          <button
            onClick={() => { setFilterSchool(""); setFilterParty(""); }}
            className="text-xs text-body hover:text-meta-1 transition-colors"
          >
            ✕ Limpiar
          </button>
        )}
      </div>

      {/* ─── Table ──────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="card p-10 text-center text-body">Cargando...</div>
      ) : isAdminOrJefe && !filterSchool && !filterParty ? (
        <div className="card p-10 text-center">
          <div className="text-4xl mb-3">🏢</div>
          <p className="text-body font-medium">
            Selecciona un recinto o partido para ver sus reportes
          </p>
        </div>
      ) : (reports as any[]).length === 0 ? (
        <div className="card p-10 text-center">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-body">
            No hay reportes{filterSchool ? " para este recinto" : " aún"}
          </p>
          {canCreate && (
            <Link
              to="/reports/new"
              className="btn-primary btn-sm mt-4 inline-flex"
            >
              Crear primer reporte
            </Link>
          )}
        </div>
      ) : (
        <div className="rounded-2xl bg-white border border-black/[.06] shadow-[0_2px_16px_rgba(0,0,0,.06)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="ta-table">
              <thead>
                <tr>
                  <th>Mesa</th>
                  <th>Delegado</th>
                  <th>Estado</th>
                  <th className="text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {(reports as any[]).map((r: any) => (
                  <tr key={r.id}>
                    <td>
                      <span className="font-medium text-black">
                        {r.table?.tableNumber}
                      </span>
                    </td>
                    <td>
                      <div className="text-xs font-medium text-black">
                        {r.delegate?.fullName}
                      </div>
                      {r.delegate?.party && (
                        <div className="text-xs text-body">
                          {r.delegate.party.acronym}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className={STATUS_BADGE[r.status]}>
                        {STATUS_LABEL[r.status]}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setSelected(r)}
                          className="btn-secondary btn-xs"
                        >
                          Ver
                        </button>
                        {canSubmit &&
                          r.status === "DRAFT" &&
                          (user?.role === "JEFE_RECINTO" ||
                            r.delegate?.id === user?.id) && (
                            <button
                              onClick={() => submitMutation.mutate(r.id)}
                              className="btn-xs btn-action-primary"
                            >
                              Enviar
                            </button>
                          )}
                        {canVerify && r.status === "SUBMITTED" && (
                          <button
                            onClick={() => verifyMutation.mutate(r.id)}
                            className="btn-success btn-xs"
                          >
                            Verificar
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() =>
                              handleDelete(r.id, r.table?.tableNumber)
                            }
                            className="btn-xs btn-action-danger"
                          >
                            Eliminar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Detail Modal ────────────────────────────────────────── */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => e.target === e.currentTarget && setSelected(null)}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-auto">
            {/* Modal header */}
            <div className="px-6 py-4 border-b border-stroke flex items-start justify-between gap-4">
              <div>
                <h3 className="font-bold text-lg text-black">
                  Reporte — Mesa {selected.table?.tableNumber}
                </h3>
                {selected.table?.school?.nombreRecinto && (
                  <p className="text-sm text-body mt-0.5">
                    📍 {selected.table.school.nombreRecinto}
                    {selected.table.school.codigoRecinto &&
                      ` (Cód. ${selected.table.school.codigoRecinto})`}
                  </p>
                )}
                <p className="text-xs text-body mt-0.5">
                  {selected.delegate?.fullName} ·{" "}
                  {selected.delegate?.party?.name}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={STATUS_BADGE[selected.status]}>
                  {STATUS_LABEL[selected.status]}
                </span>
                <button
                  onClick={() => setSelected(null)}
                  className="text-body hover:text-black text-lg w-8 h-8 flex items-center justify-center rounded transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal body */}
            <div className="p-6">
              {/* Entries grouped by election type */}
              {(() => {
                const byType: Record<string, any[]> = {};
                (selected.entries || []).forEach((e: any) => {
                  const key = e.electionType?.name || "General";
                  if (!byType[key]) byType[key] = [];
                  byType[key].push(e);
                });
                return Object.entries(byType).map(([type, entries]) => {
                  const validVotes = entries.reduce(
                    (s: number, e: any) => s + (e.votes || 0),
                    0,
                  );
                  const nullVotes = entries.reduce(
                    (s: number, e: any) => s + (e.nullVotes || 0),
                    0,
                  );
                  const blankVotes = entries.reduce(
                    (s: number, e: any) => s + (e.blankVotes || 0),
                    0,
                  );
                  const emitidos = validVotes + nullVotes + blankVotes;
                  const tableVoters = selected.table?.totalVoters;

                  return (
                    <div key={type} className="mb-5">
                      {/* Election type header */}
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-1 h-5 bg-primary rounded-full" />
                        <h4 className="font-semibold text-black text-sm">
                          {type}
                        </h4>
                      </div>

                      {/* All rows: parties + blank + null as unified list */}
                      <div className="space-y-1">
                        {entries.map((e: any) => (
                          <div
                            key={e.id}
                            className="flex items-center justify-between px-3 py-2 bg-whiter rounded-xl border border-black/[.06]"
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className="w-2.5 h-2.5 rounded-md flex-shrink-0"
                                style={{
                                  backgroundColor: e.party?.color || "#94a3b8",
                                }}
                              />
                              <span className="text-sm text-black font-medium">
                                {e.party?.acronym}
                              </span>
                              <span className="text-xs text-body hidden sm:inline">
                                {e.party?.name}
                              </span>
                            </div>
                            <span className="font-mono font-bold text-primary text-sm">
                              {(e.votes || 0).toLocaleString()}
                            </span>
                          </div>
                        ))}
                        {nullVotes > 0 && (
                          <div className="flex items-center justify-between px-3 py-2 bg-whiter rounded-xl border border-black/[.06]">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-md flex-shrink-0 bg-meta-8" />
                              <span className="text-sm text-black font-medium">
                                Nulos
                              </span>
                            </div>
                            <span className="font-mono font-bold text-meta-8 text-sm">
                              {nullVotes.toLocaleString()}
                            </span>
                          </div>
                        )}
                        {blankVotes > 0 && (
                          <div className="flex items-center justify-between px-3 py-2 bg-whiter rounded-xl border border-black/[.06]">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-md flex-shrink-0 bg-bodydark" />
                              <span className="text-sm text-black font-medium">
                                Blancos
                              </span>
                            </div>
                            <span className="font-mono font-bold text-bodydark text-sm">
                              {blankVotes.toLocaleString()}
                            </span>
                          </div>
                        )}
                        {/* Total row */}
                        <div className="flex items-center justify-between px-3 py-2 rounded-xl border border-black/[.06] bg-boxdark">
                          <span className="text-sm font-semibold text-white">
                            Total emitidos
                          </span>
                          <span className="font-mono font-bold text-white text-sm">
                            {emitidos.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}

              {selected.notes && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <p className="text-xs font-semibold text-amber-700 mb-1">
                    Notas:
                  </p>
                  <p className="text-sm text-amber-800">{selected.notes}</p>
                </div>
              )}

              {/* Modal actions */}
              <div className="mt-5 pt-4 border-t border-stroke flex gap-2 justify-end">
                {canSubmit &&
                  selected.status === "DRAFT" &&
                  (user?.role === "JEFE_RECINTO" ||
                    selected.delegate?.id === user?.id) && (
                    <button
                      onClick={() => {
                        submitMutation.mutate(selected.id);
                        setSelected(null);
                      }}
                      className="btn-primary btn-sm"
                    >
                      Enviar
                    </button>
                  )}
                {canVerify && selected.status === "SUBMITTED" && (
                  <button
                    onClick={() => {
                      verifyMutation.mutate(selected.id);
                      setSelected(null);
                    }}
                    className="btn-success btn-sm"
                  >
                    Verificar
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={() =>
                      handleDelete(selected.id, selected.table?.tableNumber)
                    }
                    className="btn-danger btn-sm"
                  >
                    Eliminar
                  </button>
                )}
                <button
                  onClick={() => setSelected(null)}
                  className="btn-secondary btn-sm"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
