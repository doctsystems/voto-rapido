import "reflect-metadata";
import { DataSource, IsNull, Not } from "typeorm";
import * as bcrypt from "bcryptjs";
import { User } from "../modules/users/user.entity";
import { Party } from "../modules/parties/party.entity";
import { PartyElectionType } from "../modules/parties/party-election-type.entity";
import { School } from "../modules/schools/school.entity";
import { VotingTable } from "../modules/tables/voting-table.entity";
import { ElectionType } from "../modules/election-types/election-type.entity";
import { VoteReport } from "../modules/votes/vote-report.entity";
import { VoteEntry } from "../modules/votes/vote-entry.entity";
import { AuditLog } from "../modules/audit/audit-log.entity";
import { Role } from "../common/enums/role.enum";

import * as dotenv from "dotenv";
import { join } from "node:path";

// Ajusta la ruta al .env según la ubicación de seed.ts
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
  synchronize: true,
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
});

// Shared location data for all recintos (same for these elections)
const LOCATION = {
  department: "Tarija",
  province: "Arce",
  municipality: "Bermejo",
  electoralSeat: "Bermejo",
  locality: "Bermejo",
  constituency: 42,
};

async function seed() {
  await AppDataSource.initialize();
  console.log("🌱 Iniciando seed...");

  const voteEntryRepo = AppDataSource.getRepository(VoteEntry);
  const voteReportRepo = AppDataSource.getRepository(VoteReport);
  const auditLogRepo = AppDataSource.getRepository(AuditLog);
  const partyElectionTypeRepo = AppDataSource.getRepository(PartyElectionType);
  const votingTableRepo = AppDataSource.getRepository(VotingTable);
  const schoolRepo = AppDataSource.getRepository(School);
  const partyRepo = AppDataSource.getRepository(Party);
  const electionTypeRepo = AppDataSource.getRepository(ElectionType);
  const userRepo = AppDataSource.getRepository(User);

  // Clean all tables in order (respecting foreign key constraints)
  console.log("🗑️  Limpiando base de datos...");
  try {
    await auditLogRepo.delete({ id: Not(IsNull()) });
    console.log("✓ Eliminados AuditLog");
    await voteEntryRepo.delete({ id: Not(IsNull()) });
    console.log("✓ Eliminados VoteEntry");
    await voteReportRepo.delete({ id: Not(IsNull()) });
    console.log("✓ Eliminados VoteReport");
    await electionTypeRepo.delete({ id: Not(IsNull()) });
    console.log("✓ Eliminados ElectionType");
    await partyElectionTypeRepo.delete({ id: Not(IsNull()) });
    console.log("✓ Eliminados PartyElectionType");
    await userRepo.delete({ id: Not(IsNull()) });
    console.log("✓ Eliminados User");
    await votingTableRepo.delete({ id: Not(IsNull()) });
    console.log("✓ Eliminados VotingTable");
    await schoolRepo.delete({ id: Not(IsNull()) });
    console.log("✓ Eliminados School");
    await partyRepo.delete({ id: Not(IsNull()) });
    console.log("✓ Eliminados Party");
  } catch (e) {
    console.log(e.message);
  }

  // --- Partidos ---
  const parties = await partyRepo.save([
    { name: "Camino Democrata al Cambio", ballotOrder: 1, color: "#c52b1a" },
    { name: "Unidad por la Patria", ballotOrder: 2, color: "#d37e0e" },
    { name: "Partido Democrata Cristiano", ballotOrder: 3, color: "#255037" },
    {
      name: "Integracion Seguridad y Autonomia",
      ballotOrder: 4,
      color: "#4aa151",
    },
    { name: "Primero Tarija", ballotOrder: 5, color: "#e788cb" },
    { name: "Movimiento Tercer Sistema", ballotOrder: 6, color: "#acebb2" },
    { name: "Unidos Para Renovar", ballotOrder: 7, color: "#ff8a03" },
    { name: "Nueva Generación Patriótica", ballotOrder: 8, color: "#02aefd" },
  ]);
  console.log("✅ Partidos creados");

  // --- Tipos de elección ---
  const electionTypes = await electionTypeRepo.save([
    { name: "Gobernador", order: 1 },
    { name: "Alcalde", order: 2 },
    { name: "Concejal", order: 3 },
    { name: "Asambleísta por Poblacion", order: 4 },
    { name: "Asambleísta por Territorio", order: 5 },
  ]);
  console.log("✅ Tipos de elección creados");

  // --- Asignaciones partido-tipo de elección ---
  const assignments = [
    {
      party: parties[0],
      et: electionTypes[0],
      candidate: "Mario Cossío (CDC)",
    },
    {
      party: parties[1],
      et: electionTypes[0],
      candidate: "Adrián Oliva (PATRIA)",
    },
    {
      party: parties[2],
      et: electionTypes[0],
      candidate: "Richard Rocha (PDC)",
    },
    {
      party: parties[3],
      et: electionTypes[0],
      candidate: "Wilfredo Vicente (ISA)",
    },
    { party: parties[4], et: electionTypes[0], candidate: "(PT)" },
    {
      party: parties[5],
      et: electionTypes[0],
      candidate: "Daniel Centeno (MTS)",
    },
    { party: parties[6], et: electionTypes[0], candidate: "(UNIR)" },
    {
      party: parties[7],
      et: electionTypes[0],
      candidate: "Never Antelo (NGP)",
    },

    {
      party: parties[0],
      et: electionTypes[1],
      candidate: "Victor Morales (CDC)",
    },
    {
      party: parties[1],
      et: electionTypes[1],
      candidate: "Tito Gareca (PATRIA)",
    },
    {
      party: parties[2],
      et: electionTypes[1],
      candidate: "Amado Cuevas (PDC)",
    },
    {
      party: parties[3],
      et: electionTypes[1],
      candidate: "Alejandro Sivila (ISA)",
    },
    { party: parties[4], et: electionTypes[1], candidate: "Freddy Rueda (PT)" },
    {
      party: parties[5],
      et: electionTypes[1],
      candidate: "Norma Gutierrez (MTS)",
    },
    {
      party: parties[6],
      et: electionTypes[1],
      candidate: "Nathalie Galvez (UNIR)",
    },
    { party: parties[7], et: electionTypes[1], candidate: "(NGP)" },

    {
      party: parties[0],
      et: electionTypes[2],
      candidate: "Ivert Loaiza (CDC)",
    },
    {
      party: parties[1],
      et: electionTypes[2],
      candidate: "Maria Carvajal (PATRIA)",
    },
    {
      party: parties[2],
      et: electionTypes[2],
      candidate: "Melva Velásquez (PDC)",
    },
    { party: parties[3], et: electionTypes[2], candidate: "Elsa Blas (ISA)" },
    {
      party: parties[4],
      et: electionTypes[2],
      candidate: "Tatiana Sanchez (PT)",
    },
    {
      party: parties[5],
      et: electionTypes[2],
      candidate: "Ramiro Gerardo (MTS)",
    },
    { party: parties[6], et: electionTypes[2], candidate: "(UNIR)" },
    { party: parties[7], et: electionTypes[2], candidate: "(NGP)" },

    {
      party: parties[0],
      et: electionTypes[3],
      candidate: "Paola Chipana (CDC)",
    },
    {
      party: parties[1],
      et: electionTypes[3],
      candidate: "Gabriel Calapiña (PATRIA)",
    },
    {
      party: parties[2],
      et: electionTypes[3],
      candidate: "Janeth Vidaurre (PDC)",
    },
    {
      party: parties[3],
      et: electionTypes[3],
      candidate: "Roxana Farfan (ISA)",
    },
    { party: parties[4], et: electionTypes[3], candidate: "(PT)" },
    {
      party: parties[5],
      et: electionTypes[3],
      candidate: "Denis Gallardo (MTS)",
    },
    { party: parties[6], et: electionTypes[3], candidate: "(UNIR)" },
    { party: parties[7], et: electionTypes[3], candidate: "(NGP)" },

    { party: parties[0], et: electionTypes[4], candidate: "(CDC)" },
    { party: parties[1], et: electionTypes[4], candidate: "(PATRIA)" },
    { party: parties[2], et: electionTypes[4], candidate: "(PDC)" },
    { party: parties[3], et: electionTypes[4], candidate: "(ISA)" },
    { party: parties[4], et: electionTypes[4], candidate: "(PT)" },
    { party: parties[5], et: electionTypes[4], candidate: "(MTS)" },
    { party: parties[6], et: electionTypes[4], candidate: "(UNIR)" },
    { party: parties[7], et: electionTypes[4], candidate: "(NGP)" },
  ];
  for (const a of assignments) {
    await partyElectionTypeRepo.save(
      partyElectionTypeRepo.create({
        party: a.party,
        electionType: a.et,
        candidateName: a.candidate,
      }),
    );
  }
  console.log("✅ Tipos de elección asignados por partido");

  // --- Recintos Electorales ---
  const schools = await schoolRepo.save([
    {
      ...LOCATION,
      code: 9,
      name: "U.E. Guido Villagomez",
      shortName: "UEGV",
    },
    {
      ...LOCATION,
      code: 10,
      name: "U.E. 8 de Septiembre",
      shortName: "UE8DS",
    },
    {
      ...LOCATION,
      code: 11,
      name: "U.E. 25 de Mayo",
      shortName: "UE25DM",
    },
    {
      ...LOCATION,
      code: 12,
      name: "U.E. Eduardo Avaroa",
      shortName: "UEEA",
    },
    {
      ...LOCATION,
      code: 13,
      name: "U.E. Mscal. Andres De Santa Cruz",
      shortName: "UEMADSC",
    },
    {
      ...LOCATION,
      code: 14,
      name: "U.E. Octavio Campero Echazu (Bermejo)",
      shortName: "UEOCE",
    },
    {
      ...LOCATION,
      code: 15,
      name: "U.E. Aulio Araoz",
      shortName: "UEAA",
    },
    {
      ...LOCATION,
      code: 16,
      name: "U.E. Antonio Jose De Sucre",
      shortName: "UEAJS",
    },
    {
      ...LOCATION,
      code: 17,
      name: "(Cárcel) Carceleta Bermejo",
      shortName: "Carceleta",
    },
    {
      ...LOCATION,
      code: 25354,
      name: "U.E. La Esperanza",
      shortName: "UELE",
    },
    {
      ...LOCATION,
      code: 25547,
      name: "U.E. Bolivia",
      shortName: "UEBO",
    },
    {
      ...LOCATION,
      code: 3,
      name: "U.E. Moto Mendez",
      shortName: "UEMM",
    },
    {
      ...LOCATION,
      code: 4,
      name: "U.E. Flor De Oro",
      shortName: "UEFDO",
    },
    {
      ...LOCATION,
      code: 5,
      name: "U.E. Arrozales",
      shortName: "UEARZ",
    },
    {
      ...LOCATION,
      code: 6,
      name: "U.E. Barredero",
      shortName: "UEBAR",
    },
    {
      ...LOCATION,
      code: 7,
      name: "U.E. Colonia Linares",
      shortName: "UECL",
    },
    {
      ...LOCATION,
      code: 8,
      name: "U.E. Porcelana",
      shortName: "UEPOR",
    },
    {
      ...LOCATION,
      code: 33,
      name: "U.E. Campo Grande (Arce)",
      shortName: "UECG",
    },
  ]);
  console.log("✅ Recintos electorales creados");

  // --- Mesas (2 por recinto) ---
  const tables = await votingTableRepo.save([
    {
      ...LOCATION,
      code: 6008791,
      number: 1,
      totalVoters: 240,
      school: schools[0],
    },
    {
      ...LOCATION,
      code: 6008801,
      number: 2,
      totalVoters: 240,
      school: schools[0],
    },
    {
      ...LOCATION,
      code: 6008811,
      number: 3,
      totalVoters: 240,
      school: schools[0],
    },
    {
      ...LOCATION,
      code: 6008821,
      number: 4,
      totalVoters: 240,
      school: schools[0],
    },
    {
      ...LOCATION,
      code: 6008831,
      number: 5,
      totalVoters: 240,
      school: schools[0],
    },
    {
      ...LOCATION,
      code: 6008841,
      number: 6,
      totalVoters: 240,
      school: schools[0],
    },
    {
      ...LOCATION,
      code: 6008851,
      number: 7,
      totalVoters: 240,
      school: schools[0],
    },
    {
      ...LOCATION,
      code: 6008861,
      number: 8,
      totalVoters: 240,
      school: schools[0],
    },
    {
      ...LOCATION,
      code: 6008871,
      number: 9,
      totalVoters: 240,
      school: schools[0],
    },
    {
      ...LOCATION,
      code: 6008881,
      number: 10,
      totalVoters: 240,
      school: schools[0],
    },
    {
      ...LOCATION,
      code: 6008891,
      number: 11,
      totalVoters: 240,
      school: schools[0],
    },
    {
      ...LOCATION,
      code: 6008901,
      number: 12,
      totalVoters: 240,
      school: schools[0],
    },
    {
      ...LOCATION,
      code: 6008911,
      number: 13,
      totalVoters: 240,
      school: schools[0],
    },
    {
      ...LOCATION,
      code: 6008921,
      number: 14,
      totalVoters: 240,
      school: schools[0],
    },
    {
      ...LOCATION,
      code: 6008931,
      number: 15,
      totalVoters: 211,
      school: schools[0],
    },
    {
      ...LOCATION,
      code: 6008941,
      number: 1,
      totalVoters: 240,
      school: schools[1],
    },
    {
      ...LOCATION,
      code: 6008951,
      number: 2,
      totalVoters: 240,
      school: schools[1],
    },
    {
      ...LOCATION,
      code: 6008961,
      number: 3,
      totalVoters: 240,
      school: schools[1],
    },
    {
      ...LOCATION,
      code: 6008971,
      number: 4,
      totalVoters: 240,
      school: schools[1],
    },
    {
      ...LOCATION,
      code: 6008981,
      number: 5,
      totalVoters: 240,
      school: schools[1],
    },
    {
      ...LOCATION,
      code: 6008991,
      number: 6,
      totalVoters: 240,
      school: schools[1],
    },
    {
      ...LOCATION,
      code: 6009001,
      number: 7,
      totalVoters: 240,
      school: schools[1],
    },
    {
      ...LOCATION,
      code: 6009011,
      number: 8,
      totalVoters: 240,
      school: schools[1],
    },
    {
      ...LOCATION,
      code: 6009021,
      number: 9,
      totalVoters: 240,
      school: schools[1],
    },
    {
      ...LOCATION,
      code: 6009031,
      number: 10,
      totalVoters: 240,
      school: schools[1],
    },
    {
      ...LOCATION,
      code: 6009041,
      number: 11,
      totalVoters: 177,
      school: schools[1],
    },
    {
      ...LOCATION,
      code: 6009051,
      number: 1,
      totalVoters: 240,
      school: schools[2],
    },
    {
      ...LOCATION,
      code: 6009061,
      number: 2,
      totalVoters: 240,
      school: schools[2],
    },
    {
      ...LOCATION,
      code: 6009071,
      number: 3,
      totalVoters: 240,
      school: schools[2],
    },
    {
      ...LOCATION,
      code: 6009081,
      number: 4,
      totalVoters: 240,
      school: schools[2],
    },
    {
      ...LOCATION,
      code: 6009091,
      number: 5,
      totalVoters: 240,
      school: schools[2],
    },
    {
      ...LOCATION,
      code: 6009101,
      number: 6,
      totalVoters: 240,
      school: schools[2],
    },
    {
      ...LOCATION,
      code: 6009111,
      number: 7,
      totalVoters: 240,
      school: schools[2],
    },
    {
      ...LOCATION,
      code: 6009121,
      number: 8,
      totalVoters: 240,
      school: schools[2],
    },
    {
      ...LOCATION,
      code: 6009131,
      number: 9,
      totalVoters: 240,
      school: schools[2],
    },
    {
      ...LOCATION,
      code: 6009141,
      number: 10,
      totalVoters: 240,
      school: schools[2],
    },
    {
      ...LOCATION,
      code: 6009151,
      number: 11,
      totalVoters: 240,
      school: schools[2],
    },
    {
      ...LOCATION,
      code: 6009161,
      number: 12,
      totalVoters: 240,
      school: schools[2],
    },
    {
      ...LOCATION,
      code: 6009171,
      number: 13,
      totalVoters: 240,
      school: schools[2],
    },
    {
      ...LOCATION,
      code: 6009181,
      number: 14,
      totalVoters: 240,
      school: schools[2],
    },
    {
      ...LOCATION,
      code: 6009191,
      number: 15,
      totalVoters: 240,
      school: schools[2],
    },
    {
      ...LOCATION,
      code: 6009201,
      number: 16,
      totalVoters: 24,
      school: schools[2],
    },
    {
      ...LOCATION,
      code: 6009211,
      number: 1,
      totalVoters: 240,
      school: schools[3],
    },
    {
      ...LOCATION,
      code: 6009221,
      number: 2,
      totalVoters: 240,
      school: schools[3],
    },
    {
      ...LOCATION,
      code: 6009231,
      number: 3,
      totalVoters: 240,
      school: schools[3],
    },
    {
      ...LOCATION,
      code: 6009241,
      number: 4,
      totalVoters: 240,
      school: schools[3],
    },
    {
      ...LOCATION,
      code: 6009251,
      number: 5,
      totalVoters: 240,
      school: schools[3],
    },
    {
      ...LOCATION,
      code: 6009261,
      number: 6,
      totalVoters: 240,
      school: schools[3],
    },
    {
      ...LOCATION,
      code: 6009271,
      number: 7,
      totalVoters: 240,
      school: schools[3],
    },
    {
      ...LOCATION,
      code: 6009281,
      number: 8,
      totalVoters: 240,
      school: schools[3],
    },
    {
      ...LOCATION,
      code: 6009291,
      number: 9,
      totalVoters: 240,
      school: schools[3],
    },
    {
      ...LOCATION,
      code: 6009301,
      number: 10,
      totalVoters: 240,
      school: schools[3],
    },
    {
      ...LOCATION,
      code: 6009311,
      number: 11,
      totalVoters: 240,
      school: schools[3],
    },
    {
      ...LOCATION,
      code: 6009321,
      number: 12,
      totalVoters: 240,
      school: schools[3],
    },
    {
      ...LOCATION,
      code: 6009331,
      number: 13,
      totalVoters: 240,
      school: schools[3],
    },
    {
      ...LOCATION,
      code: 6009341,
      number: 14,
      totalVoters: 157,
      school: schools[3],
    },
    {
      ...LOCATION,
      code: 6009351,
      number: 1,
      totalVoters: 240,
      school: schools[4],
    },
    {
      ...LOCATION,
      code: 6009361,
      number: 2,
      totalVoters: 240,
      school: schools[4],
    },
    {
      ...LOCATION,
      code: 6009371,
      number: 3,
      totalVoters: 240,
      school: schools[4],
    },
    {
      ...LOCATION,
      code: 6009381,
      number: 4,
      totalVoters: 240,
      school: schools[4],
    },
    {
      ...LOCATION,
      code: 6009391,
      number: 5,
      totalVoters: 240,
      school: schools[4],
    },
    {
      ...LOCATION,
      code: 6009401,
      number: 6,
      totalVoters: 240,
      school: schools[4],
    },
    {
      ...LOCATION,
      code: 6009411,
      number: 7,
      totalVoters: 240,
      school: schools[4],
    },
    {
      ...LOCATION,
      code: 6009421,
      number: 8,
      totalVoters: 240,
      school: schools[4],
    },
    {
      ...LOCATION,
      code: 6009431,
      number: 9,
      totalVoters: 240,
      school: schools[4],
    },
    {
      ...LOCATION,
      code: 6009441,
      number: 10,
      totalVoters: 240,
      school: schools[4],
    },
    {
      ...LOCATION,
      code: 6009451,
      number: 11,
      totalVoters: 191,
      school: schools[4],
    },
    {
      ...LOCATION,
      code: 6009461,
      number: 1,
      totalVoters: 240,
      school: schools[5],
    },
    {
      ...LOCATION,
      code: 6009471,
      number: 2,
      totalVoters: 240,
      school: schools[5],
    },
    {
      ...LOCATION,
      code: 6009481,
      number: 3,
      totalVoters: 240,
      school: schools[5],
    },
    {
      ...LOCATION,
      code: 6009491,
      number: 4,
      totalVoters: 240,
      school: schools[5],
    },
    {
      ...LOCATION,
      code: 6009501,
      number: 5,
      totalVoters: 240,
      school: schools[5],
    },
    {
      ...LOCATION,
      code: 6009511,
      number: 6,
      totalVoters: 240,
      school: schools[5],
    },
    {
      ...LOCATION,
      code: 6009521,
      number: 7,
      totalVoters: 240,
      school: schools[5],
    },
    {
      ...LOCATION,
      code: 6009531,
      number: 8,
      totalVoters: 240,
      school: schools[5],
    },
    {
      ...LOCATION,
      code: 6009541,
      number: 9,
      totalVoters: 240,
      school: schools[5],
    },
    {
      ...LOCATION,
      code: 6009551,
      number: 10,
      totalVoters: 240,
      school: schools[5],
    },
    {
      ...LOCATION,
      code: 6009561,
      number: 11,
      totalVoters: 240,
      school: schools[5],
    },
    {
      ...LOCATION,
      code: 6009571,
      number: 12,
      totalVoters: 240,
      school: schools[5],
    },
    {
      ...LOCATION,
      code: 6009581,
      number: 13,
      totalVoters: 240,
      school: schools[5],
    },
    {
      ...LOCATION,
      code: 6009591,
      number: 14,
      totalVoters: 240,
      school: schools[5],
    },
    {
      ...LOCATION,
      code: 6009601,
      number: 15,
      totalVoters: 240,
      school: schools[5],
    },
    {
      ...LOCATION,
      code: 6009611,
      number: 16,
      totalVoters: 240,
      school: schools[5],
    },
    {
      ...LOCATION,
      code: 6009621,
      number: 17,
      totalVoters: 66,
      school: schools[5],
    },
    {
      ...LOCATION,
      code: 6009631,
      number: 1,
      totalVoters: 240,
      school: schools[6],
    },
    {
      ...LOCATION,
      code: 6009641,
      number: 2,
      totalVoters: 240,
      school: schools[6],
    },
    {
      ...LOCATION,
      code: 6009651,
      number: 3,
      totalVoters: 240,
      school: schools[6],
    },
    {
      ...LOCATION,
      code: 6009661,
      number: 4,
      totalVoters: 240,
      school: schools[6],
    },
    {
      ...LOCATION,
      code: 6009671,
      number: 5,
      totalVoters: 240,
      school: schools[6],
    },
    {
      ...LOCATION,
      code: 6009681,
      number: 6,
      totalVoters: 240,
      school: schools[6],
    },
    {
      ...LOCATION,
      code: 6009691,
      number: 7,
      totalVoters: 240,
      school: schools[6],
    },
    {
      ...LOCATION,
      code: 6009701,
      number: 8,
      totalVoters: 240,
      school: schools[6],
    },
    {
      ...LOCATION,
      code: 6009711,
      number: 9,
      totalVoters: 240,
      school: schools[6],
    },
    {
      ...LOCATION,
      code: 6009721,
      number: 10,
      totalVoters: 240,
      school: schools[6],
    },
    {
      ...LOCATION,
      code: 6009731,
      number: 11,
      totalVoters: 102,
      school: schools[6],
    },
    {
      ...LOCATION,
      code: 6009741,
      number: 1,
      totalVoters: 240,
      school: schools[7],
    },
    {
      ...LOCATION,
      code: 6009751,
      number: 2,
      totalVoters: 240,
      school: schools[7],
    },
    {
      ...LOCATION,
      code: 6009761,
      number: 3,
      totalVoters: 240,
      school: schools[7],
    },
    {
      ...LOCATION,
      code: 6009771,
      number: 4,
      totalVoters: 240,
      school: schools[7],
    },
    {
      ...LOCATION,
      code: 6009781,
      number: 5,
      totalVoters: 240,
      school: schools[7],
    },
    {
      ...LOCATION,
      code: 6009791,
      number: 6,
      totalVoters: 240,
      school: schools[7],
    },
    {
      ...LOCATION,
      code: 6009801,
      number: 7,
      totalVoters: 240,
      school: schools[7],
    },
    {
      ...LOCATION,
      code: 6009811,
      number: 8,
      totalVoters: 114,
      school: schools[7],
    },
    {
      ...LOCATION,
      code: 6009821,
      number: 1,
      totalVoters: 67,
      school: schools[8],
    },
    {
      ...LOCATION,
      code: 6009831,
      number: 1,
      totalVoters: 240,
      school: schools[9],
    },
    {
      ...LOCATION,
      code: 6009841,
      number: 2,
      totalVoters: 240,
      school: schools[9],
    },
    {
      ...LOCATION,
      code: 6009851,
      number: 3,
      totalVoters: 240,
      school: schools[9],
    },
    {
      ...LOCATION,
      code: 6009861,
      number: 4,
      totalVoters: 240,
      school: schools[9],
    },
    {
      ...LOCATION,
      code: 6009871,
      number: 5,
      totalVoters: 101,
      school: schools[9],
    },
    {
      ...LOCATION,
      code: 6009881,
      number: 1,
      totalVoters: 240,
      school: schools[10],
    },
    {
      ...LOCATION,
      code: 6009891,
      number: 2,
      totalVoters: 240,
      school: schools[10],
    },
    {
      ...LOCATION,
      code: 6009901,
      number: 3,
      totalVoters: 240,
      school: schools[10],
    },
    {
      ...LOCATION,
      code: 6009911,
      number: 4,
      totalVoters: 240,
      school: schools[10],
    },
    {
      ...LOCATION,
      code: 6009921,
      number: 5,
      totalVoters: 240,
      school: schools[10],
    },
    {
      ...LOCATION,
      code: 6009931,
      number: 6,
      totalVoters: 170,
      school: schools[10],
    },
    {
      ...LOCATION,
      code: 6009941,
      number: 1,
      totalVoters: 240,
      school: schools[11],
    },
    {
      ...LOCATION,
      code: 6009951,
      number: 2,
      totalVoters: 123,
      school: schools[11],
    },
    {
      ...LOCATION,
      code: 6009961,
      number: 1,
      totalVoters: 224,
      school: schools[12],
    },
    {
      ...LOCATION,
      code: 6009971,
      number: 1,
      totalVoters: 240,
      school: schools[13],
    },
    {
      ...LOCATION,
      code: 6009981,
      number: 2,
      totalVoters: 23,
      school: schools[13],
    },
    {
      ...LOCATION,
      code: 6009991,
      number: 1,
      totalVoters: 240,
      school: schools[14],
    },
    {
      ...LOCATION,
      code: 6010001,
      number: 2,
      totalVoters: 163,
      school: schools[14],
    },
    {
      ...LOCATION,
      code: 6010011,
      number: 1,
      totalVoters: 240,
      school: schools[15],
    },
    {
      ...LOCATION,
      code: 6010021,
      number: 2,
      totalVoters: 240,
      school: schools[15],
    },
    {
      ...LOCATION,
      code: 6010031,
      number: 3,
      totalVoters: 240,
      school: schools[15],
    },
    {
      ...LOCATION,
      code: 6010041,
      number: 4,
      totalVoters: 24,
      school: schools[15],
    },
    {
      ...LOCATION,
      code: 6010051,
      number: 1,
      totalVoters: 177,
      school: schools[16],
    },
    {
      ...LOCATION,
      code: 6010061,
      number: 1,
      totalVoters: 240,
      school: schools[17],
    },
    {
      ...LOCATION,
      code: 6010071,
      number: 2,
      totalVoters: 235,
      school: schools[17],
    },
  ]);
  console.log("✅ Mesas electorales creadas");

  // --- Admin ---
  await userRepo.save(
    userRepo.create({
      username: "admin",
      phone: "60000000",
      password: await bcrypt.hash("admin123", 10),
      fullName: "Administrador del Sistema",
      role: Role.ADMIN,
    }),
  );

  // --- Jefes de campaña ---
  for (let i = 0; i < parties.length; i++) {
    await userRepo.save(
      userRepo.create({
        username: `jefe_partido_${parties[i].ballotOrder}`,
        password: await bcrypt.hash("jefe123", 10),
        phone: `600000${10 + i}`,
        fullName: `Jefe de Campaña - Partido ${parties[i].ballotOrder}`,
        role: Role.JEFE_CAMPANA,
        party: parties[i],
      }),
    );
  }

  // --- Jefes de recinto (CDC y ISA, uno por recinto) ---
  for (let s = 0; s < schools.length; s++) {
    for (let p = 0; p < 4; p++) {
      await userRepo.save(
        userRepo.create({
          username: `jrecinto_p${parties[p].ballotOrder}_${schools[s].shortName.toLowerCase()}`,
          password: await bcrypt.hash("jrecinto123", 10),
          phone: `601000${s + 1}`,
          fullName: `Jefe Recinto Partido ${parties[p].ballotOrder} — ${schools[s].shortName}`,
          role: Role.JEFE_RECINTO,
          party: parties[p],
          school: schools[s],
        }),
      );
    }
  }

  // --- Delegados (CDC y ISA, uno por mesa) ---
  const delegadoPwd = await bcrypt.hash("delegado123", 10);
  for (const table of tables) {
    for (let p = 0; p < 4; p++) {
      await userRepo.save(
        userRepo.create({
          username: `del_p${parties[p].ballotOrder}_${table.school.shortName.toLowerCase()}_${table.number}`,
          password: delegadoPwd,
          phone: "60000000",
          fullName: `Delegado Partido ${parties[p].ballotOrder} - ${table.school.shortName} - Mesa ${table.number}`,
          role: Role.DELEGADO,
          party: parties[p],
          table,
        }),
      );
    }
  }

  console.log("✅ Usuarios creados");
  console.log("\n🎉 Seed completado!\n");
  console.log("Credenciales:");
  console.log("  admin              / admin123");
  console.log("  jefe_partido_1    / jefe123");
  console.log("  jefe_partido_4    / jefe123");
  console.log("  jrecinto_p1_ueoce / jrecinto123");
  console.log("  jrecinto_p4_ueoce / jrecinto123");
  console.log("  del_p1_ueoce_1    / delegado123");
  console.log("  del_p4_ueoce_1    / delegado123");

  await AppDataSource.destroy();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});



