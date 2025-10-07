import { useEffect, useState } from 'react';
import { TOTP } from 'otpauth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Shield, Clock, Copy, Check, QrCode, ScanLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import BarcodeScanner from '@/components/BarcodeScanner';
import BackButton from '@/components/BackButton';

interface TOTPSecret {
  role: string;
  secret: string;
}

const AuthenticatorApp = () => {
  const [secrets, setSecrets] = useState<TOTPSecret[]>([]);
  const [codes, setCodes] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(30);
  const [copiedRole, setCopiedRole] = useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSecrets();
  }, []);

  const loadSecrets = async () => {
    const { data, error } = await supabase
      .from('totp_secrets')
      .select('role, secret');

    if (error) {
      console.error('Error loading secrets:', error);
      return;
    }

    setSecrets(data || []);
  };

  const generateCode = (secret: string): string => {
    try {
      const totp = new TOTP({
        secret: secret,
        digits: 6,
        period: 30,
      });
      return totp.generate();
    } catch (error) {
      console.error('Error generating TOTP:', error);
      return '------';
    }
  };

  useEffect(() => {
    const updateCodes = () => {
      const newCodes: Record<string, string> = {};
      secrets.forEach(({ role, secret }) => {
        newCodes[role] = generateCode(secret);
      });
      setCodes(newCodes);

      // Calculate time left until next code
      const now = Math.floor(Date.now() / 1000);
      const timeRemaining = 30 - (now % 30);
      setTimeLeft(timeRemaining);
    };

    updateCodes();
    const interval = setInterval(updateCodes, 1000);

    return () => clearInterval(interval);
  }, [secrets]);

  const copyCode = (role: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedRole(role);
    toast({
      title: "Code copied!",
      description: `${role.charAt(0).toUpperCase() + role.slice(1)} code copied to clipboard`,
    });
    setTimeout(() => setCopiedRole(null), 2000);
  };

  const getProgressPercentage = () => {
    return (timeLeft / 30) * 100;
  };

  const handleQRScan = (code: string) => {
    // QR code contains role:totp format (e.g., "admin:123456")
    try {
      const [role, totpCode] = code.split(':');
      
      if (totpCode && totpCode.length === 6) {
        const secret = secrets.find(s => s.role === role);
        if (secret) {
          const totp = new TOTP({
            secret: secret.secret,
            digits: 6,
            period: 30,
          });

          const isValid = totp.validate({ token: totpCode, window: 2 }) !== null;
          
          if (isValid) {
            sessionStorage.setItem(`totp_verified_${role}`, Date.now().toString());
            toast({
              title: "Authentication Successful",
              description: `${role === 'admin' ? 'Admin' : 'Library Staff'} access granted`,
            });
            setScannerOpen(false);
            
            // Redirect to appropriate page
            window.location.href = `#/${role}`;
          } else {
            toast({
              title: "Invalid Code",
              description: "The scanned QR code is expired or invalid",
              variant: "destructive",
            });
          }
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
            <Shield className="h-16 w-16 text-primary" />
          </div>
          <h1 className="text-4xl font-bold text-foreground">Library Authenticator</h1>
          <p className="text-muted-foreground">Admin Access - Generate secure codes</p>
        </div>

        {/* Timer Card */}
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                <CardTitle className="text-card-foreground">Time Remaining</CardTitle>
              </div>
              <span className="text-3xl font-mono font-bold text-primary">
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
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
          size="lg"
        >
          <ScanLine className="mr-2 h-5 w-5" />
          Scan QR Code to Authenticate
        </Button>

        {/* Code Cards */}
        <div className="space-y-4">
          {secrets.map(({ role }) => (
            <Card key={role} className="bg-card border-border">
              <CardHeader className={role === 'admin' ? 'bg-primary/10' : 'bg-accent/10'}>
                <CardTitle className="text-card-foreground flex items-center gap-2">
                  <Shield className={`h-5 w-5 ${role === 'admin' ? 'text-primary' : 'text-accent-foreground'}`} />
                  {role === 'admin' ? 'Administrator' : 'Library Staff'}
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Use this code to access the {role === 'admin' ? 'admin' : 'library staff'} panel
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="bg-muted p-6 rounded-lg border border-border">
                  <div className="text-center">
                    <p className={`text-5xl font-mono font-bold tracking-wider ${
                      role === 'admin' ? 'text-primary' : 'text-accent-foreground'
                    }`}>
                      {codes[role] || '------'}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => copyCode(role, codes[role])}
                  className={`w-full ${
                    role === 'admin' 
                      ? 'bg-primary hover:bg-primary/90 text-primary-foreground' 
                      : 'bg-accent hover:bg-accent/90 text-accent-foreground'
                  }`}
                  variant="default"
                >
                  {copiedRole === role ? (
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
          ))}
        </div>

        <Separator className="bg-border" />

        {/* Info Card */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-card-foreground">How to Use</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-muted-foreground">
            <p>• Open the admin or staff login page on the main system</p>
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

export default AuthenticatorApp;
