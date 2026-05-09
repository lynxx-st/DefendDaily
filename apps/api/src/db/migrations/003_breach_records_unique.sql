DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'breach_records_user_breach_unique'
  ) THEN
    ALTER TABLE breach_records
      ADD CONSTRAINT breach_records_user_breach_unique UNIQUE (user_id, breach_name);
  END IF;
END $$;
