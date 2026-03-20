import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { VotingTable } from "./voting-table.entity";
import { School } from "../schools/school.entity";
import { IsOptional, IsNumber, IsUUID } from "class-validator";

export class CreateTableDto {
  @IsNumber() number: number;
  @IsNumber() code: number;
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
      
      return a.number - b.number;
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
        number: dto.number,
        ...(school ? { school: { id: school.id } } : {}),
      },
    });
    if (existing) {
      throw new ConflictException(
        `Table "${dto.number}" already exists in "${school?.name ?? "(no school)"}"`,
      );
    }

    const table = this.repo.create({
      number: dto.number,
      code: dto.code,
      totalVoters: dto.totalVoters,
      createdBy: actorId,
      updatedBy: actorId,
    });
    if (school) table.school = school;

    return this.repo.save(table);
  }

  async update(id: string, dto: Partial<CreateTableDto>, actorId?: string) {
    const table = await this.findOne(id);

    if (dto.number !== undefined) table.number = dto.number;
    if (dto.code !== undefined) table.code = dto.code;
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
    return { message: `Table ${table.number} deleted` };
  }

  async findBySchool(schoolId: string) {
    const tables = await this.repo.find({
      where: { school: { id: schoolId } },
      relations: ["school", "delegates"],
    });
    
    return tables.sort((a, b) =>
      a.number - b.number
    );
  }
}
