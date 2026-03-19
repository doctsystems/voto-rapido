import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { partiesApi, votesApi, tablesApi } from "../lib/api";
import { useAuthStore } from "../store/auth.store";
import { toast } from "../lib/toast";

export default function NewReportPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: parties = [], isLoading: loadingParties } = useQuery({
    queryKey: ["parties-with-et"],
    queryFn: partiesApi.getWithElectionTypes,
  });

  const { data: existingReports = [] } = useQuery({
    queryKey: ["reports"],
    queryFn: () => votesApi.getReports(),
  });

  // For JEFE_RECINTO: load tables in their recinto and allow selection
  const isJefeRecinto = user?.role === "JEFE_RECINTO";
  const [selectedTableId, setSelectedTableId] = useState<string>("");

  const { data: recintoTables = [] } = useQuery({
    queryKey: ["tables-recinto", (user as any)?.school?.id],
    queryFn: () => tablesApi.getAll((user as any)?.school?.id),
    enabled: isJefeRecinto && !!(user as any)?.school?.id,
  });

  const targetTableId = isJefeRecinto
    ? selectedTableId
    : (user as any)?.table?.id;

  // Find if there is any report for this table
  const tableReport = (existingReports as any[]).find(
    (r) => r.table?.id === targetTableId,
  );
  const reportsByTableId = new Map(
    (existingReports as any[])
      .filter((report: any) => report.table?.id)
      .map((report: any) => [report.table.id, report]),
  );
  const isVerified = tableReport?.status === "VERIFIED";
  // If it's not verified, we can edit it
  const existingReport = isVerified ? null : tableReport;
  const isEditing = !!existingReport;

  /** votes[etId][partyId] = votos válidos */
  const [votes, setVotes] = useState<Record<string, Record<string, number>>>(
    {},
  );
  /** nulls[etId] = votos nulos de ese tipo */
  const [nulls, setNulls] = useState<Record<string, number>>({});
  /** blanks[etId] = votos blancos de ese tipo */
  const [blanks, setBlanks] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!existingReport) return;
    const prefillVotes: Record<string, Record<string, number>> = {};
    const prefillNulls: Record<string, number> = {};
    const prefillBlanks: Record<string, number> = {};
    for (const entry of existingReport.entries || []) {
      const etId = entry.electionType?.id;
      const pId = entry.party?.id;
      if (etId && pId) {
        if (!prefillVotes[etId]) prefillVotes[etId] = {};
        prefillVotes[etId][pId] = entry.votes;
        prefillNulls[etId] = (prefillNulls[etId] || 0) + (entry.nullVotes || 0);
        prefillBlanks[etId] =
          (prefillBlanks[etId] || 0) + (entry.blankVotes || 0);
      }
    }
    setVotes(prefillVotes);
    setNulls(prefillNulls);
    setBlanks(prefillBlanks);
    setNotes(existingReport.notes || "");
  }, [existingReport?.id]);

  const setVote = (etId: string, pId: string, v: number) =>
    setVotes((prev) => ({
      ...prev,
      [etId]: { ...prev[etId], [pId]: Math.max(0, v) },
    }));
  const setNull = (etId: string, v: number) =>
    setNulls((prev) => ({ ...prev, [etId]: Math.max(0, v) }));
  const setBlank = (etId: string, v: number) =>
    setBlanks((prev) => ({ ...prev, [etId]: Math.max(0, v) }));

  const buildPayload = () => {
    const entries: any[] = [];
    // Extras: null/blank per election type — sent ONCE per type, not per party
    const extras: any[] = [];
    const addedExtras = new Set<string>();

    for (const [etId, pv] of Object.entries(votes)) {
      for (const [partyId, v] of Object.entries(pv)) {
        entries.push({ electionTypeId: etId, partyId, votes: v || 0 });
      }
      if (!addedExtras.has(etId)) {
        addedExtras.add(etId);
        extras.push({
          electionTypeId: etId,
          nullVotes: nulls[etId] || 0,
          blankVotes: blanks[etId] || 0,
        });
      }
    }

    // Also add extras for election types that have null/blank but no party votes
    for (const etId of Object.keys(nulls)) {
      if (!addedExtras.has(etId)) {
        addedExtras.add(etId);
        extras.push({
          electionTypeId: etId,
          nullVotes: nulls[etId] || 0,
          blankVotes: blanks[etId] || 0,
        });
      }
    }
    for (const etId of Object.keys(blanks)) {
      if (!addedExtras.has(etId)) {
        addedExtras.add(etId);
        extras.push({
          electionTypeId: etId,
          nullVotes: nulls[etId] || 0,
          blankVotes: blanks[etId] || 0,
        });
      }
    }

    return {
      entries,
      extras,
      notes,
      ...(isJefeRecinto && selectedTableId ? { tableId: selectedTableId } : {}),
    };
  };

  const createMutation = useMutation({
    mutationFn: votesApi.createReport,
    onSuccess: () => {
      toast.success("Reporte guardado como borrador");
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      queryClient.invalidateQueries({ queryKey: ["metrics"] });
      navigate("/reports");
    },
    onError: (e: any) =>
      toast.error(e.response?.data?.message || "Error al crear reporte"),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => votesApi.updateReport(id, data),
    onSuccess: () => {
      toast.success("Reporte actualizado");
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      queryClient.invalidateQueries({ queryKey: ["metrics"] });
      navigate("/reports");
    },
    onError: (e: any) =>
      toast.error(e.response?.data?.message || "Error al actualizar"),
  });
  const submitMutation = useMutation({
    mutationFn: async () => {
      const payload = buildPayload();
      if (payload.entries.length === 0)
        throw new Error("Debes ingresar al menos un voto");
      const report = isEditing
        ? await votesApi.updateReport(existingReport.id, payload)
        : await votesApi.createReport(payload);
      return votesApi.submitReport(report.id);
    },
    onSuccess: () => {
      toast.success("Reporte guardado y enviado");
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      queryClient.invalidateQueries({ queryKey: ["metrics"] });
      navigate("/reports");
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message || e?.message || "Error"),
  });

  // Build matrix: electionType → parties
  const matrix: Record<string, { etName: string; order: number; rows: any[] }> =
    {};
  for (const party of parties as any[]) {
    for (const et of party.electionTypes ?? []) {
      if (!matrix[et.id])
        matrix[et.id] = { etName: et.name, order: et.order ?? 0, rows: [] };
      matrix[et.id].rows.push({
        partyId: party.id,
        partyAcronym: party.acronym,
        partyName: party.name,
        partyColor: party.color,
        candidateName: et.candidateName,
      });
    }
  }
  const sections = Object.entries(matrix).sort(
    ([, a], [, b]) => a.order - b.order,
  );

  const tableInfo = isJefeRecinto
    ? (recintoTables as any[]).find((t: any) => t.id === selectedTableId)
    : (user as any)?.table;
  const tableVoters = tableInfo?.totalVoters ?? null;

  // Per-type totals for header bar
  // Per type: válidos + nulos + blancos ≤ padrón (mismo criterio que el backend)
  const perTypeTotal = (etId: string) => {
    const validVotes = Object.values(votes[etId] || {}).reduce(
      (s, v) => s + (v || 0),
      0,
    );
    return validVotes + (nulls[etId] || 0) + (blanks[etId] || 0);
  };
  const overLimitEt = sections.filter(
    ([etId]) => tableVoters && perTypeTotal(etId) > tableVoters,
  );
  const anyOverLimit = overLimitEt.length > 0;

  const handleSave = () => {
    const payload = buildPayload();
    if (payload.entries.length === 0)
      return toast.error("Debes ingresar al menos un voto");
    if (anyOverLimit) {
      const names = overLimitEt.map(([, s]) => s.etName).join(", ");
      return toast.error(
        `Error: Los votos para "${names}" superan el padrón habilitado para la mesa.`,
      );
    }
    if (isEditing)
      updateMutation.mutate({ id: existingReport.id, data: payload });
    else createMutation.mutate(payload);
  };

  if (!tableInfo && !isJefeRecinto) {
    return (
      <div className="rounded-xl border border-stroke bg-white p-10 text-center">
        <div className="text-5xl mb-4">⚠️</div>
        <p className="font-semibold text-black">No tienes una mesa asignada</p>
        <p className="text-body text-sm mt-1">Contacta al administrador</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-black">
          {isEditing ? "Actualizar Reporte" : "Nuevo Reporte de Votación"}
        </h2>
        <p className="text-sm text-body mt-1">
          {tableInfo ? (
            <>
              Mesa{" "}
              <span className="font-mono font-bold text-primary">
                {tableInfo.tableNumber}
              </span>
              {tableInfo.school && <> — {tableInfo.school.nombreRecinto}</>}
              {tableVoters && (
                <>
                  {" "}
                  · Padrón:{" "}
                  <span className="font-mono font-semibold">
                    {tableVoters.toLocaleString()}
                  </span>{" "}
                  votantes
                </>
              )}
            </>
          ) : isJefeRecinto ? (
            <span className="text-body italic">
              Selecciona una mesa para continuar
            </span>
          ) : null}
        </p>
        {isEditing && (
          <span className="inline-flex items-center gap-1.5 mt-2 text-xs bg-warning/10 border border-warning/20 text-warning px-3 py-1 rounded-full">
            ✏️ Editando reporte{" "}
            {existingReport.status === "DRAFT" ? "borrador" : "enviado"} — se
            restablecerá a borrador
          </span>
        )}
      </div>

      {/* JEFE_RECINTO: must select a table first */}
      {isJefeRecinto && (
        <div className="rounded-xl border border-stroke bg-white shadow-card p-5 mb-5">
          <label className="block text-sm font-semibold text-black mb-2">
            Seleccionar Mesa del Recinto
            <span className="text-meta-1 ml-1">*</span>
          </label>
          {(recintoTables as any[]).length === 0 ? (
            <p className="text-body text-sm">
              No hay mesas registradas en su recinto.
            </p>
          ) : (
            <select
              value={selectedTableId}
              onChange={(e) => {
                setSelectedTableId(e.target.value);
              }}
              className="w-full rounded-xl border border-stroke bg-white px-4 py-2.5 text-sm text-black outline-none focus:border-primary transition-colors"
            >
              <option value="">— Seleccione una mesa —</option>
              {(recintoTables as any[]).map((t: any) => (
                <option key={t.id} value={t.id}>
                  Mesa {t.tableNumber}
                  {t.totalVoters
                    ? ` · ${t.totalVoters.toLocaleString()} votantes`
                    : ""}
                  {reportsByTableId.has(t.id) ? " ✏️ (tiene reporte)" : ""}
                </option>
              ))}
            </select>
          )}
          {selectedTableId && existingReport && (
            <p className="mt-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
              ✏️ Esta mesa ya tiene un reporte{" "}
              {existingReport.status === "DRAFT" ? "borrador" : "enviado"} — se
              editará
            </p>
          )}
        </div>
      )}

      {/* Block form if JEFE_RECINTO hasn't selected a table */}
      {isJefeRecinto && !selectedTableId ? null : loadingParties ? (
        <div className="card p-10 text-center text-body">Cargando...</div>
      ) : isVerified ? (
        <div className="rounded-xl border border-stroke bg-white p-10 text-center shadow-card">
          <div className="text-5xl mb-4">✅</div>
          <p className="font-semibold text-black">
            El reporte de esta mesa ya ha sido verificado
          </p>
          <p className="text-body text-sm mt-2">
            No es posible crear ni editar un reporte sobre una mesa verificada.
            <br />
            Si necesitas realizar una corrección, solicita al Jefe de Recinto
            que elimine el reporte actual.
          </p>
          <button
            onClick={() => navigate("/reports")}
            className="btn-secondary mt-6"
          >
            Volver a Reportes
          </button>
        </div>
      ) : sections.length === 0 ? (
        <div className="card p-10 text-center text-body">
          No hay partidos con tipos de elección asignados.
        </div>
      ) : (
        <div className="space-y-5">
          {sections.map(([etId, section]) => {
            const typeTotal = perTypeTotal(etId);
            const overLimit = tableVoters && typeTotal > tableVoters;
            const validVotes = Object.values(votes[etId] || {}).reduce(
              (s, v) => s + (v || 0),
              0,
            );

            return (
              <div
                key={etId}
                className="rounded-2xl bg-white border border-black/[.06] shadow-[0_2px_16px_rgba(0,0,0,.06)] overflow-hidden"
              >
                {/* Section header */}
                <div
                  className={`flex items-center justify-between px-6 py-3 border-b border-stroke ${overLimit ? "bg-meta-1/10 border-meta-1/30" : "bg-whiter"}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-5 rounded-full bg-primary" />
                    <h3 className="font-semibold text-black">
                      {section.etName}
                    </h3>
                    <span className="text-xs text-body">
                      ({section.rows.length} partido
                      {section.rows.length > 1 ? "s" : ""})
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-mono">
                    <span className="text-body">
                      Válidos:{" "}
                      <span className="font-bold text-meta-3">
                        {validVotes.toLocaleString()}
                      </span>
                    </span>
                    <span className="text-body">
                      Nulos:{" "}
                      <span className="font-bold text-meta-8">
                        {(nulls[etId] || 0).toLocaleString()}
                      </span>
                    </span>
                    <span className="text-body">
                      Blancos:{" "}
                      <span className="font-bold text-bodydark">
                        {(blanks[etId] || 0).toLocaleString()}
                      </span>
                    </span>
                    {tableVoters && (
                      <span
                        className={`font-bold ${overLimit ? "text-meta-1" : "text-black"}`}
                      >
                        Total: {typeTotal.toLocaleString()} /{" "}
                        {tableVoters.toLocaleString()}
                        {overLimit && " ⚠"}
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-5">
                  {/* Party rows */}
                  <div className="space-y-3 mb-5">
                    {section.rows.map((row: any) => (
                      <div
                        key={row.partyId}
                        className="flex items-center gap-4 flex-wrap"
                      >
                        <div className="flex items-center gap-2 w-52 min-w-0 flex-shrink-0">
                          <div
                            className="w-3 h-3 rounded-md flex-shrink-0"
                            style={{
                              backgroundColor: row.partyColor || "#999",
                            }}
                          />
                          <span className="text-sm font-semibold text-black">
                            {row.partyAcronym}
                          </span>
                          <span className="text-xs text-body truncate">
                            {row.candidateName || row.partyName}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setVote(
                                etId,
                                row.partyId,
                                (votes[etId]?.[row.partyId] || 0) - 1,
                              )
                            }
                            className="w-8 h-8 rounded border border-stroke flex items-center justify-center text-body hover:bg-stroke transition-colors select-none text-lg leading-none"
                          >
                            −
                          </button>
                          <input
                            type="number"
                            min={0}
                            value={votes[etId]?.[row.partyId] || ""}
                            onChange={(e) =>
                              setVote(
                                etId,
                                row.partyId,
                                parseInt(e.target.value) || 0,
                              )
                            }
                            className="w-20 text-center font-mono text-sm border border-stroke rounded py-1.5 outline-none focus:border-primary transition-colors"
                            placeholder="0"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setVote(
                                etId,
                                row.partyId,
                                (votes[etId]?.[row.partyId] || 0) + 1,
                              )
                            }
                            className="w-8 h-8 rounded border border-stroke flex items-center justify-center text-body hover:bg-stroke transition-colors select-none text-lg leading-none"
                          >
                            +
                          </button>
                        </div>
                        {(votes[etId]?.[row.partyId] || 0) > 0 && (
                          <span className="text-xs font-mono font-semibold text-meta-3">
                            ✓ {votes[etId][row.partyId].toLocaleString()}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Null & Blank per type */}
                  <div className="border-t border-stroke pt-4 grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-body mb-1.5 uppercase tracking-wide">
                        Votos Nulos
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setNull(etId, (nulls[etId] || 0) - 1)}
                          className="w-8 h-8 rounded border border-stroke flex items-center justify-center text-body hover:bg-stroke transition-colors text-lg leading-none select-none"
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min={0}
                          value={nulls[etId] || ""}
                          onChange={(e) =>
                            setNull(etId, parseInt(e.target.value) || 0)
                          }
                          className="w-20 text-center font-mono text-sm border border-stroke rounded py-1.5 outline-none focus:border-primary transition-colors"
                          placeholder="0"
                        />
                        <button
                          type="button"
                          onClick={() => setNull(etId, (nulls[etId] || 0) + 1)}
                          className="w-8 h-8 rounded border border-stroke flex items-center justify-center text-body hover:bg-stroke transition-colors text-lg leading-none select-none"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-body mb-1.5 uppercase tracking-wide">
                        Votos en Blanco
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setBlank(etId, (blanks[etId] || 0) - 1)
                          }
                          className="w-8 h-8 rounded border border-stroke flex items-center justify-center text-body hover:bg-stroke transition-colors text-lg leading-none select-none"
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min={0}
                          value={blanks[etId] || ""}
                          onChange={(e) =>
                            setBlank(etId, parseInt(e.target.value) || 0)
                          }
                          className="w-20 text-center font-mono text-sm border border-stroke rounded py-1.5 outline-none focus:border-primary transition-colors"
                          placeholder="0"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setBlank(etId, (blanks[etId] || 0) + 1)
                          }
                          className="w-8 h-8 rounded border border-stroke flex items-center justify-center text-body hover:bg-stroke transition-colors text-lg leading-none select-none"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  {overLimit && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-meta-1 bg-meta-1/5 border border-meta-1/20 rounded px-3 py-2">
                      <span>⚠️</span>
                      <span>
                        El total de votos para este tipo de elección supera el padrón habilitado.
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Notes */}
      <div className="rounded-2xl bg-white border border-black/[.06] shadow-[0_2px_16px_rgba(0,0,0,.06)] p-5 mt-5">
        <label className="block text-sm font-semibold text-black mb-2">
          Notas / Observaciones (opcional)
        </label>
        <textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full rounded border border-stroke px-4 py-2.5 text-sm text-black outline-none focus:border-primary resize-none transition-colors"
          placeholder="Observaciones sobre el conteo..."
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 mt-6">
        <button onClick={() => navigate("/reports")} className="btn-secondary">
          Cancelar
        </button>
        <button
          onClick={handleSave}
          disabled={createMutation.isPending || updateMutation.isPending}
          className="btn-secondary"
        >
          {createMutation.isPending || updateMutation.isPending
            ? "Guardando..."
            : "💾 Guardar borrador"}
        </button>
        <button
          onClick={() => submitMutation.mutate()}
          disabled={submitMutation.isPending}
          className="btn-primary"
        >
          {submitMutation.isPending ? "Enviando..." : "📤 Guardar y enviar"}
        </button>
      </div>
    </div>
  );
}
