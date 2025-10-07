-- Add student_type column to distinguish between IBED and COLLEGE students
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS student_type TEXT DEFAULT 'college';

-- Add level column for education level
ALTER TABLE public.students
ADD COLUMN IF NOT EXISTS level TEXT;

-- Add user_type column to distinguish between student and teacher
ALTER TABLE public.students
ADD COLUMN IF NOT EXISTS user_type TEXT DEFAULT 'student';

-- Update existing records to have proper defaults
UPDATE public.students 
SET student_type = 'college', user_type = 'student'
WHERE student_type IS NULL OR user_type IS NULL;

-- Add the same columns to attendance_records for tracking
ALTER TABLE public.attendance_records
ADD COLUMN IF NOT EXISTS student_type TEXT;

ALTER TABLE public.attendance_records
ADD COLUMN IF NOT EXISTS level TEXT;

ALTER TABLE public.attendance_records
ADD COLUMN IF NOT EXISTS user_type TEXT;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_students_user_type ON public.students(user_type);
CREATE INDEX IF NOT EXISTS idx_students_student_type ON public.students(student_type);
CREATE INDEX IF NOT EXISTS idx_students_level ON public.students(level);
CREATE INDEX IF NOT EXISTS idx_attendance_user_type ON public.attendance_records(user_type);
CREATE INDEX IF NOT EXISTS idx_attendance_student_type ON public.attendance_records(student_type);