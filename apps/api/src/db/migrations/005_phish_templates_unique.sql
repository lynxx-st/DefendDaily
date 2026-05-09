DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'phish_templates_name_unique'
  ) THEN
    ALTER TABLE phish_templates ADD CONSTRAINT phish_templates_name_unique UNIQUE (name);
  END IF;
END $$;
