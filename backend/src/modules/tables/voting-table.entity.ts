import { Entity, Column, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../users/user.entity';
import { VoteReport } from '../votes/vote-report.entity';
import { School } from '../schools/school.entity';

@Entity('voting_tables')
export class VotingTable extends BaseEntity {
  @Column({ unique: true, name: 'table_number' })
  tableNumber: string;

  @Column({ name: 'total_voters', nullable: true })
  totalVoters: number;

  @Column({ default: true, name: 'is_active' })
  isActive: boolean;

  /** Unidad educativa donde está instalada esta mesa */
  @ManyToOne(() => School, (school) => school.tables, { nullable: true, eager: true })
  @JoinColumn({ name: 'school_id' })
  school: School;

  @OneToMany(() => User, (user) => user.table)
  delegates: User[];

  @OneToMany(() => VoteReport, (report) => report.table)
  reports: VoteReport[];
}
