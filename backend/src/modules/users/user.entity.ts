import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  BeforeInsert,
  BeforeUpdate,
} from "typeorm";
import { Exclude } from "class-transformer";
import * as bcrypt from "bcryptjs";
import { BaseEntity } from "../../common/entities/base.entity";
import { Role } from "../../common/enums/role.enum";
import { Party } from "../parties/party.entity";
import { VotingTable } from "../tables/voting-table.entity";
import { School } from "../schools/school.entity";
import { VoteReport } from "../votes/vote-report.entity";

@Entity("users")
export class User extends BaseEntity {
  @Column({ unique: true })
  username: string;

  @Column({ nullable: true })
  phone: string;

  @Column()
  @Exclude()
  password: string;

  @Column({ name: "full_name" })
  fullName: string;

  @Column({ type: "enum", enum: Role, default: Role.DELEGADO })
  role: Role;

  @Column({ default: true, name: "is_active" })
  isActive: boolean;

  @Column({ default: false, name: "must_change_password" })
  mustChangePassword: boolean;

  @ManyToOne(() => Party, (party) => party.users, {
    nullable: true,
    eager: false,
  })
  @JoinColumn({ name: "party_id" })
  party: Party;

  @ManyToOne(() => VotingTable, (table) => table.delegates, {
    nullable: true,
    eager: false,
  })
  @JoinColumn({ name: "table_id" })
  table: VotingTable;

  @ManyToOne(() => School, { nullable: true, eager: false })
  @JoinColumn({ name: "school_id" })
  school: School;

  @OneToMany(() => VoteReport, (report) => report.delegate)
  reports: VoteReport[];

  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    if (this.password && !this.password.startsWith("$2")) {
      this.password = await bcrypt.hash(this.password, 10);
    }
  }

  async validatePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password);
  }
}
