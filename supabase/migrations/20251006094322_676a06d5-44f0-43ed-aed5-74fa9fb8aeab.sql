-- ============================================
-- SECURITY FIX: Remove public TOTP secrets access
-- ============================================
DROP POLICY IF EXISTS "Anyone can view TOTP secrets" ON public.totp_secrets;

-- ============================================
-- CREATE USER ROLES TABLE (if not exists)
-- ============================================
-- Note: app_role1 enum already exists with 'admin' and 'librarian'

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role1 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Users can view their own roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Only admins can manage roles (insert/update/delete)
CREATE POLICY "Admins can manage all roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- RATE LIMITING TABLE FOR TOTP
-- ============================================
CREATE TABLE IF NOT EXISTS public.totp_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text NOT NULL,
  role text NOT NULL,
  attempted_at timestamp with time zone DEFAULT now() NOT NULL,
  success boolean DEFAULT false NOT NULL
);

ALTER TABLE public.totp_attempts ENABLE ROW LEVEL SECURITY;

-- Only authenticated staff can view attempts
CREATE POLICY "Staff can view TOTP attempts"
ON public.totp_attempts FOR SELECT
TO authenticated
USING (public.is_staff(auth.uid()));

-- ============================================
-- AUDIT LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  table_name text,
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs"
ON public.audit_logs FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- RLS POLICIES FOR EXISTING TABLES
-- ============================================

-- STUDENTS TABLE
-- Public (anonymous) can read student info for check-in/check-out
CREATE POLICY "Public can view students"
ON public.students FOR SELECT
TO anon
USING (true);

-- Staff can view all students
CREATE POLICY "Staff can view all students"
ON public.students FOR SELECT
TO authenticated
USING (public.is_staff(auth.uid()));

-- Only staff can insert/update/delete students
CREATE POLICY "Staff can insert students"
ON public.students FOR INSERT
TO authenticated
WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Staff can update students"
ON public.students FOR UPDATE
TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Staff can delete students"
ON public.students FOR DELETE
TO authenticated
USING (public.is_staff(auth.uid()));

-- ATTENDANCE RECORDS TABLE
-- Public can insert check-in/check-out records
CREATE POLICY "Public can check in/out"
ON public.attendance_records FOR INSERT
TO anon
WITH CHECK (true);

-- Staff can view all attendance records
CREATE POLICY "Staff can view attendance"
ON public.attendance_records FOR SELECT
TO authenticated
USING (public.is_staff(auth.uid()));

-- Staff can update/delete attendance records
CREATE POLICY "Staff can update attendance"
ON public.attendance_records FOR UPDATE
TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Staff can delete attendance"
ON public.attendance_records FOR DELETE
TO authenticated
USING (public.is_staff(auth.uid()));

-- DOCUMENT LINKS TABLE
-- Public can view documents (educational resources)
CREATE POLICY "Public can view documents"
ON public.document_links FOR SELECT
TO anon
USING (true);

-- Only staff can manage documents
CREATE POLICY "Staff can insert documents"
ON public.document_links FOR INSERT
TO authenticated
WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Staff can update documents"
ON public.document_links FOR UPDATE
TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Staff can delete documents"
ON public.document_links FOR DELETE
TO authenticated
USING (public.is_staff(auth.uid()));

-- TOTP SECRETS TABLE
-- Only allow backend (edge functions with service role) to access
-- No policies for authenticated users - secrets should never be exposed to frontend
CREATE POLICY "Service role can read TOTP secrets"
ON public.totp_secrets FOR SELECT
USING (false); -- Will be accessed via service role in edge functions

-- ============================================
-- CLEANUP: Remove old permissive policies if any
-- ============================================
-- Clean up any overly permissive policies on totp_attempts
DROP POLICY IF EXISTS "Anyone can insert TOTP attempts" ON public.totp_attempts;