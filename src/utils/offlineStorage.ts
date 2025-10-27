
import { saveToFileSystem, getFromFileSystem, clearFileSystem } from './electronStorage';

export interface OfflineData {
  students: any[];
  attendanceRecords: any[];
  documents: any[];
  lastSync: string | null;
}

const STORAGE_KEY = 'library-attendance-offline';

// Check if running in Electron
const isElectron = () => {
  return typeof window !== 'undefined' && window.electronAPI;
};

export const saveToLocalStorage = async (data: Partial<OfflineData>) => {
  // Aggressive cleanup: Keep only last 30 days of attendance records
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  // Keep only recent records OR unsynced local records from last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const filteredData = {
    ...data,
    attendanceRecords: data.attendanceRecords?.filter(record => {
      const recordDate = record.timestamp instanceof Date ? record.timestamp : new Date(record.timestamp);
      
      // Keep all records from last 30 days
      if (recordDate >= thirtyDaysAgo) {
        return true;
      }
      
      // Keep unsynced local records from last 7 days
      if (record.id?.toString().startsWith('local_') && recordDate >= sevenDaysAgo) {
        return true;
      }
      
      return false;
    })
  };
  
  // Cleanup: Remove students that have no recent attendance (90+ days)
  if (filteredData.students && filteredData.attendanceRecords) {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    
    // Get list of students with recent activity
    const activeStudentIds = new Set(
      filteredData.attendanceRecords
        .filter(r => {
          const rDate = r.timestamp instanceof Date ? r.timestamp : new Date(r.timestamp);
          return rDate >= ninetyDaysAgo;
        })
        .map(r => r.studentId)
    );
    
    // Keep students with recent activity OR created in last 90 days OR unsynced local students
    const beforeCount = filteredData.students.length;
    filteredData.students = filteredData.students.filter(student => {
      // Keep if has recent attendance
      if (activeStudentIds.has(student.studentId)) {
        return true;
      }
      
      // Keep if created recently
      if (student.registrationDate) {
        const regDate = student.registrationDate instanceof Date ? student.registrationDate : new Date(student.registrationDate);
        if (regDate >= ninetyDaysAgo) {
          return true;
        }
      }
      
      // Keep unsynced local students
      if (student.id?.toString().startsWith('local_')) {
        return true;
      }
      
      return false;
    });
    
    const removedCount = beforeCount - filteredData.students.length;
    if (removedCount > 0) {
      console.log(`Storage cleanup: Removed ${removedCount} inactive students`);
    }
  }

  // Use file system storage if in Electron, otherwise fallback to localStorage
  if (isElectron()) {
    try {
      await saveToFileSystem(filteredData);
      return;
    } catch (error) {
      console.warn('Failed to save to file system, falling back to localStorage:', error);
    }
  }

  // Fallback to browser localStorage
  try {
    const existing = await getFromLocalStorage();
    const updated = { ...existing, ...filteredData };
    
    // Serialize data properly for localStorage
    const serializedData = {
      ...updated,
      attendanceRecords: updated.attendanceRecords?.map(record => ({
        ...record,
        timestamp: record.timestamp instanceof Date ? record.timestamp.toISOString() : record.timestamp
      })) || existing.attendanceRecords,
      students: updated.students?.map(student => ({
        ...student,
        lastScan: student.lastScan instanceof Date ? student.lastScan.toISOString() : student.lastScan,
        registrationDate: student.registrationDate instanceof Date ? student.registrationDate.toISOString() : student.registrationDate
      })) || existing.students
    };
    
    // Only save if data has actually changed to prevent excessive logging
    const existingString = localStorage.getItem(STORAGE_KEY);
    const newString = JSON.stringify(serializedData);
    
    if (existingString !== newString) {
      localStorage.setItem(STORAGE_KEY, newString);
      console.log(`Data saved to localStorage (${updated.attendanceRecords?.length || 0} attendance records)`);
    }
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
  }
};

export const getFromLocalStorage = async (): Promise<OfflineData> => {
  // Use file system storage if in Electron, otherwise fallback to localStorage
  if (isElectron()) {
    try {
      return await getFromFileSystem();
    } catch (error) {
      console.warn('Failed to load from file system, falling back to localStorage:', error);
    }
  }

  // Fallback to browser localStorage
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      
      // Deserialize Date objects properly
      return {
        ...parsed,
        attendanceRecords: parsed.attendanceRecords?.map((record: any) => ({
          ...record,
          timestamp: typeof record.timestamp === 'string' ? new Date(record.timestamp) : record.timestamp
        })) || [],
        students: parsed.students?.map((student: any) => ({
          ...student,
          lastScan: typeof student.lastScan === 'string' ? new Date(student.lastScan) : student.lastScan,
          registrationDate: typeof student.registrationDate === 'string' ? new Date(student.registrationDate) : student.registrationDate
        })) || []
      };
    }
  } catch (error) {
    console.error('Failed to load from localStorage:', error);
  }
  
  return {
    students: [],
    attendanceRecords: [],
    documents: [],
    lastSync: null
  };
};

export const clearLocalStorage = async () => {
  // Clear file system storage if in Electron, otherwise fallback to localStorage
  if (isElectron()) {
    try {
      await clearFileSystem();
      return;
    } catch (error) {
      console.warn('Failed to clear file system, falling back to localStorage:', error);
    }
  }

  // Fallback to browser localStorage
  try {
    localStorage.removeItem(STORAGE_KEY);
    console.log('Browser localStorage cleared');
  } catch (error) {
    console.error('Failed to clear localStorage:', error);
  }
};

export const isOnline = () => {
  return navigator.onLine;
};
