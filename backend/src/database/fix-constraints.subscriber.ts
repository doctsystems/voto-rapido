import { DataSource } from "typeorm";
import { InjectDataSource } from "@nestjs/typeorm";
import { Injectable, Logger, OnModuleInit } from "@nestjs/common";

/**
 * Runs once on app startup to:
 * 1. Drop any legacy single-column unique constraint on voting_tables.table_number
 * 2. Ensure the composite unique index (table_number, school_id) exists
 *
 * TypeORM synchronize will handle (2) via @Index on the entity.
 * We only need to clean up the old single-col constraint that was created
 * before the composite key was introduced.
 */
@Injectable()
export class FixConstraintsService implements OnModuleInit {
  private readonly logger = new Logger(FixConstraintsService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async onModuleInit() {
    try {
      // Drop ALL unique constraints on voting_tables that cover ONLY table_number
      // (covers any name: UQ_xxx, uq_xxx, etc.)
      await this.dataSource.query(`
        DO $$
        DECLARE
          r RECORD;
        BEGIN
          FOR r IN
            SELECT tc.constraint_name
              FROM information_schema.table_constraints tc
              JOIN information_schema.constraint_column_usage ccu
                ON tc.constraint_name = ccu.constraint_name
                AND tc.table_name = ccu.table_name
             WHERE tc.table_name = 'voting_tables'
               AND tc.constraint_type = 'UNIQUE'
               AND ccu.column_name = 'table_number'
               -- Exclude composite constraints that also cover school_id
               AND tc.constraint_name NOT IN (
                 SELECT tc2.constraint_name
                   FROM information_schema.table_constraints tc2
                   JOIN information_schema.constraint_column_usage ccu2
                     ON tc2.constraint_name = ccu2.constraint_name
                  WHERE tc2.table_name = 'voting_tables'
                    AND ccu2.column_name = 'school_id'
               )
          LOOP
            EXECUTE 'ALTER TABLE voting_tables DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name);
            RAISE NOTICE 'Dropped legacy unique constraint: %', r.constraint_name;
          END LOOP;
        END $$;
      `);
      this.logger.log("✅ voting_tables constraint migration completed");
    } catch (err) {
      this.logger.warn("Could not run constraint migration: " + err?.message);
    }
  }
}
