import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Not } from "typeorm";
import { User } from "./user.entity";
import { Party } from "../parties/party.entity";
import { VotingTable } from "../tables/voting-table.entity";
import { School } from "../schools/school.entity";
import { Role } from "../../common/enums/role.enum";
import { CreateUserDto, UpdateUserDto } from "./dto/create-user.dto";

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Party) private partyRepo: Repository<Party>,
    @InjectRepository(VotingTable) private tableRepo: Repository<VotingTable>,
    @InjectRepository(School) private schoolRepo: Repository<School>,
  ) {}

  async findAll(currentUser: any) {
    const query = this.userRepo
      .createQueryBuilder("user")
      .leftJoinAndSelect("user.party", "party")
      .leftJoinAndSelect("user.table", "table")
      .leftJoinAndSelect("user.school", "school")
      .leftJoinAndSelect("table.school", "tableSchool")
      .where("user.deleted_at IS NULL");

    if (currentUser.role === Role.JEFE_CAMPANA) {
      // Jefe de campaña ve usuarios de su partido
      query.andWhere("user.party_id = :partyId AND user.role IN (:...roles)", {
        partyId: currentUser.partyId,
        roles: [Role.DELEGADO, Role.JEFE_RECINTO],
      });
    } else if (currentUser.role === Role.JEFE_RECINTO) {
      // Jefe de recinto ve delegados de su recinto y su mismo partido
      query.andWhere(
        "user.role = :roleDelegate AND user.party_id = :partyId AND (school.id = :schoolId OR tableSchool.id = :schoolId)",
        {
          roleDelegate: Role.DELEGADO,
          partyId: currentUser.partyId,
          schoolId: currentUser.schoolId,
        },
      );
    }

    return query.getMany();
  }

  async findOne(id: string) {
    const user = await this.userRepo.findOne({
      where: { id },
      relations: ["party", "table", "table.school", "school"],
    });
    if (!user) throw new NotFoundException(`Usuario ${id} no encontrado`);
    return user;
  }

  async create(dto: CreateUserDto, currentUser: any) {
    if (currentUser.role === Role.JEFE_CAMPANA) {
      if (dto.role && ![Role.DELEGADO, Role.JEFE_RECINTO].includes(dto.role)) {
        throw new ForbiddenException(
          "Solo puede crear delegados o jefes de recinto",
        );
      }
      // JEFE_CAMPANA siempre crea usuarios de su partido
      dto.partyId = currentUser.partyId;
    }
    if (currentUser.role === Role.JEFE_RECINTO) {
      // JEFE_RECINTO solo crea delegados de su partido y recinto
      dto.role = Role.DELEGADO;
      dto.partyId = currentUser.partyId;
      if (!dto.schoolId && !dto.tableId) {
        throw new ForbiddenException(
          "Debe especificar la mesa (tableId) o recinto (schoolId) del delegado",
        );
      }
    }

    const conditions: any[] = [{ username: dto.username }];
    if (dto.email) conditions.push({ email: dto.email });
    const existing = await this.userRepo.findOne({ where: conditions });
    if (existing) throw new ConflictException("Usuario o email ya existe");

    const user = this.userRepo.create({
      ...dto,
      createdBy: currentUser.sub,
      updatedBy: currentUser.sub,
    });

    if (dto.partyId) {
      const party = await this.partyRepo.findOne({
        where: { id: dto.partyId },
      });
      if (!party) throw new NotFoundException("Partido no encontrado");
      user.party = party;
    }
    if (dto.tableId) {
      const table = await this.tableRepo.findOne({
        where: { id: dto.tableId },
      });
      if (!table) throw new NotFoundException("Mesa no encontrada");
      user.table = table;

      // Un solo delegado por partido en la misma mesa
      if (dto.role === Role.DELEGADO && dto.partyId) {
        const existingDelegate = await this.userRepo.findOne({
          where: {
            role: Role.DELEGADO,
            table: { id: dto.tableId },
            party: { id: dto.partyId },
            isActive: true,
          },
        });
        if (existingDelegate) {
          throw new ConflictException(
            "Ya existe un delegado activo para este partido en esta mesa",
          );
        }
      }
    }
    if (dto.schoolId) {
      const school = await this.schoolRepo.findOne({
        where: { id: dto.schoolId },
      });
      if (!school) throw new NotFoundException("Recinto no encontrado");
      user.school = school;
    }

    await this.userRepo.save(user);
    this.logger.log(
      `Usuario creado: ${user.username} por ${currentUser.username}`,
    );
    return this.findOne(user.id);
  }

  async update(id: string, dto: UpdateUserDto, currentUser: any) {
    const user = await this.findOne(id);

    if (currentUser.role === Role.JEFE_CAMPANA) {
      // JEFE_CAMPAÑA solo puede editar usuarios de su partido
      if (user.party?.id !== currentUser.partyId) {
        throw new ForbiddenException(
          "No puede editar usuarios de otro partido",
        );
      }
      // JEFE_CAMPAÑA solo puede editar DELEGADO y JEFE_RECINTO
      if (![Role.DELEGADO, Role.JEFE_RECINTO].includes(user.role)) {
        throw new ForbiddenException(
          "Solo puede editar delegados o jefes de recinto",
        );
      }
      // No puede cambiar el partido
      if (dto.partyId && dto.partyId !== currentUser.partyId) {
        throw new ForbiddenException("No puede cambiar el partido del usuario");
      }
    }

    if (currentUser.role === Role.JEFE_RECINTO) {
      // JEFE_RECINTO solo puede editar DELEGADOS de su partido
      if (user.role !== Role.DELEGADO) {
        throw new ForbiddenException("Solo puede editar delegados");
      }
      if (user.party?.id !== currentUser.partyId) {
        throw new ForbiddenException(
          "Solo puede editar delegados de su partido",
        );
      }
      // JEFE_RECINTO solo puede editar delegados de su recinto
      if (
        user.table?.school?.id !== currentUser.schoolId &&
        user.school?.id !== currentUser.schoolId
      ) {
        throw new ForbiddenException(
          "Solo puede editar delegados de su recinto",
        );
      }
      // No puede cambiar partido del delegado
      if (dto.partyId) {
        throw new ForbiddenException(
          "No puede cambiar el partido del delegado",
        );
      }
    }

    if (dto.partyId)
      user.party = await this.partyRepo.findOne({ where: { id: dto.partyId } });
    if (dto.tableId !== undefined) {
      const newTable = dto.tableId
        ? await this.tableRepo.findOne({ where: { id: dto.tableId } })
        : null;

      // Validar que no exista otro delegado del mismo partido en esa mesa
      if (newTable && user.role === Role.DELEGADO && user.party) {
        const existingDelegate = await this.userRepo.findOne({
          where: {
            id: Not(user.id), // Excluir el usuario actual
            role: Role.DELEGADO,
            table: { id: newTable.id },
            party: { id: user.party.id },
            isActive: true,
          },
        });
        if (existingDelegate) {
          throw new ConflictException(
            "Ya existe un delegado activo para este partido en la mesa especificada",
          );
        }
      }
      user.table = newTable;
    }
    if (dto.schoolId !== undefined) {
      user.school = dto.schoolId
        ? await this.schoolRepo.findOne({ where: { id: dto.schoolId } })
        : null;
    }

    Object.assign(user, { ...dto, updatedBy: currentUser.sub });
    await this.userRepo.save(user);
    this.logger.log(`Usuario actualizado: ${user.username}`);
    return this.findOne(id);
  }

  async remove(id: string, currentUser: any) {
    const user = await this.findOne(id);

    if (currentUser.role === Role.JEFE_CAMPANA) {
      if (user.party?.id !== currentUser.partyId) {
        throw new ForbiddenException(
          "No puede eliminar usuarios de otro partido",
        );
      }
      if (user.role !== Role.JEFE_RECINTO) {
        throw new ForbiddenException(
          "Solo puede eliminar jefes de recinto",
        );
      }
    }

    if (currentUser.role === Role.JEFE_RECINTO) {
      if (user.role !== Role.DELEGADO) {
        throw new ForbiddenException("Solo puede eliminar delegados");
      }
      if (user.party?.id !== currentUser.partyId) {
        throw new ForbiddenException(
          "Solo puede eliminar delegados de su partido",
        );
      }
      if (
        user.table?.school?.id !== currentUser.schoolId &&
        user.school?.id !== currentUser.schoolId
      ) {
        throw new ForbiddenException(
          "Solo puede eliminar delegados de su recinto",
        );
      }
    }

    await this.userRepo.update(id, { deletedBy: currentUser.sub });
    await this.userRepo.softDelete(id);
    this.logger.log(`Usuario eliminado: ${user.username}`);
    return { message: `Usuario ${user.username} eliminado` };
  }
}
