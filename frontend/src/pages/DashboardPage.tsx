import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement,
  ArcElement, Tooltip, Legend,
} from 'chart.js';
import { votesApi, reportsApi } from '../lib/api';
import { useAuthStore } from '../store/auth.store';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

// ─── StatusCards ─────────────────────────────────────────────────────────────

function StatusCards({ metrics }: { metrics: any }) {
  const cards = [
    { label: 'Borradores',     value: metrics?.draft ?? 0,        color: 'bg-slate-100 text-slate-700', icon: '📝' },
    { label: 'Enviados',       value: metrics?.submitted ?? 0,    color: 'bg-blue-50 text-blue-700',    icon: '📤' },
    { label: 'Verificados',    value: metrics?.verified ?? 0,     color: 'bg-green-50 text-green-700',  icon: '✅' },
    { label: 'Total Reportes', value: metrics?.totalReports ?? 0, color: 'bg-brand-50 text-brand-700',  icon: '📊' },
  ];
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map(c => (
        <div key={c.label} className="card p-5">
          <div className="flex items-start justify-between mb-3">
            <span className="text-2xl">{c.icon}</span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${c.color}`}>{c.label}</span>
          </div>
          <div className="font-display font-bold text-3xl text-brand-800">{c.value}</div>
        </div>
      ))}
    </div>
  );
}

// ─── ElectionTypeBlock (colapsable) ─────────────────────────────────────────

function ElectionTypeBlock({ et, defaultOpen = true }: { et: any; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  if (!et.parties?.length) return null;

  const winner = et.parties[0];

  const barData = {
    labels: et.parties.map((p: any) => p.acronym),
    datasets: [{
      label: 'Votos',
      data: et.parties.map((p: any) => p.votes),
      backgroundColor: et.parties.map((p: any) => p.color || '#1a3a6b'),
      borderRadius: 6,
      borderSkipped: false,
    }],
  };

  const doughnutData = {
    labels: et.parties.map((p: any) => `${p.acronym} ${p.percentage}%`),
    datasets: [{
      data: et.parties.map((p: any) => p.votes),
      backgroundColor: et.parties.map((p: any) => p.color || '#1a3a6b'),
      borderWidth: 2,
      borderColor: '#ffffff',
    }],
  };

  return (
    <div className="card overflow-hidden">
      {/* Clickable header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full px-6 py-4 bg-brand-800 hover:bg-brand-700 transition-colors flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <span className="font-display font-bold text-white text-lg">{et.name}</span>
          <span className="text-brand-100 text-sm opacity-70">
            {et.totalVotes.toLocaleString()} votos
          </span>
        </div>
        <div className="flex items-center gap-3">
          {winner && (
            <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: winner.color }} />
              <span className="text-white text-sm font-semibold">{winner.acronym}</span>
              <span className="text-white/70 text-xs">{winner.percentage}%</span>
              <span className="text-accent-400 text-xs font-mono ml-1">🏆 va ganando</span>
            </div>
          )}
          <span className={`text-white/60 text-lg transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
            ▾
          </span>
        </div>
      </button>

      {/* Collapsible body */}
      {open && (
        <>
          <div className="p-5 grid lg:grid-cols-5 gap-6">
            {/* Bar */}
            <div className="lg:col-span-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Votos por partido</p>
              <Bar
                data={barData}
                options={{
                  indexAxis: 'y' as const,
                  responsive: true,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        label: (ctx: any) => {
                          const p = et.parties[ctx.dataIndex];
                          return ` ${ctx.raw.toLocaleString()} votos (${p?.percentage}%)`;
                        },
                      },
                    },
                  },
                  scales: {
                    x: { beginAtZero: true, grid: { color: '#f1f5f9' } },
                    y: { grid: { display: false } },
                  },
                }}
              />
            </div>
            {/* Doughnut */}
            <div className="lg:col-span-2 flex flex-col items-center justify-center">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3 self-start">
                Distribución %
              </p>
              <div className="w-full max-w-[220px]">
                <Doughnut
                  data={doughnutData}
                  options={{
                    responsive: true,
                    cutout: '62%',
                    plugins: {
                      legend: { position: 'bottom', labels: { font: { size: 11 }, padding: 10 } },
                      tooltip: {
                        callbacks: {
                          label: (ctx: any) => {
                            const p = et.parties[ctx.dataIndex];
                            return ` ${p?.percentage}% — ${ctx.raw.toLocaleString()} votos`;
                          },
                        },
                      },
                    },
                  }}
                />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="px-5 pb-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  {['#', 'Partido', 'Votos', '%', ''].map(h => (
                    <th key={h} className={`py-2 text-xs font-semibold text-slate-400 uppercase tracking-wide ${h === 'Votos' || h === '%' ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {et.parties.map((p: any, i: number) => (
                  <tr key={p.acronym} className={i === 0 ? 'bg-amber-50/60' : ''}>
                    <td className="py-2.5 pr-3 font-mono text-slate-400 text-xs">{i + 1}</td>
                    <td className="py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: p.color }} />
                        <span className="font-semibold text-slate-800">{p.acronym}</span>
                        <span className="text-slate-400 text-xs hidden sm:inline">{p.name}</span>
                      </div>
                    </td>
                    <td className="py-2.5 text-right font-mono font-semibold text-brand-800">
                      {p.votes.toLocaleString()}
                    </td>
                    <td className="py-2.5 text-right font-mono text-slate-600">{p.percentage}%</td>
                    <td className="py-2.5 pl-4 w-32">
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${p.percentage}%`, backgroundColor: p.color }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-200">
                  <td colSpan={2} className="py-2 text-xs text-slate-400 font-medium">Total</td>
                  <td className="py-2 text-right font-mono font-bold text-brand-800">
                    {et.totalVotes.toLocaleString()}
                  </td>
                  <td className="py-2 text-right font-mono text-slate-400">100%</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

// ─── ResultsPanel ────────────────────────────────────────────────────────────

function ResultsPanel({ metrics }: { metrics: any }) {
  const byET: any[] = metrics?.byElectionType ?? [];
  const [allOpen, setAllOpen] = useState(true);

  if (byET.length === 0) {
    return (
      <div className="card p-10 text-center text-slate-400">
        <div className="text-4xl mb-3">🗳️</div>
        <p>Sin datos de votación aún. Los delegados deben ingresar reportes.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-end mb-3">
        <button onClick={() => setAllOpen(o => !o)} className="btn-secondary btn-sm text-xs">
          {allOpen ? '▲ Contraer todos' : '▼ Expandir todos'}
        </button>
      </div>
      <div className="space-y-3">
        {byET.map((et: any) => (
          <ElectionTypeBlock key={`${et.id}-${allOpen}`} et={et} defaultOpen={allOpen} />
        ))}
      </div>
    </div>
  );
}

// ─── AdminDashboard ───────────────────────────────────────────────────────────

function AdminDashboard({ metrics }: { metrics: any }) {
  const byParty: any[] = metrics?.byParty ?? [];
  const [allOpen, setAllOpen] = useState(false);

  if (byParty.length === 0) {
    return (
      <div className="card p-10 text-center text-slate-400">
        <div className="text-4xl mb-3">🗳️</div>
        <p>No hay reportes ingresados por ningún partido todavía.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display font-bold text-lg text-brand-800">
          Resultados por partido
        </h2>
        <button
          onClick={() => setAllOpen(o => !o)}
          className="btn-secondary btn-sm text-xs"
        >
          {allOpen ? '▲ Contraer todos' : '▼ Expandir todos'}
        </button>
      </div>
      {/* Render panels — pass key that changes to force re-mount when allOpen toggles */}
      <div className="space-y-3">
        {byParty.map((pd: any) => (
          <ControlledPartyPanel key={`${pd.partyId}-${allOpen}`} pd={pd} defaultOpen={allOpen} />
        ))}
      </div>
    </div>
  );
}

/** Wrapper that accepts a defaultOpen prop so "expand all / collapse all" works */
function ControlledPartyPanel({ pd, defaultOpen }: { pd: any; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const byET: any[] = pd.byElectionType ?? [];
  const hasData = byET.length > 0;

  return (
    <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-6 py-4 text-left transition-colors hover:bg-slate-50"
        style={{ borderBottom: open ? `3px solid ${pd.partyColor || '#94a3b8'}` : 'none' }}
      >
        <div className="w-5 h-5 rounded-md flex-shrink-0" style={{ backgroundColor: pd.partyColor || '#94a3b8' }} />
        <div className="flex-1 min-w-0">
          <span className="font-display font-bold text-brand-800 text-base">{pd.partyAcronym}</span>
          <span className="text-slate-400 text-sm ml-2 hidden sm:inline">{pd.partyName}</span>
        </div>
        <div className="flex items-center gap-3 text-xs font-mono flex-shrink-0">
          <span className="text-slate-400">{pd.totalReports} reporte(s)</span>
          {pd.verified > 0 && (
            <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{pd.verified} verificado(s)</span>
          )}
          {pd.submitted > 0 && (
            <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{pd.submitted} enviado(s)</span>
          )}
          {!hasData && (
            <span className="bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full italic">sin votos</span>
          )}
        </div>
        <span className={`ml-3 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>

      {open && (
        <div className="p-5 bg-slate-50/40">
          {hasData ? (
            <div className="space-y-5">
              {byET.map((et: any) => <ElectionTypeBlock key={et.id} et={et} defaultOpen={true} />)}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400">
              <div className="text-3xl mb-2">📭</div>
              <p className="text-sm">Los delegados de este partido no han ingresado reportes aún.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── main page ───────────────────────────────────────────────────────────────

const roleMessages: Record<string, string> = {
  ADMIN:        'Resultados por partido — datos ingresados por delegados',
  JEFE_CAMPANA: 'Resultados consolidados de todos los delegados de tu partido',
  DELEGADO:     'Resultados reportados por los delegados de tu partido',
};

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['metrics'],
    queryFn: votesApi.getMetrics,
    refetchInterval: 30_000,
  });

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-brand-800">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-0.5">{roleMessages[user?.role ?? '']}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={reportsApi.exportExcel} className="btn-secondary btn-sm">📊 Excel</button>
          <button onClick={reportsApi.exportPdf}   className="btn-secondary btn-sm">📄 PDF</button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64 text-slate-400">
          Cargando métricas...
        </div>
      ) : (
        <>
          <StatusCards metrics={metrics} />
          {user?.role === 'ADMIN'
            ? <AdminDashboard metrics={metrics} />
            : <ResultsPanel metrics={metrics} />
          }
        </>
      )}
    </div>
  );
}
