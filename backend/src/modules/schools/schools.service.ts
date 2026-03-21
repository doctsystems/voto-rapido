import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Brackets, Repository } from "typeorm";
import { School } from "./school.entity";
import { IsString, IsOptional, IsNumber, IsBoolean } from "class-validator";

export class CreateSchoolDto {
  @IsString() name: string;
  @IsOptional() @IsString() shortName?: string;
  @IsOptional() @IsNumber() code?: number;
  @IsOptional() @IsNumber() tableCount?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

@Injectable()
export class SchoolsService {
  constructor(
    @InjectRepository(School) private readonly repo: Repository<School>,
  ) {}

  async findAll(search?: string) {
    const query = this.repo
      .createQueryBuilder("school")
      .leftJoinAndSelect("school.tables", "table")
      .orderBy("school.name", "ASC");

    if (search) {
      query.andWhere(
        new Brackets((qb) => {
          qb.where("school.name ILIKE :search", { search: `%${search}%` })
            .orWhere("CAST(school.code AS TEXT) ILIKE :search", {
              search: `%${search}%`,
            });
        }),
      );
    }

    const schools = await query.getMany();
    
    schools.forEach(school => {
      if (school.tables) {
        school.tables.sort((a, b) => 
          (a.number || 0) - (b.number || 0)
        );
      }
    });
    
    return schools;
  }

  async findOne(id: string) {
    const school = await this.repo.findOne({
      where: { id },
      relations: ["tables", "tables.delegates"],
    });
    if (!school) throw new NotFoundException("Recinto electoral no encontrado");
    
    if (school.tables) {
      school.tables.sort((a, b) => 
        (a.number || 0) - (b.number || 0)
      );
    }
    
    return school;
  }

  async create(dto: CreateSchoolDto, actorId: string) {
    const existing = await this.repo.findOne({
      where: { name: dto.name },
    });
    if (existing)
      throw new ConflictException("Ya existe un recinto con ese nombre");
    const school = this.repo.create({
      ...dto,
      createdBy: actorId,
      updatedBy: actorId,
    });
    return this.repo.save(school);
  }

  async update(id: string, dto: Partial<CreateSchoolDto>, actorId: string) {
    await this.findOne(id);
    await this.repo.update(id, { ...dto, updatedBy: actorId });
    return this.findOne(id);
  }

  async remove(id: string, actorId: string) {
    const school = await this.findOne(id);
    if (school.tables?.length > 0) {
      throw new BadRequestException(
        `No se puede eliminar: tiene ${school.tables.length} mesa(s) asignada(s)`,
      );
    }
    await this.repo.update(id, { deletedBy: actorId });
    await this.repo.softDelete(id);
    return { message: `School "${school.name}" deleted` };
  }

}
