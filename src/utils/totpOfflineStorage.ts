interface TOTPSecret {
  role: string;
  secret: string;
}

interface TOTPCache {
  secrets: TOTPSecret[];
  lastSync: number;
}

const TOTP_STORAGE_KEY = 'totp_offline_cache';

// Helper function to check if running in Electron
const isElectron = (): boolean => {
  return typeof window !== 'undefined' && window.electronAPI !== undefined;
};

export const saveTOTPSecrets = async (secrets: TOTPSecret[]): Promise<void> => {
  const cache: TOTPCache = {
    secrets,
    lastSync: Date.now()
  };

  // Try Electron file system storage first
  if (isElectron()) {
    try {
      // Load existing data to merge with TOTP secrets
      const existingDataResult = await window.electronAPI.loadData();
      const existingData = existingDataResult.success && existingDataResult.data 
        ? existingDataResult.data 
        : {};

      const result = await window.electronAPI.saveData({
        ...existingData,
        totpSecrets: cache.secrets,
        totpLastSync: cache.lastSync
      });

      if (result.success) {
        console.log('✅ TOTP secrets cached to Electron file system');
        return;
      } else {
        console.warn('Electron save failed, falling back to localStorage:', result.error);
      }
    } catch (error) {
      console.warn('Electron file system not available, falling back to localStorage:', error);
    }
  }

  // Fallback to localStorage
  try {
    localStorage.setItem(TOTP_STORAGE_KEY, JSON.stringify(cache));
    console.log('✅ TOTP secrets cached to localStorage');
  } catch (error) {
    console.error('Failed to cache TOTP secrets:', error);
  }
};

export const getTOTPSecrets = async (): Promise<TOTPSecret[]> => {
  // Try Electron file system first
  if (isElectron()) {
    try {
      const result = await window.electronAPI.loadData();
      
      if (result.success && result.data) {
        const secrets = result.data.totpSecrets || [];
        console.log('✅ TOTP secrets loaded from Electron file system');
        return secrets;
      }
    } catch (error) {
      console.warn('Failed to load TOTP secrets from Electron, trying localStorage:', error);
    }
  }

  // Fallback to localStorage
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
  // Try Electron file system first
  if (isElectron()) {
    try {
      const result = await window.electronAPI.loadData();
      
      if (result.success && result.data && result.data.totpLastSync) {
        return result.data.totpLastSync;
      }
    } catch (error) {
      console.warn('Failed to get TOTP last sync from Electron, trying localStorage:', error);
    }
  }

  // Fallback to localStorage
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
  // Try Electron file system first
  if (isElectron()) {
    try {
      // Load existing data and remove TOTP secrets
      const existingDataResult = await window.electronAPI.loadData();
      const existingData = existingDataResult.success && existingDataResult.data 
        ? existingDataResult.data 
        : {};

      const { totpSecrets, totpLastSync, ...restData } = existingData;

      const result = await window.electronAPI.saveData(restData);

      if (result.success) {
        console.log('✅ TOTP secrets cleared from Electron file system');
        return;
      } else {
        console.warn('Electron clear failed, falling back to localStorage:', result.error);
      }
    } catch (error) {
      console.warn('Failed to clear TOTP secrets from Electron, trying localStorage:', error);
    }
  }

  // Fallback to localStorage
  try {
    localStorage.removeItem(TOTP_STORAGE_KEY);
    console.log('✅ TOTP secrets cleared from localStorage');
  } catch (error) {
    console.error('Failed to clear TOTP secrets:', error);
  }
};
