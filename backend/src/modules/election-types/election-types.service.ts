import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ElectionType } from './election-type.entity';
import { IsString, IsOptional, IsNumber } from 'class-validator';

export class CreateElectionTypeDto {
  @IsString() name: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsNumber() order?: number;
}

@Injectable()
export class ElectionTypesService {
  constructor(@InjectRepository(ElectionType) private repo: Repository<ElectionType>) {}

  findAll() {
    return this.repo.find({ where: { isActive: true }, order: { order: 'ASC', name: 'ASC' } });
  }

  async findOne(id: string) {
    const et = await this.repo.findOne({ where: { id } });
    if (!et) throw new NotFoundException('Tipo de elección no encontrado');
    return et;
  }

  async create(dto: CreateElectionTypeDto, actorId?: string) {
    return this.repo.save(this.repo.create({ ...dto, createdBy: actorId, updatedBy: actorId }));
  }

  async update(id: string, dto: Partial<CreateElectionTypeDto>, actorId?: string) {
    await this.findOne(id);
    await this.repo.update(id, { ...dto, updatedBy: actorId });
    return this.findOne(id);
  }

  async remove(id: string, actorId?: string) {
    await this.findOne(id);
    await this.repo.update(id, { deletedBy: actorId });
    await this.repo.softDelete(id);
    return { message: 'Tipo de elección eliminado' };
  }
}
