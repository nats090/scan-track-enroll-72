import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import TOTPVerification from '@/components/TOTPVerification';
import CheckOutPage from './CheckOutPage';

const ProtectedCheckOutPage = () => {
  const [isVerified, setIsVerified] = useState(false);
  const [secret, setSecret] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkVerification();
    loadSecret();
  }, []);

  const checkVerification = () => {
    const verified = sessionStorage.getItem('totp_verified_librarian');
    if (verified) {
      // Check if verification is still valid (within 1 hour)
      const verifiedTime = parseInt(verified);
      const now = Date.now();
      const oneHour = 60 * 60 * 1000;
      
      if (now - verifiedTime < oneHour) {
        setIsVerified(true);
      } else {
        sessionStorage.removeItem('totp_verified_librarian');
      }
    }
    setLoading(false);
  };

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isVerified) {
    return (
      <TOTPVerification
        role="librarian"
        secret={secret}
        onVerified={() => setIsVerified(true)}
      />
    );
  }

  return <CheckOutPage />;
};

export default ProtectedCheckOutPage;
