interface TOTPSecret {
  role: string;
  secret: string;
}

interface TOTPCache {
  secrets: TOTPSecret[];
  lastSync: number;
}

const TOTP_STORAGE_KEY = 'totp_offline_cache';

export const saveTOTPSecrets = async (secrets: TOTPSecret[]): Promise<void> => {
  const cache: TOTPCache = {
    secrets,
    lastSync: Date.now()
  };

  try {
    localStorage.setItem(TOTP_STORAGE_KEY, JSON.stringify(cache));
    console.log('✅ TOTP secrets cached to localStorage');
  } catch (error) {
    console.error('Failed to cache TOTP secrets:', error);
  }
};

export const getTOTPSecrets = async (): Promise<TOTPSecret[]> => {
  try {
    const stored = localStorage.getItem(TOTP_STORAGE_KEY);
    if (stored) {
      const cache: TOTPCache = JSON.parse(stored);
      return cache.secrets || [];
    }
  } catch (error) {
    console.error('Failed to retrieve TOTP secrets from cache:', error);
  }
  
  return [];
};

export const getTOTPLastSync = async (): Promise<number | null> => {
  try {
    const stored = localStorage.getItem(TOTP_STORAGE_KEY);
    if (stored) {
      const cache: TOTPCache = JSON.parse(stored);
      return cache.lastSync || null;
    }
  } catch (error) {
    console.error('Failed to get TOTP last sync:', error);
  }
  
  return null;
};

export const clearTOTPSecrets = async (): Promise<void> => {
  try {
    localStorage.removeItem(TOTP_STORAGE_KEY);
    console.log('✅ TOTP secrets cleared from localStorage');
  } catch (error) {
    console.error('Failed to clear TOTP secrets:', error);
  }
};
