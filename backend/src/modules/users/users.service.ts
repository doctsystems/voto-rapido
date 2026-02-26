import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "./user.entity";
import { Party } from "../parties/party.entity";
import { VotingTable } from "../tables/voting-table.entity";
import { Role } from "../../common/enums/role.enum";
import { CreateUserDto, UpdateUserDto } from "./dto/create-user.dto";

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Party) private readonly partyRepo: Repository<Party>,
    @InjectRepository(VotingTable)
    private readonly tableRepo: Repository<VotingTable>,
  ) {}

  async findAll(currentUser: any) {
    const query = this.userRepo
      .createQueryBuilder("user")
      .leftJoinAndSelect("user.party", "party")
      .leftJoinAndSelect("user.table", "table")
      .where("user.deleted_at IS NULL");

    // Jefe de campaña solo ve sus delegados
    if (currentUser.role === Role.JEFE_CAMPANA) {
      query.andWhere("user.party_id = :partyId AND user.role = :role", {
        partyId: currentUser.partyId,
        role: Role.DELEGADO,
      });
    }

    return query.getMany();
  }

  async findOne(id: string) {
    const user = await this.userRepo.findOne({
      where: { id },
      relations: ["party", "table"],
    });
    if (!user) throw new NotFoundException(`Usuario ${id} no encontrado`);
    return user;
  }

  async create(dto: CreateUserDto, currentUser: any) {
    // Jefe de campaña solo puede crear delegados de su partido
    if (currentUser.role === Role.JEFE_CAMPANA) {
      if (dto.role && dto.role !== Role.DELEGADO) {
        throw new ForbiddenException("Solo puede crear delegados");
      }
      dto.role = Role.DELEGADO;
      dto.partyId = currentUser.partyId;
    }

    const existing = await this.userRepo.findOne({
      where: [{ username: dto.username }, { email: dto.email }],
    });
    if (existing) throw new ConflictException("Usuario o email ya existe");

    const user = this.userRepo.create(dto);

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
      if (user.party?.id !== currentUser.partyId) {
        throw new ForbiddenException(
          "No puede editar usuarios de otro partido",
        );
      }
    }

    if (dto.partyId) {
      user.party = await this.partyRepo.findOne({ where: { id: dto.partyId } });
    }
    if (dto.tableId !== undefined) {
      user.table = dto.tableId
        ? await this.tableRepo.findOne({ where: { id: dto.tableId } })
        : null;
    }

    Object.assign(user, dto);
    await this.userRepo.save(user);
    this.logger.log(`Usuario actualizado: ${user.username}`);
    return this.findOne(id);
  }

  async remove(id: string) {
    const user = await this.findOne(id);
    await this.userRepo.softDelete(id);
    this.logger.log(`Usuario eliminado: ${user.username}`);
    return { message: `Usuario ${user.username} eliminado` };
  }
}
