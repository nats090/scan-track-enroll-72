-- Allow duplicate student IDs by dropping unique constraint and adding a non-unique index
DO $$ BEGIN
  ALTER TABLE students DROP CONSTRAINT IF EXISTS students_student_id_key;
EXCEPTION WHEN undefined_object THEN
  -- Constraint might not exist; ignore
  NULL;
END $$;

-- Add helpful indexes
CREATE INDEX IF NOT EXISTS idx_students_student_id ON students(student_id);
CREATE INDEX IF NOT EXISTS idx_students_created_at ON students(created_at);