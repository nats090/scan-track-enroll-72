-- Create approved_totp_users table for PWA access control
CREATE TABLE IF NOT EXISTS public.approved_totp_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email text NOT NULL,
  approved boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.approved_totp_users ENABLE ROW LEVEL SECURITY;

-- Users can view their own approval status
CREATE POLICY "Users can view their own approval status"
ON public.approved_totp_users
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admins can view all approval requests
CREATE POLICY "Admins can view all approval requests"
ON public.approved_totp_users
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Admins can update approval status
CREATE POLICY "Admins can update approval status"
ON public.approved_totp_users
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Auto-insert approved users with @ndkc.edu.ph emails
CREATE OR REPLACE FUNCTION public.handle_new_totp_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Auto-approve @ndkc.edu.ph emails
  INSERT INTO public.approved_totp_users (user_id, email, approved)
  VALUES (
    NEW.id, 
    NEW.email,
    NEW.email LIKE '%@ndkc.edu.ph'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_totp
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_totp_user();

-- Trigger for updated_at
CREATE TRIGGER update_approved_totp_users_updated_at
  BEFORE UPDATE ON public.approved_totp_users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();