import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../modules/users/user.entity';
import { Party } from '../modules/parties/party.entity';
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
  entities: [User, Party, School, VotingTable, ElectionType, VoteReport, VoteEntry, AuditLog],
  synchronize: true,
});

async function seed() {
  await AppDataSource.initialize();
  console.log('🌱 Iniciando seed...');

  const partyRepo   = AppDataSource.getRepository(Party);
  const schoolRepo  = AppDataSource.getRepository(School);
  const tableRepo   = AppDataSource.getRepository(VotingTable);
  const userRepo    = AppDataSource.getRepository(User);
  const etRepo      = AppDataSource.getRepository(ElectionType);

  // --- Partidos ---
  const parties = await partyRepo.save([
    { name: 'Movimiento Popular Unido',    acronym: 'MPU', color: '#E74C3C' },
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

  // --- Unidades educativas ---
  const schools = await schoolRepo.save([
    {
      name: 'Unidad Educativa Escuela Central',
      code: 'UE-001',
      address: 'Av. Principal 123',
      parish: 'Matriz',
      municipality: 'Bermejo',
      province: 'Tarija',
      principalName: 'Prof. Ana Gutiérrez',
    },
    {
      name: 'Colegio San José',
      code: 'UE-002',
      address: 'Calle Sucre 456',
      parish: 'Matriz',
      municipality: 'Bermejo',
      province: 'Tarija',
      principalName: 'Prof. Carlos Méndez',
    },
    {
      name: 'Unidad Educativa Norte',
      code: 'UE-003',
      address: 'Barrio Norte s/n',
      parish: 'Norte',
      municipality: 'Bermejo',
      province: 'Tarija',
      principalName: 'Prof. Rosa Flores',
    },
  ]);
  console.log('✅ Unidades educativas creadas');

  // --- Mesas (asociadas a escuelas) ---
  const tables = await tableRepo.save([
    { tableNumber: 'M001', totalVoters: 300, school: schools[0] },
    { tableNumber: 'M002', totalVoters: 280, school: schools[0] },
    { tableNumber: 'M003', totalVoters: 250, school: schools[1] },
    { tableNumber: 'M004', totalVoters: 260, school: schools[1] },
    { tableNumber: 'M005', totalVoters: 230, school: schools[2] },
  ]);
  console.log('✅ Mesas creadas y asociadas a unidades educativas');

  // --- Admin ---
  await userRepo.save(userRepo.create({
    username: 'admin',
    email: 'admin@votorapido.bo',
    password: await bcrypt.hash('admin123', 10),
    fullName: 'Administrador del Sistema',
    role: Role.ADMIN,
  }));

  // --- Jefes de campaña (primeros 2 partidos) ---
  for (let i = 0; i < 2; i++) {
    await userRepo.save(userRepo.create({
      username: `jefe_${parties[i].acronym.toLowerCase()}`,
      email: `jefe@${parties[i].acronym.toLowerCase()}.bo`,
      password: await bcrypt.hash('jefe123', 10),
      fullName: `Jefe de Campaña ${parties[i].name}`,
      role: Role.JEFE_CAMPANA,
      party: parties[i],
    }));
  }

  // --- Delegados (primeros 2 partidos × todas las mesas) ---
  const delegadoPwd = await bcrypt.hash('delegado123', 10);
  for (const table of tables) {
    for (let p = 0; p < 2; p++) {
      await userRepo.save(userRepo.create({
        username: `delegado_${parties[p].acronym.toLowerCase()}_${table.tableNumber}`,
        email: `delegado.${parties[p].acronym.toLowerCase()}.${table.tableNumber}@votorapido.bo`,
        password: delegadoPwd,
        fullName: `Delegado ${parties[p].acronym} Mesa ${table.tableNumber}`,
        role: Role.DELEGADO,
        party: parties[p],
        table,
      }));
    }
  }

  console.log('✅ Usuarios creados');
  console.log('\n🎉 Seed completado!');
  console.log('\nCredenciales de acceso:');
  console.log('  Admin:           admin             / admin123');
  console.log('  Jefe MPU:        jefe_mpu          / jefe123');
  console.log('  Jefe ADN:        jefe_adn          / jefe123');
  console.log('  Delegado ejemplo: delegado_mpu_M001 / delegado123');

  await AppDataSource.destroy();
}

seed().catch(err => { console.error(err); process.exit(1); });
