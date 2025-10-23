import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import TOTPVerification from '@/components/TOTPVerification';
import EnhancedLibraryStaffPage from './EnhancedLibraryStaffPage';
import { getTOTPSecrets, saveTOTPSecrets } from '@/utils/totpOfflineStorage';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { Badge } from '@/components/ui/badge';

const ProtectedStaffPage = () => {
  const [isVerified, setIsVerified] = useState(false);
  const [secret, setSecret] = useState('');
  const [loading, setLoading] = useState(true);
  const isOnline = useOnlineStatus();

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
    // First, try to load from cache (works offline)
    const cachedSecrets = await getTOTPSecrets();
    const cachedStaff = cachedSecrets.find(s => s.role === 'librarian');
    
    if (cachedStaff) {
      setSecret(cachedStaff.secret);
      console.log('✅ Staff TOTP secret loaded from cache (offline available)');
    }
    
    // If online, refresh from Supabase
    if (isOnline) {
      try {
        const { data, error } = await supabase
          .from('totp_secrets')
          .select('secret')
          .eq('role', 'librarian')
          .single();

        if (data && !error) {
          setSecret(data.secret);
          // Update cache for offline use
          const allSecrets = cachedSecrets.filter(s => s.role !== 'librarian');
          allSecrets.push({ role: 'librarian', secret: data.secret });
          await saveTOTPSecrets(allSecrets);
          console.log('✅ Staff TOTP secret refreshed and cached');
        }
      } catch (error) {
        console.warn('Could not refresh staff TOTP secret from server:', error);
        // If we have cache, continue with it
      }
    } else if (!cachedStaff) {
      console.warn('⚠️ No cached staff TOTP secret and offline');
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
      <div className="relative">
        {!isOnline && (
          <div className="fixed top-4 right-4 z-50">
            <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-700 border-yellow-500/20">
              🔌 Offline Mode
            </Badge>
          </div>
        )}
        <TOTPVerification
          role="librarian"
          secret={secret}
          onVerified={() => setIsVerified(true)}
        />
      </div>
    );
  }

  return <EnhancedLibraryStaffPage />;
};

export default ProtectedStaffPage;
