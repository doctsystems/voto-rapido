import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { partiesApi, electionTypesApi, votesApi } from '../lib/api';
import { useAuthStore } from '../store/auth.store';

export default function NewReportPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const { data: parties = [] } = useQuery({ queryKey: ['parties'], queryFn: partiesApi.getAll });
  const { data: electionTypes = [] } = useQuery({ queryKey: ['election-types'], queryFn: electionTypesApi.getAll });

  // votes[electionTypeId][partyId] = number
  const [votes, setVotes] = useState<Record<string, Record<string, number>>>({});
  const [nullVotes, setNullVotes] = useState(0);
  const [blankVotes, setBlankVotes] = useState(0);
  const [notes, setNotes] = useState('');

  const setVote = (etId: string, partyId: string, val: number) => {
    setVotes(prev => ({
      ...prev,
      [etId]: { ...prev[etId], [partyId]: val >= 0 ? val : 0 },
    }));
  };

  const createMutation = useMutation({
    mutationFn: votesApi.createReport,
    onSuccess: () => {
      toast.success('Reporte creado correctamente');
      navigate('/reports');
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Error al crear reporte'),
  });

  const handleSubmit = () => {
    const entries: any[] = [];
    for (const [etId, partyVotes] of Object.entries(votes)) {
      for (const [partyId, v] of Object.entries(partyVotes)) {
        if (v > 0) entries.push({ electionTypeId: etId, partyId, votes: v });
      }
    }
    if (entries.length === 0) {
      toast.error('Debes ingresar al menos un voto');
      return;
    }
    createMutation.mutate({ entries, nullVotes, blankVotes, notes });
  };

  const totalVotes = Object.values(votes).reduce((acc, pv) =>
    acc + Object.values(pv).reduce((a, v) => a + (v || 0), 0), 0
  );

  if (!user?.table) {
    return (
      <div className="card p-10 text-center">
        <div className="text-4xl mb-3">⚠️</div>
        <p className="text-slate-600 font-medium">No tienes una mesa asignada</p>
        <p className="text-slate-400 text-sm mt-1">Contacta al administrador para que te asigne una mesa</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl text-brand-800">Nuevo Reporte de Votación</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Mesa <span className="font-mono font-semibold text-brand-600">{user.table.tableNumber}</span>
          {(user.table as any).school && (
            <> — <span className="text-slate-600">{(user.table as any).school.name}</span></>
          )}
        </p>
      </div>

      {/* Summary bar */}
      <div className="card p-4 mb-6 flex items-center gap-6 bg-brand-800 text-white border-0">
        <div>
          <div className="text-xs opacity-70">Total votos ingresados</div>
          <div className="font-mono font-bold text-2xl">{totalVotes.toLocaleString()}</div>
        </div>
        <div>
          <div className="text-xs opacity-70">Nulos</div>
          <div className="font-mono font-bold text-xl">{nullVotes}</div>
        </div>
        <div>
          <div className="text-xs opacity-70">Blancos</div>
          <div className="font-mono font-bold text-xl">{blankVotes}</div>
        </div>
        <div className="ml-auto">
          <div className="text-xs opacity-70">Partido</div>
          <div className="font-medium">{user.party?.acronym || '—'}</div>
        </div>
      </div>

      {/* Vote entry by election type */}
      <div className="space-y-4">
        {(electionTypes as any[]).map((et: any) => (
          <div key={et.id} className="card overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
              <span className="w-2 h-2 bg-accent-500 rounded-full" />
              <h2 className="font-display font-semibold text-brand-800">{et.name}</h2>
            </div>
            <div className="p-4">
              <div className="grid gap-3">
                {(parties as any[]).filter((p: any) => p.isActive).map((party: any) => (
                  <div key={party.id} className="flex items-center gap-4">
                    <div className="flex items-center gap-2 w-48">
                      <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: party.color || '#999' }} />
                      <span className="text-sm text-slate-700 font-medium">{party.acronym}</span>
                      <span className="text-xs text-slate-400 truncate">{party.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setVote(et.id, party.id, (votes[et.id]?.[party.id] || 0) - 1)}
                        className="w-8 h-8 rounded-lg border border-slate-300 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors"
                      >−</button>
                      <input
                        type="number"
                        min={0}
                        value={votes[et.id]?.[party.id] || ''}
                        onChange={e => setVote(et.id, party.id, parseInt(e.target.value) || 0)}
                        className="w-20 text-center font-mono font-medium border border-slate-300 rounded-lg py-1.5 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none text-sm"
                        placeholder="0"
                      />
                      <button
                        type="button"
                        onClick={() => setVote(et.id, party.id, (votes[et.id]?.[party.id] || 0) + 1)}
                        className="w-8 h-8 rounded-lg border border-slate-300 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors"
                      >+</button>
                    </div>
                    {(votes[et.id]?.[party.id] || 0) > 0 && (
                      <div className="font-mono text-sm text-brand-600 font-semibold">
                        {votes[et.id][party.id].toLocaleString()} ✓
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Null/blank votes + notes */}
      <div className="card p-5 mt-4">
        <h2 className="font-display font-semibold text-brand-800 mb-4">Votos Especiales y Notas</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Votos Nulos</label>
            <input
              type="number" min={0}
              value={nullVotes || ''}
              onChange={e => setNullVotes(parseInt(e.target.value) || 0)}
              className="input"
              placeholder="0"
            />
          </div>
          <div>
            <label className="label">Votos en Blanco</label>
            <input
              type="number" min={0}
              value={blankVotes || ''}
              onChange={e => setBlankVotes(parseInt(e.target.value) || 0)}
              className="input"
              placeholder="0"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Notas / Observaciones (opcional)</label>
            <textarea
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="input resize-none"
              placeholder="Observaciones sobre el conteo..."
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 mt-6">
        <button onClick={() => navigate('/reports')} className="btn-secondary">Cancelar</button>
        <button
          onClick={handleSubmit}
          disabled={createMutation.isPending}
          className="btn-primary px-6"
        >
          {createMutation.isPending ? 'Guardando...' : '💾 Guardar Reporte'}
        </button>
      </div>
    </div>
  );
}
