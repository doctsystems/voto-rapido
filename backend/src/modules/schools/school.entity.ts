import { Entity, Column, OneToMany } from "typeorm";
import { BaseEntity } from "../../common/entities/base.entity";
import { VotingTable } from "../tables/voting-table.entity";

@Entity("schools")
export class School extends BaseEntity {
  @Column({ unique: true })
  name: string;

  @Column({ name: "code", unique: true, nullable: true })
  code: string;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  municipality: string;

  @Column({ nullable: true })
  province: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true, name: "principal_name" })
  principalName: string;

  @Column({ default: true, name: "is_active" })
  isActive: boolean;

  @OneToMany(() => VotingTable, (table) => table.school)
  tables: VotingTable[];
}
