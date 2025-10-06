import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Shield, AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface TOTPVerificationProps {
  role: 'admin' | 'librarian';
  onVerified: () => void;
}

const TOTPVerification = ({ role, onVerified }: TOTPVerificationProps) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const verifyCode = async () => {
    if (isVerifying) return;
    
    setIsVerifying(true);
    setError('');

    try {
      console.log('🔐 Calling verify-totp function for role:', role);
      
      const { data, error: invokeError } = await supabase.functions.invoke('verify-totp', {
        body: { role, code }
      });

      if (invokeError) {
        console.error('❌ Error invoking function:', invokeError);
        setError('Verification failed. Please try again.');
        setCode('');
        setIsVerifying(false);
        return;
      }

      if (data?.success) {
        console.log('✅ TOTP verification successful');
        // Store verification token in sessionStorage
        sessionStorage.setItem(`totp_verified_${role}`, data.token);
        sessionStorage.setItem(`totp_expires_${role}`, data.expiresAt.toString());
        onVerified();
      } else {
        console.log('❌ Invalid TOTP code');
        setError(data?.error || 'Invalid code. Please try again.');
        setCode('');
      }
    } catch (err) {
      console.error('❌ Exception during verification:', err);
      setError('Network error. Please check your connection.');
      setCode('');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCodeChange = (value: string) => {
    setCode(value);
    setError('');
    
    // Auto-verify when 6 digits are entered
    if (value.length === 6 && !isVerifying) {
      setTimeout(() => verifyCode(), 100);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Shield className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl">
            {role === 'admin' ? 'Admin' : 'Library Staff'} Access
          </CardTitle>
          <CardDescription>
            Enter the 6-digit code from your authenticator app
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center">
            <InputOTP
              maxLength={6}
              value={code}
              onChange={handleCodeChange}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            className="w-full"
            onClick={verifyCode}
            disabled={code.length !== 6 || isVerifying}
          >
            {isVerifying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              'Verify Code'
            )}
          </Button>

          <div className="text-center text-sm text-muted-foreground">
            <p>Use your authenticator app to get the code</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TOTPVerification;
