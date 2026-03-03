import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { Party } from '../parties/party.entity';
import { VotingTable } from '../tables/voting-table.entity';
import { School } from '../schools/school.entity';
import { Role } from '../../common/enums/role.enum';
import { CreateUserDto, UpdateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Party) private partyRepo: Repository<Party>,
    @InjectRepository(VotingTable) private tableRepo: Repository<VotingTable>,
    @InjectRepository(School) private schoolRepo: Repository<School>,
  ) { }

  async findAll(currentUser: any) {
    const query = this.userRepo.createQueryBuilder('user')
      .leftJoinAndSelect('user.party', 'party')
      .leftJoinAndSelect('user.table', 'table')
      .leftJoinAndSelect('user.school', 'school')
      .leftJoinAndSelect('table.school', 'tableSchool')
      .where('user.deleted_at IS NULL');

    if (currentUser.role === Role.JEFE_CAMPANA) {
      // Jefe de campaña ve todos los usuarios de su mismo partido
      query.andWhere('user.party_id = :partyId AND user.role IN (:...roles)', {
        partyId: currentUser.partyId,
        roles: [Role.DELEGADO, Role.JEFE_RECINTO],
      });
    } else if (currentUser.role === Role.JEFE_RECINTO) {
      // Jefe de recinto ve los usuarios de su mismo partido y recinto
      // (recinto puede estar en user.school o en la mesa del usuario)
      query.andWhere('user.party_id = :partyId AND (school.id = :schoolId OR tableSchool.id = :schoolId)', {
        partyId: currentUser.partyId,
        schoolId: currentUser.schoolId,
      });
    }

    return query.getMany();
  }

  async findOne(id: string) {
    const user = await this.userRepo.findOne({
      where: { id },
      relations: ['party', 'table', 'table.school', 'school'],
    });
    if (!user) throw new NotFoundException(`Usuario ${id} no encontrado`);
    return user;
  }

  async create(dto: CreateUserDto, currentUser: any) {
    if (currentUser.role === Role.JEFE_CAMPANA) {
      if (dto.role && ![Role.DELEGADO, Role.JEFE_RECINTO].includes(dto.role)) {
        throw new ForbiddenException('Solo puede crear delegados o jefes de recinto');
      }
      dto.partyId = currentUser.partyId;
    }
    if (currentUser.role === Role.JEFE_RECINTO) {
      dto.role = Role.DELEGADO;
      dto.partyId = currentUser.partyId;
    }

    const conditions: any[] = [{ username: dto.username }];
    if (dto.email) conditions.push({ email: dto.email });
    const existing = await this.userRepo.findOne({ where: conditions });
    if (existing) throw new ConflictException('Usuario o email ya existe');

    const user = this.userRepo.create({ ...dto, createdBy: currentUser.sub, updatedBy: currentUser.sub });

    if (dto.partyId) {
      const party = await this.partyRepo.findOne({ where: { id: dto.partyId } });
      if (!party) throw new NotFoundException('Partido no encontrado');
      user.party = party;
    }
    if (dto.tableId) {
      const table = await this.tableRepo.findOne({ where: { id: dto.tableId } });
      if (!table) throw new NotFoundException('Mesa no encontrada');
      user.table = table;
    }
    if (dto.schoolId) {
      const school = await this.schoolRepo.findOne({ where: { id: dto.schoolId } });
      if (!school) throw new NotFoundException('Recinto no encontrado');
      user.school = school;
    }

    await this.userRepo.save(user);
    this.logger.log(`Usuario creado: ${user.username} por ${currentUser.username}`);
    return this.findOne(user.id);
  }

  async update(id: string, dto: UpdateUserDto, currentUser: any) {
    const user = await this.findOne(id);

    if (currentUser.role === Role.JEFE_CAMPANA) {
      if (user.party?.id !== currentUser.partyId) throw new ForbiddenException('No puede editar usuarios de otro partido');
    }

    if (dto.partyId) user.party = await this.partyRepo.findOne({ where: { id: dto.partyId } });
    if (dto.tableId !== undefined) {
      user.table = dto.tableId ? await this.tableRepo.findOne({ where: { id: dto.tableId } }) : null;
    }
    if (dto.schoolId !== undefined) {
      user.school = dto.schoolId ? await this.schoolRepo.findOne({ where: { id: dto.schoolId } }) : null;
    }

    Object.assign(user, { ...dto, updatedBy: currentUser.sub });
    await this.userRepo.save(user);
    this.logger.log(`Usuario actualizado: ${user.username}`);
    return this.findOne(id);
  }

  async remove(id: string, currentUser: any) {
    const user = await this.findOne(id);
    await this.userRepo.update(id, { deletedBy: currentUser.sub });
    await this.userRepo.softDelete(id);
    this.logger.log(`Usuario eliminado: ${user.username}`);
    return { message: `Usuario ${user.username} eliminado` };
  }
}
