import "reflect-metadata";
import { DataSource } from "typeorm";
import * as dotenv from "dotenv";
import { join } from "node:path";
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
  synchronize: false,
});

function rFloat(seed: number): number {
  const s = Math.sin(seed * 9301 + 49297) * 233280;
  return s - Math.floor(s);
}

function rInt(min: number, max: number, seed: number): number {
  return Math.round(min + rFloat(seed) * (max - min));
}

function orderBySeed<T>(
  items: T[],
  seed: number,
  getKey: (item: T, index: number) => number,
): T[] {
  return [...items]
    .map((item, index) => ({
      item,
      sortKey: rFloat(seed + getKey(item, index) * 17 + index),
    }))
    .sort((a, b) => a.sortKey - b.sortKey)
    .map(({ item }) => item);
}

function generateVotesForTable(
  parties: Party[],
  totalVoters: number,
  tableIdx: number,
  etIdx: number,
): { partyVotes: number[]; nullVotes: number; blankVotes: number } {
  const n = parties.length;
  const turnoutPct = rInt(68, 94, tableIdx * 13 + etIdx * 7 + 1) / 100;
  const emitidos = Math.floor(totalVoters * turnoutPct);

  const nullPct = rInt(1, 5, tableIdx * 17 + etIdx * 3 + 2) / 100;
  const blankPct = rInt(1, 5, tableIdx * 11 + etIdx * 5 + 3) / 100;
  const nullVotes = Math.floor(emitidos * nullPct);
  const blankVotes = Math.floor(emitidos * blankPct);
  const validVotesTotal = emitidos - nullVotes - blankVotes;

  const majorBaseWeights = [0.38, 0.28, 0.15, 0.09];
  const minorBaseWeights = [0.04, 0.03, 0.02, 0.01];

  const majorIndices = parties
    .map((p, i) => ([3, 4, 5, 7].includes(p.ballotOrder) ? i : -1))
    .filter((i) => i >= 0);
  const minorIndices = parties
    .map((p, i) => ([3, 4, 5, 7].includes(p.ballotOrder) ? -1 : i))
    .filter((i) => i >= 0);

  function permutedWeights(weights: number[], seed: number): number[] {
    const arr = [...weights];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = rInt(0, i, seed + i * 31);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  const shuffledMajor = permutedWeights(
    majorBaseWeights,
    tableIdx * 997 + etIdx * 37,
  );
  const shuffledMinor = permutedWeights(
    minorBaseWeights,
    tableIdx * 1009 + etIdx * 41,
  );

  const rawWeights = new Array(n).fill(0.01);
  majorIndices.forEach((pi, rank) => {
    rawWeights[pi] = shuffledMajor[rank] ?? 0.05;
  });
  minorIndices.forEach((pi, rank) => {
    rawWeights[pi] = shuffledMinor[rank] ?? 0.01;
  });

  for (let i = 0; i < n; i++) {
    const delta = rInt(-4, 4, tableIdx * 43 + etIdx * 19 + i * 7) / 100;
    rawWeights[i] = Math.max(0.005, rawWeights[i] + delta);
  }

  const weightSum = rawWeights.reduce((a, b) => a + b, 0);
  const normalized = rawWeights.map((w) => w / weightSum);

  let assigned = 0;
  const partyVotes = normalized.map((share, i) => {
    if (i === n - 1) return Math.max(0, validVotesTotal - assigned);
    const v = Math.floor(validVotesTotal * share);
    assigned += v;
    return v;
  });

  return { partyVotes, nullVotes, blankVotes };
}

function varyVotesForPressReport(
  baseVotes: { partyVotes: number[]; nullVotes: number; blankVotes: number },
  parties: Party[],
  tableIdx: number,
  etIdx: number,
  schoolIdx: number,
): { partyVotes: number[]; nullVotes: number; blankVotes: number } {
  const partyVotes = [...baseVotes.partyVotes];
  let nullVotes = baseVotes.nullVotes;
  let blankVotes = baseVotes.blankVotes;

  const swings = rInt(1, 3, tableIdx * 71 + etIdx * 17 + schoolIdx * 13);
  for (let step = 0; step < swings; step++) {
    const from = rInt(
      0,
      parties.length - 1,
      tableIdx * 131 + etIdx * 37 + schoolIdx * 19 + step,
    );
    const to = rInt(
      0,
      parties.length - 1,
      tableIdx * 149 + etIdx * 43 + schoolIdx * 23 + step,
    );
    if (from === to) continue;
    if (partyVotes[from] <= 0) continue;

    const moved = Math.min(
      partyVotes[from],
      rInt(1, 3, tableIdx * 163 + etIdx * 53 + schoolIdx * 29 + step),
    );
    partyVotes[from] -= moved;
    partyVotes[to] += moved;
  }

  nullVotes = Math.max(
    0,
    nullVotes + rInt(-1, 1, tableIdx * 173 + etIdx * 67 + schoolIdx * 31),
  );
  blankVotes = Math.max(
    0,
    blankVotes + rInt(-1, 1, tableIdx * 181 + etIdx * 79 + schoolIdx * 37),
  );

  return { partyVotes, nullVotes, blankVotes };
}

async function seedPressReports() {
  await AppDataSource.initialize();
  console.log("📰 Iniciando seed de reportes de PRENSA...");

  const reportRepo = AppDataSource.getRepository(VoteReport);
  const entryRepo = AppDataSource.getRepository(VoteEntry);
  const partyRepo = AppDataSource.getRepository(Party);
  const userRepo = AppDataSource.getRepository(User);
  const schoolRepo = AppDataSource.getRepository(School);
  const tableRepo = AppDataSource.getRepository(VotingTable);
  const etRepo = AppDataSource.getRepository(ElectionType);

  const pressParty = await partyRepo.findOne({
    where: { acronym: "PRENSA" },
  });
  if (!pressParty) {
    throw new Error(
      "No existe el partido PRENSA. Ejecuta primero npm run seed:prensa",
    );
  }

  const pressReports = await reportRepo.find({
    where: { delegate: { party: { id: pressParty.id } } },
    relations: ["delegate", "delegate.party"],
  });
  if (pressReports.length > 0) {
    const reportIds = pressReports.map((r) => r.id);
    await entryRepo
      .createQueryBuilder()
      .delete()
      .from(VoteEntry)
      .where("report_id IN (:...reportIds)", { reportIds })
      .execute();
    await reportRepo
      .createQueryBuilder()
      .delete()
      .from(VoteReport)
      .where("id IN (:...reportIds)", { reportIds })
      .execute();
    console.log(
      `✓ Reportes anteriores de PRENSA eliminados: ${reportIds.length}`,
    );
  }

  const allParties = await partyRepo.find({
    where: { isActive: true },
    order: { ballotOrder: "ASC" },
  });
  const reportParties = allParties.filter((p) => p.acronym !== "PRENSA");
  const electionTypes = await etRepo.find({ order: { order: "ASC" } });
  const schools = await schoolRepo.find({
    where: { isActive: true },
    order: { code: "ASC" },
  });
  const allTables = await tableRepo.find({
    where: { isActive: true },
    relations: ["school"],
    order: { number: "ASC" },
  });

  const tablesBySchool = new Map<string, VotingTable[]>();
  for (const table of allTables) {
    const sid = table.school.id;
    if (!tablesBySchool.has(sid)) tablesBySchool.set(sid, []);
    tablesBySchool.get(sid)!.push(table);
  }

  const eligibleSchools = schools
    .map((school) => ({
      school,
      tables: tablesBySchool.get(school.id) ?? [],
    }))
    .filter(({ tables }) => tables.length >= 5);

  if (eligibleSchools.length < 5) {
    throw new Error(
      `No hay suficientes recintos con al menos 5 mesas. Encontrados: ${eligibleSchools.length}`,
    );
  }

  const selectedSchools = orderBySeed(
    eligibleSchools,
    20260322,
    ({ school }, index) => (school.code ?? 0) * 100 + index,
  ).slice(0, 5);

  let totalReports = 0;
  for (let schoolIdx = 0; schoolIdx < selectedSchools.length; schoolIdx++) {
    const { school, tables } = selectedSchools[schoolIdx];
    const pressJr = await userRepo.findOne({
      where: {
        role: Role.JEFE_RECINTO,
        party: { id: pressParty.id },
        school: { id: school.id },
      },
      relations: ["party", "school"],
    });

    if (!pressJr) {
      console.log(`⚠️  Sin JR de PRENSA para ${school.shortName}`);
      continue;
    }

    const selectedTables = orderBySeed(
      tables,
      schoolIdx * 100 + 11,
      (table, index) => table.number * 1000 + index,
    ).slice(0, 5);

    console.log(
      `\n🏫 ${school.name} → ${selectedTables.length} mesas para PRENSA`,
    );

    let tableGlobalIdx = schoolIdx * 50;
    for (const table of selectedTables) {
      tableGlobalIdx++;
      const entries: VoteEntry[] = [];
      let totalVotes = 0;

      for (let etIdx = 0; etIdx < electionTypes.length; etIdx++) {
        const et = electionTypes[etIdx];
        const baseVotes = generateVotesForTable(
          reportParties,
          table.totalVoters,
          tableGlobalIdx + etIdx,
          etIdx,
        );
        const { partyVotes, nullVotes, blankVotes } = varyVotesForPressReport(
          baseVotes,
          reportParties,
          tableGlobalIdx,
          etIdx,
          schoolIdx,
        );

        for (let pIdx = 0; pIdx < reportParties.length; pIdx++) {
          const currentParty = reportParties[pIdx];
          const isFirstPartyInType = pIdx === 0;
          const entry = entryRepo.create({
            party: currentParty,
            electionType: et,
            votes: partyVotes[pIdx] ?? 0,
            nullVotes: isFirstPartyInType ? nullVotes : 0,
            blankVotes: isFirstPartyInType ? blankVotes : 0,
          });
          entries.push(entry);
          totalVotes += partyVotes[pIdx] ?? 0;
        }
      }

      const statusRoll = rInt(0, 99, tableGlobalIdx * 10 + schoolIdx);
      let status: ReportStatus;
      let submittedAt: Date | null = null;

      if (statusRoll < 25) {
        status = ReportStatus.DRAFT;
      } else if (statusRoll < 60) {
        status = ReportStatus.SUBMITTED;
        submittedAt = new Date(
          Date.now() - rInt(1, 48, tableGlobalIdx) * 3600 * 1000,
        );
      } else {
        status = ReportStatus.VERIFIED;
        submittedAt = new Date(
          Date.now() - rInt(2, 72, tableGlobalIdx) * 3600 * 1000,
        );
      }

      const report = reportRepo.create({
        delegate: pressJr,
        table,
        status,
        submittedAt,
        totalVotes,
        nullVotes: 0,
        blankVotes: 0,
        notes:
          status === ReportStatus.DRAFT
            ? `Borrador PRENSA - ${school.shortName} Mesa ${table.number}`
            : null,
        entries,
        createdBy: pressJr.id,
        updatedBy: pressJr.id,
      });

      await reportRepo.save(report);
      totalReports++;
      console.log(
        `   ✓ Mesa ${String(table.number).padStart(2, "0")} cargada por PRENSA`,
      );
    }
  }

  console.log(`\n✅ Seed de reportes de PRENSA completado`);
  console.log(`   Reportes creados: ${totalReports}`);
  console.log(`   Recintos cubiertos: ${selectedSchools.length}`);

  await AppDataSource.destroy();
}

seedPressReports().catch((err) => {
  console.error(err);
  process.exit(1);
});
