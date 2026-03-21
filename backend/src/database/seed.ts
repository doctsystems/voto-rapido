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
import { logger } from "../common/logger/winston.logger";
import { generateInitialPassword } from "../common/utils/pass.generator";

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
});

const PARTY_SEED_DATA = [
  { name: "Movimiento Tercer Sistema", acronym: "MTS", ballotOrder: 1, color: "#c4a577", },
  { name: "Partido Democrata Cristiano", acronym: "PDC", ballotOrder: 2, color: "#6d7c73", },
  { name: "Integracion Seguridad y Autonomia", acronym: "ISA", ballotOrder: 3, color: "#2e743d", },
  { name: "Camino Democrata al Cambio", acronym: "CDC", ballotOrder: 4, color: "#c52b1a", },
  { name: "Primero Tarija", acronym: "PT", ballotOrder: 5, color: "#e788cb", },
  { name: "Unidos Para Renovar", acronym: "UNIR", ballotOrder: 6, color: "#eb8006", },
  { name: "Unidad por la Patria", acronym: "PATRIA", ballotOrder: 7, color: "#c9530f", },
  { name: "Autonomía Para Bolivia", acronym: "SUMATE", ballotOrder: 8, color: "#5c0672", },
  { name: "Nueva Generación Patriótica", acronym: "NGP", ballotOrder: 9, color: "#02aefd", },
  { name: "Unidos por los Pueblos", acronym: "ALIANZA", ballotOrder: 10, color: "#e4c514", },
];

async function seed() {
  await AppDataSource.initialize();
  console.log("🌱 Iniciando seed...");

  const auditLogRepo = AppDataSource.getRepository(AuditLog);
  const voteEntryRepo = AppDataSource.getRepository(VoteEntry);
  const voteReportRepo = AppDataSource.getRepository(VoteReport);
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
  const parties = await partyRepo.save(PARTY_SEED_DATA);
  console.log("✅ Partidos creados");

  // --- Tipos de elección ---
  const electionTypes = await electionTypeRepo.save([
    { name: "Alcalde", order: 1 },
    { name: "Concejal", order: 2 },
    { name: "Gobernador", order: 3 },
    { name: "Asambleísta por Territorio", order: 4 },
    { name: "Asambleísta por Poblacion", order: 5 },
  ]);
  console.log("✅ Tipos de elección creados");

  // --- Asignaciones partido-tipo de elección ---
  const assignments = [
    { party: parties[0], et: electionTypes[0], candidate: "Norma Gutierrez (MTS)", },
    { party: parties[1], et: electionTypes[0], candidate: "Amado Cuevas (PDC)", },
    { party: parties[2], et: electionTypes[0], candidate: "Alejandro Sivila (ISA)", },
    { party: parties[3], et: electionTypes[0], candidate: "Victor Morales (CDC)", },
    { party: parties[4], et: electionTypes[0], candidate: "Freddy Rueda (PT)" },
    { party: parties[5], et: electionTypes[0], candidate: "Nathalie Galvez (UNIR)", },
    { party: parties[6], et: electionTypes[0], candidate: "Tito Gareca (PATRIA)", },

    { party: parties[0], et: electionTypes[1], candidate: "Ramiro Gerardo (MTS)" },
    { party: parties[1], et: electionTypes[1], candidate: "Melva Velásquez (PDC)" },
    { party: parties[2], et: electionTypes[1], candidate: "Elsa Blas (ISA)" },
    { party: parties[3], et: electionTypes[1], candidate: "Ivert Loaiza (CDC)" },
    { party: parties[4], et: electionTypes[1], candidate: "Tatiana Sanchez (PT)" },
    { party: parties[5], et: electionTypes[1], candidate: "Reynaldo Garcia (UNIR)" },
    { party: parties[6], et: electionTypes[1], candidate: "Maria Carvajal (PATRIA)" },

    { party: parties[0], et: electionTypes[2], candidate: "Daniel Centeno (MTS)" },
    { party: parties[1], et: electionTypes[2], candidate: "Richard Rocha (PDC)" },
    { party: parties[2], et: electionTypes[2], candidate: "Wilfredo Vicente (ISA)" },
    { party: parties[3], et: electionTypes[2], candidate: "Maria Rene Soruco (CDC)" },
    { party: parties[6], et: electionTypes[2], candidate: "Adrián Oliva (PATRIA)" },
    { party: parties[8], et: electionTypes[2], candidate: "Never Antelo (NGP)" },
    { party: parties[7], et: electionTypes[2], candidate: "Sebastian Castillo (SUMATE)" },
    { party: parties[9], et: electionTypes[2], candidate: "Jose Yucra (ALIANZA)" },

    { party: parties[0], et: electionTypes[3], candidate: "Analía Caucota (MTS)" },
    { party: parties[1], et: electionTypes[3], candidate: "Pablo Gutierrez (PDC)" },
    { party: parties[2], et: electionTypes[3], candidate: "Gladis Morales (ISA)" },
    { party: parties[3], et: electionTypes[3], candidate: "Sthephany Muguertegui (CDC)" },
    { party: parties[6], et: electionTypes[3], candidate: "Lucely MAmani (PATRIA)" },
    { party: parties[8], et: electionTypes[3], candidate: "Carminia Lazo (NGP)" },
    { party: parties[7], et: electionTypes[3], candidate: "(SUMATE)" },
    { party: parties[9], et: electionTypes[3], candidate: "(ALIANZA)" },

    { party: parties[0], et: electionTypes[4], candidate: "Denis Gallardo (MTS)" },
    { party: parties[1], et: electionTypes[4], candidate: "Janneth Vidaurre (PDC)" },
    { party: parties[2], et: electionTypes[4], candidate: "Roxana Farfan (ISA)" },
    { party: parties[3], et: electionTypes[4], candidate: "Paola Chipana (CDC)" },
    { party: parties[6], et: electionTypes[4], candidate: "Gabriel Calapiña (PATRIA)" },
    { party: parties[8], et: electionTypes[4], candidate: "(NGP)" },
    { party: parties[7], et: electionTypes[4], candidate: "(SUMATE)" },
    { party: parties[9], et: electionTypes[4], candidate: "(ALIANZA)" },
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
    { code: 9, name: "U.E. Guido Villagomez", shortName: "UEGV", tableCount: 15 },
    { code: 10, name: "U.E. 8 de Septiembre", shortName: "UE8DS", tableCount: 11 },
    { code: 11, name: "U.E. 25 de Mayo", shortName: "UE25DM", tableCount: 16 },
    { code: 12, name: "U.E. Eduardo Avaroa", shortName: "UEEA", tableCount: 14 },
    { code: 13, name: "U.E. Mscal. Andres De Santa Cruz", shortName: "UEMADSC", tableCount: 11 },
    { code: 14, name: "U.E. Octavio Campero Echazu (Bermejo)", shortName: "UEOCE", tableCount: 17 },
    { code: 15, name: "U.E. Aulio Araoz", shortName: "UEAA", tableCount: 11 },
    { code: 16, name: "U.E. Antonio Jose De Sucre", shortName: "UEAJS", tableCount: 8 },
    { code: 17, name: "(Cárcel) Carceleta Bermejo", shortName: "Carceleta", tableCount: 1 },
    { code: 25354, name: "U.E. La Esperanza", shortName: "UELE", tableCount: 5 },
    { code: 25547, name: "U.E. Bolivia", shortName: "UEBO", tableCount: 6 },
    { code: 3, name: "U.E. Moto Mendez", shortName: "UEMM", tableCount: 2 },
    { code: 4, name: "U.E. Flor De Oro", shortName: "UEFDO", tableCount: 1 },
    { code: 5, name: "U.E. Arrozales", shortName: "UEARZ", tableCount: 2 },
    { code: 6, name: "U.E. Barredero", shortName: "UEBAR", tableCount: 2 },
    { code: 7, name: "U.E. Colonia Linares", shortName: "UECL", tableCount: 4 },
    { code: 8, name: "U.E. Porcelana", shortName: "UEPOR", tableCount: 8 },
    { code: 33, name: "U.E. Campo Grande (Arce)", shortName: "UECG", tableCount: 2 },
  ]);
  console.log("✅ Recintos electorales creados");

  // --- Mesas (2 por recinto) ---
  const tables = await votingTableRepo.save([
    { number: 1, totalVoters: 240, school: schools[0], },
    { number: 2, totalVoters: 240, school: schools[0], },
    { number: 3, totalVoters: 240, school: schools[0], },
    { number: 4, totalVoters: 240, school: schools[0], },
    { number: 5, totalVoters: 240, school: schools[0], },
    { number: 6, totalVoters: 240, school: schools[0], },
    { number: 7, totalVoters: 240, school: schools[0], },
    { number: 8, totalVoters: 240, school: schools[0], },
    { number: 9, totalVoters: 240, school: schools[0], },
    { number: 10, totalVoters: 240, school: schools[0], },
    { number: 11, totalVoters: 240, school: schools[0], },
    { number: 12, totalVoters: 240, school: schools[0], },
    { number: 13, totalVoters: 240, school: schools[0], },
    { number: 14, totalVoters: 240, school: schools[0], },
    { number: 15, totalVoters: 211, school: schools[0], },
    { number: 1, totalVoters: 240, school: schools[1], },
    { number: 2, totalVoters: 240, school: schools[1], },
    { number: 3, totalVoters: 240, school: schools[1], },
    { number: 4, totalVoters: 240, school: schools[1], },
    { number: 5, totalVoters: 240, school: schools[1], },
    { number: 6, totalVoters: 240, school: schools[1], },
    { number: 7, totalVoters: 240, school: schools[1], },
    { number: 8, totalVoters: 240, school: schools[1], },
    { number: 9, totalVoters: 240, school: schools[1], },
    { number: 10, totalVoters: 240, school: schools[1], },
    { number: 11, totalVoters: 177, school: schools[1], },
    { number: 1, totalVoters: 240, school: schools[2], },
    { number: 2, totalVoters: 240, school: schools[2], },
    { number: 3, totalVoters: 240, school: schools[2], },
    { number: 4, totalVoters: 240, school: schools[2], },
    { number: 5, totalVoters: 240, school: schools[2], },
    { number: 6, totalVoters: 240, school: schools[2], },
    { number: 7, totalVoters: 240, school: schools[2], },
    { number: 8, totalVoters: 240, school: schools[2], },
    { number: 9, totalVoters: 240, school: schools[2], },
    { number: 10, totalVoters: 240, school: schools[2], },
    { number: 11, totalVoters: 240, school: schools[2], },
    { number: 12, totalVoters: 240, school: schools[2], },
    { number: 13, totalVoters: 240, school: schools[2], },
    { number: 14, totalVoters: 240, school: schools[2], },
    { number: 15, totalVoters: 240, school: schools[2], },
    { number: 16, totalVoters: 24, school: schools[2], },
    { number: 1, totalVoters: 240, school: schools[3], },
    { number: 2, totalVoters: 240, school: schools[3], },
    { number: 3, totalVoters: 240, school: schools[3], },
    { number: 4, totalVoters: 240, school: schools[3], },
    { number: 5, totalVoters: 240, school: schools[3], },
    { number: 6, totalVoters: 240, school: schools[3], },
    { number: 7, totalVoters: 240, school: schools[3], },
    { number: 8, totalVoters: 240, school: schools[3], },
    { number: 9, totalVoters: 240, school: schools[3], },
    { number: 10, totalVoters: 240, school: schools[3], },
    { number: 11, totalVoters: 240, school: schools[3], },
    { number: 12, totalVoters: 240, school: schools[3], },
    { number: 13, totalVoters: 240, school: schools[3], },
    { number: 14, totalVoters: 157, school: schools[3], },
    { number: 1, totalVoters: 240, school: schools[4], },
    { number: 2, totalVoters: 240, school: schools[4], },
    { number: 3, totalVoters: 240, school: schools[4], },
    { number: 4, totalVoters: 240, school: schools[4], },
    { number: 5, totalVoters: 240, school: schools[4], },
    { number: 6, totalVoters: 240, school: schools[4], },
    { number: 7, totalVoters: 240, school: schools[4], },
    { number: 8, totalVoters: 240, school: schools[4], },
    { number: 9, totalVoters: 240, school: schools[4], },
    { number: 10, totalVoters: 240, school: schools[4], },
    { number: 11, totalVoters: 191, school: schools[4], },
    { number: 1, totalVoters: 240, school: schools[5], },
    { number: 2, totalVoters: 240, school: schools[5], },
    { number: 3, totalVoters: 240, school: schools[5], },
    { number: 4, totalVoters: 240, school: schools[5], },
    { number: 5, totalVoters: 240, school: schools[5], },
    { number: 6, totalVoters: 240, school: schools[5], },
    { number: 7, totalVoters: 240, school: schools[5], },
    { number: 8, totalVoters: 240, school: schools[5], },
    { number: 9, totalVoters: 240, school: schools[5], },
    { number: 10, totalVoters: 240, school: schools[5], },
    { number: 11, totalVoters: 240, school: schools[5], },
    { number: 12, totalVoters: 240, school: schools[5], },
    { number: 13, totalVoters: 240, school: schools[5], },
    { number: 14, totalVoters: 240, school: schools[5], },
    { number: 15, totalVoters: 240, school: schools[5], },
    { number: 16, totalVoters: 240, school: schools[5], },
    { number: 17, totalVoters: 66, school: schools[5], },
    { number: 1, totalVoters: 240, school: schools[6], },
    { number: 2, totalVoters: 240, school: schools[6], },
    { number: 3, totalVoters: 240, school: schools[6], },
    { number: 4, totalVoters: 240, school: schools[6], },
    { number: 5, totalVoters: 240, school: schools[6], },
    { number: 6, totalVoters: 240, school: schools[6], },
    { number: 7, totalVoters: 240, school: schools[6], },
    { number: 8, totalVoters: 240, school: schools[6], },
    { number: 9, totalVoters: 240, school: schools[6], },
    { number: 10, totalVoters: 240, school: schools[6], },
    { number: 11, totalVoters: 102, school: schools[6], },
    { number: 1, totalVoters: 240, school: schools[7], },
    { number: 2, totalVoters: 240, school: schools[7], },
    { number: 3, totalVoters: 240, school: schools[7], },
    { number: 4, totalVoters: 240, school: schools[7], },
    { number: 5, totalVoters: 240, school: schools[7], },
    { number: 6, totalVoters: 240, school: schools[7], },
    { number: 7, totalVoters: 240, school: schools[7], },
    { number: 8, totalVoters: 114, school: schools[7], },
    { number: 1, totalVoters: 67, school: schools[8], },
    { number: 1, totalVoters: 240, school: schools[9], },
    { number: 2, totalVoters: 240, school: schools[9], },
    { number: 3, totalVoters: 240, school: schools[9], },
    { number: 4, totalVoters: 240, school: schools[9], },
    { number: 5, totalVoters: 101, school: schools[9], },
    { number: 1, totalVoters: 240, school: schools[10], },
    { number: 2, totalVoters: 240, school: schools[10], },
    { number: 3, totalVoters: 240, school: schools[10], },
    { number: 4, totalVoters: 240, school: schools[10], },
    { number: 5, totalVoters: 240, school: schools[10], },
    { number: 6, totalVoters: 170, school: schools[10], },
    { number: 1, totalVoters: 240, school: schools[11], },
    { number: 2, totalVoters: 123, school: schools[11], },
    { number: 1, totalVoters: 224, school: schools[12], },
    { number: 1, totalVoters: 240, school: schools[13], },
    { number: 2, totalVoters: 23, school: schools[13], },
    { number: 1, totalVoters: 240, school: schools[14], },
    { number: 2, totalVoters: 163, school: schools[14], },
    { number: 1, totalVoters: 240, school: schools[15], },
    { number: 2, totalVoters: 240, school: schools[15], },
    { number: 3, totalVoters: 240, school: schools[15], },
    { number: 4, totalVoters: 24, school: schools[15], },
    { number: 1, totalVoters: 177, school: schools[16], },
    { number: 1, totalVoters: 240, school: schools[17], },
    { number: 2, totalVoters: 235, school: schools[17], },
  ]);
  console.log("✅ Mesas electorales creadas");

  const tableCountBySchoolId = new Map<string, number>();
  for (const table of tables) {
    const schoolId = table.school?.id;
    if (!schoolId) continue;
    tableCountBySchoolId.set(
      schoolId,
      (tableCountBySchoolId.get(schoolId) ?? 0) + 1,
    );
  }

  // --- Admin ---
  await userRepo.save(
    userRepo.create({
      username: "admin",
      phone: "72900865",
      password: generateInitialPassword({ role: Role.ADMIN, username: "admin" }),
      fullName: "Administrador del Sistema",
      role: Role.ADMIN,
      mustChangePassword: true,
    }),
  );
  logger.info("✅ Admin creado");

  // --- Jefes de campaña ---
  for (const p of parties) {
    await userRepo.save(
      userRepo.create({
        username: `jc_${p.acronym.toLowerCase()}`,
        password: generateInitialPassword({
          role: Role.JEFE_CAMPANA,
          username: `jc_${p.acronym.toLowerCase()}`,
          party: p,
        }),
        phone: `600000${p.ballotOrder}`,
        fullName: `Jefe de Campaña - ${p.acronym}`,
        role: Role.JEFE_CAMPANA,
        party: p,
        mustChangePassword: true,
      }),
    );
  }
  logger.info("✅ Jefes de campaña creados");

  // --- Jefes de recinto (CDC y ISA, uno por recinto) ---
  for (const s of schools) {
    for (const p of parties) {
      if ([3, 4, 5, 7].includes(p.ballotOrder)) {
        await userRepo.save(
          userRepo.create({
            username: `jr_${p.acronym.toLowerCase()}_${s.shortName.toLowerCase()}`,
            password: generateInitialPassword({
              role: Role.JEFE_RECINTO,
              username: `jr_${p.acronym.toLowerCase()}_${s.shortName.toLowerCase()}`,
              school: s,
            }),
            phone: `601010${s.code}`,
            fullName: `Jefe de Recinto - ${s.shortName} - ${p.acronym}`,
            role: Role.JEFE_RECINTO,
            party: p,
            school: s,
            mustChangePassword: true,
          }),
        );
      }
    }
  }
  logger.info("✅ Jefes de recinto creados");

  // --- Delegados (CDC y ISA, uno por mesa) ---
  for (const t of tables) {
    for (const p of parties) {
      if ([3, 4, 5, 7].includes(p.ballotOrder)) {
        await userRepo.save(
          userRepo.create({
            username: `del_${p.acronym.toLowerCase()}_${t.school.shortName.toLowerCase()}_${t.number}`,
            password: generateInitialPassword({
              role: Role.DELEGADO,
              username: `del_${p.acronym.toLowerCase()}_${t.school.shortName.toLowerCase()}_${t.number}`,
              table: t,
            }),
            phone: `602020${t.number}`,
            fullName: `Delegado - ${t.school.shortName} - Mesa ${t.number}`,
            role: Role.DELEGADO,
            party: p,
            table: t,
            mustChangePassword: true,
          }),
        );
      }
    }
  }
  logger.info("✅ Delegados creados");
  console.log("\n🎉 Seed completado!\n");
  await AppDataSource.destroy();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
