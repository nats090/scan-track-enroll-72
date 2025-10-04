import { useEffect, useState } from 'react';
import { TOTP } from 'otpauth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Shield, Clock, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
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

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <BackButton />
        
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Library Authenticator</h1>
          </div>
          <p className="text-muted-foreground">
            Time-based codes for secure access (works offline)
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Time Remaining
            </CardTitle>
            <CardDescription>
              Codes refresh every 30 seconds
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-mono font-bold">{timeLeft}s</span>
                <span className="text-sm text-muted-foreground">
                  Next refresh
                </span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-1000 ease-linear"
                  style={{ width: `${getProgressPercentage()}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {secrets.map(({ role }) => (
            <Card key={role}>
              <CardHeader>
                <CardTitle className="capitalize">{role}</CardTitle>
                <CardDescription>
                  Use this code to access {role} features
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-4xl font-mono font-bold tracking-wider">
                      {codes[role] || '------'}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyCode(role, codes[role])}
                  >
                    {copiedRole === role ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Separator />

        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-lg">How to use</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>1. Open this page on your device (works offline)</p>
            <p>2. When accessing Admin or Library Staff pages, enter the current code</p>
            <p>3. Codes change every 30 seconds for security</p>
            <p>4. Keep this page bookmarked for easy access</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AuthenticatorApp;
