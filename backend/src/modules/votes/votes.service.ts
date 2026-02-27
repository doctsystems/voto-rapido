import {
  Injectable, NotFoundException, ForbiddenException,
  BadRequestException, ConflictException, Logger,
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
import { IsString, IsOptional, IsNumber, IsUUID, IsArray, ValidateNested } from 'class-validator';
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

function aggregateReports(reports: VoteReport[]) {
  const submitted = reports.filter(r => r.status === ReportStatus.SUBMITTED).length;
  const verified  = reports.filter(r => r.status === ReportStatus.VERIFIED).length;
  const draft     = reports.filter(r => r.status === ReportStatus.DRAFT).length;

  const globalParty: Record<string, { name: string; acronym: string; color: string; total: number }> = {};
  const etMap: Record<string, { id: string; name: string; order: number; parties: Record<string, { name: string; acronym: string; color: string; votes: number }> }> = {};

  for (const report of reports) {
    for (const entry of report.entries || []) {
      const p = entry.party; const et = entry.electionType;
      if (!p || !et) continue;
      if (!globalParty[p.id]) globalParty[p.id] = { name: p.name, acronym: p.acronym, color: p.color, total: 0 };
      globalParty[p.id].total += entry.votes;
      if (!etMap[et.id]) etMap[et.id] = { id: et.id, name: et.name, order: et.order ?? 0, parties: {} };
      if (!etMap[et.id].parties[p.id]) etMap[et.id].parties[p.id] = { name: p.name, acronym: p.acronym, color: p.color, votes: 0 };
      etMap[et.id].parties[p.id].votes += entry.votes;
    }
  }

  const byElectionType = Object.values(etMap).sort((a, b) => a.order - b.order).map(et => {
    const parties = Object.values(et.parties).sort((a, b) => b.votes - a.votes);
    const totalVotes = parties.reduce((s, p) => s + p.votes, 0);
    return { id: et.id, name: et.name, order: et.order, totalVotes,
      parties: parties.map(p => ({ ...p, percentage: totalVotes > 0 ? +((p.votes / totalVotes) * 100).toFixed(1) : 0 })) };
  });

  return { totalReports: reports.length, draft, submitted, verified,
    votesByParty: Object.values(globalParty).sort((a, b) => b.total - a.total), byElectionType };
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

  private baseQuery() {
    return this.reportRepo.createQueryBuilder('r')
      .leftJoinAndSelect('r.delegate', 'd')
      .leftJoinAndSelect('d.party', 'dp')
      .leftJoinAndSelect('r.table', 't')
      .leftJoinAndSelect('t.school', 's')
      .leftJoinAndSelect('r.entries', 'e')
      .leftJoinAndSelect('e.party', 'p')
      .leftJoinAndSelect('e.electionType', 'et');
  }

  async findAll(currentUser: any, filters?: { schoolId?: string }) {
    const query = this.baseQuery();

    if (currentUser.role === Role.DELEGADO) {
      query.where('d.id = :userId', { userId: currentUser.sub });
    } else if (currentUser.role === Role.JEFE_RECINTO) {
      // Only reports from delegates of same party at their recinto
      query.where('dp.id = :partyId AND s.id = :schoolId', {
        partyId: currentUser.partyId, schoolId: currentUser.schoolId,
      });
    } else if (currentUser.role === Role.JEFE_CAMPANA) {
      query.where('dp.id = :partyId', { partyId: currentUser.partyId });
    }

    if (filters?.schoolId) {
      query.andWhere('s.id = :filterSchool', { filterSchool: filters.schoolId });
    }

    return query.orderBy('s.recintoElectoral', 'ASC').addOrderBy('t.tableNumber', 'ASC').getMany();
  }

  async findOne(id: string, currentUser: any) {
    const report = await this.reportRepo.findOne({
      where: { id },
      relations: ['delegate', 'delegate.party', 'table', 'table.school', 'entries', 'entries.party', 'entries.electionType'],
    });
    if (!report) throw new NotFoundException('Reporte no encontrado');
    if (currentUser.role === Role.DELEGADO && report.delegate.id !== currentUser.sub) throw new ForbiddenException();
    if (currentUser.role === Role.JEFE_RECINTO) {
      if (report.delegate.party?.id !== currentUser.partyId || report.table?.school?.id !== currentUser.schoolId)
        throw new ForbiddenException('Solo puede ver reportes de su recinto y partido');
    }
    if (currentUser.role === Role.JEFE_CAMPANA && report.delegate.party?.id !== currentUser.partyId) throw new ForbiddenException();
    return report;
  }

  private async buildEntries(dto: CreateReportDto): Promise<{ entries: VoteEntry[]; totalVotes: number }> {
    let totalVotes = 0;
    const entries: VoteEntry[] = [];
    for (const ed of dto.entries) {
      if (ed.votes < 0) throw new BadRequestException('Los votos no pueden ser negativos');
      const party = await this.partyRepo.findOne({ where: { id: ed.partyId } });
      if (!party) throw new NotFoundException(`Partido no encontrado`);
      const electionType = await this.etRepo.findOne({ where: { id: ed.electionTypeId } });
      if (!electionType) throw new NotFoundException(`Tipo de elección no encontrado`);
      entries.push(this.entryRepo.create({ party, electionType, votes: ed.votes }));
      totalVotes += ed.votes;
    }
    return { entries, totalVotes };
  }

  async create(dto: CreateReportDto, currentUser: any) {
    const delegate = await this.userRepo.findOne({
      where: { id: currentUser.sub },
      relations: ['table', 'table.school', 'party'],
    });
    if (!delegate?.table) throw new BadRequestException('No tiene una mesa asignada');

    // One report per table per delegate
    const existing = await this.reportRepo.findOne({
      where: { delegate: { id: currentUser.sub }, table: { id: delegate.table.id } },
      withDeleted: false,
    });
    if (existing) throw new ConflictException('Ya existe un reporte para esta mesa. Edítalo en lugar de crear uno nuevo.');

    const { entries, totalVotes } = await this.buildEntries(dto);
    const allVotes = totalVotes + (dto.nullVotes || 0) + (dto.blankVotes || 0);

    // Validate against totalVoters
    if (delegate.table.totalVoters && allVotes > delegate.table.totalVoters) {
      throw new BadRequestException(
        `El total de votos (${allVotes}) supera el padrón habilitado de la mesa (${delegate.table.totalVoters} votantes).`
      );
    }

    const report = this.reportRepo.create({
      delegate,
      table: delegate.table,
      notes: dto.notes,
      nullVotes: dto.nullVotes || 0,
      blankVotes: dto.blankVotes || 0,
      totalVotes,
      entries,
      createdBy: currentUser.sub,
      updatedBy: currentUser.sub,
    });

    await this.reportRepo.save(report);
    this.logger.log(`Reporte creado por ${delegate.username} mesa ${delegate.table.tableNumber}`);
    return this.findOne(report.id, currentUser);
  }

  async update(id: string, dto: CreateReportDto, currentUser: any) {
    const report = await this.findOne(id, currentUser);

    // Only DELEGADO or JEFE_RECINTO can update, and only DRAFT/SUBMITTED reports
    const canUpdate = currentUser.role === Role.DELEGADO || currentUser.role === Role.JEFE_RECINTO;
    if (!canUpdate) throw new ForbiddenException('Solo el delegado o jefe de recinto puede actualizar un reporte');
    if (report.status === ReportStatus.VERIFIED) throw new BadRequestException('No se puede editar un reporte verificado');

    const table = await this.tableRepo.findOne({ where: { id: report.table.id } });
    const { entries, totalVotes } = await this.buildEntries(dto);
    const allVotes = totalVotes + (dto.nullVotes || 0) + (dto.blankVotes || 0);

    if (table?.totalVoters && allVotes > table.totalVoters) {
      throw new BadRequestException(
        `El total de votos (${allVotes}) supera el padrón habilitado de la mesa (${table.totalVoters} votantes).`
      );
    }

    // Remove old entries
    await this.entryRepo.delete({ report: { id } });

    report.entries = entries;
    report.totalVotes = totalVotes;
    report.nullVotes = dto.nullVotes || 0;
    report.blankVotes = dto.blankVotes || 0;
    report.notes = dto.notes;
    report.status = ReportStatus.DRAFT; // Reset to draft on update
    report.submittedAt = null;
    report.updatedBy = currentUser.sub;

    await this.reportRepo.save(report);
    return this.findOne(id, currentUser);
  }

  async submit(id: string, currentUser: any) {
    const report = await this.findOne(id, currentUser);
    const canSubmit = currentUser.role === Role.DELEGADO || currentUser.role === Role.JEFE_RECINTO;
    if (!canSubmit) throw new ForbiddenException('Solo el delegado o jefe de recinto puede enviar el reporte');
    if (report.status !== ReportStatus.DRAFT) throw new BadRequestException('Solo borradores pueden enviarse');

    report.status = ReportStatus.SUBMITTED;
    report.submittedAt = new Date();
    report.updatedBy = currentUser.sub;
    await this.reportRepo.save(report);
    return report;
  }

  async verify(id: string, currentUser: any) {
    const report = await this.findOne(id, currentUser);
    if (report.status !== ReportStatus.SUBMITTED) throw new BadRequestException('Solo reportes enviados pueden verificarse');

    if (currentUser.role === Role.JEFE_RECINTO) {
      // Can only verify reports from same party at same recinto
      if (report.delegate.party?.id !== currentUser.partyId || report.table?.school?.id !== currentUser.schoolId) {
        throw new ForbiddenException('Solo puede verificar reportes de su recinto y partido');
      }
    } else if (currentUser.role === Role.JEFE_CAMPANA) {
      if (report.delegate.party?.id !== currentUser.partyId) {
        throw new ForbiddenException('Solo puede verificar reportes de su partido');
      }
    } else if (currentUser.role !== Role.ADMIN) {
      throw new ForbiddenException();
    }

    report.status = ReportStatus.VERIFIED;
    report.updatedBy = currentUser.sub;
    return this.reportRepo.save(report);
  }

  async remove(id: string, currentUser: any) {
    const report = await this.findOne(id, currentUser);
    if (currentUser.role === Role.DELEGADO) throw new ForbiddenException('Los delegados no pueden eliminar reportes');

    await this.reportRepo.update(id, { deletedBy: currentUser.sub });
    await this.reportRepo.softDelete(id);
    this.logger.log(`Reporte ${id} eliminado por ${currentUser.username}`);
    return { message: 'Reporte eliminado. El delegado puede crear uno nuevo.' };
  }

  async getMetrics(currentUser: any) {
    if (currentUser.role === Role.ADMIN) return this.getAdminMetrics();

    const query = this.baseQuery();
    if (currentUser.role === Role.DELEGADO || currentUser.role === Role.JEFE_RECINTO || currentUser.role === Role.JEFE_CAMPANA) {
      query.where('dp.id = :partyId', { partyId: currentUser.partyId });
    }
    const reports = await query.getMany();
    return aggregateReports(reports);
  }

  private async getAdminMetrics() {
    const allReports = await this.baseQuery().getMany();
    const totalReports = allReports.length;
    const draft     = allReports.filter(r => r.status === ReportStatus.DRAFT).length;
    const submitted = allReports.filter(r => r.status === ReportStatus.SUBMITTED).length;
    const verified  = allReports.filter(r => r.status === ReportStatus.VERIFIED).length;

    const byPartyMap: Record<string, { partyName: string; partyAcronym: string; partyColor: string; reports: VoteReport[] }> = {};
    for (const report of allReports) {
      const pid = report.delegate?.party?.id;
      if (!pid) continue;
      if (!byPartyMap[pid]) byPartyMap[pid] = { partyName: report.delegate.party.name, partyAcronym: report.delegate.party.acronym, partyColor: report.delegate.party.color, reports: [] };
      byPartyMap[pid].reports.push(report);
    }

    const byParty = Object.entries(byPartyMap).map(([partyId, data]) => ({
      partyId, partyName: data.partyName, partyAcronym: data.partyAcronym, partyColor: data.partyColor,
      ...aggregateReports(data.reports),
    }));

    return { totalReports, draft, submitted, verified, byParty };
  }
}
