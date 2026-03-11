import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { VotingTable } from "./voting-table.entity";
import { School } from "../schools/school.entity";
import { IsString, IsOptional, IsNumber, IsUUID } from "class-validator";

export class CreateTableDto {
  @IsString() tableNumber: string;
  @IsOptional() @IsNumber() totalVoters?: number;
  @IsUUID() @IsOptional() schoolId?: string;
}

@Injectable()
export class TablesService {
  constructor(
    @InjectRepository(VotingTable)
    private readonly repo: Repository<VotingTable>,
    @InjectRepository(School) private readonly schoolRepo: Repository<School>,
  ) {}

  async findAll() {
    const tables = await this.repo.find({
      relations: ["school", "delegates"],
    });
    
    return tables.sort((a, b) => {
      const schoolA = a.school_id || "";
      const schoolB = b.school_id || "";
      if (schoolA !== schoolB) return schoolA.localeCompare(schoolB);
      
      return a.tableNumber.localeCompare(b.tableNumber, undefined, {
        numeric: true,
        sensitivity: "base",
      });
    });
  }

  async findOne(id: string) {
    const table = await this.repo.findOne({
      where: { id },
      relations: ["school", "delegates"],
    });
    if (!table) throw new NotFoundException("Mesa no encontrada");
    return table;
  }

  private async resolveSchool(schoolId: string | undefined) {
    if (!schoolId) return undefined;
    const school = await this.schoolRepo.findOne({ where: { id: schoolId } });
    if (!school) throw new NotFoundException("Recinto electoral no encontrado");
    return school;
  }

  async create(dto: CreateTableDto, actorId?: string) {
    // Pre-validate composite uniqueness with a clear error
    const school = await this.resolveSchool(dto.schoolId);

    const existing = await this.repo.findOne({
      where: {
        tableNumber: dto.tableNumber,
        ...(school ? { school: { id: school.id } } : {}),
      },
    });
    if (existing) {
      throw new ConflictException(
        `Ya existe la mesa "${dto.tableNumber}" en el recinto "${school?.nombreRecinto ?? "(sin recinto)"}"`,
      );
    }

    const table = this.repo.create({
      tableNumber: dto.tableNumber,
      totalVoters: dto.totalVoters,
      createdBy: actorId,
      updatedBy: actorId,
    });
    if (school) table.school = school;

    return this.repo.save(table);
  }

  async update(id: string, dto: Partial<CreateTableDto>, actorId?: string) {
    const table = await this.findOne(id);

    if (dto.tableNumber !== undefined) table.tableNumber = dto.tableNumber;
    if (dto.totalVoters !== undefined) table.totalVoters = dto.totalVoters;

    if (dto.schoolId !== undefined) {
      if (!dto.schoolId) {
        table.school = null;
        table.school_id = null;
      } else {
        const school = await this.resolveSchool(dto.schoolId);
        table.school = school;
      }
    }

    table.updatedBy = actorId ?? table.updatedBy;
    return this.repo.save(table);
  }

  async remove(id: string, actorId?: string) {
    const table = await this.findOne(id);
    await this.repo.update(id, { deletedBy: actorId });
    await this.repo.softDelete(id);
    return { message: `Mesa ${table.tableNumber} eliminada` };
  }

  async findBySchool(schoolId: string) {
    const tables = await this.repo.find({
      where: { school: { id: schoolId } },
      relations: ["school", "delegates"],
    });
    
    return tables.sort((a, b) =>
      a.tableNumber.localeCompare(b.tableNumber, undefined, {
        numeric: true,
        sensitivity: "base",
      })
    );
  }
}
