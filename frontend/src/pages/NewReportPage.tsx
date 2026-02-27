import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { partiesApi, votesApi } from '../lib/api';
import { useAuthStore } from '../store/auth.store';

export default function NewReportPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const { data: parties = [], isLoading: loadingParties } = useQuery({
    queryKey: ['parties-with-et'],
    queryFn: partiesApi.getWithElectionTypes,
  });

  // Check if user already has a draft/submitted report for their table
  const { data: existingReports = [] } = useQuery({
    queryKey: ['reports'],
    queryFn: () => votesApi.getReports(),
  });

  // Find existing non-verified report for this table
  const existingReport = (existingReports as any[]).find(
    r => r.table?.id === (user as any)?.table?.id && r.status !== 'VERIFIED'
  );
  const isEditing = !!existingReport;

  // votes[electionTypeId][partyId] = number
  const [votes, setVotes] = useState<Record<string, Record<string, number>>>({});
  const [nullVotes, setNullVotes] = useState(0);
  const [blankVotes, setBlankVotes] = useState(0);
  const [notes, setNotes] = useState('');

  // Pre-fill from existing report
  useEffect(() => {
    if (existingReport) {
      const prefill: Record<string, Record<string, number>> = {};
      for (const entry of existingReport.entries || []) {
        const etId = entry.electionType?.id;
        const pId = entry.party?.id;
        if (etId && pId) {
          if (!prefill[etId]) prefill[etId] = {};
          prefill[etId][pId] = entry.votes;
        }
      }
      setVotes(prefill);
      setNullVotes(existingReport.nullVotes || 0);
      setBlankVotes(existingReport.blankVotes || 0);
      setNotes(existingReport.notes || '');
    }
  }, [existingReport?.id]);

  const setVote = (etId: string, partyId: string, val: number) => {
    setVotes(prev => ({
      ...prev,
      [etId]: { ...prev[etId], [partyId]: val >= 0 ? val : 0 },
    }));
  };

  const buildPayload = () => {
    const entries: any[] = [];
    for (const [etId, partyVotes] of Object.entries(votes)) {
      for (const [partyId, v] of Object.entries(partyVotes)) {
        if (v > 0) entries.push({ electionTypeId: etId, partyId, votes: v });
      }
    }
    return { entries, nullVotes, blankVotes, notes };
  };

  const createMutation = useMutation({
    mutationFn: votesApi.createReport,
    onSuccess: () => { toast.success('Reporte guardado'); navigate('/reports'); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Error al crear reporte'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => votesApi.updateReport(id, data),
    onSuccess: () => { toast.success('Reporte actualizado'); navigate('/reports'); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Error al actualizar reporte'),
  });

  const submitAfterSaveMutation = useMutation({
    mutationFn: async () => {
      const payload = buildPayload();
      if (entries.length === 0) throw new Error('Debes ingresar al menos un voto');
      let report;
      if (isEditing) {
        report = await votesApi.updateReport(existingReport.id, payload);
      } else {
        report = await votesApi.createReport(payload);
      }
      return votesApi.submitReport(report.id);
    },
    onSuccess: () => { toast.success('Reporte guardado y enviado'); navigate('/reports'); },
    onError: (e: any) => toast.error(e?.response?.data?.message || e?.message || 'Error'),
  });

  const totalVotesCount = Object.values(votes).reduce(
    (acc, pv) => acc + Object.values(pv).reduce((a, v) => a + (v || 0), 0), 0,
  );
  const totalAll = totalVotesCount + nullVotes + blankVotes;
  const tableVoters = (user as any)?.table?.totalVoters ?? null;
  const overLimit = tableVoters !== null && totalAll > tableVoters;

  const entries: any[] = [];
  for (const [etId, partyVotes] of Object.entries(votes)) {
    for (const [partyId, v] of Object.entries(partyVotes)) {
      if (v > 0) entries.push({ electionTypeId: etId, partyId, votes: v });
    }
  }

  const handleSave = () => {
    if (entries.length === 0) return toast.error('Debes ingresar al menos un voto');
    if (overLimit) return toast.error(`El total (${totalAll}) supera el padrón habilitado (${tableVoters}).`);
    const payload = buildPayload();
    if (isEditing) {
      updateMutation.mutate({ id: existingReport.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  // Build matrix: electionType → parties assigned
  const matrix: Record<string, { etName: string; order: number; rows: any[] }> = {};
  for (const party of parties as any[]) {
    for (const et of party.electionTypes ?? []) {
      if (!matrix[et.id]) matrix[et.id] = { etName: et.name, order: et.order ?? 0, rows: [] };
      matrix[et.id].rows.push({ partyId: party.id, partyAcronym: party.acronym, partyName: party.name, partyColor: party.color, candidateName: et.candidateName });
    }
  }
  const electionTypeSections = Object.entries(matrix).sort(([, a], [, b]) => a.order - b.order);

  const tableInfo = (user as any)?.table;
  const schoolInfo = tableInfo?.school;

  if (!tableInfo) {
    return (
      <div className="card p-10 text-center">
        <div className="text-4xl mb-3">⚠️</div>
        <p className="text-slate-600 font-medium">No tienes una mesa asignada</p>
        <p className="text-slate-400 text-sm mt-1">Contacta al administrador</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl text-brand-800">
          {isEditing ? 'Actualizar Reporte' : 'Nuevo Reporte de Votación'}
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Mesa <span className="font-mono font-semibold text-brand-600">{tableInfo.tableNumber}</span>
          {schoolInfo && <> — <span className="text-slate-600">{schoolInfo.recintoElectoral}</span></>}
        </p>
        {isEditing && (
          <div className="mt-2 inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 text-xs px-3 py-1.5 rounded-lg">
            ✏️ Editando reporte existente ({existingReport.status === 'DRAFT' ? 'Borrador' : 'Enviado'}) — se restablecerá a borrador al guardar
          </div>
        )}
      </div>

      {/* Summary bar */}
      <div className={`card p-4 mb-6 flex items-center gap-6 border-0 rounded-xl ${overLimit ? 'bg-red-700' : 'bg-brand-800'} text-white`}>
        <div>
          <div className="text-xs opacity-70">Votos partido</div>
          <div className="font-mono font-bold text-2xl">{totalVotesCount.toLocaleString()}</div>
        </div>
        <div>
          <div className="text-xs opacity-70">Nulos</div>
          <div className="font-mono font-bold text-xl">{nullVotes}</div>
        </div>
        <div>
          <div className="text-xs opacity-70">Blancos</div>
          <div className="font-mono font-bold text-xl">{blankVotes}</div>
        </div>
        <div className="border-l border-white/20 pl-6">
          <div className="text-xs opacity-70">Total acumulado</div>
          <div className={`font-mono font-bold text-2xl ${overLimit ? 'text-red-200' : ''}`}>{totalAll.toLocaleString()}</div>
        </div>
        {tableVoters && (
          <div>
            <div className="text-xs opacity-70">Padrón habilitado</div>
            <div className="font-mono font-bold text-xl">{tableVoters.toLocaleString()}</div>
          </div>
        )}
        {overLimit && (
          <div className="ml-auto bg-white/20 rounded-lg px-3 py-2 text-sm font-semibold">
            ⚠️ Se supera el padrón en {(totalAll - tableVoters).toLocaleString()} votos
          </div>
        )}
      </div>

      {loadingParties ? (
        <div className="card p-10 text-center text-slate-400">Cargando partidos...</div>
      ) : electionTypeSections.length === 0 ? (
        <div className="card p-10 text-center">
          <div className="text-4xl mb-3">⚠️</div>
          <p className="text-slate-500">No hay partidos con tipos de elección asignados.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {electionTypeSections.map(([etId, section]) => (
            <div key={etId} className="card overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                <span className="w-2 h-2 bg-accent-500 rounded-full" />
                <h2 className="font-display font-semibold text-brand-800">{section.etName}</h2>
                <span className="text-xs text-slate-400">({section.rows.length} partido(s))</span>
              </div>
              <div className="p-4 grid gap-3">
                {section.rows.map((row: any) => (
                  <div key={row.partyId} className="flex items-center gap-4">
                    <div className="flex items-center gap-2 w-56 min-w-0">
                      <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: row.partyColor || '#999' }} />
                      <span className="text-sm font-medium text-slate-800">{row.partyAcronym}</span>
                      <span className="text-xs text-slate-400 truncate">{row.candidateName || row.partyName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="button"
                        onClick={() => setVote(etId, row.partyId, (votes[etId]?.[row.partyId] || 0) - 1)}
                        className="w-8 h-8 rounded-lg border border-slate-300 flex items-center justify-center text-slate-500 hover:bg-slate-100 select-none">−</button>
                      <input
                        type="number" min={0}
                        value={votes[etId]?.[row.partyId] || ''}
                        onChange={e => setVote(etId, row.partyId, parseInt(e.target.value) || 0)}
                        className="w-20 text-center font-mono font-medium border border-slate-300 rounded-lg py-1.5 focus:ring-2 focus:ring-brand-500 outline-none text-sm"
                        placeholder="0"
                      />
                      <button type="button"
                        onClick={() => setVote(etId, row.partyId, (votes[etId]?.[row.partyId] || 0) + 1)}
                        className="w-8 h-8 rounded-lg border border-slate-300 flex items-center justify-center text-slate-500 hover:bg-slate-100 select-none">+</button>
                    </div>
                    {(votes[etId]?.[row.partyId] || 0) > 0 && (
                      <span className="font-mono text-sm text-brand-600 font-semibold">
                        {votes[etId][row.partyId].toLocaleString()} ✓
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Null/blank + notes */}
      <div className="card p-5 mt-4">
        <h2 className="font-display font-semibold text-brand-800 mb-4">Votos Especiales y Notas</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Votos Nulos</label>
            <input type="number" min={0} value={nullVotes || ''} placeholder="0"
              onChange={e => setNullVotes(parseInt(e.target.value) || 0)} className="input" />
          </div>
          <div>
            <label className="label">Votos en Blanco</label>
            <input type="number" min={0} value={blankVotes || ''} placeholder="0"
              onChange={e => setBlankVotes(parseInt(e.target.value) || 0)} className="input" />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Notas / Observaciones (opcional)</label>
            <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)}
              className="input resize-none" placeholder="Observaciones sobre el conteo..." />
          </div>
        </div>
      </div>

      {overLimit && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 font-medium text-sm flex items-start gap-2">
          <span className="text-lg">⚠️</span>
          <div>
            El total de votos ingresados ({totalAll.toLocaleString()}) supera el padrón habilitado de la mesa
            ({tableVoters?.toLocaleString()} votantes) por {(totalAll - tableVoters).toLocaleString()} votos.
            Revisa los datos antes de guardar.
          </div>
        </div>
      )}

      <div className="flex justify-end gap-3 mt-6">
        <button onClick={() => navigate('/reports')} className="btn-secondary">Cancelar</button>
        <button
          onClick={handleSave}
          disabled={createMutation.isPending || updateMutation.isPending || overLimit}
          className="btn-secondary px-5"
        >
          {createMutation.isPending || updateMutation.isPending ? 'Guardando...' : '💾 Guardar borrador'}
        </button>
        <button
          onClick={() => submitAfterSaveMutation.mutate()}
          disabled={submitAfterSaveMutation.isPending || overLimit}
          className="btn-primary px-6"
        >
          {submitAfterSaveMutation.isPending ? 'Enviando...' : '📤 Guardar y enviar'}
        </button>
      </div>
    </div>
  );
}
