
import { supabase } from '@/integrations/supabase/client';
import { Student } from '@/types/Student';
import { saveToLocalStorage, getFromLocalStorage } from '@/utils/offlineStorage';

export interface DatabaseStudent {
  id: string;
  name: string;
  student_id: string;
  email?: string;
  course?: string;
  biometric_data?: string;
  rfid?: string;
  created_at: string;
  updated_at: string;
}

// Generate unique ID for offline mode
const generateId = () => `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const studentService = {
  async getStudents(): Promise<Student[]> {
    // Always try local storage first
    const localData = await getFromLocalStorage();
    
    try {
      // Try to fetch from Supabase if online
      if (navigator.onLine) {
        // Fetch ALL students using pagination to bypass the 1000 row default limit
        let allStudents: any[] = [];
        let from = 0;
        const pageSize = 1000;
        let hasMore = true;

        while (hasMore) {
          const { data, error, count } = await supabase
            .from('students')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(from, from + pageSize - 1);

          if (error) {
            console.error('Error fetching students:', error);
            break;
          }

          if (data && data.length > 0) {
            allStudents = [...allStudents, ...data];
            from += pageSize;
            
            // Check if we've fetched all records
            if (data.length < pageSize || (count && allStudents.length >= count)) {
              hasMore = false;
            }
          } else {
            hasMore = false;
          }
        }

        if (allStudents.length > 0) {
          const students = allStudents.map(student => {
            const courseStr = (student as any).course || '';
            const levelVal = (student as any).level || undefined;
            // Try to derive strand from course string when senior-high
            let strand: string | undefined = undefined;
            if (levelVal === 'senior-high' && typeof courseStr === 'string') {
              const match = courseStr.match(/senior-high\s*-\s*(.+)$/i);
              strand = match ? match[1] : undefined;
            }
            return {
              id: student.id,
              name: student.name,
              studentId: student.student_id,
              email: student.email || '',
              department: courseStr, // backward compatibility
              course: (student as any).course || '',
              year: (student as any).year || '',
              contactNumber: (student as any).contact_number || '',
              biometricData: student.biometric_data || '',
              rfid: student.rfid || '',
              library: (student as any).library as 'notre-dame' | 'ibed' || 'notre-dame',
              userType: (student as any).user_type as 'student' | 'teacher' || 'student',
              studentType: (student as any).student_type as 'ibed' | 'college' || 'college',
              level: levelVal,
              strand,
              lastScan: undefined
            } as any;
          });

          // Preserve offline-only and locally edited (dirty) students
          const localOnly = (localData.students || []).filter((s: any) => s.id?.toString().startsWith('local_'));
          const dirtyList = (localData.students || []).filter((s: any) => !s.id?.toString().startsWith('local_') && (s as any)._dirty);
          const dirtyMap = Object.fromEntries(dirtyList.map((s: any) => [s.id, s]));
          const overlay = students.map(s => dirtyMap[s.id] ? { ...s, ...(dirtyMap[s.id] as any) } : s);
          const merged = [...overlay, ...localOnly];

          // Update local storage with merged data
          saveToLocalStorage({ students: merged });
          return merged;
        }
      }
    } catch (error) {
      console.log('Using offline data:', error);
    }

    // Return local data as fallback
    return localData.students || [];
  },

  async addStudent(student: Omit<Student, 'id'>): Promise<Student> {
    // Check if RFID is already in use
    if (student.rfid && student.rfid.trim()) {
      try {
        if (navigator.onLine) {
          const { data: existingStudent } = await supabase
            .from('students')
            .select('id, name, student_id')
            .eq('rfid', student.rfid)
            .maybeSingle();

          if (existingStudent) {
            throw new Error(`RFID is already assigned to ${existingStudent.name} (ID: ${existingStudent.student_id})`);
          }
        }
      } catch (error: any) {
        if (error.message.includes('RFID is already assigned')) {
          throw error;
        }
        console.log('Could not verify RFID uniqueness:', error);
      }
    }

    // Check if student name already exists (exact match, case-insensitive)
    try {
      const allStudents = await this.getStudents();
      const duplicateName = allStudents.find(s => 
        s.name.toUpperCase() === student.name.toUpperCase() &&
        s.library === (student.library || 'notre-dame')
      );
      
      if (duplicateName) {
        throw new Error(`A student with the name "${student.name}" already exists (ID: ${duplicateName.studentId})`);
      }
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        throw error;
      }
      console.log('Could not verify name uniqueness:', error);
    }

    // For now, we'll store the combined department info in the course field
    let courseInfo = student.department || '';
    if (student.level) {
      courseInfo = student.level + (student.department ? ` - ${student.department}` : '');
      if (student.shift && student.level === 'senior-high') {
        courseInfo += ` (${student.shift} shift)`;
      }
    }

    const newStudent: Student = {
      ...student,
      id: generateId(),
      department: courseInfo
    };

    // Save to local storage immediately
    const localData = await getFromLocalStorage();
    const updatedStudents = [...localData.students, newStudent];
    saveToLocalStorage({ students: updatedStudents });

    // Try to sync to Supabase if online
    try {
      if (navigator.onLine) {
        const { data, error } = await supabase
          .from('students')
          .insert({
            name: student.name,
            student_id: student.studentId,
            email: student.email,
            course: student.course || courseInfo,
            year: (student as any).year,
            contact_number: (student as any).contactNumber,
            biometric_data: student.biometricData,
            rfid: student.rfid,
            library: student.library || 'notre-dame',
            user_type: student.userType || 'student',
            student_type: student.studentType || 'college',
            level: student.level
          })
          .select()
          .single();

        if (!error && data) {
          // Update local student with server ID
          const serverStudent = {
            id: data.id,
            name: data.name,
            studentId: data.student_id,
            email: data.email || '',
            department: data.course,
            course: (data as any).course || '',
            year: (data as any).year || '',
            contactNumber: (data as any).contact_number || '',
            biometricData: data.biometric_data || '',
            rfid: data.rfid || '',
            library: data.library as 'notre-dame' | 'ibed' || 'notre-dame',
            userType: (data as any).user_type as 'student' | 'teacher' || 'student',
            studentType: (data as any).student_type as 'ibed' | 'college' || 'college',
            level: student.level
          };
          const updatedWithServerId = updatedStudents.map(s => 
            s.id === newStudent.id ? serverStudent : s
          );
          saveToLocalStorage({ students: updatedWithServerId });
          return serverStudent;
        }
      }
    } catch (error) {
      console.log('Offline mode: Student saved locally');
    }

    return newStudent;
  },

  async updateStudent(id: string, studentData: Partial<Student>): Promise<Student> {
    try {
      if (navigator.onLine) {
        const courseToSave = (() => {
          const sd: any = studentData || {};
          if (sd.studentType === 'college') {
            return sd.course ?? sd.department ?? null;
          }
          if (sd.level === 'senior-high') {
            return `${sd.level}${sd.strand ? ` - ${sd.strand}` : ''}`;
          }
          return sd.department ?? sd.course ?? null;
        })();

        const { data, error } = await supabase
          .from('students')
          .update({
            name: studentData.name,
            student_id: studentData.studentId,
            email: studentData.email,
            course: courseToSave ?? undefined,
            year: (studentData as any).year,
            contact_number: (studentData as any).contactNumber,
            rfid: studentData.rfid,
            level: (studentData as any).level,
            user_type: (studentData as any).userType,
            student_type: (studentData as any).studentType
          })
          .eq('id', id)
          .select()
          .single();

        if (!error && data) {
          const courseStr = (data as any).course || '';
          const levelVal = (data as any).level || undefined;
          const strand = levelVal === 'senior-high' ? (courseStr.match(/senior-high\s*-\s*(.+)$/i)?.[1] || undefined) : undefined;
          const updatedStudent = {
            id: data.id,
            name: data.name,
            studentId: data.student_id,
            email: data.email || '',
            department: data.course,
            course: (data as any).course || '',
            year: (data as any).year || '',
            contactNumber: (data as any).contact_number || '',
            biometricData: data.biometric_data || '',
            rfid: data.rfid || '',
            library: data.library as 'notre-dame' | 'ibed' || 'notre-dame',
            userType: (data as any).user_type as 'student' | 'teacher' || 'student',
            studentType: (data as any).student_type as 'ibed' | 'college' || 'college',
            level: levelVal,
            strand
          } as any;

          // Update local storage
          const localData = await getFromLocalStorage();
          const updatedStudents = localData.students.map(s => 
            s.id === id ? updatedStudent : s
          );
          await saveToLocalStorage({ students: updatedStudents });
          
          return updatedStudent;
        }
      }
    } catch (error) {
      console.error('Error updating student:', error);
    }

    // Fallback: update locally only
    const localData = await getFromLocalStorage();
    const updatedStudents = localData.students.map(s => 
      s.id === id ? { ...s, ...studentData, _dirty: true, _dirtyUpdatedAt: new Date().toISOString() } : s
    );
    await saveToLocalStorage({ students: updatedStudents });
    
    return { ...(localData.students.find(s => s.id === id) as any), ...studentData, id } as Student;
  },

  async findStudentByBarcode(barcode: string, library?: 'notre-dame' | 'ibed'): Promise<Student | null> {
    let query = supabase
      .from('students')
      .select('*')
      .or(`student_id.eq.${barcode},id.eq.${barcode}`)
      .order('created_at', { ascending: false }); // Get most recent first

    // Filter by library if provided
    if (library) {
      query = query.eq('library', library);
    }

    const { data, error } = await query.limit(1).maybeSingle();

    if (error) {
      console.error('Error finding student by barcode:', error);
      return null;
    }

    if (!data) return null;

    const courseStr = (data as any).course || '';
    const levelVal = (data as any).level || undefined;
    const strand = levelVal === 'senior-high' ? (courseStr.match(/senior-high\s*-\s*(.+)$/i)?.[1] || undefined) : undefined;

    return {
      id: data.id,
      name: data.name,
      studentId: data.student_id,
      email: data.email || '',
      department: data.course,
      course: (data as any).course || '',
      year: (data as any).year || '',
      contactNumber: (data as any).contact_number || '',
      biometricData: data.biometric_data || '',
      rfid: data.rfid || '',
      library: data.library as 'notre-dame' | 'ibed' || 'notre-dame',
      userType: (data as any).user_type as 'student' | 'teacher' || 'student',
      studentType: (data as any).student_type as 'ibed' | 'college' || 'college',
      level: levelVal,
      strand
    } as any;
  },

  async findStudentByBiometric(biometricData: string): Promise<Student | null> {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('biometric_data', biometricData)
      .maybeSingle();

    if (error) {
      console.error('Error finding student by biometric:', error);
      return null;
    }

    if (!data) return null;

    return {
      id: data.id,
      name: data.name,
      studentId: data.student_id,
      email: data.email || '',
      department: data.course,
      course: (data as any).course || '',
      year: (data as any).year || '',
      contactNumber: (data as any).contact_number || '',
      biometricData: data.biometric_data || '',
      rfid: data.rfid || '',
      library: data.library as 'notre-dame' | 'ibed' || 'notre-dame'
    };
  },

  async findStudentByRFID(rfidData: string, library?: 'notre-dame' | 'ibed'): Promise<Student | null> {
    let query = supabase
      .from('students')
      .select('*')
      .eq('rfid', rfidData)
      .order('created_at', { ascending: false }); // Get most recent first

    // Filter by library if provided
    if (library) {
      query = query.eq('library', library);
    }

    const { data, error } = await query.limit(1).maybeSingle();

    if (error) {
      console.error('Error finding student by RFID:', error);
      return null;
    }

    if (!data) return null;

    return {
      id: data.id,
      name: data.name,
      studentId: data.student_id,
      email: data.email || '',
      department: data.course,
      course: (data as any).course || '',
      year: (data as any).year || '',
      contactNumber: (data as any).contact_number || '',
      biometricData: data.biometric_data || '',
      rfid: data.rfid || '',
      library: data.library as 'notre-dame' | 'ibed' || 'notre-dame'
    };
  },

  async deleteStudent(id: string): Promise<void> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
    try {
      if (navigator.onLine && isUuid) {
        const { error } = await supabase
          .from('students')
          .delete()
          .eq('id', id);

        if (error) {
          console.error('Error deleting student from Supabase:', error);
          throw error;
        }
      }
    } catch (error) {
      console.error('Error deleting student:', error);
      throw error;
    } finally {
      // Always remove locally
      const localData = await getFromLocalStorage();
      const updatedStudents = localData.students.filter(s => s.id !== id);
      await saveToLocalStorage({ students: updatedStudents });
    }
  }
};
