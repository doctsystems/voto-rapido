-- Drop old single-column unique constraint on table_number
-- This allows the same table number to exist in different recintos.
-- The composite unique (tableNumber, school_id) is enforced by TypeORM @Unique decorator.
DO $$
DECLARE
  cname TEXT;
BEGIN
  SELECT constraint_name INTO cname
    FROM information_schema.table_constraints
   WHERE table_name = 'voting_tables'
     AND constraint_type = 'UNIQUE'
     AND constraint_name != 'UQ_voting_tables_table_school'  -- keep composite
  LIMIT 1;

  IF cname IS NOT NULL THEN
    EXECUTE 'ALTER TABLE voting_tables DROP CONSTRAINT IF EXISTS ' || quote_ident(cname);
  END IF;
END $$;
