import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "../lib/toast";
import { partiesApi, electionTypesApi } from "../lib/api";

export default function PartiesPage() {
  const qc = useQueryClient();
  const { data: parties = [], isLoading } = useQuery({
    queryKey: ["parties"],
    queryFn: partiesApi.getAll,
  });
  const { data: electionTypes = [] } = useQuery({
    queryKey: ["election-types"],
    queryFn: electionTypesApi.getAll,
  });

  const [modal, setModal] = useState<"create" | "edit" | "assign" | null>(null);
  const [selected, setSelected] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [assignForm, setAssignForm] = useState({
    electionTypeId: "",
    candidateName: "",
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["parties"] });

  const createMutation = useMutation({
    mutationFn: partiesApi.create,
    onSuccess: () => {
      toast.success("Partido creado");
      invalidate();
      setModal(null);
    },
    onError: (e: any) => toast.error(e.response?.data?.message || "Error"),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => partiesApi.update(id, data),
    onSuccess: () => {
      toast.success("Partido actualizado");
      invalidate();
      setModal(null);
    },
    onError: (e: any) => toast.error(e.response?.data?.message || "Error"),
  });
  const deleteMutation = useMutation({
    mutationFn: partiesApi.remove,
    onSuccess: () => {
      toast.success("Partido eliminado");
      invalidate();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || "Error"),
  });
  const assignMutation = useMutation({
    mutationFn: ({ partyId, data }: any) =>
      partiesApi.assignElectionType(partyId, data),
    onSuccess: () => {
      toast.success("Tipo de elección asignado");
      invalidate();
      setAssignForm({ electionTypeId: "", candidateName: "" });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || "Error"),
  });
  const unassignMutation = useMutation({
    mutationFn: ({ partyId, etId }: any) =>
      partiesApi.removeElectionType(partyId, etId),
    onSuccess: () => {
      toast.success("Tipo de elección removido");
      invalidate();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || "Error"),
  });

  const openCreate = () => {
    setForm({});
    setModal("create");
  };
  const openEdit = (p: any) => {
    setForm({ name: p.name, ballotOrder: p.ballotOrder, color: p.color || "" });
    setSelected(p);
    setModal("edit");
  };
  const openAssign = (p: any) => {
    setSelected(p);
    setAssignForm({ electionTypeId: "", candidateName: "" });
    setModal("assign");
  };

  const assignedIds = (selected?.electionTypes || []).map(
    (pet: any) => pet.electionType?.id,
  );
  const availableEts = (electionTypes as any[]).filter(
    (et) => !assignedIds.includes(et.id),
  );

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-primary">Partidos Políticos</h1>
          <p className="text-sm text-body mt-0.5">
            Gestión de partidos y sus tipos de elección asignados
          </p>
        </div>
        <button
          onClick={openCreate}
          className="btn-primary w-full justify-center sm:w-auto"
        >
          ✚ Nuevo Partido
        </button>
      </div>

      {isLoading ? (
        <div className="card p-10 text-center text-bodydark">Cargando...</div>
      ) : (
        <div className="space-y-3">
          {(parties as any[]).map((party: any) => (
            <div key={party.id} className="card p-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                {/* Party info */}
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-display font-bold text-sm"
                    style={{ backgroundColor: party.color || "#1a3a6b" }}
                  >
                    {party.ballotOrder}
                  </div>
                  <div>
                    <div className="font-semibold text-black">{party.name}</div>
                    <div className="text-xs font-mono text-bodydark">
                      Orden {party.ballotOrder}
                    </div>
                  </div>
                </div>
                {/* Actions */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => openAssign(party)}
                    className="btn-secondary btn-sm text-xs flex-1 sm:flex-none justify-center"
                  >
                    🗳 Tipos de elección
                  </button>
                  <button
                    onClick={() => openEdit(party)}
                    className="btn-secondary btn-sm text-xs flex-1 sm:flex-none justify-center"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => {
                      if (confirm("¿Eliminar?"))
                        deleteMutation.mutate(party.id);
                    }}
                    className="text-red-500 hover:text-red-700 text-xs font-medium px-2 py-1"
                  >
                    Eliminar
                  </button>
                </div>
              </div>

              {/* Assigned election types */}
              {(party.electionTypes || []).length > 0 && (
                <div className="mt-3 pt-3 border-t border-stroke">
                  <p className="text-xs text-bodydark mb-2 font-medium">
                    Tipos de elección con candidato:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(party.electionTypes as any[]).map((pet: any) => (
                      <div
                        key={pet.id}
                        className="flex items-center gap-1.5 bg-whiten border border-stroke rounded-lg px-3 py-1.5"
                      >
                        <span className="text-xs font-medium text-black">
                          {pet.electionType?.name}
                        </span>
                        {pet.candidateName && (
                          <span className="text-xs text-bodydark">
                            — {pet.candidateName}
                          </span>
                        )}
                        <button
                          onClick={() =>
                            unassignMutation.mutate({
                              partyId: party.id,
                              etId: pet.electionType?.id,
                            })
                          }
                          className="text-red-400 hover:text-red-600 ml-1 text-xs leading-none"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {(party.electionTypes || []).length === 0 && (
                <div className="mt-3 pt-3 border-t border-stroke">
                  <p className="text-xs text-amber-500 italic">
                    Sin tipos de elección asignados — los delegados no podrán
                    registrar votos para este partido.
                  </p>
                </div>
              )}
            </div>
          ))}
          {(parties as any[]).length === 0 && (
            <div className="card p-10 text-center text-bodydark">
              No hay partidos registrados.
            </div>
          )}
        </div>
      )}

      {/* Create / Edit modal */}
      {(modal === "create" || modal === "edit") && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-sm shadow-default border border-stroke w-full max-w-md">
            <div className="p-6 border-b border-stroke flex justify-between items-center">
              <h2 className="text-lg font-bold text-black">
                {modal === "create" ? "Nuevo Partido" : "Editar Partido"}
              </h2>
              <button
                onClick={() => setModal(null)}
                className="text-bodydark hover:text-body text-xl"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              {[
                { key: "name", label: "Nombre del partido" },
                { key: "ballotOrder", label: "Orden en papeleta", type: "number" },
                { key: "color", label: "Color (hex)", type: "color" },
              ].map((f) => (
                <div key={f.key}>
                  <label className="label">{f.label}</label>
                  <input
                    type={f.type || "text"}
                    value={form[f.key] || ""}
                    className="input"
                    onChange={(e) =>
                      setForm({ ...form, [f.key]: e.target.value })
                    }
                  />
                </div>
              ))}
            </div>
            <div className="px-6 pb-6 flex justify-end gap-3">
              <button onClick={() => setModal(null)} className="btn-secondary">
                Cancelar
              </button>
              <button
                onClick={() =>
                  modal === "create"
                    ? createMutation.mutate(form)
                    : updateMutation.mutate({ id: selected.id, data: form })
                }
                disabled={createMutation.isPending || updateMutation.isPending}
                className="btn-primary"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign election types modal */}
      {modal === "assign" && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-sm shadow-default border border-stroke w-full max-w-lg">
            <div className="p-6 border-b border-stroke flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-black">
                  Tipos de elección — {selected.name}
                </h2>
                <p className="text-bodydark text-sm mt-0.5">
                  Define en qué elecciones participa este partido
                </p>
              </div>
              <button
                onClick={() => setModal(null)}
                className="text-bodydark hover:text-body text-xl"
              >
                ✕
              </button>
            </div>
            <div className="p-6">
              {/* Current assignments */}
              <div className="mb-5">
                <p className="text-xs font-semibold text-body uppercase tracking-wide mb-2">
                  Asignados actualmente
                </p>
                {(selected.electionTypes || []).length === 0 ? (
                  <p className="text-bodydark text-sm italic">
                    Ninguno asignado.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {(selected.electionTypes as any[]).map((pet: any) => (
                      <div
                        key={pet.id}
                        className="flex items-center justify-between bg-whiten rounded-lg px-3 py-2"
                      >
                        <div>
                          <span className="text-sm font-medium text-black">
                            {pet.electionType?.name}
                          </span>
                          {pet.candidateName && (
                            <span className="text-xs text-bodydark ml-2">
                              {pet.candidateName}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() =>
                            unassignMutation.mutate({
                              partyId: selected.id,
                              etId: pet.electionType?.id,
                            })
                          }
                          className="text-meta-1 hover:text-red-700 text-xs font-semibold"
                        >
                          Quitar
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add new */}
              {availableEts.length > 0 && (
                <div className="border-t border-stroke pt-4">
                  <p className="text-xs font-semibold text-body uppercase tracking-wide mb-3">
                    Agregar tipo de elección
                  </p>
                  <div className="space-y-3">
                    <div>
                      <label className="label">Tipo de elección</label>
                      <select
                        value={assignForm.electionTypeId}
                        className="input"
                        onChange={(e) =>
                          setAssignForm({
                            ...assignForm,
                            electionTypeId: e.target.value,
                          })
                        }
                      >
                        <option value="">Seleccionar...</option>
                        {availableEts.map((et: any) => (
                          <option key={et.id} value={et.id}>
                            {et.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label">
                        Nombre del candidato (opcional)
                      </label>
                      <input
                        type="text"
                        value={assignForm.candidateName}
                        className="input"
                        placeholder="Ej: Juan Pérez"
                        onChange={(e) =>
                          setAssignForm({
                            ...assignForm,
                            candidateName: e.target.value,
                          })
                        }
                      />
                    </div>
                    <button
                      onClick={() => {
                        if (!assignForm.electionTypeId)
                          return toast.error("Selecciona un tipo de elección");
                        assignMutation.mutate({
                          partyId: selected.id,
                          data: {
                            electionTypeId: assignForm.electionTypeId,
                            candidateName:
                              assignForm.candidateName || undefined,
                          },
                        });
                      }}
                      disabled={assignMutation.isPending}
                      className="btn-primary btn-sm w-full"
                    >
                      {assignMutation.isPending ? "Asignando..." : "✚ Agregar"}
                    </button>
                  </div>
                </div>
              )}
              {availableEts.length === 0 &&
                (selected.electionTypes || []).length > 0 && (
                  <p className="text-xs text-green-600 font-medium mt-3">
                    ✓ Este partido tiene todos los tipos de elección asignados.
                  </p>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
