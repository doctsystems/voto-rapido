/**
 * seed-reports.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Seed SEPARADO para generar reportes de votos simulados.
 * Requiere haber ejecutado `seed.ts` primero (necesita partidos, mesas y usuarios).
 *
 * Estrategia:
 *  - Cubre la mitad de los recintos (9 de 18), elegidos al azar pero reproducibles.
 *  - En los recintos con más mesas (≥ 5), genera al menos 5 reportes por recinto.
 *  - Cada reporte lo crea un delegado de cada uno de los 4 primeros partidos.
 *  - Los votos se generan con distribución simulada realista.
 *  - Mix de estados: DRAFT, SUBMITTED, VERIFIED para mayor realismo.
 *
 * Uso:
 *   npx ts-node src/database/seed-reports.ts
 *   o con npm:  npm run seed:reports
 */

import "reflect-metadata";
import { DataSource, IsNull, Not } from "typeorm";
import { User } from "../modules/users/user.entity";
import { Party } from "../modules/parties/party.entity";
import { School } from "../modules/schools/school.entity";
import { VotingTable } from "../modules/tables/voting-table.entity";
import { ElectionType } from "../modules/election-types/election-type.entity";
import { VoteReport, ReportStatus } from "../modules/votes/vote-report.entity";
import { VoteEntry } from "../modules/votes/vote-entry.entity";
import { AuditLog } from "../modules/audit/audit-log.entity";
import { PartyElectionType } from "../modules/parties/party-election-type.entity";
import { Role } from "../common/enums/role.enum";

import * as dotenv from "dotenv";
import { join } from "node:path";

dotenv.config({ path: join(__dirname, "../../.env") });

const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST || "localhost",
  port: Number.parseInt(process.env.DB_PORT, 10) || 5432,
  username: process.env.DB_USERNAME || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  database: process.env.DB_NAME || "db_app",
  entities: [
    User,
    Party,
    PartyElectionType,
    School,
    VotingTable,
    ElectionType,
    VoteReport,
    VoteEntry,
    AuditLog,
  ],
  synchronize: false, // No modificar schema en seed de reportes
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
});

// ─── Utilidades ────────────────────────────────────────────────────────────────

/** Valor flotante pseudo-aleatorio en [0,1) a partir de un seed */
function rFloat(seed: number): number {
  const s = Math.sin(seed * 9301 + 49297) * 233280;
  return s - Math.floor(s);
}

/** Entero aleatorio entre min y max (inclusive), seeded por índice para reproducibilidad */
function rInt(min: number, max: number, seed: number): number {
  return Math.round(min + rFloat(seed) * (max - min));
}

function orderBySeed<T>(items: T[], seed: number, getKey: (item: T, index: number) => number): T[] {
  return [...items]
    .map((item, index) => ({
      item,
      sortKey: rFloat(seed + getKey(item, index) * 17 + index),
    }))
    .sort((a, b) => a.sortKey - b.sortKey)
    .map(({ item }) => item);
}

/**
 * Genera votos para todos los partidos para una mesa y tipo de elección dados.
 *
 * Para simular variación geográfica real:
 *  - Se PERMUTA aleatoriamente el orden de los pesos base por mesa+tipo,
 *    de modo que cualquier partido puede "ganar" en cualquier mesa.
 *  - Se añade un factor de "swing" que concentra votos en 1-2 partidos al azar.
 *  - Los partidos menores siempre reciben entre 2-9%.
 */
function generateVotesForTable(
  parties: Party[],
  totalVoters: number,
  tableIdx: number,
  etIdx: number,
): { partyVotes: number[]; nullVotes: number; blankVotes: number } {
  const n = parties.length; // 8 partidos

  // — Participación electoral: 68–94% del padrón —
  const turnoutPct = (rInt(68, 94, tableIdx * 13 + etIdx * 7 + 1)) / 100;
  const emitidos = Math.floor(totalVoters * turnoutPct);

  // — Nulos y blancos —
  const nullPct = (rInt(1, 5, tableIdx * 17 + etIdx * 3 + 2)) / 100;
  const blankPct = (rInt(1, 5, tableIdx * 11 + etIdx * 5 + 3)) / 100;
  const nullVotes = Math.floor(emitidos * nullPct);
  const blankVotes = Math.floor(emitidos * blankPct);
  const validVotesTotal = emitidos - nullVotes - blankVotes;

  // — Pesos base para los 4 partidos principales y 4 menores —
  // Sumas: majors ~0.90, minors ~0.10 (los menores siempre son pequeños)
  const majorBaseWeights = [0.38, 0.28, 0.15, 0.09]; // 4 slots para partidos grandes
  const minorBaseWeights = [0.04, 0.03, 0.02, 0.01]; // 4 slots para partidos chicos

  // Separar partidos: los primeros 4 por orden de papeleta = mayores; resto = menores
  const majorIndices = parties
    .map((p, i) => (p.ballotOrder <= 4 ? i : -1))
    .filter((i) => i >= 0);
  const minorIndices = parties
    .map((p, i) => (p.ballotOrder > 4 ? i : -1))
    .filter((i) => i >= 0);

  // Permutación aleatoria de los pesos dentro de cada grupo (por mesa+tipo)
  function permutedWeights(weights: number[], seed: number): number[] {
    const arr = [...weights];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = rInt(0, i, seed + i * 31);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  const majorSeed = tableIdx * 997 + etIdx * 37;
  const minorSeed = tableIdx * 1009 + etIdx * 41;
  const shuffledMajor = permutedWeights(majorBaseWeights, majorSeed);
  const shuffledMinor = permutedWeights(minorBaseWeights, minorSeed);

  // Asignar pesos individuales a cada partido
  const rawWeights = new Array(n).fill(0.01);
  majorIndices.forEach((pi, rank) => { rawWeights[pi] = shuffledMajor[rank] ?? 0.05; });
  minorIndices.forEach((pi, rank) => { rawWeights[pi] = shuffledMinor[rank] ?? 0.01; });

  // Perturbación aleatoria ±4% per-party para evitar resultados idénticos en mismo tipo
  for (let i = 0; i < n; i++) {
    const delta = (rInt(-4, 4, tableIdx * 43 + etIdx * 19 + i * 7)) / 100;
    rawWeights[i] = Math.max(0.005, rawWeights[i] + delta);
  }

  // Normalizar y convertir a votos
  const weightSum = rawWeights.reduce((a, b) => a + b, 0);
  const normalized = rawWeights.map(w => w / weightSum);

  let assigned = 0;
  const partyVotes = normalized.map((share, i) => {
    if (i === n - 1) return Math.max(0, validVotesTotal - assigned);
    const v = Math.floor(validVotesTotal * share);
    assigned += v;
    return v;
  });

  return { partyVotes, nullVotes, blankVotes };
}

// ─── Seed principal ────────────────────────────────────────────────────────────

async function seedReports() {
  await AppDataSource.initialize();
  console.log("🌱 Iniciando seed de reportes...");

  const voteEntryRepo = AppDataSource.getRepository(VoteEntry);
  const voteReportRepo = AppDataSource.getRepository(VoteReport);
  const userRepo = AppDataSource.getRepository(User);
  const schoolRepo = AppDataSource.getRepository(School);
  const partyRepo = AppDataSource.getRepository(Party);
  const etRepo = AppDataSource.getRepository(ElectionType);
  const tableRepo = AppDataSource.getRepository(VotingTable);

  // Limpiar reportes existentes
  console.log("🗑️  Limpiando reportes existentes...");
  await voteEntryRepo.delete({ id: Not(IsNull()) });
  await voteReportRepo.delete({ id: Not(IsNull()) });
  console.log("✓ Reportes anteriores eliminados");

  // Cargar datos base
  const schools = await schoolRepo.find({ order: { code: "ASC" } });
  const allParties = await partyRepo.find({ order: { ballotOrder: "ASC" } });
  const electionTypes = await etRepo.find({ order: { order: "ASC" } });
  const allTables = await tableRepo.find({
    relations: ["school"],
    where: { isActive: true },
    order: { number: "ASC" },
  });

  if (!schools.length || !allParties.length || !electionTypes.length || !allTables.length) {
    throw new Error("Faltan datos base. Ejecuta seed.ts primero.");
  }

  // Solo los primeros 4 partidos tienen delegados
  const delegateParties = allParties.filter((p) => p.ballotOrder <= 4);
  console.log(`✓ Partidos con delegados: ${delegateParties.map((p) => p.ballotOrder).join(", ")}`);
  console.log(`✓ Todos los partidos: ${allParties.map((p) => p.ballotOrder).join(", ")}`);


  // Agrupar mesas por recinto
  const tablesBySchool = new Map<string, VotingTable[]>();
  for (const table of allTables) {
    const sid = table.school.id;
    if (!tablesBySchool.has(sid)) tablesBySchool.set(sid, []);
    tablesBySchool.get(sid).push(table);
  }

  // ─── Selección de recintos a cubrir ────────────────────────────────────────
  // Cubrir la mitad de los recintos disponibles.
  // Priorizamos los que tienen más mesas usando los datos realmente cargados en la DB.
  const selectedSchoolIds = new Set<string>();
  const rankedSchools = schools
    .map((school) => ({
      school,
      tables: tablesBySchool.get(school.id) ?? [],
    }))
    .sort((a, b) => {
      const countDiff = b.tables.length - a.tables.length;
      if (countDiff !== 0) return countDiff;
      return (a.school.code ?? 0) - (b.school.code ?? 0);
    });

  const targetSchoolCount = Math.min(
    Math.ceil(rankedSchools.length / 2),
    rankedSchools.length,
  );
  const prioritizedCount = Math.min(8, targetSchoolCount);

  for (let i = 0; i < prioritizedCount; i++) {
    selectedSchoolIds.add(rankedSchools[i].school.id);
  }

  const remainingToPick = targetSchoolCount - selectedSchoolIds.size;
  if (remainingToPick > 0) {
    const remainingSchools = rankedSchools
      .slice(prioritizedCount)
      .map(({ school }) => school);
    const randomizedRemaining = orderBySeed(
      remainingSchools,
      20260320,
      (school) => school.code ?? 0,
    );

    for (const school of randomizedRemaining.slice(0, remainingToPick)) {
      selectedSchoolIds.add(school.id);
    }
  }

  console.log(`\n📋 Recintos seleccionados (${selectedSchoolIds.size}):`);

  // ─── Por cada recinto seleccionado ─────────────────────────────────────────
  let totalReports = 0;
  let schoolIdx = 0;

  for (const school of schools) {
    if (!selectedSchoolIds.has(school.id)) continue;

    const tables = tablesBySchool.get(school.id) ?? [];
    if (!tables.length) continue;

    // Para recintos grandes (≥5 mesas), cubrir al menos 5 mesas.
    // Para recintos menores, cubrir todas.
    const minTables = tables.length >= 5 ? 5 : tables.length;
    const targetTableCount = tables.length >= 5
      ? Math.min(tables.length, minTables + rInt(0, Math.min(3, tables.length - minTables), schoolIdx))
      : tables.length;

    // Tomar mesas "al azar" (mezcla reproducible)
    const shuffled = orderBySeed(
      tables,
      schoolIdx * 100 + 7,
      (table, index) => table.number * 1000 + index,
    );
    const selectedTables = shuffled.slice(0, targetTableCount);

    console.log(`\n  🏫 ${school.name} (${tables.length} mesas → ${targetTableCount} cubiertas)`);

    let tableGlobalIdx = schoolIdx * 50;

    for (const table of selectedTables) {
      tableGlobalIdx++;

      // Calculate votes for this table once, for all election types and all parties
      // Store results in a map for reuse
      const tableVotesByElectionType = new Map<string, { partyVotes: number[]; nullVotes: number; blankVotes: number }>();
      for (let etIdx = 0; etIdx < electionTypes.length; etIdx++) {
        const et = electionTypes[etIdx];
        const votes = generateVotesForTable(
          allParties, // Use all parties for distribution
          table.totalVoters,
          tableGlobalIdx + etIdx,
          etIdx,
        );
        tableVotesByElectionType.set(et.id, votes);
      }

      // Each table has 1 report per delegate party
      for (let pIdx = 0; pIdx < delegateParties.length; pIdx++) {
        const delegateParty = delegateParties[pIdx]; // This is the party of the delegate creating the report

        // Find the delegate for this table and party
        const delegate = await userRepo.findOne({
          where: {
            role: Role.DELEGADO,
            party: { id: delegateParty.id },
            table: { id: table.id },
          },
          relations: ["party", "table", "table.school"],
        });

        if (!delegate) {
          console.log(
            `    ⚠️  Sin delegado: Partido ${delegateParty.ballotOrder} / Mesa ${table.number} (${school.shortName})`
          );
          continue;
        }

        // Generar entries: TODOS los partidos × TODOS los tipos de elección.
        // Los nulos/blancos se guardan en el PRIMER entry de cada tipo (convención del sistema).
        const entries: VoteEntry[] = [];
        let reportTotalVotes = 0;

        for (let etIdx = 0; etIdx < electionTypes.length; etIdx++) {
          const et = electionTypes[etIdx];
          const { partyVotes, nullVotes, blankVotes } = tableVotesByElectionType.get(et.id)!;

          // Una entry por cada partido (los 8) para este tipo de elección
          for (let apIdx = 0; apIdx < allParties.length; apIdx++) {
            const currentParty = allParties[apIdx];
            const isFirstPartyInType = apIdx === 0; // El primer partido lleva null/blank

            const entry = voteEntryRepo.create({
              party: currentParty,
              electionType: et,
              votes: partyVotes[apIdx] ?? 0,
              // Nulos y blancos solo en el primer entry de cada tipo (siguiendo la lógica de buildEntries)
              nullVotes: isFirstPartyInType ? nullVotes : 0,
              blankVotes: isFirstPartyInType ? blankVotes : 0,
            });
            entries.push(entry);
            reportTotalVotes += partyVotes[apIdx] ?? 0;
          }
        }

        // Determine report status: realistic mix
        // ~30% DRAFT, ~35% SUBMITTED, ~35% VERIFIED
        const statusRoll = rInt(0, 99, tableGlobalIdx * 10 + pIdx);
        let status: ReportStatus;
        let submittedAt: Date | null = null;

        if (statusRoll < 30) {
          status = ReportStatus.DRAFT;
        } else if (statusRoll < 65) {
          status = ReportStatus.SUBMITTED;
          submittedAt = new Date(Date.now() - rInt(1, 72, tableGlobalIdx) * 3600 * 1000);
        } else {
          status = ReportStatus.VERIFIED;
          submittedAt = new Date(Date.now() - rInt(2, 96, tableGlobalIdx) * 3600 * 1000);
        }

        const report = voteReportRepo.create({
          delegate,
          table,
          status,
          submittedAt,
          totalVotes: reportTotalVotes,
          nullVotes: 0, // Los nulos/blancos se almacenan en las entries, no en el report
          blankVotes: 0,
          notes: status === ReportStatus.DRAFT
            ? `Borrador - Partido ${delegateParty.ballotOrder} Mesa ${table.number}`
            : null,
          entries,
          createdBy: delegate.id,
          updatedBy: delegate.id,
        });

        await voteReportRepo.save(report);
        totalReports++;
      }

      console.log(
        `    ✓ Mesa ${String(table.number).padStart(2, "0")} (${table.totalVoters} votantes) → ${delegateParties.length} reportes (${allParties.length} partidos × ${electionTypes.length} tipos = ${allParties.length * electionTypes.length} entries c/u)`
      );
    }

    schoolIdx++;
  }

  console.log(`\n🎉 Seed de reportes completado!`);
  console.log(`   Recintos cubiertos : ${selectedSchoolIds.size} de ${schools.length}`);
  console.log(`   Reportes creados   : ${totalReports}`);
  console.log(`   Partidos en acta   : ${allParties.length} (${allParties.map((p) => p.ballotOrder).join(", ")})`);
  console.log(`   Tipos de elección  : ${electionTypes.length} (${electionTypes.map((e) => e.name).join(", ")})`);
  console.log(`   Entries por reporte: ${allParties.length} × ${electionTypes.length} = ${allParties.length * electionTypes.length}`);

  await AppDataSource.destroy();
}

seedReports().catch((err) => {
  console.error(err);
  process.exit(1);
});

