import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Party } from "./party.entity";
import { PartyElectionType } from "./party-election-type.entity";
import { ElectionType } from "../election-types/election-type.entity";
import { IsString, IsOptional, IsUUID, IsNumber } from "class-validator";

export class CreatePartyDto {
  @IsString() name: string;
  @IsNumber() ballotOrder: number;
  @IsOptional() @IsString() color?: string;
  @IsOptional() @IsString() logoUrl?: string;
}

export class AssignElectionTypeDto {
  @IsUUID() electionTypeId: string;
  @IsOptional() @IsString() candidateName?: string;
}

@Injectable()
export class PartiesService {
  constructor(
    @InjectRepository(Party) private readonly repo: Repository<Party>,
    @InjectRepository(PartyElectionType)
    private readonly petRepo: Repository<PartyElectionType>,
    @InjectRepository(ElectionType)
    private readonly etRepo: Repository<ElectionType>,
  ) {}

  findAll() {
    return this.repo.find({
      relations: ["electionTypes", "electionTypes.electionType"],
      order: { ballotOrder: "ASC" },
    });
  }

  async findOne(id: string) {
    const p = await this.repo.findOne({
      where: { id },
      relations: ["electionTypes", "electionTypes.electionType"],
    });
    if (!p) throw new NotFoundException("Partido no encontrado");
    return p;
  }

  async create(dto: CreatePartyDto, actorId?: string) {
    const existing = await this.repo.findOne({
      where: [{ name: dto.name }, { ballotOrder: dto.ballotOrder }],
    });
    if (existing)
      throw new ConflictException("Partido o orden de papeleta ya existen");
    return this.repo.save(
      this.repo.create({ ...dto, createdBy: actorId, updatedBy: actorId }),
    );
  }

  async update(id: string, dto: Partial<CreatePartyDto>, actorId?: string) {
    await this.findOne(id);
    await this.repo.update(id, { ...dto, updatedBy: actorId });
    return this.findOne(id);
  }

  async remove(id: string, actorId?: string) {
    await this.findOne(id);
    await this.repo.update(id, { deletedBy: actorId });
    await this.repo.softDelete(id);
    return { message: "Partido eliminado" };
  }

  async assignElectionType(partyId: string, dto: AssignElectionTypeDto) {
    const party = await this.repo.findOne({ where: { id: partyId } });
    if (!party) throw new NotFoundException("Partido no encontrado");
    const electionType = await this.etRepo.findOne({
      where: { id: dto.electionTypeId },
    });
    if (!electionType)
      throw new NotFoundException("Tipo de elección no encontrado");

    // Upsert (restore if soft-deleted)
    const existing = await this.petRepo
      .createQueryBuilder("pet")
      .withDeleted()
      .where("pet.party_id = :partyId AND pet.election_type_id = :etId", {
        partyId,
        etId: dto.electionTypeId,
      })
      .getOne();

    if (existing) {
      existing.candidateName = dto.candidateName ?? null;
      existing.isActive = true;
      existing.deletedAt = null;
      return this.petRepo.save(existing);
    }

    return this.petRepo.save(
      this.petRepo.create({
        party,
        electionType,
        candidateName: dto.candidateName,
      }),
    );
  }

  async removeElectionType(partyId: string, electionTypeId: string) {
    const pet = await this.petRepo.findOne({
      where: { party: { id: partyId }, electionType: { id: electionTypeId } },
    });
    if (!pet) throw new NotFoundException("Asignación no encontrada");
    await this.petRepo.softDelete(pet.id);
    return { message: "Tipo de elección removido del partido" };
  }

  /** Retorna partidos activos con solo sus tipos de elección asignados.
   *  Usado por el formulario de ingreso de votos. */
  async getPartiesWithElectionTypes() {
    const parties = await this.repo.find({
      where: { isActive: true },
      relations: ["electionTypes", "electionTypes.electionType"],
      order: { ballotOrder: "ASC" },
    });
    return parties.map((p) => ({
      id: p.id,
      name: p.name,
      ballotOrder: p.ballotOrder,
      color: p.color,
      electionTypes: (p.electionTypes || [])
        .filter((pet) => pet.isActive && !pet.deletedAt)
        .sort(
          (a, b) => (a.electionType.order ?? 0) - (b.electionType.order ?? 0),
        )
        .map((pet) => ({
          id: pet.electionType.id,
          name: pet.electionType.name,
          order: pet.electionType.order,
          candidateName: pet.candidateName,
        })),
    }));
  }
}
