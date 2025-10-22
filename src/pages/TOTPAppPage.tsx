import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Copy, LogOut, Clock } from 'lucide-react';
import { TOTP } from 'otpauth';
import { User, Session } from '@supabase/supabase-js';

interface TOTPSecret {
  role: string;
  secret: string;
}

const TOTPAppPage = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isApproved, setIsApproved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [secrets, setSecrets] = useState<TOTPSecret[]>([]);
  const [codes, setCodes] = useState<{ [key: string]: string }>({});
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [copiedRole, setCopiedRole] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (!session?.user) {
          setTimeout(() => {
            navigate('/totp-auth');
          }, 0);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate('/totp-auth');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (user) {
      checkApproval();
    }
  }, [user]);

  useEffect(() => {
    if (isApproved) {
      loadSecrets();
    }
  }, [isApproved]);

  useEffect(() => {
    if (secrets.length > 0) {
      updateCodes();
      const interval = setInterval(() => {
        updateCodes();
        const seconds = 30 - (Math.floor(Date.now() / 1000) % 30);
        setTimeRemaining(seconds);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [secrets]);

  const checkApproval = async () => {
    try {
      const { data, error } = await supabase
        .from('approved_totp_users')
        .select('approved')
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;
      
      setIsApproved(data?.approved || false);
    } catch (error) {
      console.error('Error checking approval:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSecrets = async () => {
    try {
      const { data, error } = await supabase
        .from('totp_secrets')
        .select('role, secret');

      if (error) throw error;
      setSecrets(data || []);
    } catch (error) {
      console.error('Error loading secrets:', error);
      toast.error('Failed to load TOTP secrets');
    }
  };

  const updateCodes = () => {
    const newCodes: { [key: string]: string } = {};
    secrets.forEach(({ role, secret }) => {
      newCodes[role] = generateCode(secret);
    });
    setCodes(newCodes);
    
    const seconds = 30 - (Math.floor(Date.now() / 1000) % 30);
    setTimeRemaining(seconds);
  };

  const generateCode = (secret: string): string => {
    try {
      const totp = new TOTP({
        secret: secret,
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
      });
      return totp.generate();
    } catch (error) {
      console.error('Error generating TOTP:', error);
      return '------';
    }
  };

  const copyCode = (role: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedRole(role);
    toast.success('Code copied to clipboard!');
    setTimeout(() => setCopiedRole(null), 2000);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success('Signed out successfully');
    navigate('/totp-auth');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isApproved) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Waiting for Approval</CardTitle>
            <CardDescription>
              Your account is pending admin approval. Please check back later.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Email: {user?.email}
            </p>
            <Button onClick={handleSignOut} variant="outline" className="w-full">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <div className="max-w-md mx-auto space-y-4 pt-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Library Authenticator</h1>
          <Button onClick={handleSignOut} variant="outline" size="sm">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Time Remaining</CardTitle>
              </div>
              <span className="text-2xl font-bold text-primary">{timeRemaining}s</span>
            </div>
          </CardHeader>
          <CardContent>
            <Progress value={(timeRemaining / 30) * 100} className="h-2" />
          </CardContent>
        </Card>

        {secrets.map(({ role }) => (
          <Card key={role}>
            <CardHeader>
              <CardTitle className="capitalize">{role}</CardTitle>
              <CardDescription>Time-based One-Time Password</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-3xl font-mono font-bold tracking-wider">
                  {codes[role] || '------'}
                </span>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => copyCode(role, codes[role])}
                  disabled={!codes[role]}
                >
                  <Copy className={`h-4 w-4 ${copiedRole === role ? 'text-green-500' : ''}`} />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground text-center">
              Use these codes to authenticate with the library system. Codes refresh every 30 seconds.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TOTPAppPage;
