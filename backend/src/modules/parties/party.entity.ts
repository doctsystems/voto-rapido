import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../users/user.entity';
import { VoteEntry } from '../votes/vote-entry.entity';
import { PartyElectionType } from './party-election-type.entity';

@Entity('parties')
export class Party extends BaseEntity {
  @Column({ unique: true })
  name: string;

  @Column({ unique: true })
  acronym: string;

  @Column({ nullable: true })
  color: string;

  @Column({ nullable: true })
  logoUrl: string;

  @Column({ default: true, name: 'is_active' })
  isActive: boolean;

  @OneToMany(() => User, (user) => user.party)
  users: User[];

  @OneToMany(() => VoteEntry, (entry) => entry.party)
  voteEntries: VoteEntry[];

  @OneToMany(() => PartyElectionType, (pet) => pet.party, { cascade: true })
  electionTypes: PartyElectionType[];
}
