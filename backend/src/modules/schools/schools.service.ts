import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Like, Repository } from "typeorm";
import { School } from "./school.entity";
import { IsString, IsOptional, IsNumber } from "class-validator";

export class CreateSchoolDto {
  @IsString() nombreRecinto: string;
  @IsOptional() @IsString() nombreAbrev?: string;
  @IsOptional() @IsString() codigoRecinto?: string;
  @IsOptional() @IsString() departamento?: string;
  @IsOptional() @IsString() provincia?: string;
  @IsOptional() @IsString() municipio?: string;
  @IsOptional() @IsString() asientoElectoral?: string;
  @IsOptional() @IsString() localidad?: string;
  @IsOptional() @IsNumber() circunscripcion?: number;
}

@Injectable()
export class SchoolsService {
  constructor(
    @InjectRepository(School) private readonly repo: Repository<School>,
  ) {}

  findAll(search?: string) {
    const where = search
      ? [
          { nombreRecinto: Like(`%${search}%`) },
          { codigoRecinto: Like(`%${search}%`) },
          { municipio: Like(`%${search}%`) },
        ]
      : undefined;
    return this.repo.find({
      where,
      relations: ["tables"],
      order: { nombreRecinto: "ASC" },
    });
  }

  async findOne(id: string) {
    const school = await this.repo.findOne({
      where: { id },
      relations: ["tables", "tables.delegates"],
    });
    if (!school) throw new NotFoundException("Recinto electoral no encontrado");
    return school;
  }

  async create(dto: CreateSchoolDto, actorId: string) {
    const existing = await this.repo.findOne({
      where: { nombreRecinto: dto.nombreRecinto },
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
    return { message: `Recinto "${school.nombreRecinto}" eliminado` };
  }

  findByMunicipio(municipio: string) {
    return this.repo.find({
      where: { municipio },
      relations: ["tables"],
      order: { nombreRecinto: "ASC" },
    });
  }
}
