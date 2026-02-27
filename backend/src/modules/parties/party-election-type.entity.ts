import { Entity, ManyToOne, JoinColumn, Column } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Party } from '../parties/party.entity';
import { ElectionType } from '../election-types/election-type.entity';

/**
 * Indica que un partido político participa (tiene candidato)
 * en un tipo de elección específico.
 * Ej: MPU participa en Alcalde y Concejal, pero no en Gobernador.
 */
@Entity('party_election_types')
export class PartyElectionType extends BaseEntity {
  @ManyToOne(() => Party, (party) => party.electionTypes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'party_id' })
  party: Party;

  @ManyToOne(() => ElectionType, (et) => et.partyElectionTypes, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'election_type_id' })
  electionType: ElectionType;

  @Column({ nullable: true, name: 'candidate_name' })
  candidateName: string;

  @Column({ default: true, name: 'is_active' })
  isActive: boolean;
}
