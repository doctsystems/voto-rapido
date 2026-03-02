import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../modules/users/user.entity';
import { Party } from '../modules/parties/party.entity';
import { PartyElectionType } from '../modules/parties/party-election-type.entity';
import { School } from '../modules/schools/school.entity';
import { VotingTable } from '../modules/tables/voting-table.entity';
import { ElectionType } from '../modules/election-types/election-type.entity';
import { VoteReport } from '../modules/votes/vote-report.entity';
import { VoteEntry } from '../modules/votes/vote-entry.entity';
import { AuditLog } from '../modules/audit/audit-log.entity';
import { Role } from '../common/enums/role.enum';

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'voto_rapido',
  entities: [User, Party, PartyElectionType, School, VotingTable, ElectionType, VoteReport, VoteEntry, AuditLog],
  synchronize: true,
});

// Shared location data for all recintos (same for these elections)
const LOCATION = {
  departamento: 'Tarija',
  provincia: 'Arce',
  municipio: 'Bermejo',
  asientoElectoral: 'Bermejo',
  localidad: 'Bermejo',
  circunscripcion: 42,
};

async function seed() {
  await AppDataSource.initialize();
  console.log('🌱 Iniciando seed...');

  const partyRepo  = AppDataSource.getRepository(Party);
  const petRepo    = AppDataSource.getRepository(PartyElectionType);
  const schoolRepo = AppDataSource.getRepository(School);
  const tableRepo  = AppDataSource.getRepository(VotingTable);
  const userRepo   = AppDataSource.getRepository(User);
  const etRepo     = AppDataSource.getRepository(ElectionType);

  // --- Partidos ---
  const parties = await partyRepo.save([
    { name: 'Movimiento Popular Unido',     acronym: 'MPU', color: '#E74C3C' },
    { name: 'Alianza Democrática Nacional', acronym: 'ADN', color: '#3498DB' },
    { name: 'Frente Progresista',           acronym: 'FP',  color: '#2ECC71' },
    { name: 'Unidad Ciudadana',             acronym: 'UC',  color: '#F39C12' },
  ]);
  console.log('✅ Partidos creados');

  // --- Tipos de elección ---
  const electionTypes = await etRepo.save([
    { name: 'Gobernador',   order: 1 },
    { name: 'Alcalde',      order: 2 },
    { name: 'Concejal',     order: 3 },
    { name: 'Asambleísta',  order: 4 },
  ]);
  console.log('✅ Tipos de elección creados');

  // --- Asignaciones partido-tipo de elección ---
  const assignments = [
    { party: parties[0], et: electionTypes[0], candidate: 'Juan Pérez (MPU)' },
    { party: parties[0], et: electionTypes[1], candidate: 'María López (MPU)' },
    { party: parties[0], et: electionTypes[2], candidate: 'Carlos Ruiz (MPU)' },
    { party: parties[0], et: electionTypes[3], candidate: 'Ana Torres (MPU)' },
    { party: parties[1], et: electionTypes[1], candidate: 'Pedro Gómez (ADN)' },
    { party: parties[1], et: electionTypes[2], candidate: 'Laura Vega (ADN)' },
    { party: parties[2], et: electionTypes[0], candidate: 'Sergio Ríos (FP)' },
    { party: parties[2], et: electionTypes[3], candidate: 'Elena Cruz (FP)' },
    { party: parties[3], et: electionTypes[0], candidate: 'Roberto Díaz (UC)' },
    { party: parties[3], et: electionTypes[1], candidate: 'Claudia Soto (UC)' },
    { party: parties[3], et: electionTypes[2], candidate: 'Fernando Mora (UC)' },
    { party: parties[3], et: electionTypes[3], candidate: 'Patricia León (UC)' },
  ];
  for (const a of assignments) {
    await petRepo.save(petRepo.create({ party: a.party, electionType: a.et, candidateName: a.candidate }));
  }
  console.log('✅ Tipos de elección asignados por partido');

  // --- Recintos Electorales ---
  const schools = await schoolRepo.save([
    { ...LOCATION, codigoRecinto: '17', recintoElectoral: '(Cárcel) Carceleta Bermejo' },
    { ...LOCATION, codigoRecinto: '18', recintoElectoral: 'Unidad Educativa Central Bermejo' },
    { ...LOCATION, codigoRecinto: '19', recintoElectoral: 'Colegio San José' },
  ]);
  console.log('✅ Recintos electorales creados');

  // --- Mesas (2 por recinto) ---
  const tables = await tableRepo.save([
    { tableNumber: 'M001', totalVoters: 300, school: schools[0] },
    { tableNumber: 'M002', totalVoters: 280, school: schools[0] },
    { tableNumber: 'M003', totalVoters: 250, school: schools[1] },
    { tableNumber: 'M004', totalVoters: 260, school: schools[1] },
    { tableNumber: 'M005', totalVoters: 230, school: schools[2] },
    { tableNumber: 'M006', totalVoters: 240, school: schools[2] },
  ]);
  console.log('✅ Mesas creadas');

  // --- Admin ---
  await userRepo.save(userRepo.create({
    username: 'admin', email: 'admin@votorapido.bo', phone: '60000000',
    password: await bcrypt.hash('admin123', 10),
    fullName: 'Administrador del Sistema', role: Role.ADMIN,
  }));

  // --- Jefes de campaña ---
  for (let i = 0; i < 2; i++) {
    await userRepo.save(userRepo.create({
      username: `jefe_${parties[i].acronym.toLowerCase()}`,
      email: `jefe@${parties[i].acronym.toLowerCase()}.bo`,
      password: await bcrypt.hash('jefe123', 10),
      phone: `600000${10 + i}`,
      fullName: `Jefe de Campaña ${parties[i].name}`,
      role: Role.JEFE_CAMPANA, party: parties[i],
    }));
  }

  // --- Jefes de recinto (MPU, uno por recinto) ---
  for (let s = 0; s < schools.length; s++) {
    await userRepo.save(userRepo.create({
      username: `jrecinto_mpu_${s + 1}`,
      email: `jrecinto.mpu.${s + 1}@votorapido.bo`,
      password: await bcrypt.hash('jrecinto123', 10),
      phone: `601000${s + 1}`,
      fullName: `Jefe Recinto MPU — ${schools[s].recintoElectoral}`,
      role: Role.JEFE_RECINTO, party: parties[0], school: schools[s],
    }));
  }

  // --- Delegados (MPU y ADN, uno por mesa) ---
  const delegadoPwd = await bcrypt.hash('delegado123', 10);
  for (const table of tables) {
    for (let p = 0; p < 2; p++) {
      await userRepo.save(userRepo.create({
        username: `delegado_${parties[p].acronym.toLowerCase()}_${table.tableNumber}`,
        email: `del.${parties[p].acronym.toLowerCase()}.${table.tableNumber}@votorapido.bo`,
        password: delegadoPwd,
        phone: '60000000',
        fullName: `Delegado ${parties[p].acronym} Mesa ${table.tableNumber}`,
        role: Role.DELEGADO, party: parties[p], table,
      }));
    }
  }

  console.log('✅ Usuarios creados');
  console.log('\n🎉 Seed completado!\n');
  console.log('Credenciales:');
  console.log('  admin              / admin123');
  console.log('  jefe_mpu           / jefe123');
  console.log('  jefe_adn           / jefe123');
  console.log('  jrecinto_mpu_1     / jrecinto123');
  console.log('  delegado_mpu_M001  / delegado123');

  await AppDataSource.destroy();
}

seed().catch(err => { console.error(err); process.exit(1); });
