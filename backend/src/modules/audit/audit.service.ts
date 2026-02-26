import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './audit-log.entity';

@Injectable()
export class AuditService {
  constructor(@InjectRepository(AuditLog) private repo: Repository<AuditLog>) {}

  async log(data: Partial<AuditLog>) {
    const entry = this.repo.create(data);
    await this.repo.save(entry).catch(() => {});
  }

  findAll(limit = 100) {
    return this.repo.find({ order: { createdAt: 'DESC' }, take: limit });
  }
}
