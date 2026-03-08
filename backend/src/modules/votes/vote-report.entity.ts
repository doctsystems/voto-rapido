import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../users/user.entity';
import { VotingTable } from '../tables/voting-table.entity';
import { VoteEntry } from './vote-entry.entity';

export enum ReportStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  VERIFIED = 'VERIFIED',
}

@Entity('vote_reports')
export class VoteReport extends BaseEntity {
  @ManyToOne(() => User, (user) => user.reports, { eager: false })
  @JoinColumn({ name: 'delegate_id' })
  delegate: User;

  @ManyToOne(() => VotingTable, (table) => table.reports, { eager: false })
  @JoinColumn({ name: 'table_id' })
  table: VotingTable;

  @Column({ type: 'enum', enum: ReportStatus, default: ReportStatus.DRAFT })
  status: ReportStatus;

  @Column({ type: 'timestamptz', nullable: true, name: 'submitted_at' })
  submittedAt: Date | null;

  @Column({ nullable: true })
  notes: string;

  @Column({ name: 'total_votes', default: 0 })
  totalVotes: number;

  @Column({ name: 'null_votes', default: 0 })
  nullVotes: number;

  @Column({ name: 'blank_votes', default: 0 })
  blankVotes: number;

  @OneToMany(() => VoteEntry, (entry) => entry.report, { cascade: true, eager: true })
  entries: VoteEntry[];
}
