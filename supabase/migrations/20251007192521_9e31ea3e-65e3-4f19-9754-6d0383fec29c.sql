-- Fix search_path for the cleanup function
CREATE OR REPLACE FUNCTION clean_expired_verification_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM public.verification_sessions
  WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '';