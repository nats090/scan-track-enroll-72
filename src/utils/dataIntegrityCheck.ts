import { getFromLocalStorage } from './offlineStorage';
import { supabase } from '@/integrations/supabase/client';

export interface DataIntegrityReport {
  localRecords: number;
  supabaseRecords: number;
  unsyncedRecords: number;
  syncedRecords: number;
  yesterdayLocal: number;
  yesterdaySupabase: number;
  issues: string[];
}

export const checkDataIntegrity = async (): Promise<DataIntegrityReport> => {
  const report: DataIntegrityReport = {
    localRecords: 0,
    supabaseRecords: 0,
    unsyncedRecords: 0,
    syncedRecords: 0,
    yesterdayLocal: 0,
    yesterdaySupabase: 0,
    issues: []
  };

  try {
    // Check local storage
    const localData = await getFromLocalStorage();
    const localRecords = localData.attendanceRecords || [];
    report.localRecords = localRecords.length;

    // Check unsynced records
    const unsyncedRecords = localRecords.filter(r => r.id?.toString().startsWith('local_'));
    report.unsyncedRecords = unsyncedRecords.length;
    report.syncedRecords = localRecords.length - unsyncedRecords.length;

    // Check yesterday's data in local storage
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStart = new Date(yesterday.toDateString());
    const yesterdayEnd = new Date(yesterdayStart);
    yesterdayEnd.setDate(yesterdayEnd.getDate() + 1);

    const yesterdayLocalRecords = localRecords.filter(record => {
      const recordDate = new Date(record.timestamp);
      return recordDate >= yesterdayStart && recordDate < yesterdayEnd;
    });
    report.yesterdayLocal = yesterdayLocalRecords.length;

    // Check Supabase data
    if (navigator.onLine) {
      const { data: supabaseRecords, error } = await supabase
        .from('attendance_records')
        .select('*');

      if (!error && supabaseRecords) {
        report.supabaseRecords = supabaseRecords.length;

        // Check yesterday's data in Supabase
        const yesterdaySupabaseRecords = supabaseRecords.filter(record => {
          const recordDate = new Date(record.timestamp);
          return recordDate >= yesterdayStart && recordDate < yesterdayEnd;
        });
        report.yesterdaySupabase = yesterdaySupabaseRecords.length;
      }
    } else {
      report.issues.push('Device is offline - cannot check Supabase data');
    }

    // Analyze issues
    if (report.unsyncedRecords > 0) {
      report.issues.push(`${report.unsyncedRecords} records are waiting to sync to server`);
    }

    if (report.yesterdayLocal !== report.yesterdaySupabase) {
      report.issues.push(`Yesterday data mismatch: ${report.yesterdayLocal} local vs ${report.yesterdaySupabase} server`);
    }

    if (report.localRecords > report.supabaseRecords + report.unsyncedRecords) {
      report.issues.push('Local storage has more records than expected');
    }

  } catch (error) {
    report.issues.push(`Error during integrity check: ${error}`);
  }

  return report;
};

export const logDataIntegrityReport = async () => {
  const report = await checkDataIntegrity();
  
  console.log('=== DATA INTEGRITY REPORT ===');
  console.log(`📊 Local Storage Records: ${report.localRecords}`);
  console.log(`☁️  Supabase Records: ${report.supabaseRecords}`);
  console.log(`⏳ Unsynced Records: ${report.unsyncedRecords}`);
  console.log(`✅ Synced Records: ${report.syncedRecords}`);
  console.log(`📅 Yesterday Local: ${report.yesterdayLocal}`);
  console.log(`📅 Yesterday Supabase: ${report.yesterdaySupabase}`);
  
  if (report.issues.length > 0) {
    console.log('🚨 ISSUES FOUND:');
    report.issues.forEach(issue => console.log(`   - ${issue}`));
  } else {
    console.log('✅ No data integrity issues found');
  }
  
  return report;
};