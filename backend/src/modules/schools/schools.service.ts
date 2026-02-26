import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { School } from './school.entity';
import { IsString, IsOptional } from 'class-validator';

export class CreateSchoolDto {
  @IsString() name: string;
  @IsOptional() @IsString() code?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() parish?: string;
  @IsOptional() @IsString() municipality?: string;
  @IsOptional() @IsString() province?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() principalName?: string;
}

@Injectable()
export class SchoolsService {
  constructor(
    @InjectRepository(School) private readonly repo: Repository<School>,
  ) {}

  findAll() {
    return this.repo.find({
      relations: ['tables'],
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string) {
    const school = await this.repo.findOne({
      where: { id },
      relations: ['tables', 'tables.delegates'],
    });
    if (!school) throw new NotFoundException('Unidad educativa no encontrada');
    return school;
  }

  async create(dto: CreateSchoolDto) {
    if (dto.code) {
      const existing = await this.repo.findOne({ where: { code: dto.code } });
      if (existing) throw new ConflictException('Ya existe una unidad educativa con ese código');
    }
    const existing = await this.repo.findOne({ where: { name: dto.name } });
    if (existing) throw new ConflictException('Ya existe una unidad educativa con ese nombre');

    return this.repo.save(this.repo.create(dto));
  }

  async update(id: string, dto: Partial<CreateSchoolDto>) {
    await this.findOne(id);
    await this.repo.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: string) {
    const school = await this.findOne(id);
    if (school.tables?.length > 0) {
      throw new ConflictException(
        `No se puede eliminar: tiene ${school.tables.length} mesa(s) asignada(s)`,
      );
    }
    await this.repo.softDelete(id);
    return { message: `Unidad educativa "${school.name}" eliminada` };
  }
}
