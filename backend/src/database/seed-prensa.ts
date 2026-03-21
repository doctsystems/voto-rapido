import "reflect-metadata";
import { DataSource } from "typeorm";
import * as dotenv from "dotenv";
import { join } from "node:path";
import { Party } from "../modules/parties/party.entity";
import { PartyElectionType } from "../modules/parties/party-election-type.entity";
import { School } from "../modules/schools/school.entity";
import { User } from "../modules/users/user.entity";
import { VotingTable } from "../modules/tables/voting-table.entity";
import { ElectionType } from "../modules/election-types/election-type.entity";
import { VoteReport } from "../modules/votes/vote-report.entity";
import { VoteEntry } from "../modules/votes/vote-entry.entity";
import { AuditLog } from "../modules/audit/audit-log.entity";
import { Role } from "../common/enums/role.enum";
import { generateInitialPassword } from "../common/utils/pass.generator";

dotenv.config({ path: join(__dirname, "../../.env") });

const PRESS_PARTY = {
  ballotOrder: 99,
  name: "Prensa",
  acronym: "PRENSA",
  color: "#596474",
};

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

async function seedPrensa() {
  await AppDataSource.initialize();
  console.log("📰 Iniciando seed de prensa...");

  const partyRepo = AppDataSource.getRepository(Party);
  const petRepo = AppDataSource.getRepository(PartyElectionType);
  const schoolRepo = AppDataSource.getRepository(School);
  const userRepo = AppDataSource.getRepository(User);

  const conflictingParty = await partyRepo.findOne({
    where: { ballotOrder: PRESS_PARTY.ballotOrder },
  });

  if (conflictingParty && conflictingParty.acronym !== PRESS_PARTY.acronym) {
    throw new Error(
      `El ballotOrder ${PRESS_PARTY.ballotOrder} ya está usado por ${conflictingParty.acronym}.`,
    );
  }

  let pressParty =
    (await partyRepo.findOne({
      where: [{ acronym: PRESS_PARTY.acronym }, { name: PRESS_PARTY.name }],
    })) ?? null;

  if (!pressParty) {
    pressParty = partyRepo.create({
      ...PRESS_PARTY,
      isActive: true,
    });
    await partyRepo.save(pressParty);
    console.log(`✓ Partido creado: ${PRESS_PARTY.acronym}`);
  } else {
    pressParty.ballotOrder = PRESS_PARTY.ballotOrder;
    pressParty.name = PRESS_PARTY.name;
    pressParty.acronym = PRESS_PARTY.acronym;
    pressParty.color = PRESS_PARTY.color;
    pressParty.isActive = true;
    await partyRepo.save(pressParty);
    console.log(`✓ Partido actualizado: ${PRESS_PARTY.acronym}`);
  }

  await petRepo
    .createQueryBuilder()
    .delete()
    .from(PartyElectionType)
    .where("party_id = :partyId", { partyId: pressParty.id })
    .execute();
  console.log("✓ Tipos de elección removidos para PRENSA");

  const jcUsername = "jc_prensa";
  const jcPassword = generateInitialPassword({
    role: Role.JEFE_CAMPANA,
    username: jcUsername,
    party: pressParty,
  });

  let jefeCampana = await userRepo.findOne({
    where: { username: jcUsername },
    relations: ["party"],
  });

  if (!jefeCampana) {
    jefeCampana = userRepo.create({
      username: jcUsername,
      fullName: "JC - PRENSA",
      phone: "69999999",
      role: Role.JEFE_CAMPANA,
      party: pressParty,
      password: jcPassword,
      mustChangePassword: false,
      isActive: true,
    });
  } else {
    jefeCampana.fullName = "JC - PRENSA";
    jefeCampana.phone = "69999999";
    jefeCampana.role = Role.JEFE_CAMPANA;
    jefeCampana.party = pressParty;
    jefeCampana.mustChangePassword = false;
    jefeCampana.isActive = true;
    jefeCampana.school = null;
    jefeCampana.table = null;
    jefeCampana.password = jcPassword;
  }
  await userRepo.save(jefeCampana);
  console.log(`✓ Usuario listo: ${jcUsername} / ${jcPassword}`);

  const schools = await schoolRepo.find({
    where: { isActive: true },
    order: { code: "ASC" },
  });

  let createdOrUpdated = 0;
  for (const school of schools) {
    const username = `jr_prensa_${school.shortName.toLowerCase()}`;
    const password = generateInitialPassword({
      role: Role.JEFE_RECINTO,
      username,
      school,
    });

    let jefeRecinto = await userRepo.findOne({
      where: { username },
      relations: ["party", "school"],
    });

    if (!jefeRecinto) {
      jefeRecinto = userRepo.create({
        username,
        fullName: `JR - ${school.shortName} - PRENSA`,
        phone: `60399${school.code}`,
        role: Role.JEFE_RECINTO,
        party: pressParty,
        school,
        password,
        mustChangePassword: false,
        isActive: true,
      });
    } else {
      jefeRecinto.fullName = `JR - ${school.shortName} - PRENSA`;
      jefeRecinto.phone = `60399${school.code}`;
      jefeRecinto.role = Role.JEFE_RECINTO;
      jefeRecinto.party = pressParty;
      jefeRecinto.school = school;
      jefeRecinto.table = null;
      jefeRecinto.password = password;
      jefeRecinto.mustChangePassword = false;
      jefeRecinto.isActive = true;
    }

    await userRepo.save(jefeRecinto);
    createdOrUpdated++;
  }

  console.log(`✓ Jefes de recinto PRENSA listos: ${createdOrUpdated}`);
  console.log("ℹ️  No se crean delegados de PRENSA en este seed.");
  console.log("✅ Seed de prensa completado");

  await AppDataSource.destroy();
}

seedPrensa().catch((err) => {
  console.error(err);
  process.exit(1);
});
