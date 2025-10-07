-- Create verification sessions table
CREATE TABLE IF NOT EXISTS public.verification_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'librarian')),
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '5 minutes')
);

-- Enable RLS
ALTER TABLE public.verification_sessions ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read verification sessions (needed for polling)
CREATE POLICY "Anyone can read verification sessions"
ON public.verification_sessions
FOR SELECT
USING (true);

-- Allow anyone to insert verification sessions
CREATE POLICY "Anyone can create verification sessions"
ON public.verification_sessions
FOR INSERT
WITH CHECK (true);

-- Allow anyone to update verification sessions
CREATE POLICY "Anyone can update verification sessions"
ON public.verification_sessions
FOR UPDATE
USING (true);

-- Create index for faster lookups
CREATE INDEX idx_verification_sessions_session_id ON public.verification_sessions(session_id);
CREATE INDEX idx_verification_sessions_expires_at ON public.verification_sessions(expires_at);

-- Create function to clean up expired sessions
CREATE OR REPLACE FUNCTION clean_expired_verification_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM public.verification_sessions
  WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;