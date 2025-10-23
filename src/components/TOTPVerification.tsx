import { useState, useEffect } from 'react';
import { TOTP } from 'otpauth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Shield, AlertCircle, QrCode, WifiOff } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import QRCode from 'qrcode';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

interface TOTPVerificationProps {
  role: 'admin' | 'librarian';
  secret: string;
  onVerified: () => void;
}

const TOTPVerification = ({ role, secret, onVerified }: TOTPVerificationProps) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [currentCode, setCurrentCode] = useState('');
  const [sessionId, setSessionId] = useState('');
  const isOnline = useOnlineStatus();

  // Generate QR code with current TOTP and create verification session
  useEffect(() => {
    if (!secret) return;

    const generateQR = async () => {
      const totp = new TOTP({
        secret: secret,
        digits: 6,
        period: 30,
      });

      const code = totp.generate();
      setCurrentCode(code);

      // Generate unique session ID
      const newSessionId = `${role}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setSessionId(newSessionId);

      // Create verification session in database (only if online)
      if (isOnline) {
        try {
          const { error: dbError } = await supabase
            .from('verification_sessions')
            .insert({
              session_id: newSessionId,
              role: role,
              verified: false
            });

          if (dbError) {
            console.error('Error creating verification session:', dbError);
          }
        } catch (err) {
          console.warn('Could not create verification session (offline):', err);
        }
      }

      // Format: sessionId:role:code (e.g., "abc123:admin:123456")
      const qrData = `${newSessionId}:${role}:${code}`;
      
      try {
        const url = await QRCode.toDataURL(qrData, {
          width: 256,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#ffffff'
          }
        });
        setQrCodeUrl(url);
      } catch (err) {
        console.error('Error generating QR code:', err);
      }
    };

    generateQR();
    
    // Regenerate QR code every 30 seconds
    const interval = setInterval(generateQR, 30000);
    return () => clearInterval(interval);
  }, [secret, role, isOnline]);

  // Poll for verification from mobile app (only when online)
  useEffect(() => {
    if (!sessionId || !isOnline) return;

    const pollForVerification = async () => {
      try {
        const { data, error } = await supabase
          .from('verification_sessions')
          .select('verified')
          .eq('session_id', sessionId)
          .single();

        if (data?.verified) {
          // Mobile app has verified! Proceed with login
          sessionStorage.setItem(`totp_verified_${role}`, Date.now().toString());
          onVerified();
        }
      } catch (err) {
        console.warn('Could not poll verification session:', err);
      }
    };

    // Poll every 2 seconds
    const pollInterval = setInterval(pollForVerification, 2000);

    // Stop polling after 5 minutes
    const timeout = setTimeout(() => {
      clearInterval(pollInterval);
    }, 5 * 60 * 1000);

    return () => {
      clearInterval(pollInterval);
      clearTimeout(timeout);
    };
  }, [sessionId, role, onVerified, isOnline]);

  const verifyCode = () => {
    try {
      const totp = new TOTP({
        secret: secret,
        digits: 6,
        period: 30,
      });

      // Use larger window for validation (allows for time drift)
      const isValid = totp.validate({ token: code, window: 2 }) !== null;

      if (isValid) {
        // Store verification in sessionStorage (cleared when browser closes)
        sessionStorage.setItem(`totp_verified_${role}`, Date.now().toString());
        onVerified();
      } else {
        setError('Invalid code. Please check your device time and try again.');
        setCode('');
      }
    } catch (err) {
      console.error('TOTP verification error:', err);
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

        // Use larger window for validation (allows for time drift)
        const isValid = totp.validate({ token: value, window: 2 }) !== null;

        if (isValid) {
          sessionStorage.setItem(`totp_verified_${role}`, Date.now().toString());
          onVerified();
        } else {
          setError('Invalid code. Please check your device time and try again.');
          setCode('');
        }
      }, 100);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-muted to-accent/20">
      <Card className="w-full max-w-md bg-card border-border">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Shield className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl text-card-foreground">
            {role === 'admin' ? 'Admin' : 'Library Staff'} Access
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Enter the 6-digit code from your authenticator app or scan the QR code
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* TOTP Input */}
          <div className="space-y-4">
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
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={verifyCode}
              disabled={code.length !== 6}
            >
              Verify Code
            </Button>
          </div>

          <div className="relative">
            <Separator className="bg-border" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="bg-card px-2 text-muted-foreground text-sm">OR</span>
            </div>
          </div>

          {/* QR Code */}
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              {isOnline ? (
                <>
                  <QrCode className="h-4 w-4" />
                  <span className="text-sm font-medium">Scan with Authenticator App</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-4 w-4" />
                  <span className="text-sm font-medium">Manual code entry only (offline mode)</span>
                </>
              )}
            </div>
            
            {isOnline && qrCodeUrl && (
              <>
                <div className="flex justify-center">
                  <div className="bg-white p-4 rounded-lg border-2 border-border">
                    <img 
                      src={qrCodeUrl} 
                      alt="Authentication QR Code" 
                      className="w-48 h-48"
                    />
                  </div>
                </div>
                
                <div className="text-center text-xs text-muted-foreground">
                  <p>QR code refreshes every 30 seconds</p>
                  <p className="mt-1">Open your Library Authenticator App and scan this code</p>
                </div>
              </>
            )}
            
            {!isOnline && (
              <Alert>
                <WifiOff className="h-4 w-4" />
                <AlertDescription>
                  QR code scanning requires internet connection. Please use manual code entry from your cached authenticator codes.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TOTPVerification;
