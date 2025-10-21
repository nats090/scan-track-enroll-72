import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import AdminLogin from '@/components/AdminLogin';
import TOTPVerification from '@/components/TOTPVerification';
import EnhancedAdminPage from './EnhancedAdminPage';

const ProtectedAdminPage = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [secret, setSecret] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
    // Check if user is logged in to Supabase
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      // Check if user has staff role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .in('role', ['admin', 'librarian'])
        .single();

      if (roleData) {
        setIsAuthenticated(true);
        checkVerification();
        await loadSecret();
      }
    }
    
    setLoading(false);
  };

  const checkVerification = () => {
    const verified = sessionStorage.getItem('totp_verified_admin');
    if (verified) {
      // Check if verification is still valid (within 1 hour)
      const verifiedTime = parseInt(verified);
      const now = Date.now();
      const oneHour = 60 * 60 * 1000;
      
      if (now - verifiedTime < oneHour) {
        setIsVerified(true);
      } else {
        sessionStorage.removeItem('totp_verified_admin');
      }
    }
  };

  const loadSecret = async () => {
    const { data } = await supabase
      .from('totp_secrets')
      .select('secret')
      .eq('role', 'admin')
      .single();

    if (data) {
      setSecret(data.secret);
    }
  };

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    checkVerification();
    loadSecret();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AdminLogin onLoginSuccess={handleLoginSuccess} />;
  }

  if (!isVerified) {
    return (
      <TOTPVerification
        role="admin"
        secret={secret}
        onVerified={() => setIsVerified(true)}
      />
    );
  }

  return <EnhancedAdminPage />;
};

export default ProtectedAdminPage;
