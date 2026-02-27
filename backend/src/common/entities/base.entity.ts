import {
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Column,
} from 'typeorm';

/**
 * Base entity with audit columns:
 * created_at, updated_at, deleted_at
 * created_by, updated_by, deleted_by  ← user id who performed the action
 */
export abstract class BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date;

  @Column({ nullable: true, name: 'created_by' })
  createdBy: string;

  @Column({ nullable: true, name: 'updated_by' })
  updatedBy: string;

  @Column({ nullable: true, name: 'deleted_by' })
  deletedBy: string;
}
