import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Party } from '../parties/party.entity';
import { ElectionType } from '../election-types/election-type.entity';
import { VoteReport } from './vote-report.entity';

@Entity('vote_entries')
export class VoteEntry extends BaseEntity {
  @ManyToOne(() => VoteReport, (report) => report.entries)
  @JoinColumn({ name: 'report_id' })
  report: VoteReport;

  @ManyToOne(() => Party, (party) => party.voteEntries, { eager: true })
  @JoinColumn({ name: 'party_id' })
  party: Party;

  @ManyToOne(() => ElectionType, (et) => et.voteEntries, { eager: true })
  @JoinColumn({ name: 'election_type_id' })
  electionType: ElectionType;

  @Column({ default: 0 })
  votes: number;

  /** Votos nulos de este tipo de elección */
  @Column({ name: 'null_votes', default: 0 })
  nullVotes: number;

  /** Votos en blanco de este tipo de elección */
  @Column({ name: 'blank_votes', default: 0 })
  blankVotes: number;
}
