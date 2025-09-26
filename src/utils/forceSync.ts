import { autoSyncService } from '@/services/autoSyncService';

export const forceDataSync = async () => {
  try {
    // Call the private performSync method via reflection
    const syncService = autoSyncService as any;
    if (syncService && typeof syncService.performSync === 'function') {
      await syncService.performSync();
      return { success: true, message: 'Sync completed successfully' };
    } else {
      // Fallback: trigger sync by going offline and online
      window.dispatchEvent(new Event('offline'));
      setTimeout(() => {
        window.dispatchEvent(new Event('online'));
      }, 100);
      return { success: true, message: 'Sync triggered via network events' };
    }
  } catch (error) {
    console.error('Force sync failed:', error);
    return { success: false, message: `Sync failed: ${error}` };
  }
};