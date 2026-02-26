import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Party } from './party.entity';
import { IsString, IsOptional } from 'class-validator';

export class CreatePartyDto {
  @IsString() name: string;
  @IsString() acronym: string;
  @IsOptional() @IsString() color?: string;
  @IsOptional() @IsString() logoUrl?: string;
}

@Injectable()
export class PartiesService {
  constructor(@InjectRepository(Party) private repo: Repository<Party>) {}

  findAll() { return this.repo.find({ order: { name: 'ASC' } }); }

  async findOne(id: string) {
    const p = await this.repo.findOne({ where: { id } });
    if (!p) throw new NotFoundException('Partido no encontrado');
    return p;
  }

  async create(dto: CreatePartyDto) {
    const existing = await this.repo.findOne({ where: [{ name: dto.name }, { acronym: dto.acronym }] });
    if (existing) throw new ConflictException('Partido o siglas ya existen');
    return this.repo.save(this.repo.create(dto));
  }

  async update(id: string, dto: Partial<CreatePartyDto>) {
    await this.findOne(id);
    await this.repo.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.repo.softDelete(id);
    return { message: 'Partido eliminado' };
  }
}
