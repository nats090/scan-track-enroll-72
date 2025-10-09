-- Add student_database_id column to attendance_records table to handle duplicate student IDs
-- This allows proper tracking of individual students even when they share the same ID number
ALTER TABLE public.attendance_records 
ADD COLUMN IF NOT EXISTS student_database_id UUID REFERENCES public.students(id);

-- Add index for better performance when querying by student_database_id
CREATE INDEX IF NOT EXISTS idx_attendance_student_database_id 
ON public.attendance_records(student_database_id);

-- Add comment explaining the purpose of this column
COMMENT ON COLUMN public.attendance_records.student_database_id IS 
'Unique database ID for the student, used to distinguish between students who may share the same student ID number';