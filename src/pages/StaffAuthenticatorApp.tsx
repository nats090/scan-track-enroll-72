import { useState, useEffect } from 'react';
import { TOTP } from 'otpauth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, Clock, Shield, ScanLine, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import BarcodeScanner from '@/components/BarcodeScanner';
import BackButton from '@/components/BackButton';

interface TOTPSecret {
  role: string;
  secret: string;
}

const StaffAuthenticatorApp = () => {
  const [secret, setSecret] = useState<string>('');
  const [code, setCode] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState(30);
  const [copied, setCopied] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSecret();
  }, []);

  useEffect(() => {
    if (secret) {
      updateCode();
      const interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            updateCode();
            return 30;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [secret]);

  const loadSecret = async () => {
    const { data } = await supabase
      .from('totp_secrets')
      .select('secret')
      .eq('role', 'librarian')
      .single();

    if (data) {
      setSecret(data.secret);
    }
  };

  const updateCode = () => {
    if (!secret) return;
    
    const totp = new TOTP({
      secret: secret,
      digits: 6,
      period: 30,
    });

    const generatedCode = totp.generate();
    setCode(generatedCode);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast({
      title: "Code Copied",
      description: "Authentication code copied to clipboard",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const getProgressPercentage = () => {
    return (timeLeft / 30) * 100;
  };

  const handleQRScan = (scannedCode: string) => {
    // QR code contains role:totp format (e.g., "librarian:123456")
    try {
      const [role, totpCode] = scannedCode.split(':');
      
      if (role === 'librarian' && totpCode && totpCode.length === 6) {
        const totp = new TOTP({
          secret: secret,
          digits: 6,
          period: 30,
        });

        const isValid = totp.validate({ token: totpCode, window: 2 }) !== null;
        
        if (isValid) {
          sessionStorage.setItem('totp_verified_librarian', Date.now().toString());
          toast({
            title: "Authentication Successful",
            description: "Library Staff access granted",
          });
          setScannerOpen(false);
          
          // Redirect to staff page
          window.location.href = '#/staff';
        } else {
          toast({
            title: "Invalid Code",
            description: "The scanned QR code is expired or invalid",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      toast({
        title: "Scan Error",
        description: "Unable to process QR code",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-accent/20 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <BackButton />
        
        {/* Header */}
        <div className="text-center space-y-2 pt-4">
          <div className="flex justify-center mb-4">
            <Shield className="h-16 w-16 text-accent-foreground" />
          </div>
          <h1 className="text-4xl font-bold text-foreground">Library Authenticator</h1>
          <p className="text-muted-foreground">Staff Access - Generate secure codes</p>
        </div>

        {/* Timer Card */}
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-accent-foreground" />
                <CardTitle className="text-card-foreground">Time Remaining</CardTitle>
              </div>
              <span className="text-3xl font-mono font-bold text-accent-foreground">
                {timeLeft}s
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <Progress value={getProgressPercentage()} className="h-2" />
            <p className="text-sm text-muted-foreground mt-2">
              Codes refresh automatically every 30 seconds
            </p>
          </CardContent>
        </Card>

        {/* QR Scanner Button */}
        <Button 
          onClick={() => setScannerOpen(true)}
          className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
          size="lg"
        >
          <ScanLine className="mr-2 h-5 w-5" />
          Scan QR Code to Authenticate
        </Button>

        {/* Code Card */}
        <Card className="bg-card border-border">
          <CardHeader className="bg-accent/10">
            <CardTitle className="text-card-foreground flex items-center gap-2">
              <Shield className="h-5 w-5 text-accent-foreground" />
              Library Staff
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Use this code to access the library staff panel
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="bg-muted p-6 rounded-lg border border-border">
              <div className="text-center">
                <p className="text-5xl font-mono font-bold tracking-wider text-accent-foreground">
                  {code || '------'}
                </p>
              </div>
            </div>
            <Button
              onClick={copyCode}
              className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
              variant="default"
            >
              {copied ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Code
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Separator className="bg-border" />

        {/* Info Card */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-card-foreground">How to Use</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-muted-foreground">
            <p>• Open the staff login page on the main system</p>
            <p>• Enter the 6-digit code shown above, or scan the QR code</p>
            <p>• Codes refresh every 30 seconds</p>
            <p>• Keep this app on your personal device</p>
          </CardContent>
        </Card>
      </div>

      {/* QR Scanner Dialog */}
      <Dialog open={scannerOpen} onOpenChange={setScannerOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Scan QR Code</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <BarcodeScanner 
              onBarcodeDetected={handleQRScan}
              isActive={scannerOpen}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StaffAuthenticatorApp;
