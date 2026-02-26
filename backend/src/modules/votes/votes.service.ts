import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VoteReport, ReportStatus } from './vote-report.entity';
import { VoteEntry } from './vote-entry.entity';
import { User } from '../users/user.entity';
import { VotingTable } from '../tables/voting-table.entity';
import { Party } from '../parties/party.entity';
import { ElectionType } from '../election-types/election-type.entity';
import { Role } from '../../common/enums/role.enum';
import {
  IsString, IsOptional, IsNumber, IsUUID, IsArray, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class VoteEntryDto {
  @IsUUID() partyId: string;
  @IsUUID() electionTypeId: string;
  @IsNumber() votes: number;
}

export class CreateReportDto {
  @IsOptional() @IsString() notes?: string;
  @IsNumber() @IsOptional() nullVotes?: number;
  @IsNumber() @IsOptional() blankVotes?: number;
  @IsArray() @ValidateNested({ each: true }) @Type(() => VoteEntryDto)
  entries: VoteEntryDto[];
}

@Injectable()
export class VotesService {
  private readonly logger = new Logger(VotesService.name);

  constructor(
    @InjectRepository(VoteReport) private reportRepo: Repository<VoteReport>,
    @InjectRepository(VoteEntry) private entryRepo: Repository<VoteEntry>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(VotingTable) private tableRepo: Repository<VotingTable>,
    @InjectRepository(Party) private partyRepo: Repository<Party>,
    @InjectRepository(ElectionType) private etRepo: Repository<ElectionType>,
  ) {}

  async findAll(currentUser: any) {
    const query = this.reportRepo.createQueryBuilder('r')
      .leftJoinAndSelect('r.delegate', 'd')
      .leftJoinAndSelect('r.table', 't')
      .leftJoinAndSelect('r.entries', 'e')
      .leftJoinAndSelect('e.party', 'p')
      .leftJoinAndSelect('e.electionType', 'et')
      .leftJoinAndSelect('d.party', 'dp');

    if (currentUser.role === Role.DELEGADO) {
      query.where('d.id = :userId', { userId: currentUser.sub });
    } else if (currentUser.role === Role.JEFE_CAMPANA) {
      query.where('dp.id = :partyId', { partyId: currentUser.partyId });
    }

    return query.orderBy('r.created_at', 'DESC').getMany();
  }

  async findOne(id: string, currentUser: any) {
    const report = await this.reportRepo.findOne({
      where: { id },
      relations: ['delegate', 'table', 'entries', 'entries.party', 'entries.electionType', 'delegate.party'],
    });
    if (!report) throw new NotFoundException('Reporte no encontrado');

    if (currentUser.role === Role.DELEGADO && report.delegate.id !== currentUser.sub) {
      throw new ForbiddenException('No puede ver este reporte');
    }
    if (currentUser.role === Role.JEFE_CAMPANA && report.delegate.party?.id !== currentUser.partyId) {
      throw new ForbiddenException('No puede ver este reporte');
    }
    return report;
  }

  async create(dto: CreateReportDto, currentUser: any) {
    const delegate = await this.userRepo.findOne({
      where: { id: currentUser.sub },
      relations: ['table', 'party'],
    });

    if (!delegate.table) {
      throw new BadRequestException('No tiene una mesa asignada');
    }

    // Validate entries
    let totalVotes = 0;
    const entries: VoteEntry[] = [];

    for (const entryDto of dto.entries) {
      const party = await this.partyRepo.findOne({ where: { id: entryDto.partyId } });
      if (!party) throw new NotFoundException(`Partido ${entryDto.partyId} no encontrado`);

      const electionType = await this.etRepo.findOne({ where: { id: entryDto.electionTypeId } });
      if (!electionType) throw new NotFoundException(`Tipo de elección no encontrado`);

      if (entryDto.votes < 0) throw new BadRequestException('Los votos no pueden ser negativos');

      const entry = this.entryRepo.create({
        party,
        electionType,
        votes: entryDto.votes,
      });
      entries.push(entry);
      totalVotes += entryDto.votes;
    }

    const report = this.reportRepo.create({
      delegate,
      table: delegate.table,
      notes: dto.notes,
      nullVotes: dto.nullVotes || 0,
      blankVotes: dto.blankVotes || 0,
      totalVotes,
      entries,
    });

    await this.reportRepo.save(report);
    this.logger.log(`Reporte creado por ${delegate.username} en mesa ${delegate.table.tableNumber}`);
    return this.findOne(report.id, currentUser);
  }

  async submit(id: string, currentUser: any) {
    const report = await this.findOne(id, currentUser);
    if (report.delegate.id !== currentUser.sub) {
      throw new ForbiddenException('Solo el delegado puede enviar su reporte');
    }
    if (report.status !== ReportStatus.DRAFT) {
      throw new BadRequestException('Solo reportes en borrador pueden enviarse');
    }
    report.status = ReportStatus.SUBMITTED;
    report.submittedAt = new Date();
    await this.reportRepo.save(report);
    this.logger.log(`Reporte ${id} enviado por ${currentUser.username}`);
    return report;
  }

  async verify(id: string, currentUser: any) {
    if (currentUser.role !== Role.ADMIN && currentUser.role !== Role.JEFE_CAMPANA) {
      throw new ForbiddenException();
    }
    const report = await this.reportRepo.findOne({ where: { id } });
    if (!report) throw new NotFoundException('Reporte no encontrado');
    report.status = ReportStatus.VERIFIED;
    return this.reportRepo.save(report);
  }

  async getMetrics(currentUser: any) {
    const query = this.reportRepo.createQueryBuilder('r')
      .leftJoin('r.delegate', 'd')
      .leftJoin('d.party', 'dp')
      .leftJoin('r.table', 't')
      .leftJoin('r.entries', 'e')
      .leftJoin('e.party', 'p')
      .leftJoin('e.electionType', 'et');

    if (currentUser.role === Role.DELEGADO) {
      query.where('d.id = :userId', { userId: currentUser.sub });
    } else if (currentUser.role === Role.JEFE_CAMPANA) {
      query.where('dp.id = :partyId', { partyId: currentUser.partyId });
    }

    const [reports, totalReports] = await query.getManyAndCount();

    const submitted = reports.filter(r => r.status === ReportStatus.SUBMITTED).length;
    const verified = reports.filter(r => r.status === ReportStatus.VERIFIED).length;
    const draft = reports.filter(r => r.status === ReportStatus.DRAFT).length;

    // Aggregate votes by party and election type
    const votesByParty: Record<string, { name: string; acronym: string; color: string; total: number }> = {};
    const votesByElectionType: Record<string, { name: string; total: number }> = {};

    for (const report of reports) {
      for (const entry of report.entries || []) {
        if (entry.party) {
          if (!votesByParty[entry.party.id]) {
            votesByParty[entry.party.id] = { name: entry.party.name, acronym: entry.party.acronym, color: entry.party.color, total: 0 };
          }
          votesByParty[entry.party.id].total += entry.votes;
        }
        if (entry.electionType) {
          if (!votesByElectionType[entry.electionType.id]) {
            votesByElectionType[entry.electionType.id] = { name: entry.electionType.name, total: 0 };
          }
          votesByElectionType[entry.electionType.id].total += entry.votes;
        }
      }
    }

    return {
      totalReports,
      draft,
      submitted,
      verified,
      votesByParty: Object.values(votesByParty).sort((a, b) => b.total - a.total),
      votesByElectionType: Object.values(votesByElectionType),
    };
  }
}
