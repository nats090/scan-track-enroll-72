-- Drop existing restrictive SELECT policy
DROP POLICY IF EXISTS "Staff can view attendance" ON attendance_records;

-- Create public SELECT policy for attendance records
CREATE POLICY "Public can view attendance"
ON attendance_records
FOR SELECT
TO public
USING (true);

-- Ensure INSERT policy allows public check-in/check-out
DROP POLICY IF EXISTS "Public can check in/out" ON attendance_records;

CREATE POLICY "Public can check in/out"
ON attendance_records
FOR INSERT
TO public
WITH CHECK (true);