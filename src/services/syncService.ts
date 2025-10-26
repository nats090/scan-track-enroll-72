
import { saveToLocalStorage, getFromLocalStorage } from '@/utils/offlineStorage';
import { studentService } from './studentService';
import { attendanceService } from './attendanceService';
import { Student } from '@/types/Student';
import { AttendanceEntry } from '@/types/AttendanceEntry';
import { supabase } from '@/integrations/supabase/client';

export const syncService = {
  async syncLocalToSupabase(): Promise<{ studentsAdded: number; recordsAdded: number }> {
    const localData = await getFromLocalStorage();
    let studentsAdded = 0;
    let recordsAdded = 0;
    const studentsToKeep: any[] = [];

    console.log('Starting sync from local storage to Supabase...');

    // Sync students
    for (const student of localData.students) {
      try {
        const existingStudent = await studentService.findStudentByBarcode(student.studentId);
        if (!existingStudent) {
          await studentService.addStudent(student);
          studentsAdded++;
          console.log(`✅ Synced new student: ${student.name} (${student.studentId})`);
        } else {
          console.log(`⚠️ Student ${student.name} with ID ${student.studentId} already exists as "${existingStudent.name}" - skipping duplicate`);
          // Don't keep this student in offline storage since it's a duplicate
          continue;
        }
      } catch (error: any) {
        // Check if it's a duplicate key error
        if (error?.message?.includes('duplicate key') || error?.code === '23505') {
          console.error(`❌ Duplicate student ID detected: ${student.name} (${student.studentId}) - removing from sync queue`);
          // Don't keep this student in offline storage
          continue;
        }
        console.error(`Failed to sync student ${student.name}:`, error);
        // Keep this student for retry on other errors
        studentsToKeep.push(student);
      }
    }

    // Sync attendance records
    const recordsToKeep: any[] = [];
    for (const record of localData.attendanceRecords) {
      try {
        const timestamp = typeof record.timestamp === 'string' ? new Date(record.timestamp) : record.timestamp;
        
        // Check if this record already exists in Supabase to prevent duplicates
        const existingStatus = await attendanceService.getStudentCurrentStatus(record.studentDatabaseId || record.studentId);
        const queryBuilder = supabase
          .from('attendance_records')
          .select('*')
          .eq(record.studentDatabaseId ? 'student_database_id' : 'student_id', record.studentDatabaseId || record.studentId)
          .eq('type', record.type)
          .gte('timestamp', new Date(timestamp.getTime() - 60000).toISOString()) // Check within 1 minute window
          .lte('timestamp', new Date(timestamp.getTime() + 60000).toISOString());
        const { data: recentRecords } = await queryBuilder;
        
        if (recentRecords && recentRecords.length > 0) {
          console.log(`⚠️ Attendance record already exists for ${record.studentName} at ${timestamp} - skipping duplicate`);
          // Don't keep this record as it's already synced
          continue;
        }
        
        await attendanceService.addAttendanceRecord({
          ...record,
          timestamp
        });
        recordsAdded++;
        console.log(`✅ Synced attendance record for: ${record.studentName}`);
        // Don't keep successfully synced records
      } catch (error: any) {
        // Check if it's a duplicate or already exists
        if (error?.message?.includes('duplicate') || error?.code === '23505') {
          console.log(`⚠️ Attendance record already synced for ${record.studentName} - removing from queue`);
          continue;
        }
        console.error(`Failed to sync attendance record for ${record.studentName}:`, error);
        // Keep this record for retry on other errors
        recordsToKeep.push(record);
      }
    }

    // Update localStorage with only unsynced records
    saveToLocalStorage({ 
      students: studentsToKeep,
      attendanceRecords: recordsToKeep,
      lastSync: new Date().toISOString() 
    });

    console.log(`✅ Sync completed: ${studentsAdded} students, ${recordsAdded} records added`);
    if (studentsToKeep.length > 0 || recordsToKeep.length > 0) {
      console.log(`⏳ ${studentsToKeep.length} students and ${recordsToKeep.length} records kept for retry`);
    }
    return { studentsAdded, recordsAdded };
  },

  async syncSupabaseToLocal(): Promise<{ students: Student[]; attendanceRecords: AttendanceEntry[] }> {
    console.log('Starting sync from Supabase to local storage...');

    const [studentsData, attendanceData] = await Promise.all([
      studentService.getStudents(),
      attendanceService.getAttendanceRecords()
    ]);

    const studentsWithLastScan = await Promise.all(
      studentsData.map(async (student) => {
        const lastScan = await attendanceService.getStudentLastScan(student.studentId);
        return { ...student, lastScan };
      })
    );

    saveToLocalStorage({
      students: studentsWithLastScan,
      attendanceRecords: attendanceData,
      lastSync: new Date().toISOString()
    });

    console.log(`Downloaded ${studentsWithLastScan.length} students and ${attendanceData.length} records to local storage`);
    return { students: studentsWithLastScan, attendanceRecords: attendanceData };
  }
};
