-- Update RLS policies to allow staff operations without requiring auth.uid()
-- This allows TOTP-verified users to perform operations

-- Drop existing restrictive policies on students table
DROP POLICY IF EXISTS "Staff can insert students" ON public.students;
DROP POLICY IF EXISTS "Staff can update students" ON public.students;
DROP POLICY IF EXISTS "Staff can delete students" ON public.students;

-- Create new policies that allow staff operations without auth requirement
CREATE POLICY "Anyone can insert students"
ON public.students
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update students"
ON public.students
FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "Anyone can delete students"
ON public.students
FOR DELETE
USING (true);

-- Update attendance_records policies
DROP POLICY IF EXISTS "Staff can update attendance" ON public.attendance_records;
DROP POLICY IF EXISTS "Staff can delete attendance" ON public.attendance_records;

CREATE POLICY "Anyone can update attendance"
ON public.attendance_records
FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "Anyone can delete attendance"
ON public.attendance_records
FOR DELETE
USING (true);

-- Update document_links policies
DROP POLICY IF EXISTS "Staff can insert documents" ON public.document_links;
DROP POLICY IF EXISTS "Staff can update documents" ON public.document_links;
DROP POLICY IF EXISTS "Staff can delete documents" ON public.document_links;

CREATE POLICY "Anyone can insert documents"
ON public.document_links
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update documents"
ON public.document_links
FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "Anyone can delete documents"
ON public.document_links
FOR DELETE
USING (true);

-- Add helpful comment
COMMENT ON TABLE public.students IS 'Students table with public access - access control is managed at application level via TOTP verification';
COMMENT ON TABLE public.attendance_records IS 'Attendance records with public access - access control is managed at application level via TOTP verification';
COMMENT ON TABLE public.document_links IS 'Document links with public access - access control is managed at application level via TOTP verification';
