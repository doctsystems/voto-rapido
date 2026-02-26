import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { VoteEntry } from '../votes/vote-entry.entity';

@Entity('election_types')
export class ElectionType extends BaseEntity {
  @Column({ unique: true })
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ default: 0 })
  order: number;

  @Column({ default: true, name: 'is_active' })
  isActive: boolean;

  @OneToMany(() => VoteEntry, (entry) => entry.electionType)
  voteEntries: VoteEntry[];
}
