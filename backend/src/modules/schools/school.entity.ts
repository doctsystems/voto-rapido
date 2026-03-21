import { Entity, Column, OneToMany } from "typeorm";
import { BaseEntity } from "../../common/entities/base.entity";
import { VotingTable } from "../tables/voting-table.entity";

@Entity("schools")
export class School extends BaseEntity {
  @Column({ unique: true, name: "name" })
  name: string;

  @Column({ nullable: true, name: "short_name" })
  shortName: string;

  @Column({ name: "code", unique: true, nullable: true, type: "int" })
  code: number;

  @Column({ name: "total_tables", nullable: true, type: "int" })
  tableCount: number;

  @Column({ default: true, name: "is_active" })
  isActive: boolean;

  @OneToMany(() => VotingTable, (table) => table.school)
  tables: VotingTable[];
}
