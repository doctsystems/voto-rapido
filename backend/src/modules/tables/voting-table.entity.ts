import { Entity, Column, OneToMany, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../users/user.entity';
import { VoteReport } from '../votes/vote-report.entity';
import { School } from '../schools/school.entity';

/**
 * El número de mesa puede repetirse entre recintos (ej: "Mesa 1" existe en cada recinto).
 * La unicidad real es la combinación (table_number, school_id).
 * Se usa @Index compuesto en lugar de @Unique para mayor control.
 */
@Index('UQ_table_number_school', ['tableNumber', 'school_id'], { unique: true, sparse: true })
@Entity('voting_tables')
export class VotingTable extends BaseEntity {
  @Column({ name: 'table_number' })
  tableNumber: string;

  /** FK columna explícita para poder usar en @Index */
  @Column({ name: 'school_id', nullable: true, type: 'uuid' })
  school_id: string | null;

  @Column({ name: 'total_voters', nullable: true })
  totalVoters: number;

  @Column({ default: true, name: 'is_active' })
  isActive: boolean;

  /** Recinto electoral donde está instalada esta mesa */
  @ManyToOne(() => School, (school) => school.tables, { nullable: true, eager: true })
  @JoinColumn({ name: 'school_id' })
  school: School;

  @OneToMany(() => User, (user) => user.table)
  delegates: User[];

  @OneToMany(() => VoteReport, (report) => report.table)
  reports: VoteReport[];
}
