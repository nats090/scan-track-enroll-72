-- Create table for TOTP secrets
CREATE TABLE public.totp_secrets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role TEXT NOT NULL UNIQUE CHECK (role IN ('admin', 'librarian')),
  secret TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.totp_secrets ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read secrets (they need them for the authenticator app)
CREATE POLICY "Anyone can view TOTP secrets"
ON public.totp_secrets
FOR SELECT
USING (true);

-- Only allow inserts/updates via SQL (admin setup)
CREATE POLICY "No direct inserts"
ON public.totp_secrets
FOR INSERT
WITH CHECK (false);

CREATE POLICY "No direct updates"
ON public.totp_secrets
FOR UPDATE
USING (false);

-- Add trigger for updated_at
CREATE TRIGGER update_totp_secrets_updated_at
BEFORE UPDATE ON public.totp_secrets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default TOTP secrets (these should be changed in production)
INSERT INTO public.totp_secrets (role, secret) VALUES
  ('admin', 'JBSWY3DPEHPK3PXP'),
  ('librarian', 'JBSWY3DPEHPK3PXQ');