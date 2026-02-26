import { useQuery } from '@tanstack/react-query';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend } from 'chart.js';
import { votesApi, reportsApi } from '../lib/api';
import { useAuthStore } from '../store/auth.store';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

const roleMessages: Record<string, string> = {
  ADMIN: 'Visión global del sistema electoral',
  JEFE_CAMPANA: 'Métricas consolidadas de tu partido',
  DELEGADO: 'Tus reportes de votación',
};

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['metrics'],
    queryFn: votesApi.getMetrics,
    refetchInterval: 30_000,
  });

  const statusCards = [
    { label: 'Borradores', value: metrics?.draft ?? 0, color: 'bg-slate-100 text-slate-700', icon: '📝' },
    { label: 'Enviados', value: metrics?.submitted ?? 0, color: 'bg-blue-50 text-blue-700', icon: '📤' },
    { label: 'Verificados', value: metrics?.verified ?? 0, color: 'bg-green-50 text-green-700', icon: '✅' },
    { label: 'Total Reportes', value: metrics?.totalReports ?? 0, color: 'bg-brand-50 text-brand-700', icon: '📊' },
  ];

  const barData = {
    labels: (metrics?.votesByParty || []).map((p: any) => p.acronym),
    datasets: [{
      label: 'Votos',
      data: (metrics?.votesByParty || []).map((p: any) => p.total),
      backgroundColor: (metrics?.votesByParty || []).map((p: any) => p.color || '#1a3a6b'),
      borderRadius: 6,
    }],
  };

  const doughnutData = {
    labels: (metrics?.votesByElectionType || []).map((e: any) => e.name),
    datasets: [{
      data: (metrics?.votesByElectionType || []).map((e: any) => e.total),
      backgroundColor: ['#1a3a6b', '#d97706', '#059669', '#7c3aed'],
    }],
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-brand-800">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-0.5">{roleMessages[user?.role || '']}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={reportsApi.exportExcel} className="btn-secondary btn-sm flex items-center gap-1.5">
            📊 Excel
          </button>
          <button onClick={reportsApi.exportPdf} className="btn-secondary btn-sm flex items-center gap-1.5">
            📄 PDF
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-slate-400">Cargando métricas...</div>
        </div>
      ) : (
        <>
          {/* Status cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {statusCards.map(card => (
              <div key={card.label} className="card p-5">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-2xl">{card.icon}</span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${card.color}`}>
                    {card.label}
                  </span>
                </div>
                <div className="font-display font-bold text-3xl text-brand-800">{card.value}</div>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div className="grid lg:grid-cols-3 gap-4">
            {/* Votes by party - bar chart */}
            <div className="card p-5 lg:col-span-2">
              <h2 className="font-display font-semibold text-brand-800 mb-4">Votos por Partido</h2>
              {(metrics?.votesByParty?.length ?? 0) > 0 ? (
                <Bar
                  data={barData}
                  options={{
                    responsive: true,
                    plugins: { legend: { display: false } },
                    scales: {
                      y: { beginAtZero: true, grid: { color: '#f1f5f9' } },
                      x: { grid: { display: false } },
                    },
                  }}
                />
              ) : (
                <div className="flex items-center justify-center h-40 text-slate-400 text-sm">
                  Sin datos de votación aún
                </div>
              )}
            </div>

            {/* Votes by election type - doughnut */}
            <div className="card p-5">
              <h2 className="font-display font-semibold text-brand-800 mb-4">Por Tipo de Elección</h2>
              {(metrics?.votesByElectionType?.length ?? 0) > 0 ? (
                <>
                  <Doughnut
                    data={doughnutData}
                    options={{ responsive: true, plugins: { legend: { position: 'bottom' } } }}
                  />
                </>
              ) : (
                <div className="flex items-center justify-center h-40 text-slate-400 text-sm">
                  Sin datos aún
                </div>
              )}
            </div>
          </div>

          {/* Top parties list */}
          {(metrics?.votesByParty?.length ?? 0) > 0 && (
            <div className="card p-5 mt-4">
              <h2 className="font-display font-semibold text-brand-800 mb-4">Ranking de Partidos</h2>
              <div className="space-y-3">
                {(metrics.votesByParty as any[]).map((party: any, i: number) => {
                  const maxVotes = metrics.votesByParty[0].total;
                  const pct = maxVotes > 0 ? (party.total / maxVotes) * 100 : 0;
                  return (
                    <div key={party.name}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-slate-400 w-4">#{i+1}</span>
                          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: party.color }} />
                          <span className="text-sm font-medium text-slate-700">{party.acronym}</span>
                          <span className="text-xs text-slate-400">{party.name}</span>
                        </div>
                        <span className="font-mono text-sm font-semibold text-brand-700">{party.total.toLocaleString()}</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: party.color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
