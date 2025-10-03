-- Implement Role-Based Access Control for Student Data Protection
-- This fixes the critical security vulnerability where any authenticated user can access all student data

-- ==========================================
-- 1. CREATE ROLE SYSTEM
-- ==========================================

-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'librarian', 'student');

-- Create user_roles table to store role assignments
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles table
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Users can view their own roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Only admins can manage roles (we'll create the policy after the function)

-- Create security definer function to check if user has a specific role
-- This prevents recursive RLS issues
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Helper function to check if user is admin or librarian (staff)
CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'librarian')
  )
$$;

-- Now create policy for admins to manage roles
CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ==========================================
-- 2. UPDATE STUDENTS TABLE RLS POLICIES
-- ==========================================

-- Drop the insecure policies that allow any authenticated user full access
DROP POLICY IF EXISTS "Authenticated users can view students" ON public.students;
DROP POLICY IF EXISTS "Authenticated users can insert students" ON public.students;
DROP POLICY IF EXISTS "Authenticated users can update students" ON public.students;
DROP POLICY IF EXISTS "Authenticated users can delete students" ON public.students;

-- Only staff (admin/librarian) can view student records
CREATE POLICY "Staff can view all students"
ON public.students
FOR SELECT
TO authenticated
USING (public.is_staff(auth.uid()));

-- Only staff can insert student records
CREATE POLICY "Staff can insert students"
ON public.students
FOR INSERT
TO authenticated
WITH CHECK (public.is_staff(auth.uid()));

-- Only staff can update student records
CREATE POLICY "Staff can update students"
ON public.students
FOR UPDATE
TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));

-- Only admins can delete student records
CREATE POLICY "Admins can delete students"
ON public.students
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- ==========================================
-- 3. UPDATE ATTENDANCE RECORDS RLS POLICIES
-- ==========================================

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can view attendance records" ON public.attendance_records;
DROP POLICY IF EXISTS "Authenticated users can insert attendance records" ON public.attendance_records;
DROP POLICY IF EXISTS "Authenticated users can update attendance records" ON public.attendance_records;
DROP POLICY IF EXISTS "Authenticated users can delete attendance records" ON public.attendance_records;

-- Only staff can view attendance records
CREATE POLICY "Staff can view attendance records"
ON public.attendance_records
FOR SELECT
TO authenticated
USING (public.is_staff(auth.uid()));

-- Only staff can insert attendance records
CREATE POLICY "Staff can insert attendance records"
ON public.attendance_records
FOR INSERT
TO authenticated
WITH CHECK (public.is_staff(auth.uid()));

-- Only staff can update attendance records
CREATE POLICY "Staff can update attendance records"
ON public.attendance_records
FOR UPDATE
TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));

-- Only admins can delete attendance records
CREATE POLICY "Admins can delete attendance records"
ON public.attendance_records
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- ==========================================
-- 4. UPDATE DOCUMENT LINKS RLS POLICIES
-- ==========================================

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view documents" ON public.document_links;
DROP POLICY IF EXISTS "Authenticated users can insert documents" ON public.document_links;
DROP POLICY IF EXISTS "Authenticated users can update documents" ON public.document_links;
DROP POLICY IF EXISTS "Authenticated users can delete documents" ON public.document_links;

-- Only authenticated users can view documents (not public anymore)
CREATE POLICY "Authenticated users can view documents"
ON public.document_links
FOR SELECT
TO authenticated
USING (true);

-- Only staff can upload documents
CREATE POLICY "Staff can insert documents"
ON public.document_links
FOR INSERT
TO authenticated
WITH CHECK (public.is_staff(auth.uid()));

-- Only staff can update documents
CREATE POLICY "Staff can update documents"
ON public.document_links
FOR UPDATE
TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));

-- Only admins can delete documents
CREATE POLICY "Admins can delete documents"
ON public.document_links
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));