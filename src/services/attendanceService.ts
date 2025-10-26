
import { supabase } from '@/integrations/supabase/client';
import { AttendanceEntry } from '@/types/AttendanceEntry';
import { saveToLocalStorage, getFromLocalStorage } from '@/utils/offlineStorage';

export interface DatabaseAttendanceRecord {
  id: string;
  student_id: string;
  student_name: string;
  timestamp: string;
  type: 'check-in' | 'check-out';
  barcode?: string;
  method: 'barcode' | 'biometric' | 'manual' | 'rfid';
  purpose?: string;
  contact?: string;
  created_at: string;
  course?: string;
  year?: string;
}

// Generate unique ID for offline mode
const generateId = () => `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const attendanceService = {
  async getAttendanceRecords(): Promise<AttendanceEntry[]> {
    // Always try local storage first
    const localData = await getFromLocalStorage();
    
    try {
      // Try to fetch from Supabase if online
      if (navigator.onLine) {
        const { data, error } = await supabase
          .from('attendance_records')
          .select('*')
          .order('timestamp', { ascending: false });

        if (!error && data) {
          const records = data.map(record => ({
            id: record.id,
            studentId: record.student_id,
            studentName: record.student_name,
            timestamp: new Date(record.timestamp),
            type: (record as any).type || 'check-in', // Default to check-in for backward compatibility
            barcode: record.barcode,
            method: record.method as 'barcode' | 'biometric' | 'manual' | 'rfid',
            purpose: record.purpose,
            contact: record.contact,
            library: (record as any).library as 'notre-dame' | 'ibed' || 'notre-dame',
            course: (record as any).course,
            year: (record as any).year
          }));

          // Preserve any offline-only (local_*) records until they are synced
          const localOnly = (localData.attendanceRecords || []).filter((r: any) => r.id?.toString().startsWith('local_'));
          const merged = [...records, ...localOnly];

          // Update local storage with merged data
          saveToLocalStorage({ attendanceRecords: merged });
          return merged;
        }
      }
    } catch (error) {
      console.log('Using offline data:', error);
    }

    // Return local data as fallback
    return localData.attendanceRecords || [];
  },

  async addAttendanceRecord(record: Omit<AttendanceEntry, 'id'>): Promise<AttendanceEntry> {
    const COOLDOWN_SECONDS = 10;

    // Check for cooldown period
    const lastTimestamp = await this.getLastAttendanceTimestamp(
      record.studentDatabaseId || record.studentId,
      record.type
    );

    if (lastTimestamp) {
      const secondsSinceLastAction = (Date.now() - lastTimestamp.getTime()) / 1000;
      
      if (secondsSinceLastAction < COOLDOWN_SECONDS) {
        const remainingSeconds = Math.ceil(COOLDOWN_SECONDS - secondsSinceLastAction);
        throw new Error(`COOLDOWN:${remainingSeconds}`);
      }
    }

    const newRecord: AttendanceEntry = {
      ...record,
      id: generateId()
    };

    // Save to local storage immediately
    const localData = await getFromLocalStorage();
    const updatedRecords = [...localData.attendanceRecords, newRecord];
    saveToLocalStorage({ attendanceRecords: updatedRecords });

    // Try to sync to Supabase if online
    try {
      if (navigator.onLine) {
        const { data, error } = await supabase
          .from('attendance_records')
          .insert({
            student_database_id: record.studentDatabaseId,
            student_id: record.studentId,
            student_name: record.studentName,
            timestamp: record.timestamp.toISOString(),
            type: record.type,
            barcode: record.barcode,
            method: record.method,
            purpose: record.purpose,
            contact: record.contact,
            library: record.library || 'notre-dame',
            course: record.course,
            year: record.year,
            user_type: record.userType || 'student',
            student_type: record.studentType,
            level: record.level
          })
          .select()
          .single();

        if (!error && data) {
          // Update local record with server ID
          const serverRecord = {
            id: data.id,
            studentDatabaseId: (data as any).student_database_id,
            studentId: data.student_id,
            studentName: data.student_name,
            timestamp: new Date(data.timestamp),
            type: (data as any).type || 'check-in', // Default to check-in for backward compatibility
            barcode: data.barcode,
            method: data.method as 'barcode' | 'biometric' | 'manual' | 'rfid',
            purpose: data.purpose,
            contact: data.contact,
            library: (data as any).library as 'notre-dame' | 'ibed' || 'notre-dame',
            course: (data as any).course,
            year: (data as any).year,
            userType: (data as any).user_type as 'student' | 'teacher',
            studentType: (data as any).student_type as 'ibed' | 'college',
            level: (data as any).level
          };
          const updatedWithServerId = updatedRecords.map(r => 
            r.id === newRecord.id ? serverRecord : r
          );
          saveToLocalStorage({ attendanceRecords: updatedWithServerId });
          return serverRecord;
        }
      }
    } catch (error) {
      console.log('Offline mode: Record saved locally');
    }

    return newRecord;
  },

  async getStudentLastScan(studentId: string): Promise<Date | undefined> {
    const { data, error } = await supabase
      .from('attendance_records')
      .select('timestamp')
      .eq('student_id', studentId)
      .order('timestamp', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return undefined;

    return new Date(data.timestamp);
  },

  async getLastAttendanceTimestamp(studentIdentifier: string, actionType: 'check-in' | 'check-out'): Promise<Date | null> {
    // Get local records for this specific action type
    const localData = await getFromLocalStorage();
    const localRecords = (localData.attendanceRecords || [])
      .filter(record => 
        (record.studentDatabaseId === studentIdentifier || record.studentId === studentIdentifier) &&
        record.type === actionType
      );

    let allRecords = [...localRecords];

    // Try to get records from Supabase if online
    try {
      if (navigator.onLine) {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(studentIdentifier);
        
        let query = supabase
          .from('attendance_records')
          .select('*')
          .eq('type', actionType)
          .order('timestamp', { ascending: false })
          .limit(1);
        
        if (isUUID) {
          query = query.eq('student_database_id', studentIdentifier);
        } else {
          query = query.eq('student_id', studentIdentifier);
        }
        
        const { data, error } = await query;

        if (!error && data && data.length > 0) {
          const serverRecord = {
            timestamp: new Date(data[0].timestamp)
          };
          allRecords.push(serverRecord as any);
        }
      }
    } catch (error) {
      console.log('Using local data only for cooldown check');
    }

    // Find the most recent timestamp
    if (allRecords.length > 0) {
      const sortedRecords = allRecords.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      return new Date(sortedRecords[0].timestamp);
    }

    return null;
  },

  async getStudentCurrentStatus(studentIdentifier: string): Promise<'checked-in' | 'checked-out' | 'unknown'> {
    // Get local records for this student (using unique database ID or student ID as fallback)
    const localData = await getFromLocalStorage();
    const localRecords = (localData.attendanceRecords || [])
      .filter(record => 
        record.studentDatabaseId === studentIdentifier || 
        record.studentId === studentIdentifier
      );

    let allRecords = [...localRecords];

    // Try to get records from Supabase if online and merge them
    try {
      if (navigator.onLine) {
        // Check if studentIdentifier is a UUID (database ID) or a student ID string
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(studentIdentifier);
        
        let query = supabase
          .from('attendance_records')
          .select('*')
          .order('timestamp', { ascending: false });
        
        // Query by the appropriate column
        if (isUUID) {
          query = query.eq('student_database_id', studentIdentifier);
        } else {
          query = query.eq('student_id', studentIdentifier);
        }
        
        const { data, error } = await query;

        if (!error && data) {
          const serverRecords = data.map(record => ({
            id: record.id,
            studentDatabaseId: (record as any).student_database_id,
            studentId: record.student_id,
            studentName: record.student_name,
            timestamp: new Date(record.timestamp),
            type: record.type as 'check-in' | 'check-out',
            barcode: record.barcode,
            method: record.method as 'barcode' | 'biometric' | 'manual' | 'rfid',
            purpose: record.purpose,
            contact: record.contact,
            library: (record as any).library as 'notre-dame' | 'ibed' || 'notre-dame',
            course: (record as any).course,
            year: (record as any).year
          }));

          // IMPORTANT: Always include local records too to avoid race conditions
          // where the latest local record hasn't propagated to the server yet.
          allRecords = [...serverRecords, ...localRecords];
        }
      }
    } catch (error) {
      console.log('Using local data only for status check');
    }

    // Find the most recent record by timestamp
    if (allRecords.length > 0) {
      const sortedRecords = allRecords.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      const lastRecord = sortedRecords[0];
      return lastRecord.type === 'check-in' ? 'checked-in' : 'checked-out';
    }

    return 'unknown';
  }
};
