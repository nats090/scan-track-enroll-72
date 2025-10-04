import { useState } from 'react';
import { TOTP } from 'otpauth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Shield, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface TOTPVerificationProps {
  role: 'admin' | 'librarian';
  secret: string;
  onVerified: () => void;
}

const TOTPVerification = ({ role, secret, onVerified }: TOTPVerificationProps) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const verifyCode = () => {
    try {
      const totp = new TOTP({
        secret: secret,
        digits: 6,
        period: 30,
      });

      const isValid = totp.validate({ token: code, window: 1 }) !== null;

      if (isValid) {
        // Store verification in sessionStorage (cleared when browser closes)
        sessionStorage.setItem(`totp_verified_${role}`, Date.now().toString());
        onVerified();
      } else {
        setError('Invalid code. Please try again.');
        setCode('');
      }
    } catch (err) {
      setError('Error verifying code. Please try again.');
      setCode('');
    }
  };

  const handleCodeChange = (value: string) => {
    setCode(value);
    setError('');
    
    // Auto-verify when 6 digits are entered
    if (value.length === 6) {
      setTimeout(() => {
        const totp = new TOTP({
          secret: secret,
          digits: 6,
          period: 30,
        });

        const isValid = totp.validate({ token: value, window: 1 }) !== null;

        if (isValid) {
          sessionStorage.setItem(`totp_verified_${role}`, Date.now().toString());
          onVerified();
        } else {
          setError('Invalid code. Please try again.');
          setCode('');
        }
      }, 100);
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
            disabled={code.length !== 6}
          >
            Verify Code
          </Button>

          <div className="text-center text-sm text-muted-foreground">
            <p>Don't have the authenticator app?</p>
            <a href="/#/authenticator" className="text-primary hover:underline">
              Open Authenticator App
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TOTPVerification;
