-- Fix critical security vulnerabilities by implementing proper RLS policies
-- This will require authentication to be implemented for the app to function

-- ==========================================
-- 1. FIX STUDENTS TABLE SECURITY
-- ==========================================

-- Drop the insecure policy that allows public access to sensitive student data
DROP POLICY IF EXISTS "Allow all operations on students" ON public.students;

-- Create secure policies that require authentication
-- Only authenticated users can view students (can be further restricted by role)
CREATE POLICY "Authenticated users can view students"
ON public.students
FOR SELECT
TO authenticated
USING (true);

-- Only authenticated users can insert students
CREATE POLICY "Authenticated users can insert students"
ON public.students
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Only authenticated users can update students
CREATE POLICY "Authenticated users can update students"
ON public.students
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Only authenticated users can delete students
CREATE POLICY "Authenticated users can delete students"
ON public.students
FOR DELETE
TO authenticated
USING (true);

-- ==========================================
-- 2. FIX ATTENDANCE RECORDS TABLE SECURITY
-- ==========================================

-- Drop the insecure policy that exposes student movement tracking
DROP POLICY IF EXISTS "Allow all operations on attendance_records" ON public.attendance_records;

-- Only authenticated users can view attendance records
CREATE POLICY "Authenticated users can view attendance records"
ON public.attendance_records
FOR SELECT
TO authenticated
USING (true);

-- Only authenticated users can insert attendance records
CREATE POLICY "Authenticated users can insert attendance records"
ON public.attendance_records
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Only authenticated users can update attendance records
CREATE POLICY "Authenticated users can update attendance records"
ON public.attendance_records
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Only authenticated users can delete attendance records
CREATE POLICY "Authenticated users can delete attendance records"
ON public.attendance_records
FOR DELETE
TO authenticated
USING (true);

-- ==========================================
-- 3. FIX DOCUMENT LINKS TABLE SECURITY
-- ==========================================

-- Drop the insecure policy that allows anyone to modify documents
DROP POLICY IF EXISTS "Allow all operations on document_links" ON public.document_links;

-- Allow public read access to documents (since these are educational resources)
-- But restrict write operations to authenticated users only
CREATE POLICY "Anyone can view documents"
ON public.document_links
FOR SELECT
TO public
USING (true);

-- Only authenticated users can upload documents
CREATE POLICY "Authenticated users can insert documents"
ON public.document_links
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Only authenticated users can update documents
CREATE POLICY "Authenticated users can update documents"
ON public.document_links
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Only authenticated users can delete documents
CREATE POLICY "Authenticated users can delete documents"
ON public.document_links
FOR DELETE
TO authenticated
USING (true);