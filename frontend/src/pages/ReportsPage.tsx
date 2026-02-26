import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { votesApi, reportsApi } from '../lib/api';
import { useAuthStore } from '../store/auth.store';

const statusBadge: Record<string, string> = {
  DRAFT: 'badge-draft',
  SUBMITTED: 'badge-submitted',
  VERIFIED: 'badge-verified',
};
const statusLabel: Record<string, string> = {
  DRAFT: 'Borrador',
  SUBMITTED: 'Enviado',
  VERIFIED: 'Verificado',
};

export default function ReportsPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<any | null>(null);

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['reports'],
    queryFn: votesApi.getReports,
  });

  const submitMutation = useMutation({
    mutationFn: (id: string) => votesApi.submitReport(id),
    onSuccess: () => { toast.success('Reporte enviado'); qc.invalidateQueries({ queryKey: ['reports'] }); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Error'),
  });

  const verifyMutation = useMutation({
    mutationFn: (id: string) => votesApi.verifyReport(id),
    onSuccess: () => { toast.success('Reporte verificado'); qc.invalidateQueries({ queryKey: ['reports'] }); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Error'),
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-brand-800">Reportes de Votación</h1>
          <p className="text-slate-500 text-sm mt-0.5">{reports.length} reporte(s) encontrado(s)</p>
        </div>
        <div className="flex gap-2">
          <button onClick={reportsApi.exportExcel} className="btn-secondary btn-sm">📊 Excel</button>
          <button onClick={reportsApi.exportPdf} className="btn-secondary btn-sm">📄 PDF</button>
          {user?.role === 'DELEGADO' && (
            <Link to="/reports/new" className="btn-primary btn-sm">✚ Nuevo Reporte</Link>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="card p-10 text-center text-slate-400">Cargando...</div>
      ) : reports.length === 0 ? (
        <div className="card p-10 text-center">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-slate-500">No hay reportes aún</p>
          {user?.role === 'DELEGADO' && (
            <Link to="/reports/new" className="btn-primary btn-sm mt-4 inline-block">Crear primer reporte</Link>
          )}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Mesa</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Delegado</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Estado</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600">Total votos</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Enviado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reports.map((r: any) => (
                <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono font-medium text-brand-700">{r.table?.tableNumber}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800">{r.delegate?.fullName}</div>
                    {r.delegate?.party && (
                      <div className="text-xs text-slate-400">{r.delegate.party.name}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={statusBadge[r.status]}>{statusLabel[r.status]}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-semibold text-slate-700">{r.totalVotes.toLocaleString()}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    {r.submittedAt ? new Date(r.submittedAt).toLocaleString('es-BO') : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setSelected(r)}
                        className="text-brand-500 hover:text-brand-700 text-xs font-medium"
                      >
                        Ver
                      </button>
                      {user?.role === 'DELEGADO' && r.status === 'DRAFT' && (
                        <button
                          onClick={() => submitMutation.mutate(r.id)}
                          className="btn-primary btn-sm text-xs"
                        >
                          Enviar
                        </button>
                      )}
                      {(user?.role === 'ADMIN' || user?.role === 'JEFE_CAMPANA') && r.status === 'SUBMITTED' && (
                        <button
                          onClick={() => verifyMutation.mutate(r.id)}
                          className="btn-primary btn-sm text-xs bg-green-600 hover:bg-green-700"
                        >
                          Verificar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-slate-100 flex justify-between items-start">
              <div>
                <h2 className="font-display font-bold text-xl text-brand-800">Reporte - Mesa {selected.table?.tableNumber}</h2>
                <p className="text-slate-500 text-sm">{selected.delegate?.fullName}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-3 bg-slate-50 rounded-lg">
                  <div className="font-mono font-bold text-2xl text-brand-800">{selected.totalVotes}</div>
                  <div className="text-xs text-slate-500">Total votos</div>
                </div>
                <div className="text-center p-3 bg-slate-50 rounded-lg">
                  <div className="font-mono font-bold text-2xl text-slate-600">{selected.nullVotes}</div>
                  <div className="text-xs text-slate-500">Nulos</div>
                </div>
                <div className="text-center p-3 bg-slate-50 rounded-lg">
                  <div className="font-mono font-bold text-2xl text-slate-600">{selected.blankVotes}</div>
                  <div className="text-xs text-slate-500">Blancos</div>
                </div>
              </div>

              {/* Group entries by election type */}
              {(() => {
                const byType: Record<string, any[]> = {};
                (selected.entries || []).forEach((e: any) => {
                  const key = e.electionType?.name || 'General';
                  if (!byType[key]) byType[key] = [];
                  byType[key].push(e);
                });
                return Object.entries(byType).map(([type, entries]) => (
                  <div key={type} className="mb-4">
                    <h3 className="font-semibold text-brand-700 text-sm mb-2 flex items-center gap-2">
                      <span className="w-2 h-2 bg-accent-500 rounded-full" />
                      {type}
                    </h3>
                    <div className="space-y-1">
                      {entries.map((e: any) => (
                        <div key={e.id} className="flex justify-between text-sm py-1.5 px-3 bg-slate-50 rounded-lg">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: e.party?.color }} />
                            <span className="text-slate-600">{e.party?.acronym} - {e.party?.name}</span>
                          </div>
                          <span className="font-mono font-semibold text-brand-800">{e.votes}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ));
              })()}

              {selected.notes && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-xs text-amber-700 font-medium mb-1">Notas:</p>
                  <p className="text-sm text-amber-800">{selected.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
