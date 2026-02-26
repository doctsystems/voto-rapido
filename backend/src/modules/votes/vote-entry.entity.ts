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
}
