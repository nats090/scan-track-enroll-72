-- Update totp_secrets policies to allow the app to read secrets
DROP POLICY IF EXISTS "Service role can read TOTP secrets" ON totp_secrets;
DROP POLICY IF EXISTS "Public can view TOTP secrets" ON totp_secrets;

-- Allow public read-access (required for in-app authenticator)
CREATE POLICY "Public can view TOTP secrets"
ON totp_secrets
FOR SELECT
TO public
USING (true);