-- Create indexes for performance optimization to handle 5000+ records

-- Index on student_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_students_student_id ON public.students(student_id);

-- Index on email for search functionality
CREATE INDEX IF NOT EXISTS idx_students_email ON public.students(email);

-- Index on name for search functionality
CREATE INDEX IF NOT EXISTS idx_students_name ON public.students(name);

-- Index on library for filtering
CREATE INDEX IF NOT EXISTS idx_students_library ON public.students(library);

-- Index on course for filtering
CREATE INDEX IF NOT EXISTS idx_students_course ON public.students(course);

-- Index on user_type for filtering
CREATE INDEX IF NOT EXISTS idx_students_user_type ON public.students(user_type);

-- Index on biometric_data for quick biometric lookups (partial index)
CREATE INDEX IF NOT EXISTS idx_students_biometric ON public.students(biometric_data) WHERE biometric_data IS NOT NULL;

-- Index on rfid for quick RFID lookups (partial index)
CREATE INDEX IF NOT EXISTS idx_students_rfid ON public.students(rfid) WHERE rfid IS NOT NULL;

-- Composite index for common queries (created_at + library)
CREATE INDEX IF NOT EXISTS idx_students_created_library ON public.students(created_at DESC, library);

-- Attendance records indexes
CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON public.attendance_records(student_id);

-- Index on timestamp for date-based queries
CREATE INDEX IF NOT EXISTS idx_attendance_timestamp ON public.attendance_records(timestamp DESC);

-- Index on type (check-in/check-out)
CREATE INDEX IF NOT EXISTS idx_attendance_type ON public.attendance_records(type);

-- Index on library for filtering
CREATE INDEX IF NOT EXISTS idx_attendance_library ON public.attendance_records(library);

-- Composite index for common queries (timestamp + library + type)
CREATE INDEX IF NOT EXISTS idx_attendance_timestamp_library_type ON public.attendance_records(timestamp DESC, library, type);

-- Index on student_name for search
CREATE INDEX IF NOT EXISTS idx_attendance_student_name ON public.attendance_records(student_name);