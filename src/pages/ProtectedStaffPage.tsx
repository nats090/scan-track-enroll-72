import { useState, useEffect } from 'react';
import TOTPVerification from '@/components/TOTPVerification';
import EnhancedLibraryStaffPage from './EnhancedLibraryStaffPage';

const ProtectedStaffPage = () => {
  const [isVerified, setIsVerified] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkVerification();
  }, []);

  const checkVerification = () => {
    const verifiedToken = sessionStorage.getItem('totp_verified_librarian');
    const expiresAt = sessionStorage.getItem('totp_expires_librarian');
    
    if (verifiedToken && expiresAt) {
      // Check if verification is still valid
      const now = Date.now();
      const expires = parseInt(expiresAt);
      
      if (now < expires) {
        setIsVerified(true);
      } else {
        sessionStorage.removeItem('totp_verified_librarian');
        sessionStorage.removeItem('totp_expires_librarian');
      }
    }
    setLoading(false);
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
        onVerified={() => setIsVerified(true)}
      />
    );
  }

  return <EnhancedLibraryStaffPage />;
};

export default ProtectedStaffPage;
