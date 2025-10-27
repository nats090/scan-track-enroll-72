-- Performance optimization: Add indexes for faster queries

-- Speed up student lookups by student_id
CREATE INDEX IF NOT EXISTS idx_students_student_id ON students(student_id);

-- Speed up student lookups by RFID
CREATE INDEX IF NOT EXISTS idx_students_rfid ON students(rfid) WHERE rfid IS NOT NULL;

-- Speed up student lookups by library
CREATE INDEX IF NOT EXISTS idx_students_library ON students(library) WHERE library IS NOT NULL;

-- Speed up attendance queries by student_id
CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON attendance_records(student_id);

-- Speed up attendance queries by timestamp (most recent first)
CREATE INDEX IF NOT EXISTS idx_attendance_timestamp ON attendance_records(timestamp DESC);

-- Speed up attendance queries by type (check-in/check-out)
CREATE INDEX IF NOT EXISTS idx_attendance_type ON attendance_records(type);

-- Speed up attendance queries by library
CREATE INDEX IF NOT EXISTS idx_attendance_library ON attendance_records(library) WHERE library IS NOT NULL;

-- Composite index for status checks and cooldown validation
-- This speeds up queries that need to find the most recent check-in/check-out for a student
CREATE INDEX IF NOT EXISTS idx_attendance_student_type_time ON attendance_records(student_id, type, timestamp DESC);

-- Composite index for student database ID lookups in attendance
CREATE INDEX IF NOT EXISTS idx_attendance_student_db_id ON attendance_records(student_database_id) WHERE student_database_id IS NOT NULL;