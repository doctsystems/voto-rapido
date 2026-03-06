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
  ssl: process.env.SSL === "true",
});

// Shared location data for all recintos (same for these elections)
const LOCATION = {
  departamento: "Tarija",
  provincia: "Arce",
  municipio: "Bermejo",
  asientoElectoral: "Bermejo",
  localidad: "Bermejo",
  circunscripcion: 42,
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
    { name: "Camino Democrata al Cambio", acronym: "CDC", color: "#c52b1a" },
    { name: "Unidad por la Patria", acronym: "PATRIA", color: "#d37e0e" },
    { name: "Partido Democrata Cristiano", acronym: "PDC", color: "#255037" },
    {
      name: "Integracion Seguridad y Autonomia",
      acronym: "ISA",
      color: "#4aa151",
    },
    { name: "Primero Tarija", acronym: "PT", color: "#e788cb" },
    { name: "Movimiento Tercer Sistema", acronym: "MTS", color: "#acebb2" },
    { name: "Unidos Para Renovar", acronym: "UNIR", color: "#ff8a03" },
    { name: "Nueva Generación Patriótica", acronym: "NGP", color: "#02aefd" },
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
      codigoRecinto: "9",
      nombreRecinto: "U.E. Guido Villagomez",
      nombreAbrev: "UEGV",
    },
    {
      ...LOCATION,
      codigoRecinto: "10",
      nombreRecinto: "U.E. 8 de Septiembre",
      nombreAbrev: "UE8DS",
    },
    {
      ...LOCATION,
      codigoRecinto: "11",
      nombreRecinto: "U.E. 25 de Mayo",
      nombreAbrev: "UE25DM",
    },
    {
      ...LOCATION,
      codigoRecinto: "12",
      nombreRecinto: "U.E. Eduardo Avaroa",
      nombreAbrev: "UEEA",
    },
    {
      ...LOCATION,
      codigoRecinto: "13",
      nombreRecinto: "U.E. Mscal. Andres De Santa Cruz",
      nombreAbrev: "UEMADSC",
    },
    {
      ...LOCATION,
      codigoRecinto: "14",
      nombreRecinto: "U.E. Octavio Campero Echazu (Bermejo)",
      nombreAbrev: "UEOCE",
    },
    {
      ...LOCATION,
      codigoRecinto: "15",
      nombreRecinto: "U.E. Aulio Araoz",
      nombreAbrev: "UEAA",
    },
    {
      ...LOCATION,
      codigoRecinto: "16",
      nombreRecinto: "U.E. Antonio Jose De Sucre",
      nombreAbrev: "UEAJS",
    },
    {
      ...LOCATION,
      codigoRecinto: "17",
      nombreRecinto: "(Cárcel) Carceleta Bermejo",
      nombreAbrev: "Carceleta",
    },
    {
      ...LOCATION,
      codigoRecinto: "25354",
      nombreRecinto: "U.E. La Esperanza",
      nombreAbrev: "UELE",
    },
    {
      ...LOCATION,
      codigoRecinto: "25547",
      nombreRecinto: "U.E. Bolivia",
      nombreAbrev: "UEBO",
    },
    {
      ...LOCATION,
      codigoRecinto: "3",
      nombreRecinto: "U.E. Moto Mendez",
      nombreAbrev: "UEMM",
    },
    {
      ...LOCATION,
      codigoRecinto: "4",
      nombreRecinto: "U.E. Flor De Oro",
      nombreAbrev: "UEFDO",
    },
    {
      ...LOCATION,
      codigoRecinto: "5",
      nombreRecinto: "U.E. Arrozales",
      nombreAbrev: "UEARZ",
    },
    {
      ...LOCATION,
      codigoRecinto: "6",
      nombreRecinto: "U.E. Barredero",
      nombreAbrev: "UEBAR",
    },
    {
      ...LOCATION,
      codigoRecinto: "7",
      nombreRecinto: "U.E. Colonia Linares",
      nombreAbrev: "UECL",
    },
    {
      ...LOCATION,
      codigoRecinto: "8",
      nombreRecinto: "U.E. Porcelana",
      nombreAbrev: "UEPOR",
    },
    {
      ...LOCATION,
      codigoRecinto: "33",
      nombreRecinto: "U.E. Campo Grande (Arce)",
      nombreAbrev: "UECG",
    },
  ]);
  console.log("✅ Recintos electorales creados");

  // --- Mesas (2 por recinto) ---
  const tables = await votingTableRepo.save([
    {
      ...LOCATION,
      tableCode: 6008791,
      tableNumber: "1",
      totalVoters: 240,
      school: schools[0],
    },
    {
      ...LOCATION,
      tableCode: 6008801,
      tableNumber: "2",
      totalVoters: 240,
      school: schools[0],
    },
    {
      ...LOCATION,
      tableCode: 6008811,
      tableNumber: "3",
      totalVoters: 240,
      school: schools[0],
    },
    {
      ...LOCATION,
      tableCode: 6008821,
      tableNumber: "4",
      totalVoters: 240,
      school: schools[0],
    },
    {
      ...LOCATION,
      tableCode: 6008831,
      tableNumber: "5",
      totalVoters: 240,
      school: schools[0],
    },
    {
      ...LOCATION,
      tableCode: 6008841,
      tableNumber: "6",
      totalVoters: 240,
      school: schools[0],
    },
    {
      ...LOCATION,
      tableCode: 6008851,
      tableNumber: "7",
      totalVoters: 240,
      school: schools[0],
    },
    {
      ...LOCATION,
      tableCode: 6008861,
      tableNumber: "8",
      totalVoters: 240,
      school: schools[0],
    },
    {
      ...LOCATION,
      tableCode: 6008871,
      tableNumber: "9",
      totalVoters: 240,
      school: schools[0],
    },
    {
      ...LOCATION,
      tableCode: 6008881,
      tableNumber: "10",
      totalVoters: 240,
      school: schools[0],
    },
    {
      ...LOCATION,
      tableCode: 6008891,
      tableNumber: "11",
      totalVoters: 240,
      school: schools[0],
    },
    {
      ...LOCATION,
      tableCode: 6008901,
      tableNumber: "12",
      totalVoters: 240,
      school: schools[0],
    },
    {
      ...LOCATION,
      tableCode: 6008911,
      tableNumber: "13",
      totalVoters: 240,
      school: schools[0],
    },
    {
      ...LOCATION,
      tableCode: 6008921,
      tableNumber: "14",
      totalVoters: 240,
      school: schools[0],
    },
    {
      ...LOCATION,
      tableCode: 6008931,
      tableNumber: "15",
      totalVoters: 211,
      school: schools[0],
    },
    {
      ...LOCATION,
      tableCode: 6008941,
      tableNumber: "1",
      totalVoters: 240,
      school: schools[1],
    },
    {
      ...LOCATION,
      tableCode: 6008951,
      tableNumber: "2",
      totalVoters: 240,
      school: schools[1],
    },
    {
      ...LOCATION,
      tableCode: 6008961,
      tableNumber: "3",
      totalVoters: 240,
      school: schools[1],
    },
    {
      ...LOCATION,
      tableCode: 6008971,
      tableNumber: "4",
      totalVoters: 240,
      school: schools[1],
    },
    {
      ...LOCATION,
      tableCode: 6008981,
      tableNumber: "5",
      totalVoters: 240,
      school: schools[1],
    },
    {
      ...LOCATION,
      tableCode: 6008991,
      tableNumber: "6",
      totalVoters: 240,
      school: schools[1],
    },
    {
      ...LOCATION,
      tableCode: 6009001,
      tableNumber: "7",
      totalVoters: 240,
      school: schools[1],
    },
    {
      ...LOCATION,
      tableCode: 6009011,
      tableNumber: "8",
      totalVoters: 240,
      school: schools[1],
    },
    {
      ...LOCATION,
      tableCode: 6009021,
      tableNumber: "9",
      totalVoters: 240,
      school: schools[1],
    },
    {
      ...LOCATION,
      tableCode: 6009031,
      tableNumber: "10",
      totalVoters: 240,
      school: schools[1],
    },
    {
      ...LOCATION,
      tableCode: 6009041,
      tableNumber: "11",
      totalVoters: 177,
      school: schools[1],
    },
    {
      ...LOCATION,
      tableCode: 6009051,
      tableNumber: "1",
      totalVoters: 240,
      school: schools[2],
    },
    {
      ...LOCATION,
      tableCode: 6009061,
      tableNumber: "2",
      totalVoters: 240,
      school: schools[2],
    },
    {
      ...LOCATION,
      tableCode: 6009071,
      tableNumber: "3",
      totalVoters: 240,
      school: schools[2],
    },
    {
      ...LOCATION,
      tableCode: 6009081,
      tableNumber: "4",
      totalVoters: 240,
      school: schools[2],
    },
    {
      ...LOCATION,
      tableCode: 6009091,
      tableNumber: "5",
      totalVoters: 240,
      school: schools[2],
    },
    {
      ...LOCATION,
      tableCode: 6009101,
      tableNumber: "6",
      totalVoters: 240,
      school: schools[2],
    },
    {
      ...LOCATION,
      tableCode: 6009111,
      tableNumber: "7",
      totalVoters: 240,
      school: schools[2],
    },
    {
      ...LOCATION,
      tableCode: 6009121,
      tableNumber: "8",
      totalVoters: 240,
      school: schools[2],
    },
    {
      ...LOCATION,
      tableCode: 6009131,
      tableNumber: "9",
      totalVoters: 240,
      school: schools[2],
    },
    {
      ...LOCATION,
      tableCode: 6009141,
      tableNumber: "10",
      totalVoters: 240,
      school: schools[2],
    },
    {
      ...LOCATION,
      tableCode: 6009151,
      tableNumber: "11",
      totalVoters: 240,
      school: schools[2],
    },
    {
      ...LOCATION,
      tableCode: 6009161,
      tableNumber: "12",
      totalVoters: 240,
      school: schools[2],
    },
    {
      ...LOCATION,
      tableCode: 6009171,
      tableNumber: "13",
      totalVoters: 240,
      school: schools[2],
    },
    {
      ...LOCATION,
      tableCode: 6009181,
      tableNumber: "14",
      totalVoters: 240,
      school: schools[2],
    },
    {
      ...LOCATION,
      tableCode: 6009191,
      tableNumber: "15",
      totalVoters: 240,
      school: schools[2],
    },
    {
      ...LOCATION,
      tableCode: 6009201,
      tableNumber: "16",
      totalVoters: 24,
      school: schools[2],
    },
    {
      ...LOCATION,
      tableCode: 6009211,
      tableNumber: "1",
      totalVoters: 240,
      school: schools[3],
    },
    {
      ...LOCATION,
      tableCode: 6009221,
      tableNumber: "2",
      totalVoters: 240,
      school: schools[3],
    },
    {
      ...LOCATION,
      tableCode: 6009231,
      tableNumber: "3",
      totalVoters: 240,
      school: schools[3],
    },
    {
      ...LOCATION,
      tableCode: 6009241,
      tableNumber: "4",
      totalVoters: 240,
      school: schools[3],
    },
    {
      ...LOCATION,
      tableCode: 6009251,
      tableNumber: "5",
      totalVoters: 240,
      school: schools[3],
    },
    {
      ...LOCATION,
      tableCode: 6009261,
      tableNumber: "6",
      totalVoters: 240,
      school: schools[3],
    },
    {
      ...LOCATION,
      tableCode: 6009271,
      tableNumber: "7",
      totalVoters: 240,
      school: schools[3],
    },
    {
      ...LOCATION,
      tableCode: 6009281,
      tableNumber: "8",
      totalVoters: 240,
      school: schools[3],
    },
    {
      ...LOCATION,
      tableCode: 6009291,
      tableNumber: "9",
      totalVoters: 240,
      school: schools[3],
    },
    {
      ...LOCATION,
      tableCode: 6009301,
      tableNumber: "10",
      totalVoters: 240,
      school: schools[3],
    },
    {
      ...LOCATION,
      tableCode: 6009311,
      tableNumber: "11",
      totalVoters: 240,
      school: schools[3],
    },
    {
      ...LOCATION,
      tableCode: 6009321,
      tableNumber: "12",
      totalVoters: 240,
      school: schools[3],
    },
    {
      ...LOCATION,
      tableCode: 6009331,
      tableNumber: "13",
      totalVoters: 240,
      school: schools[3],
    },
    {
      ...LOCATION,
      tableCode: 6009341,
      tableNumber: "14",
      totalVoters: 157,
      school: schools[3],
    },
    {
      ...LOCATION,
      tableCode: 6009351,
      tableNumber: "1",
      totalVoters: 240,
      school: schools[4],
    },
    {
      ...LOCATION,
      tableCode: 6009361,
      tableNumber: "2",
      totalVoters: 240,
      school: schools[4],
    },
    {
      ...LOCATION,
      tableCode: 6009371,
      tableNumber: "3",
      totalVoters: 240,
      school: schools[4],
    },
    {
      ...LOCATION,
      tableCode: 6009381,
      tableNumber: "4",
      totalVoters: 240,
      school: schools[4],
    },
    {
      ...LOCATION,
      tableCode: 6009391,
      tableNumber: "5",
      totalVoters: 240,
      school: schools[4],
    },
    {
      ...LOCATION,
      tableCode: 6009401,
      tableNumber: "6",
      totalVoters: 240,
      school: schools[4],
    },
    {
      ...LOCATION,
      tableCode: 6009411,
      tableNumber: "7",
      totalVoters: 240,
      school: schools[4],
    },
    {
      ...LOCATION,
      tableCode: 6009421,
      tableNumber: "8",
      totalVoters: 240,
      school: schools[4],
    },
    {
      ...LOCATION,
      tableCode: 6009431,
      tableNumber: "9",
      totalVoters: 240,
      school: schools[4],
    },
    {
      ...LOCATION,
      tableCode: 6009441,
      tableNumber: "10",
      totalVoters: 240,
      school: schools[4],
    },
    {
      ...LOCATION,
      tableCode: 6009451,
      tableNumber: "11",
      totalVoters: 191,
      school: schools[4],
    },
    {
      ...LOCATION,
      tableCode: 6009461,
      tableNumber: "1",
      totalVoters: 240,
      school: schools[5],
    },
    {
      ...LOCATION,
      tableCode: 6009471,
      tableNumber: "2",
      totalVoters: 240,
      school: schools[5],
    },
    {
      ...LOCATION,
      tableCode: 6009481,
      tableNumber: "3",
      totalVoters: 240,
      school: schools[5],
    },
    {
      ...LOCATION,
      tableCode: 6009491,
      tableNumber: "4",
      totalVoters: 240,
      school: schools[5],
    },
    {
      ...LOCATION,
      tableCode: 6009501,
      tableNumber: "5",
      totalVoters: 240,
      school: schools[5],
    },
    {
      ...LOCATION,
      tableCode: 6009511,
      tableNumber: "6",
      totalVoters: 240,
      school: schools[5],
    },
    {
      ...LOCATION,
      tableCode: 6009521,
      tableNumber: "7",
      totalVoters: 240,
      school: schools[5],
    },
    {
      ...LOCATION,
      tableCode: 6009531,
      tableNumber: "8",
      totalVoters: 240,
      school: schools[5],
    },
    {
      ...LOCATION,
      tableCode: 6009541,
      tableNumber: "9",
      totalVoters: 240,
      school: schools[5],
    },
    {
      ...LOCATION,
      tableCode: 6009551,
      tableNumber: "10",
      totalVoters: 240,
      school: schools[5],
    },
    {
      ...LOCATION,
      tableCode: 6009561,
      tableNumber: "11",
      totalVoters: 240,
      school: schools[5],
    },
    {
      ...LOCATION,
      tableCode: 6009571,
      tableNumber: "12",
      totalVoters: 240,
      school: schools[5],
    },
    {
      ...LOCATION,
      tableCode: 6009581,
      tableNumber: "13",
      totalVoters: 240,
      school: schools[5],
    },
    {
      ...LOCATION,
      tableCode: 6009591,
      tableNumber: "14",
      totalVoters: 240,
      school: schools[5],
    },
    {
      ...LOCATION,
      tableCode: 6009601,
      tableNumber: "15",
      totalVoters: 240,
      school: schools[5],
    },
    {
      ...LOCATION,
      tableCode: 6009611,
      tableNumber: "16",
      totalVoters: 240,
      school: schools[5],
    },
    {
      ...LOCATION,
      tableCode: 6009621,
      tableNumber: "17",
      totalVoters: 66,
      school: schools[5],
    },
    {
      ...LOCATION,
      tableCode: 6009631,
      tableNumber: "1",
      totalVoters: 240,
      school: schools[6],
    },
    {
      ...LOCATION,
      tableCode: 6009641,
      tableNumber: "2",
      totalVoters: 240,
      school: schools[6],
    },
    {
      ...LOCATION,
      tableCode: 6009651,
      tableNumber: "3",
      totalVoters: 240,
      school: schools[6],
    },
    {
      ...LOCATION,
      tableCode: 6009661,
      tableNumber: "4",
      totalVoters: 240,
      school: schools[6],
    },
    {
      ...LOCATION,
      tableCode: 6009671,
      tableNumber: "5",
      totalVoters: 240,
      school: schools[6],
    },
    {
      ...LOCATION,
      tableCode: 6009681,
      tableNumber: "6",
      totalVoters: 240,
      school: schools[6],
    },
    {
      ...LOCATION,
      tableCode: 6009691,
      tableNumber: "7",
      totalVoters: 240,
      school: schools[6],
    },
    {
      ...LOCATION,
      tableCode: 6009701,
      tableNumber: "8",
      totalVoters: 240,
      school: schools[6],
    },
    {
      ...LOCATION,
      tableCode: 6009711,
      tableNumber: "9",
      totalVoters: 240,
      school: schools[6],
    },
    {
      ...LOCATION,
      tableCode: 6009721,
      tableNumber: "10",
      totalVoters: 240,
      school: schools[6],
    },
    {
      ...LOCATION,
      tableCode: 6009731,
      tableNumber: "11",
      totalVoters: 102,
      school: schools[6],
    },
    {
      ...LOCATION,
      tableCode: 6009741,
      tableNumber: "1",
      totalVoters: 240,
      school: schools[7],
    },
    {
      ...LOCATION,
      tableCode: 6009751,
      tableNumber: "2",
      totalVoters: 240,
      school: schools[7],
    },
    {
      ...LOCATION,
      tableCode: 6009761,
      tableNumber: "3",
      totalVoters: 240,
      school: schools[7],
    },
    {
      ...LOCATION,
      tableCode: 6009771,
      tableNumber: "4",
      totalVoters: 240,
      school: schools[7],
    },
    {
      ...LOCATION,
      tableCode: 6009781,
      tableNumber: "5",
      totalVoters: 240,
      school: schools[7],
    },
    {
      ...LOCATION,
      tableCode: 6009791,
      tableNumber: "6",
      totalVoters: 240,
      school: schools[7],
    },
    {
      ...LOCATION,
      tableCode: 6009801,
      tableNumber: "7",
      totalVoters: 240,
      school: schools[7],
    },
    {
      ...LOCATION,
      tableCode: 6009811,
      tableNumber: "8",
      totalVoters: 114,
      school: schools[7],
    },
    {
      ...LOCATION,
      tableCode: 6009821,
      tableNumber: "1",
      totalVoters: 67,
      school: schools[8],
    },
    {
      ...LOCATION,
      tableCode: 6009831,
      tableNumber: "1",
      totalVoters: 240,
      school: schools[9],
    },
    {
      ...LOCATION,
      tableCode: 6009841,
      tableNumber: "2",
      totalVoters: 240,
      school: schools[9],
    },
    {
      ...LOCATION,
      tableCode: 6009851,
      tableNumber: "3",
      totalVoters: 240,
      school: schools[9],
    },
    {
      ...LOCATION,
      tableCode: 6009861,
      tableNumber: "4",
      totalVoters: 240,
      school: schools[9],
    },
    {
      ...LOCATION,
      tableCode: 6009871,
      tableNumber: "5",
      totalVoters: 101,
      school: schools[9],
    },
    {
      ...LOCATION,
      tableCode: 6009881,
      tableNumber: "1",
      totalVoters: 240,
      school: schools[10],
    },
    {
      ...LOCATION,
      tableCode: 6009891,
      tableNumber: "2",
      totalVoters: 240,
      school: schools[10],
    },
    {
      ...LOCATION,
      tableCode: 6009901,
      tableNumber: "3",
      totalVoters: 240,
      school: schools[10],
    },
    {
      ...LOCATION,
      tableCode: 6009911,
      tableNumber: "4",
      totalVoters: 240,
      school: schools[10],
    },
    {
      ...LOCATION,
      tableCode: 6009921,
      tableNumber: "5",
      totalVoters: 240,
      school: schools[10],
    },
    {
      ...LOCATION,
      tableCode: 6009931,
      tableNumber: "6",
      totalVoters: 170,
      school: schools[10],
    },
    {
      ...LOCATION,
      tableCode: 6009941,
      tableNumber: "1",
      totalVoters: 240,
      school: schools[11],
    },
    {
      ...LOCATION,
      tableCode: 6009951,
      tableNumber: "2",
      totalVoters: 123,
      school: schools[11],
    },
    {
      ...LOCATION,
      tableCode: 6009961,
      tableNumber: "1",
      totalVoters: 224,
      school: schools[12],
    },
    {
      ...LOCATION,
      tableCode: 6009971,
      tableNumber: "1",
      totalVoters: 240,
      school: schools[13],
    },
    {
      ...LOCATION,
      tableCode: 6009981,
      tableNumber: "2",
      totalVoters: 23,
      school: schools[13],
    },
    {
      ...LOCATION,
      tableCode: 6009991,
      tableNumber: "1",
      totalVoters: 240,
      school: schools[14],
    },
    {
      ...LOCATION,
      tableCode: 6010001,
      tableNumber: "2",
      totalVoters: 163,
      school: schools[14],
    },
    {
      ...LOCATION,
      tableCode: 6010011,
      tableNumber: "1",
      totalVoters: 240,
      school: schools[15],
    },
    {
      ...LOCATION,
      tableCode: 6010021,
      tableNumber: "2",
      totalVoters: 240,
      school: schools[15],
    },
    {
      ...LOCATION,
      tableCode: 6010031,
      tableNumber: "3",
      totalVoters: 240,
      school: schools[15],
    },
    {
      ...LOCATION,
      tableCode: 6010041,
      tableNumber: "4",
      totalVoters: 24,
      school: schools[15],
    },
    {
      ...LOCATION,
      tableCode: 6010051,
      tableNumber: "1",
      totalVoters: 177,
      school: schools[16],
    },
    {
      ...LOCATION,
      tableCode: 6010061,
      tableNumber: "1",
      totalVoters: 240,
      school: schools[17],
    },
    {
      ...LOCATION,
      tableCode: 6010071,
      tableNumber: "2",
      totalVoters: 235,
      school: schools[17],
    },
  ]);
  console.log("✅ Mesas electorales creadas");

  // --- Admin ---
  await userRepo.save(
    userRepo.create({
      username: "admin",
      email: "admin@votorapido.bo",
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
        username: `jefe_${parties[i].acronym.toLowerCase()}`,
        email: `jefe_${parties[i].acronym.toLowerCase()}@votorapido.bo`,
        password: await bcrypt.hash("jefe123", 10),
        phone: `600000${10 + i}`,
        fullName: `Jefe de Campaña - ${parties[i].acronym}`,
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
          username: `jrecinto_${parties[p].acronym.toLowerCase()}_${schools[s].nombreAbrev.toLowerCase()}`,
          email: `jrecinto.${parties[p].acronym.toLowerCase()}.${schools[s].nombreAbrev.toLowerCase()}@votorapido.bo`,
          password: await bcrypt.hash("jrecinto123", 10),
          phone: `601000${s + 1}`,
          fullName: `Jefe Recinto ${parties[p].acronym} — ${schools[s].nombreAbrev}`,
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
          username: `del_${parties[p].acronym.toLowerCase()}_${table.school.nombreAbrev.toLowerCase()}_${table.tableNumber}`,
          email: `del.${parties[p].acronym.toLowerCase()}.${table.tableCode}@votorapido.bo`,
          password: delegadoPwd,
          phone: "60000000",
          fullName: `Delegado ${parties[p].acronym} - ${table.school.nombreAbrev} - Mesa ${table.tableNumber}`,
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
  console.log("  jefe_cdc           / jefe123");
  console.log("  jefe_isa           / jefe123");
  console.log("  jrecinto_cdc_1     / jrecinto123");
  console.log("  jrecinto_isa_1     / jrecinto123");
  console.log("  delegado_cdc_6008791  / delegado123");
  console.log("  delegado_isa_6008791  / delegado123");

  await AppDataSource.destroy();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
