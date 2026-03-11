import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";
import { votesApi, reportsApi } from "../lib/api";
import { useAuthStore } from "../store/auth.store";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

// ─── Leader Card (ET winner for non-admin) ─────────────────────────────────────
function LeaderCard({ et }: { et: any }) {
  const winner = et?.parties?.[0];
  const hasData = winner && winner.votes > 0;

  return (
    <div className="rounded-2xl bg-white border border-black/[.06] shadow-[0_2px_16px_rgba(0,0,0,.06)] overflow-hidden flex flex-col">
      {/* Header */}
      <div
        className="px-5 py-3 text-white font-semibold text-s tracking-wide flex items-center gap-2"
        style={{ backgroundColor: hasData ? (winner.color || "#3C50E0") : "#64748b" }}
      >
        <span>🏅</span>
        <span className="uppercase tracking-wider text-x opacity-90">{et?.name ?? "—"}</span>
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col justify-center p-5">
        {hasData ? (
          <>
            {/* Party dot + acronym */}
            <div className="flex items-center gap-2 mb-1">
              <span
                className="w-3 h-3 rounded-sm flex-shrink-0"
                style={{ backgroundColor: winner.color || "#3C50E0" }}
              />
              <span className="font-bold text-black text-lg leading-none">{winner.acronym}</span>
              <span className="ml-auto text-xs font-mono font-semibold text-meta-3 bg-green-50 px-2 py-0.5 rounded-full">
                {winner.percentage?.toFixed(1)}%
              </span>
            </div>

            {/* Candidate name */}
            {winner.candidateName && (
              <p className="text-xs text-body truncate mb-2">{winner.candidateName}</p>
            )}
            {!winner.candidateName && (
              <p className="text-xs text-body/50 mb-2 italic">{winner.name}</p>
            )}

            {/* Vote count */}
            <p className="text-2xl font-bold text-black font-mono">
              {winner.votes.toLocaleString()}
              <span className="text-xs font-normal text-body ml-1">votos</span>
            </p>
          </>
        ) : (
          <div className="flex flex-col items-center py-2 text-body">
            <span className="text-2xl mb-1">🗳️</span>
            <p className="text-xs">Sin datos aún</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Stat Card simple ──────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  sub,
  icon,
  headerColor,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: string;
  headerColor?: string; // CSS color for header bg, defaults to boxdark
}) {
  return (
    <div className="rounded-2xl bg-white border border-black/[.06] shadow-[0_2px_16px_rgba(0,0,0,.06)] overflow-hidden flex flex-col">
      {/* Header — igual estilo que ElectionTypeBlock */}
      <div
        className="flex items-center gap-2.5 px-5 py-3 text-white"
        style={{ backgroundColor: headerColor || "#224bacff" }}
      >
        <span className="text-base">{icon}</span>
        <span className="font-semibold text-xs uppercase tracking-wider opacity-90">
          {label}
        </span>
      </div>
      {/* Body */}
      <div className="flex-1 flex flex-col justify-center px-5 py-4">
        <h4 className="text-3xl font-bold text-black font-mono">{value}</h4>
        {sub && <p className="text-xs text-body mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}


// ─── Status Cards ──────────────────────────────────────────────────────────────
function StatusCards({ metrics, forceNonAdmin }: { metrics: any; forceNonAdmin?: boolean }) {
  const { user } = useAuthStore();

  // ── No-ADMIN: cards elegantes ──────────────────────────────────────────────
  const byET: any[] = metrics?.byElectionType ?? [];
  // Sort by order asc — first two ETs (Gobernador=order 1, Alcalde=order 2)
  const sorted = [...byET].sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
  const et1 = sorted[0]; // ET de mayor prioridad (ej: Gobernador)
  const et2 = sorted[1]; // ET siguiente (ej: Alcalde)

  const totalReports = metrics?.totalReports ?? 0;
  const totalTables = metrics?.totalTables ?? 0;
  const pct = totalTables > 0 ? ((totalReports / totalTables) * 100) : 0;

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
      {/* Card 1: Líder ET1 */}
      {et1 ? <LeaderCard et={et1} /> : (
        <div className="rounded-2xl bg-white border border-black/[.06] shadow p-5 flex items-center justify-center text-body text-s">Sin ET configurado</div>
      )}

      {/* Card 2: Líder ET2 */}
      {et2 ? <LeaderCard et={et2} /> : (
        <div className="rounded-2xl bg-white border border-black/[.06] shadow p-5 flex items-center justify-center text-body text-s">—</div>
      )}

      {/* Card 3: Total actas/mesas contabilizadas */}
      <StatCard
        label="Actas contabilizadas"
        value={totalReports.toLocaleString()}
        sub={`de ${totalTables.toLocaleString()} mesas`}
        icon="🗳️"
        headerColor="#3C50E0"
      />

      {/* Card 4: % Cobertura */}
      <StatCard
        label="Cobertura de mesas"
        value={`${pct.toFixed(1)}%`}
        sub={`${totalReports} de ${totalTables} mesas`}
        icon="📈"
        headerColor="#3C50E0"
      />
    </div>
  );
}

// ─── Vote Detail Table ─────────────────────────────────────────────────────────
// Replaces the doughnut chart. Shows: Válidos, Blancos, Nulos, Emitidos, Habilitados
function VoteDetailTable({ et }: { et: any }) {
  const s = et.summary ?? {};
  const rows = [
    {
      label: "Votos Válidos",
      value: s.validVotes ?? et.validVotes ?? 0,
      pct: s.validPct,
      color: "text-meta-3",
      bold: false,
    },
    {
      label: "Votos Blancos",
      value: s.blankVotes ?? et.blankVotes ?? 0,
      pct: s.blankPct,
      color: "text-bodydark",
      bold: false,
    },
    {
      label: "Votos Nulos",
      value: s.nullVotes ?? et.nullVotes ?? 0,
      pct: s.nullPct,
      color: "text-meta-8",
      bold: false,
    },
    {
      label: "Votos Emitidos",
      value: s.emitidos ?? et.totalVotes ?? 0,
      pct: null,
      color: "text-black",
      bold: true,
    },
    {
      label: "Votantes Habilitados",
      value: s.totalVoters ?? et.totalVoters ?? 0,
      pct: null,
      color: "text-primary",
      bold: true,
    },
  ];

  return (
    <div className="overflow-x-auto w-full">
      <table className="ta-table w-full">
        <thead>
        <tr>
          <th>Detalle</th>
          <th className="text-right">Total</th>
          <th className="text-right">%</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.label} className={r.bold ? "bg-slate-50/50" : ""}>
            <td
              className={r.bold ? "font-semibold text-black" : "text-black"}
            >
              {r.label}
            </td>
            <td
              className={`text-right font-mono ${r.bold ? "font-bold" : "font-semibold"} ${r.color}`}
            >
              {r.value.toLocaleString()}
            </td>
            <td className="text-right font-mono text-body text-xs">
              {r.pct != null ? `${r.pct.toFixed(2)}%` : "—"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
    </div>
  );
}

// ─── Election Type Block ───────────────────────────────────────────────────────
function ElectionTypeBlock({
  et,
  defaultOpen = true,
}: {
  et: any;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  if (!et.parties?.length) return null;
  const winner = et.parties[0];

  const barData = {
    labels: et.parties.map((p: any) => p.acronym),
    datasets: [
      {
        label: "Votos válidos",
        data: et.parties.map((p: any) => p.votes),
        backgroundColor: et.parties.map((p: any) => p.color || "#3C50E0"),
        borderRadius: 4,
        borderSkipped: false,
      },
    ],
  };

  const validVotes =
    et.validVotes ?? et.parties.reduce((s: number, p: any) => s + p.votes, 0);

  return (
    <div className="rounded-2xl bg-white border border-black/[.06] shadow-[0_2px_16px_rgba(0,0,0,.06)] overflow-hidden">
      {/* Collapsible header */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-6 py-4 bg-[#3141b4] hover:bg-primary transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <span className="font-bold text-white text-base">{et.name}</span>
          <span className="text-xs text-white bg-primary-300/50 px-2 py-0.5 rounded-full">
            {validVotes.toLocaleString()} válidos
          </span>
        </div>
        <div className="flex items-center gap-3">
          {winner && (
            <div className="flex items-center gap-2 bg-primary-300/50 rounded px-3 py-1">
              <div
                className="w-2.5 h-2.5 rounded-md"
                style={{ backgroundColor: winner.color }}
              />
              <span className="text-white text-sm font-semibold">
                {winner.acronym}
              </span>
              <span className="text-white/60 text-xs">
                {winner.percentage?.toFixed(2)}%
              </span>
            </div>
          )}
          <span
            className={`text-white/50 text-lg transition-transform duration-200 inline-block ${open ? "rotate-180" : ""}`}
          >
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
              <Bar
                data={barData}
                options={{
                  indexAxis: "y" as const,
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
                    x: { beginAtZero: true, grid: { color: "#f1f5f9" } },
                    y: { grid: { display: false } },
                  },
                }}
              />
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
        <div className="text-5xl mb-4">📦</div>
        <p className="font-medium">Sin datos aún</p>
        <p className="text-sm mt-1">Los delegados deben ingresar reportes</p>
      </div>
    );
  }
  return (
    <div>
      <div className="flex justify-end mb-3">
        <button
          onClick={() => setAllOpen((o) => !o)}
          className="btn-secondary btn-sm"
        >
          {allOpen ? "▲ Contraer todos" : "▼ Expandir todos"}
        </button>
      </div>
      <div className="space-y-3">
        {byET.map((et: any) => (
          <ElectionTypeBlock
            key={`${et.id}-${allOpen}`}
            et={et}
            defaultOpen={allOpen}
          />
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
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-6 py-4 hover:bg-whiter transition-colors text-left border-b border-stroke"
        style={{
          borderLeftColor: pd.partyColor || "#3C50E0",
          borderLeftWidth: 4,
        }}
      >
        <div
          className="w-4 h-4 rounded-md flex-shrink-0"
          style={{ backgroundColor: pd.partyColor || "#94a3b8" }}
        />
        <div className="flex-1 min-w-0">
          <span className="font-bold text-black">{pd.partyAcronym}</span>
          <span className="text-body text-sm ml-2 hidden sm:inline">
            {pd.partyName}
          </span>
        </div>
        <span
          className={`text-body transition-transform duration-200 inline-block ${open ? "rotate-180" : ""}`}
        >
          ▾
        </span>
      </button>

      {open && (
        <div className="p-4 bg-whiter">
          {byET.length > 0 ? (
            <div className="space-y-3">
              {byET.map((et: any) => (
                <ElectionTypeBlock key={et.id} et={et} defaultOpen />
              ))}
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


// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === "ADMIN";

  const { data: metrics, isLoading } = useQuery({
    queryKey: ["metrics"],
    queryFn: () => votesApi.getMetrics(),
    refetchInterval: 30_000,
  });

  // Solo admin necesita el selector de partido
  const [selectedPartyId, setSelectedPartyId] = useState<string>("");
  const byParty: any[] = metrics?.byParty ?? [];

  // Partidos ordenados alfabéticamente por nombre
  const sortedParties = [...byParty].sort((a, b) =>
    (a.partyName ?? "").localeCompare(b.partyName ?? "", "es")
  );

  // Datos del partido seleccionado
  const selectedPartyData = selectedPartyId
    ? byParty.find((p) => p.partyId === selectedPartyId)
    : null;

  const partyMetrics = selectedPartyData
    ? {
      byElectionType: selectedPartyData.byElectionType ?? [],
      totalReports: selectedPartyData.totalReports ?? 0,
      totalTables: metrics?.totalTables ?? 0,
    }
    : null;

  return (
    <div>
      {/* ── Header ── */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between flex-wrap">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold text-black">Dashboard Electoral</h2>
          {isAdmin ? (
            /* Selector de partido integrado bajo el título */
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="text-body text-sm font-medium">Ver resultados de:</span>
              <select
                id="party-selector"
                value={selectedPartyId}
                onChange={(e) => setSelectedPartyId(e.target.value)}
                className="rounded-lg bg-white px-3 py-1.5 text-sm text-black shadow-sm focus:outline-none "
                style={
                  selectedPartyData
                    ? { borderColor: selectedPartyData.partyColor, borderWidth: 3, borderStyle: 'solid' }
                    : { borderColor: '#ccc', borderWidth: 1, borderStyle: 'solid' }
                }
              >


                <option value="">— Selecciona un partido —</option>
                {sortedParties.map((p) => (
                  <option key={p.partyId} value={p.partyId}>
                    {p.partyName} ({p.partyAcronym})
                  </option>
                ))}
              </select>
              {selectedPartyId && (
                <button
                  onClick={() => setSelectedPartyId("")}
                  className="text-body hover:text-danger text-xs px-1"
                  title="Limpiar selección"
                >
                  ✕ limpiar
                </button>
              )}
            </div>
          ) : (
            <p className="text-body text-sm mt-0.5">Resultados consolidados</p>
          )}
        </div>
        <div className="flex gap-2 flex-shrink-0 w-full sm:w-auto">
          <button onClick={reportsApi.exportExcel} className="btn-secondary btn-sm flex-1 sm:flex-none justify-center">
            📊 Excel
          </button>
          <button onClick={reportsApi.exportPdf} className="btn-secondary btn-sm flex-1 sm:flex-none justify-center">
            📄 PDF
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <svg className="w-8 h-8 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : isAdmin ? (
        /* ── Admin: muestra siempre las cards + gráficas del partido elegido ── */
        selectedPartyData && partyMetrics ? (
          <>
            <StatusCards metrics={partyMetrics} forceNonAdmin />
            <ResultsPanel metrics={partyMetrics} />
          </>
        ) : (
          /* Placeholder cuando no hay partido seleccionado */
          <div className="flex flex-col items-center justify-center py-24 text-body rounded-2xl border border-dashed border-stroke bg-white">
            <div className="text-5xl mb-4">📦</div>
            <p className="font-medium text-black">Selecciona un partido para ver sus resultados</p>
            <p className="text-sm mt-1">Usa el selector de partido en el encabezado</p>
          </div>
        )
      ) : (
        /* ── No-admin: cards + gráficas propias ── */
        <>
          <StatusCards metrics={metrics} />
          <ResultsPanel metrics={metrics} />
        </>
      )}
    </div>
  );
}


