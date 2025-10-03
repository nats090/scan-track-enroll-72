import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth, UserRole } from '@/hooks/useAuth';
import { LogIn, UserPlus, Loader2, AlertCircle, BookOpen, Users } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

const AuthPage = () => {
  const navigate = useNavigate();
  const { user, signIn, signUp } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: ''
  });

  const [signupForm, setSignupForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    requestedRole: 'librarian' as UserRole
  });

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const { error: signInError } = await signIn(loginForm.email, loginForm.password);
      
      if (signInError) {
        setError(signInError.message);
        toast({
          title: "Login Failed",
          description: signInError.message,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Welcome back!",
          description: "You have successfully logged in."
        });
        navigate('/', { replace: true });
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate passwords match
    if (signupForm.password !== signupForm.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate password strength
    if (signupForm.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setIsLoading(true);

    try {
      const { error: signUpError } = await signUp(
        signupForm.email, 
        signupForm.password,
        signupForm.requestedRole
      );
      
      if (signUpError) {
        setError(signUpError.message);
        toast({
          title: "Signup Failed",
          description: signUpError.message,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Account Created!",
          description: `Your account has been created with requested role: ${signupForm.requestedRole}. An admin will need to approve your role before you can access staff features.`,
          duration: 8000
        });
        // Switch to login tab
        setLoginForm({ email: signupForm.email, password: '' });
        setSignupForm({ email: '', password: '', confirmPassword: '', requestedRole: 'librarian' });
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePublicAccess = () => {
    navigate('/');
    toast({
      title: "Public Access",
      description: "You can access check-in and check-out pages without logging in."
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <BookOpen className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Library Management System</h1>
          <p className="text-muted-foreground mt-2">Sign in to access the system</p>
        </div>

        {/* Public Access Button */}
        <Card className="mb-4 border-2 border-primary/20">
          <CardContent className="pt-6">
            <div className="text-center space-y-3">
              <Users className="h-10 w-10 mx-auto text-primary" />
              <h3 className="font-semibold text-lg">Public Access</h3>
              <p className="text-sm text-muted-foreground">
                For students using check-in/check-out only
              </p>
              <Button 
                onClick={handlePublicAccess}
                variant="outline" 
                className="w-full"
                size="lg"
              >
                Continue as Guest
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Authentication</CardTitle>
            <CardDescription>
              Login to your account or create a new one
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="you@example.com"
                      value={loginForm.email}
                      onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                      required
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                      required
                      disabled={isLoading}
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Logging in...
                      </>
                    ) : (
                      <>
                        <LogIn className="mr-2 h-4 w-4" />
                        Login
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4">
                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="you@example.com"
                      value={signupForm.email}
                      onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                      required
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-role">Requested Role</Label>
                    <Select
                      value={signupForm.requestedRole}
                      onValueChange={(value) => setSignupForm({ ...signupForm, requestedRole: value as UserRole })}
                      disabled={isLoading}
                    >
                      <SelectTrigger id="signup-role">
                        <SelectValue placeholder="Select your role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="librarian">Library Staff</SelectItem>
                        <SelectItem value="admin">Administrator</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Select the role you're requesting. An admin will verify and approve it.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      value={signupForm.password}
                      onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                      required
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm">Confirm Password</Label>
                    <Input
                      id="signup-confirm"
                      type="password"
                      placeholder="••••••••"
                      value={signupForm.confirmPassword}
                      onChange={(e) => setSignupForm({ ...signupForm, confirmPassword: e.target.value })}
                      required
                      disabled={isLoading}
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      <>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Create Account
                      </>
                    )}
                  </Button>

                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      After signup, an admin must approve your role in Supabase before you can access staff features. You can still use check-in/check-out without approval.
                    </AlertDescription>
                  </Alert>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="mt-4 text-center text-sm text-muted-foreground">
          <p>Need help? Contact your system administrator.</p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
