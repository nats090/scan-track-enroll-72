import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth, UserRole } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldAlert, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole | UserRole[];
  redirectTo?: string;
}

const ProtectedRoute = ({ 
  children, 
  requiredRole,
  redirectTo = '/auth'
}: ProtectedRouteProps) => {
  const { user, role, loading, hasRole } = useAuth();

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Checking authentication...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Redirect to auth if not logged in
  if (!user) {
    return <Navigate to={redirectTo} replace />;
  }

  // Check role requirements if specified
  if (requiredRole && !hasRole(requiredRole)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-destructive">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <ShieldAlert className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle className="text-destructive">Access Denied</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              You don't have permission to access this page.
              {role && (
                <span className="block mt-2 text-sm">
                  Your role: <span className="font-semibold capitalize">{role}</span>
                </span>
              )}
            </p>
            <Button 
              onClick={() => window.history.back()} 
              variant="outline"
              className="w-full"
            >
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
