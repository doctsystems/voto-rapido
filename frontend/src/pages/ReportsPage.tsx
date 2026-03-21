import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import CrudPage from "../components/CrudPage";
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
  const isAdmin = user?.role === "ADMIN";
  const isJefeCampana = user?.role === "JEFE_CAMPANA";
  const isAdminOrJefe = isAdmin || isJefeCampana;
  const jefeCampanaPartyId = isJefeCampana ? ((user as any)?.party?.id || "") : "";
  const qc = useQueryClient();
  const [selected, setSelected] = useState<any | null>(null);
  
  const [filterSchool, setFilterSchool] = useState(
    isAdminOrJefe ? "" : ((user as any)?.school?.id || (user as any)?.table?.school?.id || "")
  );
  const [filterParty, setFilterParty] = useState(
    isAdmin ? "" : ((user as any)?.party?.id || "")
  );

  const { data: parties = [] } = useQuery({
    queryKey: ["parties"],
    queryFn: partiesApi.getAll,
  });
  const sortedParties = [...(parties as any[])].sort(
    (a, b) =>
      (a.ballotOrder ?? Number.MAX_SAFE_INTEGER) -
      (b.ballotOrder ?? Number.MAX_SAFE_INTEGER),
  );
  
  const { data: schools = [] } = useQuery({
    queryKey: ["schools"],
    queryFn: () => schoolsApi.getAll(),
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

  const role = user?.role ?? "";
  const canVerify = role === "JEFE_RECINTO";
  const canDelete = role === "JEFE_RECINTO";
  const canCreate = role === "DELEGADO" || role === "JEFE_RECINTO";
  const canSubmit = role === "DELEGADO" || role === "JEFE_RECINTO";

  const columns = [
    {
      key: "number",
      label: "Mesa",
      render: (_v: any, row: any) => <span className="font-medium text-black">{row.table?.number}</span>
    },
    {
      key: "delegate",
      label: "Delegado",
      render: (_v: any, row: any) => (
          <div>
            <div className="text-xs font-medium text-black">{row.delegate?.fullName}</div>
          {row.delegate?.party && (
            <div className="text-xs text-body">#{row.delegate.party.ballotOrder}</div>
          )}
        </div>
      )
    },
    {
      key: "status",
      label: "Estado",
      render: (v: string) => <span className={STATUS_BADGE[v]}>{STATUS_LABEL[v]}</span>
    }
  ];

  return (
    <div>
      <CrudPage
        title="Reportes de Votación"
        description="Listado de reportes de escrutinio"
        queryKey={["reports", filterSchool, filterParty]}
        fetchFn={async () => {
          if (isAdminOrJefe && !filterSchool && !filterParty) return [];
          const raw = await votesApi.getReports(filterSchool || undefined);
          if (!filterParty) return raw;
          return raw.filter((r: any) => r.delegate?.party?.id === filterParty);
        }}
        // Dummy functions required by CrudPage interface but actually not used because actions are deactivated/hidden
        createFn={async () => {}}
        updateFn={async () => {}}
        deleteFn={votesApi.deleteReport}
        canCreate={false}
        canDelete={false}
        hideEdit={true}
        fields={[]}
        columns={columns}
        headerActions={
          <>
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={reportsApi.exportExcel}
                className="btn-secondary btn-sm flex-1 sm:flex-none justify-center"
              >
                📊 Excel
              </button>
              <button
                onClick={reportsApi.exportPdf}
                className="btn-secondary btn-sm flex-1 sm:flex-none justify-center"
              >
                📄 PDF
              </button>
            </div>
            {canCreate && (
              <Link to="/reports/new" className="btn-primary btn-sm w-full sm:w-auto justify-center">
                + Nuevo Reporte
              </Link>
            )}
          </>
        }
        headerContent={
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            {isAdminOrJefe && (
              <span className="text-body text-sm font-medium">Ver reportes de:</span>
            )}
            <select
              value={filterParty}
              onChange={(e) => setFilterParty(e.target.value)}
              disabled={!isAdmin || isJefeCampana}
              className={`rounded-xl border border-stroke bg-white px-3 py-2 text-sm text-black outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all w-full sm:w-auto sm:max-w-xs ${!isAdmin || isJefeCampana ? "opacity-75 bg-slate-50 cursor-not-allowed" : ""}`}
            >
              {isAdmin && <option value="">Todos los partidos</option>}
              {sortedParties.map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.acronym} - {p.name}
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
                  {s.code ? `[${s.code}] ` : ""}
                  {s.name}
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
                Selecciona un recinto o partido para ver sus reportes
              </p>
            </div>
          ) : undefined
        }
        extraActions={(r: any) => (
          <>
            <button onClick={() => setSelected(r)} className="btn-secondary btn-xs">
              Ver
            </button>
            {canSubmit && r.status === "DRAFT" && (user?.role === "JEFE_RECINTO" || r.delegate?.id === user?.id) && (
              <button onClick={() => submitMutation.mutate(r.id)} className="btn-xs btn-action-primary">
                Enviar
              </button>
            )}
            {canVerify && r.status === "SUBMITTED" && (
              <button onClick={() => verifyMutation.mutate(r.id)} className="btn-success btn-xs">
                Verificar
              </button>
            )}
            {canDelete && (
              <button
                onClick={() => {
                  toast.confirm(
                    `¿Eliminar reporte de la mesa ${r.table?.number}? El delegado podrá crear uno nuevo.`,
                    () => votesApi.deleteReport(r.id).then(() => {
                      toast.success("Reporte eliminado.");
                      invalidate();
                    }).catch((e: any) => toast.error(e.response?.data?.message || "Error al eliminar")),
                    "Eliminar"
                  );
                }}
                className="btn-xs btn-action-danger"
              >
                Eliminar
              </button>
            )}
          </>
        )}
      />

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
                  Reporte — Mesa {selected.table?.number}
                </h3>
                {selected.table?.school?.name && (
                  <p className="text-sm text-body mt-0.5">
                    📍 {selected.table.school.name}
                    {selected.table.school.code &&
                      ` (Cód. ${selected.table.school.code})`}
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
                                #{e.party?.ballotOrder}
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
                    onClick={() => {
                      toast.confirm(
                        `¿Eliminar reporte de la mesa ${selected.table?.number}? El delegado podrá crear uno nuevo.`,
                        () => votesApi.deleteReport(selected.id).then(() => {
                           toast.success("Reporte eliminado.");
                           invalidate();
                           setSelected(null);
                        }).catch((e: any) => toast.error(e.response?.data?.message || "Error al eliminar")),
                        "Eliminar"
                      );
                    }}
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

