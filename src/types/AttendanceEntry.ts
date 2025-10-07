
export interface AttendanceEntry {
  id: string;
  studentId: string;
  studentName: string;
  timestamp: Date;
  type: 'check-in' | 'check-out'; // Separate check-in and check-out records
  barcode?: string;
  method: 'barcode' | 'biometric' | 'manual' | 'rfid';
  purpose?: string;
  contact?: string;
  library?: 'notre-dame' | 'ibed'; // Multi-library support
  course?: string; // Student's course at check-in time
  year?: string; // Student's year at check-in time
  userType?: 'student' | 'teacher'; // User type
  studentType?: 'ibed' | 'college'; // Student type: IBED or COLLEGE
  level?: string; // Education level
}
