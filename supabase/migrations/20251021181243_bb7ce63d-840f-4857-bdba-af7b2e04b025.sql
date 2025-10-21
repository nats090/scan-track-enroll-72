-- Update all college students (1st-4th year) to be labeled as students with college type
UPDATE students
SET 
  user_type = 'student',
  student_type = 'college'
WHERE 
  year IN ('1st Year', '2nd Year', '3rd Year', '4th Year')
  AND (user_type IS NULL OR user_type != 'teacher');