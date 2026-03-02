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
import { IsString, IsOptional, IsNumber, IsUUID, IsArray, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export class VoteEntryDto {
  @IsUUID() partyId: string;
  @IsUUID() electionTypeId: string;
  @IsNumber() @Min(0) votes: number;
}

/** Null/blank votes per election type (sent once per type, not per party) */
export class ElectionTypeExtrasDto {
  @IsUUID() electionTypeId: string;
  @IsNumber() @Min(0) @IsOptional() nullVotes?: number;
  @IsNumber() @Min(0) @IsOptional() blankVotes?: number;
}

export class CreateReportDto {
  @IsOptional() @IsString() notes?: string;
  /** JEFE_RECINTO must pass the tableId of the table they're creating a report for */
  @IsOptional() @IsUUID() tableId?: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => VoteEntryDto)
  entries: VoteEntryDto[];
  /** Per-type null and blank vote counts */
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ElectionTypeExtrasDto)
  extras?: ElectionTypeExtrasDto[];
}

// ─── Aggregation ──────────────────────────────────────────────────────────────

function aggregateReports(reports: VoteReport[]) {
  const submitted = reports.filter(r => r.status === ReportStatus.SUBMITTED).length;
  const verified = reports.filter(r => r.status === ReportStatus.VERIFIED).length;
  const draft = reports.filter(r => r.status === ReportStatus.DRAFT).length;

  const etMap: Record<string, {
    id: string; name: string; order: number;
    parties: Record<string, { name: string; acronym: string; color: string; votes: number }>;
    nullVotes: number; blankVotes: number; totalVoters: number;
  }> = {};

  const globalParty: Record<string, { name: string; acronym: string; color: string; total: number }> = {};

  for (const report of reports) {
    for (const entry of report.entries || []) {
      const p = entry.party;
      const et = entry.electionType;
      if (!p || !et) continue;

      if (!globalParty[p.id]) globalParty[p.id] = { name: p.name, acronym: p.acronym, color: p.color, total: 0 };
      globalParty[p.id].total += entry.votes;

      if (!etMap[et.id]) etMap[et.id] = { id: et.id, name: et.name, order: et.order ?? 0, parties: {}, nullVotes: 0, blankVotes: 0, totalVoters: 0 };
      if (!etMap[et.id].parties[p.id]) etMap[et.id].parties[p.id] = { name: p.name, acronym: p.acronym, color: p.color, votes: 0 };
      etMap[et.id].parties[p.id].votes += entry.votes;

      // Only count nullVotes/blankVotes once per entry that "owns" them (the first party entry per type per report)
      // They are stored on each entry but we deduplicate by report+et
    }

    // Aggregate null/blank per election type from entries (they're stored on the first party entry per type)
    const seenEtPerReport = new Set<string>();
    for (const entry of report.entries || []) {
      const et = entry.electionType;
      if (!et) continue;
      const key = `${report.id}:${et.id}`;
      if (!seenEtPerReport.has(key)) {
        seenEtPerReport.add(key);
        if (etMap[et.id]) {
          etMap[et.id].nullVotes += (entry.nullVotes || 0);
          etMap[et.id].blankVotes += (entry.blankVotes || 0);
          // Accumulate totalVoters once per election type per report
          etMap[et.id].totalVoters += (report.table?.totalVoters || 0);
        }
      }
    }
  }

  const byElectionType = Object.values(etMap).sort((a, b) => a.order - b.order).map(et => {
    const parties = Object.values(et.parties).sort((a, b) => b.votes - a.votes);
    const validVotes = parties.reduce((s, p) => s + p.votes, 0);
    const emitidos = validVotes + et.nullVotes + et.blankVotes;
    const total = Math.round(et.totalVoters);
    return {
      id: et.id, name: et.name, order: et.order,
      validVotes, nullVotes: et.nullVotes, blankVotes: et.blankVotes,
      totalVotes: emitidos, totalVoters: total,
      parties: parties.map(p => ({
        ...p,
        percentage: validVotes > 0 ? +((p.votes / validVotes) * 100).toFixed(2) : 0,
      })),
      summary: {
        validVotes,
        validPct: emitidos > 0 ? +((validVotes / emitidos) * 100).toFixed(2) : 0,
        blankVotes: et.blankVotes,
        blankPct: emitidos > 0 ? +((et.blankVotes / emitidos) * 100).toFixed(2) : 0,
        nullVotes: et.nullVotes,
        nullPct: emitidos > 0 ? +((et.nullVotes / emitidos) * 100).toFixed(2) : 0,
        emitidos, totalVoters: total,
      },
    };
  });

  return {
    totalReports: reports.length, draft, submitted, verified,
    votesByParty: Object.values(globalParty).sort((a, b) => b.total - a.total),
    byElectionType
  };
}

// ─── Service ──────────────────────────────────────────────────────────────────

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
  ) { }

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

  /** Fetch report WITHOUT permission checks — for internal use by verify/remove */
  private async fetchReport(id: string) {
    const report = await this.reportRepo.findOne({
      where: { id },
      relations: ['delegate', 'delegate.party', 'table', 'table.school', 'entries', 'entries.party', 'entries.electionType'],
    });
    if (!report) throw new NotFoundException('Reporte no encontrado');
    return report;
  }

  /** Fetch report WITH permission checks — for delegates and read operations */
  async findOne(id: string, currentUser: any) {
    const report = await this.fetchReport(id);

    if (currentUser.role === Role.DELEGADO && report.delegate.id !== currentUser.sub)
      throw new ForbiddenException('Solo puede ver sus propios reportes');

    if (currentUser.role === Role.JEFE_RECINTO) {
      // JEFE_RECINTO can view any report in their recinto (any party)
      if (report.table?.school?.id !== currentUser.schoolId)
        throw new ForbiddenException('Solo puede ver reportes de su recinto');
    }

    if (currentUser.role === Role.JEFE_CAMPANA && report.delegate.party?.id !== currentUser.partyId)
      throw new ForbiddenException('Solo puede ver reportes de su partido');

    return report;
  }

  async findAll(currentUser: any, filters?: { schoolId?: string }) {
    const query = this.baseQuery();

    if (currentUser.role === Role.DELEGADO) {
      query.where('d.id = :userId', { userId: currentUser.sub });
    } else if (currentUser.role === Role.JEFE_RECINTO) {
      // JEFE_RECINTO sees all reports in their recinto (any party)
      query.where('s.id = :schoolId', { schoolId: currentUser.schoolId });
    } else if (currentUser.role === Role.JEFE_CAMPANA) {
      query.where('dp.id = :partyId', { partyId: currentUser.partyId });
    }
    // ADMIN: no filter

    if (filters?.schoolId) {
      query.andWhere('s.id = :filterSchool', { filterSchool: filters.schoolId });
    }

    return query.orderBy('s.recintoElectoral', 'ASC').addOrderBy('t.tableNumber', 'ASC').getMany();
  }

  // ── Build entries from DTO ──────────────────────────────────────────────────

  private async buildEntries(dto: CreateReportDto): Promise<{ entries: VoteEntry[]; totalVotes: number }> {
    let totalVotes = 0;
    const entries: VoteEntry[] = [];

    // Build extras map: electionTypeId → { nullVotes, blankVotes }
    const extrasMap: Record<string, { nullVotes: number; blankVotes: number }> = {};
    for (const ex of dto.extras ?? []) {
      extrasMap[ex.electionTypeId] = { nullVotes: ex.nullVotes || 0, blankVotes: ex.blankVotes || 0 };
    }

    // Group entries by election type to know which is the "first" (will carry null/blank)
    const seenEt = new Set<string>();

    for (const ed of dto.entries) {
      if (ed.votes < 0) throw new BadRequestException('Los votos no pueden ser negativos');
      const party = await this.partyRepo.findOne({ where: { id: ed.partyId } });
      if (!party) throw new NotFoundException(`Partido ${ed.partyId} no encontrado`);
      const electionType = await this.etRepo.findOne({ where: { id: ed.electionTypeId } });
      if (!electionType) throw new NotFoundException(`Tipo de elección no encontrado`);

      const isFirstForType = !seenEt.has(ed.electionTypeId);
      seenEt.add(ed.electionTypeId);

      // Store null/blank only on the first entry per election type
      entries.push(this.entryRepo.create({
        party, electionType,
        votes: ed.votes,
        nullVotes: isFirstForType ? (extrasMap[ed.electionTypeId]?.nullVotes || 0) : 0,
        blankVotes: isFirstForType ? (extrasMap[ed.electionTypeId]?.blankVotes || 0) : 0,
      }));
      totalVotes += ed.votes;
    }
    return { entries, totalVotes };
  }

  // ── Validation: per-type total ≤ totalVoters ────────────────────────────────

  private validatePerTypeLimit(dto: CreateReportDto, totalVoters: number | null) {
    if (!totalVoters) return;
    // Per election type: válidos + nulos + blancos ≤ totalVoters de la mesa
    // extras carries null/blank counts once per type
    const extrasMap: Record<string, { nullVotes: number; blankVotes: number }> = {};
    for (const ex of dto.extras ?? []) {
      extrasMap[ex.electionTypeId] = {
        nullVotes: ex.nullVotes || 0,
        blankVotes: ex.blankVotes || 0,
      };
    }

    // Sum valid votes per type
    const validPerType: Record<string, number> = {};
    for (const ed of dto.entries) {
      if (!validPerType[ed.electionTypeId]) validPerType[ed.electionTypeId] = 0;
      validPerType[ed.electionTypeId] += (ed.votes || 0);
    }

    // Check each type: valid + null + blank ≤ padrón
    for (const [etId, validVotes] of Object.entries(validPerType)) {
      const extras = extrasMap[etId] ?? { nullVotes: 0, blankVotes: 0 };
      const total = validVotes + extras.nullVotes + extras.blankVotes;
      if (total > totalVoters) {
        throw new BadRequestException(
          `El total de votos del tipo de elección (válidos ${validVotes} + nulos ${extras.nullVotes} + blancos ${extras.blankVotes} = ${total}) supera el padrón habilitado de la mesa (${totalVoters} votantes).`
        );
      }
    }
  }

  // ── CRUD ───────────────────────────────────────────────────────────────────

  async create(dto: CreateReportDto, currentUser: any) {
    const creator = await this.userRepo.findOne({
      where: { id: currentUser.sub },
      relations: ['table', 'table.school', 'school', 'party'],
    });
    if (!creator) throw new BadRequestException('Usuario no encontrado');

    let table: VotingTable | null = null;

    if (currentUser.role === Role.JEFE_RECINTO) {
      // JEFE_RECINTO must specify tableId in DTO
      if (!dto.tableId) throw new BadRequestException('El jefe de recinto debe indicar la mesa (tableId)');
      table = await this.tableRepo.findOne({
        where: { id: dto.tableId },
        relations: ['school'],
      });
      if (!table) throw new BadRequestException('Mesa no encontrada');
      // Must belong to their recinto
      if (table.school?.id !== currentUser.schoolId)
        throw new ForbiddenException('La mesa no pertenece a su recinto');
    } else {
      // DELEGADO: uses their assigned table
      if (!creator.table) throw new BadRequestException('No tiene una mesa asignada. Contacte al administrador.');
      table = creator.table;
    }

    const existing = await this.reportRepo.findOne({
      where: { delegate: { id: currentUser.sub }, table: { id: table.id } },
    });
    if (existing) throw new ConflictException('Ya existe un reporte para esta mesa. Edítalo en lugar de crear uno nuevo.');

    this.validatePerTypeLimit(dto, table.totalVoters);
    const { entries, totalVotes } = await this.buildEntries(dto);

    const report = this.reportRepo.create({
      delegate: creator, table, notes: dto.notes,
      nullVotes: 0, blankVotes: 0, totalVotes,
      entries, createdBy: currentUser.sub, updatedBy: currentUser.sub,
    });

    await this.reportRepo.save(report);
    this.logger.log(`Reporte creado: ${creator.username} mesa ${table.tableNumber}`);
    return this.fetchReport(report.id);
  }

  async update(id: string, dto: CreateReportDto, currentUser: any) {
    const report = await this.fetchReport(id);
    if (![Role.DELEGADO, Role.JEFE_RECINTO].includes(currentUser.role))
      throw new ForbiddenException('Solo el delegado o jefe de recinto puede actualizar un reporte');
    // DELEGADO: can only update their own reports
    if (currentUser.role === Role.DELEGADO && report.delegate.id !== currentUser.sub)
      throw new ForbiddenException('Solo puede actualizar sus propios reportes');
    // JEFE_RECINTO: can update reports for any table in their recinto
    if (currentUser.role === Role.JEFE_RECINTO) {
      if (report.table?.school?.id !== currentUser.schoolId)
        throw new ForbiddenException('Solo puede actualizar reportes de su recinto');
    }
    if (report.status === ReportStatus.VERIFIED) throw new BadRequestException('No se puede editar un reporte verificado');

    const table = await this.tableRepo.findOne({ where: { id: report.table.id } });
    this.validatePerTypeLimit(dto, table?.totalVoters || null);
    const { entries, totalVotes } = await this.buildEntries(dto);
    await this.entryRepo.delete({ report: { id } });

    report.entries = entries;
    report.totalVotes = totalVotes;
    report.nullVotes = 0;
    report.blankVotes = 0;
    report.notes = dto.notes;
    report.status = ReportStatus.DRAFT;
    report.submittedAt = null;
    report.updatedBy = currentUser.sub;

    await this.reportRepo.save(report);
    return this.findOne(id, currentUser);
  }

  async submit(id: string, currentUser: any) {
    const report = await this.fetchReport(id);
    const role = currentUser.role as Role;

    if (role === Role.DELEGADO) {
      if (report.delegate.id !== currentUser.sub)
        throw new ForbiddenException('Solo puede enviar sus propios reportes');
    } else if (role === Role.JEFE_RECINTO) {
      if (report.table?.school?.id !== currentUser.schoolId)
        throw new ForbiddenException('Solo puede enviar reportes de su recinto');
    } else {
      throw new ForbiddenException('Solo el delegado o jefe de recinto puede enviar el reporte');
    }
    if (report.status !== ReportStatus.DRAFT) throw new BadRequestException('Solo borradores pueden enviarse');

    report.status = ReportStatus.SUBMITTED;
    report.submittedAt = new Date();
    report.updatedBy = currentUser.sub;
    return this.reportRepo.save(report);
  }

  async verify(id: string, currentUser: any) {
    const report = await this.fetchReport(id);
    if (report.status !== ReportStatus.SUBMITTED)
      throw new BadRequestException('Solo reportes enviados pueden verificarse');

    const role = currentUser.role as Role;

    if (role === Role.ADMIN)
      throw new ForbiddenException('El administrador no puede verificar reportes.');

    // JEFE_CAMPANA: can verify any report of their party
    if (role === Role.JEFE_CAMPANA) {
      if (report.delegate.party?.id !== currentUser.partyId)
        throw new ForbiddenException('Solo puede verificar reportes de su partido');
    }
    // JEFE_RECINTO: can verify reports of their recinto AND party
    else if (role === Role.JEFE_RECINTO) {
      if (report.table?.school?.id !== currentUser.schoolId)
        throw new ForbiddenException('Solo puede verificar reportes de su recinto');
    }
    else {
      throw new ForbiddenException('No tiene permisos para verificar reportes');
    }

    report.status = ReportStatus.VERIFIED;
    report.updatedBy = currentUser.sub;
    return this.reportRepo.save(report);
  }

  async remove(id: string, currentUser: any) {
    const report = await this.fetchReport(id);
    const role = currentUser.role as Role;

    if (role === Role.DELEGADO) throw new ForbiddenException('Los delegados no pueden eliminar reportes');
    if (role === Role.ADMIN) throw new ForbiddenException('El administrador no puede eliminar reportes.');

    // JEFE_CAMPANA: can delete any report of their party
    if (role === Role.JEFE_CAMPANA) {
      if (report.delegate.party?.id !== currentUser.partyId)
        throw new ForbiddenException('Solo puede eliminar reportes de su partido');
    }
    // JEFE_RECINTO: can delete reports of their recinto AND party
    else if (role === Role.JEFE_RECINTO) {
      if (report.table?.school?.id !== currentUser.schoolId)
        throw new ForbiddenException('Solo puede eliminar reportes de su recinto');
    }

    await this.reportRepo.update(id, { deletedBy: currentUser.sub });
    await this.reportRepo.softDelete(id);
    this.logger.log(`Reporte ${id} eliminado por ${currentUser.username}`);
    return { message: 'Reporte eliminado. El delegado puede crear uno nuevo.' };
  }

  // ── Metrics ────────────────────────────────────────────────────────────────

  async getMetrics(currentUser: any) {
    if (currentUser.role === Role.ADMIN) return this.getAdminMetrics();
    const query = this.baseQuery();
    query.where('dp.id = :partyId', { partyId: currentUser.partyId });
    return aggregateReports(await query.getMany());
  }

  private async getAdminMetrics() {
    const allReports = await this.baseQuery().getMany();
    const totalReports = allReports.length;
    const draft = allReports.filter(r => r.status === ReportStatus.DRAFT).length;
    const submitted = allReports.filter(r => r.status === ReportStatus.SUBMITTED).length;
    const verified = allReports.filter(r => r.status === ReportStatus.VERIFIED).length;

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
