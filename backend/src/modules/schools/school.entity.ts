import { Entity, Column, OneToMany } from "typeorm";
import { BaseEntity } from "../../common/entities/base.entity";
import { VotingTable } from "../tables/voting-table.entity";

@Entity("schools")
export class School extends BaseEntity {
  /** Nombre completo del recinto electoral */
  @Column({ unique: true, name: "nombre_recinto" })
  nombreRecinto: string;

  /** Nombre abreviado del recinto */
  @Column({ nullable: true, name: "nombre_abrev" })
  nombreAbrev: string;

  @Column({ name: "codigo_recinto", unique: true, nullable: true })
  codigoRecinto: string;

  @Column({ nullable: true })
  departamento: string;

  @Column({ nullable: true })
  provincia: string;

  @Column({ nullable: true })
  municipio: string;

  @Column({ nullable: true, name: "asiento_electoral" })
  asientoElectoral: string;

  @Column({ nullable: true })
  localidad: string;

  @Column({ nullable: true, type: "int" })
  circunscripcion: number;

  @Column({ default: true, name: "is_active" })
  isActive: boolean;

  @OneToMany(() => VotingTable, (table) => table.school)
  tables: VotingTable[];
}
