-- Enable email confirmation (you can disable this in Supabase Auth settings if needed)
-- This migration will help set up admin users

-- First, let's create a function to help create admin users with roles
CREATE OR REPLACE FUNCTION create_admin_user(
  user_email TEXT,
  user_password TEXT,
  user_role app_role1 DEFAULT 'admin'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_user_id uuid;
BEGIN
  -- Note: This function is for manual execution in SQL editor only
  -- It cannot create auth users directly from SQL
  -- You must create the user via Supabase Auth UI or API first
  -- Then use this to assign the role
  
  -- Check if user exists in auth.users
  SELECT id INTO new_user_id
  FROM auth.users
  WHERE email = user_email;
  
  IF new_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % does not exist. Create the user in Supabase Auth first.', user_email;
  END IF;
  
  -- Check if user already has a role
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = new_user_id) THEN
    RAISE NOTICE 'User % already has a role assigned', user_email;
    RETURN new_user_id;
  END IF;
  
  -- Insert role for the user
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new_user_id, user_role);
  
  RAISE NOTICE 'Successfully assigned % role to user %', user_role, user_email;
  RETURN new_user_id;
END;
$$;

-- Add a helpful comment
COMMENT ON FUNCTION create_admin_user IS 'Helper function to assign admin/librarian role to existing auth users. The user must be created in Supabase Auth first.';
