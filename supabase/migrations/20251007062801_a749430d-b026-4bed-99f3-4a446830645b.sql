-- Add course and year fields to attendance_records to store student info at check-in time
ALTER TABLE attendance_records 
ADD COLUMN course text,
ADD COLUMN year text;

-- Update existing records to populate course and year from students table where possible
UPDATE attendance_records ar
SET 
  course = s.course,
  year = s.year
FROM students s
WHERE ar.student_id = s.student_id;