import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VotingTable } from './voting-table.entity';
import { School } from '../schools/school.entity';
import { IsString, IsOptional, IsNumber, IsUUID } from 'class-validator';

export class CreateTableDto {
  @IsString() tableNumber: string;
  @IsOptional() @IsNumber() totalVoters?: number;
  @IsUUID() @IsOptional() schoolId?: string;
}

@Injectable()
export class TablesService {
  constructor(
    @InjectRepository(VotingTable) private readonly repo: Repository<VotingTable>,
    @InjectRepository(School) private readonly schoolRepo: Repository<School>,
  ) {}

  findAll() {
    return this.repo.find({
      relations: ['school', 'delegates'],
      order: { tableNumber: 'ASC' },
    });
  }

  async findOne(id: string) {
    const table = await this.repo.findOne({
      where: { id },
      relations: ['school', 'delegates'],
    });
    if (!table) throw new NotFoundException('Mesa no encontrada');
    return table;
  }

  async create(dto: CreateTableDto) {
    const table = this.repo.create({
      tableNumber: dto.tableNumber,
      totalVoters: dto.totalVoters,
    });

    if (dto.schoolId) {
      const school = await this.schoolRepo.findOne({ where: { id: dto.schoolId } });
      if (!school) throw new NotFoundException('Unidad educativa no encontrada');
      table.school = school;
    }

    return this.repo.save(table);
  }

  async update(id: string, dto: Partial<CreateTableDto>) {
    const table = await this.findOne(id);

    if (dto.tableNumber !== undefined) table.tableNumber = dto.tableNumber;
    if (dto.totalVoters !== undefined) table.totalVoters = dto.totalVoters;

    if (dto.schoolId !== undefined) {
      if (!dto.schoolId) {
        table.school = null;
      } else {
        const school = await this.schoolRepo.findOne({ where: { id: dto.schoolId } });
        if (!school) throw new NotFoundException('Unidad educativa no encontrada');
        table.school = school;
      }
    }

    return this.repo.save(table);
  }

  async remove(id: string) {
    const table = await this.findOne(id);
    await this.repo.softDelete(id);
    return { message: `Mesa ${table.tableNumber} eliminada` };
  }

  findBySchool(schoolId: string) {
    return this.repo.find({
      where: { school: { id: schoolId } },
      relations: ['school', 'delegates'],
      order: { tableNumber: 'ASC' },
    });
  }
}
