import {
  Entity,
  Column,
  OneToMany,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { BaseEntity } from "../../common/entities/base.entity";
import { User } from "../users/user.entity";
import { VoteReport } from "../votes/vote-report.entity";
import { School } from "../schools/school.entity";

@Index("UQ_table_number_school", ["number", "school_id"], {
  unique: true,
  sparse: true,
})
@Entity("voting_tables")
export class VotingTable extends BaseEntity {
  @Column({ name: "code", type: "int" })
  code: number;

  @Column({ name: "number", type: "int" })
  number: number;

  @Column({ name: "total_voters", nullable: true, type: "int" })
  totalVoters: number;

  @Column({ name: "school_id", nullable: true, type: "uuid" })
  school_id: string | null;

  @Column({ name: "is_active", default: true, type: "boolean" })
  isActive: boolean;

  @ManyToOne(() => School, (school) => school.tables, {
    nullable: true,
    eager: true,
  })
  @JoinColumn({ name: "school_id" })
  school: School;

  @OneToMany(() => User, (user) => user.table)
  delegates: User[];

  @OneToMany(() => VoteReport, (report) => report.table)
  reports: VoteReport[];
}
