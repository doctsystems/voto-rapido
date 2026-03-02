import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend,
} from 'chart.js';
import { votesApi, reportsApi } from '../lib/api';
import { useAuthStore } from '../store/auth.store';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

// ─── Status Cards ──────────────────────────────────────────────────────────────
function StatusCards({ metrics }: { metrics: any }) {
  const cards = [
    { label: 'Borradores',     value: metrics?.draft       ?? 0, icon: '📝', bg: 'bg-meta-2/60',   text: 'text-body' },
    { label: 'Enviados',       value: metrics?.submitted    ?? 0, icon: '📤', bg: 'bg-blue-50',    text: 'text-blue-600' },
    { label: 'Verificados',    value: metrics?.verified     ?? 0, icon: '✅', bg: 'bg-green-50',   text: 'text-meta-3' },
    { label: 'Total Reportes', value: metrics?.totalReports ?? 0, icon: '📊', bg: 'bg-primary/10', text: 'text-primary' },
  ];
  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
      {cards.map(c => (
        <div key={c.label} className="rounded-2xl bg-white border border-black/[.06] shadow-[0_2px_16px_rgba(0,0,0,.06)]">
          <div className="flex items-center gap-4 p-5">
            <div className={`flex h-12 w-12 items-center justify-center rounded-full text-xl flex-shrink-0 ${c.bg}`}>
              {c.icon}
            </div>
            <div>
              <p className="text-sm text-body">{c.label}</p>
              <h4 className={`text-2xl font-bold ${c.text}`}>{c.value.toLocaleString()}</h4>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Vote Detail Table ─────────────────────────────────────────────────────────
// Replaces the doughnut chart. Shows: Válidos, Blancos, Nulos, Emitidos, Habilitados
function VoteDetailTable({ et }: { et: any }) {
  const s = et.summary ?? {};
  const rows = [
    { label: 'Votos Válidos',        value: s.validVotes  ?? et.validVotes  ?? 0, pct: s.validPct,  color: 'text-meta-3',   bold: false },
    { label: 'Votos Blancos',        value: s.blankVotes  ?? et.blankVotes  ?? 0, pct: s.blankPct,  color: 'text-bodydark', bold: false },
    { label: 'Votos Nulos',          value: s.nullVotes   ?? et.nullVotes   ?? 0, pct: s.nullPct,   color: 'text-meta-8',   bold: false },
    { label: 'Votos Emitidos',       value: s.emitidos    ?? et.totalVotes  ?? 0, pct: null,         color: 'text-black',    bold: true  },
    { label: 'Votantes Habilitados', value: s.totalVoters ?? et.totalVoters ?? 0, pct: null,         color: 'text-primary',  bold: true  },
  ];

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="bg-whiter">
          <th className="px-4 py-2.5 text-left text-xs font-semibold text-body uppercase tracking-wide">Detalle</th>
          <th className="px-4 py-2.5 text-right text-xs font-semibold text-body uppercase tracking-wide">Total</th>
          <th className="px-4 py-2.5 text-right text-xs font-semibold text-body uppercase tracking-wide">%</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-stroke">
        {rows.map(r => (
          <tr key={r.label} className={r.bold ? 'bg-whiter' : ''}>
            <td className={`px-4 py-2.5 ${r.bold ? 'font-semibold text-black' : 'text-black'}`}>{r.label}</td>
            <td className={`px-4 py-2.5 text-right font-mono ${r.bold ? 'font-bold' : 'font-semibold'} ${r.color}`}>
              {r.value.toLocaleString()}
            </td>
            <td className="px-4 py-2.5 text-right font-mono text-body text-xs">
              {r.pct != null ? `${r.pct.toFixed(2)}%` : '—'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ─── Election Type Block ───────────────────────────────────────────────────────
function ElectionTypeBlock({ et, defaultOpen = true }: { et: any; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  if (!et.parties?.length) return null;
  const winner = et.parties[0];

  const barData = {
    labels: et.parties.map((p: any) => p.acronym),
    datasets: [{
      label: 'Votos válidos',
      data: et.parties.map((p: any) => p.votes),
      backgroundColor: et.parties.map((p: any) => p.color || '#3C50E0'),
      borderRadius: 4,
      borderSkipped: false,
    }],
  };

  const validVotes = et.validVotes ?? et.parties.reduce((s: number, p: any) => s + p.votes, 0);

  return (
    <div className="rounded-2xl bg-white border border-black/[.06] shadow-[0_2px_16px_rgba(0,0,0,.06)] overflow-hidden">
      {/* Collapsible header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-6 py-4 bg-boxdark hover:bg-boxdark-2 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <span className="font-bold text-white text-base">{et.name}</span>
          <span className="text-xs text-bodydark2 bg-black/20 px-2 py-0.5 rounded-full">
            {validVotes.toLocaleString()} válidos
          </span>
        </div>
        <div className="flex items-center gap-3">
          {winner && (
            <div className="flex items-center gap-2 bg-white/15 rounded px-3 py-1">
              <div className="w-2.5 h-2.5 rounded-md" style={{ backgroundColor: winner.color }} />
              <span className="text-white text-sm font-semibold">{winner.acronym}</span>
              <span className="text-white/60 text-xs">{winner.percentage?.toFixed(2)}%</span>
              <span className="text-yellow-300 text-xs ml-1">🏆</span>
            </div>
          )}
          <span className={`text-white/50 text-lg transition-transform duration-200 inline-block ${open ? 'rotate-180' : ''}`}>
            ▾
          </span>
        </div>
      </button>

      {open && (
        <div className="grid lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-stroke">
          {/* Left — Bar chart */}
          <div className="p-5">
            <p className="text-xs font-semibold text-body uppercase tracking-wider mb-3">
              Votos válidos por partido
            </p>
            <div style={{ height: 200 }}>
              <Bar data={barData} options={{
                indexAxis: 'y' as const,
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    callbacks: {
                      label: (ctx: any) =>
                        ` ${ctx.raw.toLocaleString()} votos (${et.parties[ctx.dataIndex]?.percentage?.toFixed(2)}%)`,
                    },
                  },
                },
                scales: {
                  x: { beginAtZero: true, grid: { color: '#f1f5f9' } },
                  y: { grid: { display: false } },
                },
              }} />
            </div>
          </div>

          {/* Right — Vote detail table */}
          <div className="p-5">
            <p className="text-xs font-semibold text-body uppercase tracking-wider mb-3">
              Resumen de votación
            </p>
            <VoteDetailTable et={et} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Results Panel (Jefe / Delegado view) ─────────────────────────────────────
function ResultsPanel({ metrics }: { metrics: any }) {
  const byET: any[] = metrics?.byElectionType ?? [];
  const [allOpen, setAllOpen] = useState(true);

  if (byET.length === 0) {
    return (
      <div className="card flex flex-col items-center justify-center py-20 text-body">
        <div className="text-5xl mb-4">🗳️</div>
        <p className="font-medium">Sin datos aún</p>
        <p className="text-sm mt-1">Los delegados deben ingresar reportes</p>
      </div>
    );
  }
  return (
    <div>
      <div className="flex justify-end mb-3">
        <button onClick={() => setAllOpen(o => !o)} className="btn-secondary btn-sm">
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

// ─── Party Panel (Admin view) ──────────────────────────────────────────────────
function PartyPanel({ pd, defaultOpen }: { pd: any; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const byET: any[] = pd.byElectionType ?? [];

  return (
    <div className="rounded-2xl bg-white border border-black/[.06] shadow-[0_2px_16px_rgba(0,0,0,.06)] overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-6 py-4 hover:bg-whiter transition-colors text-left border-b border-stroke"
        style={{ borderLeftColor: pd.partyColor || '#3C50E0', borderLeftWidth: 4 }}
      >
        <div className="w-4 h-4 rounded-md flex-shrink-0" style={{ backgroundColor: pd.partyColor || '#94a3b8' }} />
        <div className="flex-1 min-w-0">
          <span className="font-bold text-black">{pd.partyAcronym}</span>
          <span className="text-body text-sm ml-2 hidden sm:inline">{pd.partyName}</span>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono flex-shrink-0">
          <span className="text-body">{pd.totalReports} rep.</span>
          {pd.verified  > 0 && <span className="badge badge-verified">{pd.verified} ✓</span>}
          {pd.submitted > 0 && <span className="badge badge-submitted">{pd.submitted}</span>}
          {pd.draft     > 0 && <span className="badge badge-draft">{pd.draft}</span>}
        </div>
        <span className={`text-body transition-transform duration-200 inline-block ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>

      {open && (
        <div className="p-4 bg-whiter">
          {byET.length > 0 ? (
            <div className="space-y-3">
              {byET.map((et: any) => <ElectionTypeBlock key={et.id} et={et} defaultOpen />)}
            </div>
          ) : (
            <div className="flex flex-col items-center py-10 text-body">
              <div className="text-3xl mb-2">📭</div>
              <p className="text-sm">Sin reportes de este partido</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Admin Dashboard ───────────────────────────────────────────────────────────
function AdminDashboard({ metrics }: { metrics: any }) {
  const byParty: any[] = metrics?.byParty ?? [];
  const [allOpen, setAllOpen] = useState(false);

  if (byParty.length === 0) {
    return (
      <div className="card flex flex-col items-center py-20 text-body">
        <div className="text-5xl mb-4">🗳️</div>
        <p>No hay reportes ingresados aún</p>
      </div>
    );
  }
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-black">Resultados por partido</h3>
        <button onClick={() => setAllOpen(o => !o)} className="btn-secondary btn-sm">
          {allOpen ? '▲ Contraer todos' : '▼ Expandir todos'}
        </button>
      </div>
      <div className="space-y-3">
        {byParty.map((pd: any) => (
          <PartyPanel key={`${pd.partyId}-${allOpen}`} pd={pd} defaultOpen={allOpen} />
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user } = useAuthStore();
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['metrics'],
    queryFn: () => votesApi.getMetrics(),
    refetchInterval: 30_000,
  });

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-black">Dashboard Electoral</h2>
          <p className="text-body text-sm mt-0.5">
            {user?.role === 'ADMIN'        && 'Vista general — todos los partidos'}
            {user?.role === 'JEFE_CAMPANA' && 'Resultados consolidados de tu partido'}
            {user?.role === 'JEFE_RECINTO' && 'Resultados de tu recinto'}
            {user?.role === 'DELEGADO'     && 'Tus reportes enviados'}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={reportsApi.exportExcel} className="btn-secondary btn-sm">📊 Excel</button>
          <button onClick={reportsApi.exportPdf}   className="btn-secondary btn-sm">📄 PDF</button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <svg className="w-8 h-8 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
        </div>
      ) : (
        <>
          <StatusCards metrics={metrics} />
          {user?.role === 'ADMIN'
            ? <AdminDashboard metrics={metrics} />
            : <ResultsPanel   metrics={metrics} />
          }
        </>
      )}
    </div>
  );
}
