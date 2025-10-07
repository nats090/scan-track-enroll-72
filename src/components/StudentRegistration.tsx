
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { Student } from '@/types/Student';
import { UserPlus, GraduationCap } from 'lucide-react';
import ImageUpload from './ImageUpload';
import OfflineIndicator from './OfflineIndicator';
import RFIDScanner from './RFIDScanner';
import { studentService } from '@/services/studentService';
import { toast } from '@/components/ui/use-toast';

interface StudentRegistrationProps {
  onStudentRegistered: (student: Student) => void;
  onClose: () => void;
  initialData?: string;
}

interface RegistrationForm {
  userType: 'student' | 'teacher';
  studentType: 'ibed' | 'college';
  name: string;
  studentId: string;
  email: string;
  department: string;
  level: string;
  shift: string;
  course: string;
  year: string;
  contactNumber: string;
}

const StudentRegistration: React.FC<StudentRegistrationProps> = ({ 
  onStudentRegistered, 
  onClose, 
  initialData 
}) => {
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [rfidData, setRfidData] = useState<string>('');
  
const form = useForm<RegistrationForm>({
  defaultValues: {
    userType: 'student',
    studentType: 'college',
    name: '',
    studentId: '',
    email: '',
    department: 'none',
    level: 'none',
    shift: 'none',
    course: '',
    year: '',
    contactNumber: ''
  }
});

  const watchedUserType = form.watch('userType');
  const watchedStudentType = form.watch('studentType');
  const watchedLevel = form.watch('level');

  // Process initial data from QR code when component mounts
  useEffect(() => {
    if (initialData) {
      try {
        // Try to parse as JSON first
        const parsedData = JSON.parse(initialData);
        if (parsedData.name) form.setValue('name', parsedData.name);
        if (parsedData.studentId) form.setValue('studentId', parsedData.studentId);
        if (parsedData.email) form.setValue('email', parsedData.email);
        if (parsedData.userType) form.setValue('userType', parsedData.userType);
        if (parsedData.studentType) form.setValue('studentType', parsedData.studentType);
        // Convert empty strings to 'none' for select fields
        if (parsedData.department) {
          form.setValue('department', parsedData.department === 'none' ? 'none' : parsedData.department);
        }
        if (parsedData.level) {
          form.setValue('level', parsedData.level === 'none' ? 'none' : parsedData.level);
        }
        if (parsedData.shift) {
          form.setValue('shift', parsedData.shift === 'none' ? 'none' : parsedData.shift);
        }
      } catch (e) {
        // If not JSON, treat as student ID
        form.setValue('studentId', initialData);
      }
    }
  }, [initialData, form]);

  const getDepartmentOptions = () => {
    if (watchedLevel === 'college') {
      return [
        { value: 'none', label: 'No department assigned' },
        { value: 'CECE', label: 'CECE (Civil Engineering & Computer Engineering)' },
        { value: 'CTELAN', label: 'CTELAN (Teacher Education & Liberal Arts)' },
        { value: 'CBA', label: 'CBA (College of Business Administration)' }
      ];
    } else if (watchedLevel === 'senior-high') {
      return [
        { value: 'none', label: 'No strand assigned' },
        { value: 'ABM', label: 'ABM (Accountancy, Business & Management)' },
        { value: 'STEM', label: 'STEM (Science, Technology, Engineering & Mathematics)' },
        { value: 'HUMSS', label: 'HUMSS (Humanities & Social Sciences)' },
        { value: 'GAS', label: 'GAS (General Academic Strand)' },
        { value: 'TVL-ICT', label: 'TVL-ICT (Information & Communications Technology)' },
        { value: 'TVL-HE', label: 'TVL-HE (Home Economics)' },
        { value: 'TVL-IA', label: 'TVL-IA (Industrial Arts)' }
      ];
    }
    return [{ value: 'none', label: 'No department assigned' }];
  };

  const getSchoolYearOptions = () => {
    return [
      { value: 'Kinder', label: 'Kinder' },
      { value: 'Grade 1', label: 'Grade 1' },
      { value: 'Grade 2', label: 'Grade 2' },
      { value: 'Grade 3', label: 'Grade 3' },
      { value: 'Grade 4', label: 'Grade 4' },
      { value: 'Grade 5', label: 'Grade 5' },
      { value: 'Grade 6', label: 'Grade 6' },
      { value: 'Grade 7', label: 'Grade 7' },
      { value: 'Grade 8', label: 'Grade 8' },
      { value: 'Grade 9', label: 'Grade 9' },
      { value: 'Grade 10', label: 'Grade 10' },
      { value: 'Grade 11', label: 'Grade 11' },
      { value: 'Grade 12', label: 'Grade 12' }
    ];
  };

  const onSubmit = async (data: RegistrationForm) => {
    console.log('Form submission data:', data);

    // Validation rules
    const nameValid = !!data.name && data.name.trim().split(/\s+/).length >= 2;
    const emailValid = !data.email || /^[A-Za-z0-9._%+-]+@(gmail\.com|ndkc\.edu\.ph)$/.test(data.email);
    const studentIdValid = /^\d{4}-\d{3,4}$/.test(data.studentId || '');
    const courseValid = data.userType === 'teacher' || !!data.course?.trim();
    const yearValid = data.userType === 'teacher' || !!data.year?.trim();

    if (!nameValid) {
      form.setError('name', { type: 'manual', message: 'Please enter first and last name.' });
      toast({ title: 'Invalid Name', description: 'Enter at least first and last name.', variant: 'destructive' });
      return;
    }
    if (!studentIdValid) {
      form.setError('studentId', { type: 'manual', message: 'Format: YYYY-XXX or YYYY-XXXX (e.g., 2021-033).' });
      toast({ title: 'Invalid ID', description: 'Use format YYYY-XXX or YYYY-XXXX.', variant: 'destructive' });
      return;
    }
    if (!emailValid) {
      form.setError('email', { type: 'manual', message: 'Email must be gmail.com or ndkc.edu.ph.' });
      toast({ title: 'Invalid Email Domain', description: 'Use gmail.com or ndkc.edu.ph.', variant: 'destructive' });
      return;
    }
    if (!courseValid) {
      form.setError('course', { type: 'manual', message: 'Course is required.' });
      toast({ title: 'Course Required', description: 'Please enter course.', variant: 'destructive' });
      return;
    }
    if (!yearValid) {
      form.setError('year', { type: 'manual', message: 'Year is required.' });
      toast({ title: 'Year Required', description: 'Please enter year.', variant: 'destructive' });
      return;
    }

    const studentData: Omit<Student, 'id'> = {
      name: data.name,
      studentId: data.studentId,
      email: data.email,
      department: data.department === 'none' ? undefined : data.department,
      level: data.level === 'none' ? undefined : data.level as 'elementary' | 'junior-high' | 'senior-high' | 'college',
      shift: (data.level === 'senior-high' && data.shift !== 'none') ? data.shift as 'morning' | 'afternoon' : undefined,
      course: data.userType === 'teacher' ? 'Teacher' : data.course,
      year: data.year,
      contactNumber: data.contactNumber,
      profilePicture: profilePicture || undefined,
      rfid: rfidData || undefined,
      userType: data.userType,
      studentType: data.userType === 'student' ? data.studentType : undefined
    };

    try {
      const newStudent = await studentService.addStudent(studentData);
      console.log('Created user:', newStudent);
      
      toast({
        title: `${data.userType === 'teacher' ? 'Teacher' : 'Student'} Registered`,
        description: `${newStudent.name} has been registered successfully`,
        duration: 3000,
      });
      
      onStudentRegistered(newStudent);
      onClose();
    } catch (error) {
      console.error('Registration failed:', error);
      toast({
        title: "Registration Failed",
        description: "Failed to register. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Register New User
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <OfflineIndicator />
          
          {/* Profile Picture Upload */}
          <div>
            <Label className="text-base font-medium">Profile Picture</Label>
            <div className="mt-2">
              <ImageUpload
                currentImage={profilePicture || undefined}
                onImageChange={setProfilePicture}
              />
            </div>
          </div>


          {/* Registration Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* User Type Selection */}
                <FormField
                  control={form.control}
                  name="userType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>User Type</FormLabel>
                      <FormControl>
                        <Select 
                          value={field.value} 
                          onValueChange={(value) => {
                            field.onChange(value);
                            // Reset student-specific fields when switching to teacher
                            if (value === 'teacher') {
                              form.setValue('course', 'Teacher');
                              form.setValue('year', 'N/A');
                            } else {
                              form.setValue('course', '');
                              form.setValue('year', '');
                            }
                          }}
                        >
                          <SelectTrigger className="bg-background">
                            <SelectValue placeholder="Select user type" />
                          </SelectTrigger>
                          <SelectContent className="bg-background z-50">
                            <SelectItem value="student">👨‍🎓 Student</SelectItem>
                            <SelectItem value="teacher">👨‍🏫 Teacher</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Student Type Selection (only for students) */}
                {watchedUserType === 'student' && (
                  <FormField
                    control={form.control}
                    name="studentType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Student Type</FormLabel>
                        <FormControl>
                          <Select 
                            value={field.value} 
                            onValueChange={(value) => {
                              field.onChange(value);
                              // Reset level and year when switching student type
                              form.setValue('level', 'none');
                              form.setValue('year', '');
                            }}
                          >
                            <SelectTrigger className="bg-background">
                              <SelectValue placeholder="Select student type" />
                            </SelectTrigger>
                            <SelectContent className="bg-background z-50">
                              <SelectItem value="ibed">🏫 IBED</SelectItem>
                              <SelectItem value="college">🎓 COLLEGE</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter full name" {...field} required pattern="^[^\\s]+\\s+[^\\s]+.*$" title="Enter at least first and last name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="studentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{watchedUserType === 'teacher' ? 'Teacher ID' : 'Student ID'}</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter ID (e.g., 2021-033)" {...field} required pattern="^\\d{4}-\\d{3,4}$" title="Format: YYYY-XXX or YYYY-XXXX (e.g., 2021-033)" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Level Selection - only for IBED students */}
                {watchedUserType === 'student' && watchedStudentType === 'ibed' && (
                  <FormField
                    control={form.control}
                    name="level"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Level</FormLabel>
                        <FormControl>
                          <Select 
                            value={field.value || 'none'} 
                            onValueChange={(value) => {
                              field.onChange(value);
                              form.setValue('department', 'none');
                              form.setValue('shift', 'none');
                            }}
                          >
                            <SelectTrigger className="bg-background">
                              <SelectValue placeholder="Select level" />
                            </SelectTrigger>
                            <SelectContent className="bg-background z-50">
                              <SelectItem value="none">No level assigned</SelectItem>
                              <SelectItem value="elementary">Elementary</SelectItem>
                              <SelectItem value="junior-high">Junior High</SelectItem>
                              <SelectItem value="senior-high">Senior High</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Level Selection - only for COLLEGE students */}
                {watchedUserType === 'student' && watchedStudentType === 'college' && (
                  <FormField
                    control={form.control}
                    name="level"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Level</FormLabel>
                        <FormControl>
                          <Select 
                            value={field.value || 'college'} 
                            onValueChange={(value) => {
                              field.onChange(value);
                              form.setValue('department', 'none');
                            }}
                          >
                            <SelectTrigger className="bg-background">
                              <SelectValue placeholder="Select level" />
                            </SelectTrigger>
                            <SelectContent className="bg-background z-50">
                              <SelectItem value="college">College</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Department/Strand Selection */}
                {watchedUserType === 'student' && (
                  <FormField
                    control={form.control}
                    name="department"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {watchedLevel === 'senior-high' ? 'Strand' : 'Department'}
                        </FormLabel>
                        <FormControl>
                          <Select 
                            value={field.value || 'none'} 
                            onValueChange={(value) => {
                              field.onChange(value);
                            }}
                          >
                            <SelectTrigger className="bg-background">
                              <SelectValue placeholder={`Select ${watchedLevel === 'senior-high' ? 'strand' : 'department'}`} />
                            </SelectTrigger>
                            <SelectContent className="bg-background z-50">
                              {getDepartmentOptions().map(option => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Show shift field only for SHS students */}
                {watchedUserType === 'student' && watchedLevel === 'senior-high' && (
                  <FormField
                    control={form.control}
                    name="shift"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Shift</FormLabel>
                        <FormControl>
                          <Select 
                            value={field.value || 'none'} 
                            onValueChange={(value) => {
                              field.onChange(value);
                            }}
                          >
                            <SelectTrigger className="bg-background">
                              <SelectValue placeholder="Select shift" />
                            </SelectTrigger>
                            <SelectContent className="bg-background z-50">
                              <SelectItem value="none">No shift assigned</SelectItem>
                              <SelectItem value="morning">Morning Shift</SelectItem>
                              <SelectItem value="afternoon">Afternoon Shift</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Course - not shown for teachers */}
                {watchedUserType === 'student' && (
                  <FormField
                    control={form.control}
                    name="course"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Course/Program</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter course" {...field} required />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Year/School Year */}
                {watchedUserType === 'student' && watchedStudentType === 'ibed' ? (
                  <FormField
                    control={form.control}
                    name="year"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>School Year</FormLabel>
                        <FormControl>
                          <Select value={field.value || ''} onValueChange={field.onChange}>
                            <SelectTrigger className="bg-background">
                              <SelectValue placeholder="Select school year" />
                            </SelectTrigger>
                            <SelectContent className="bg-background z-50">
                              {getSchoolYearOptions().map(option => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : watchedUserType === 'student' && watchedStudentType === 'college' ? (
                  <FormField
                    control={form.control}
                    name="year"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Year</FormLabel>
                        <FormControl>
                          <Select value={field.value || ''} onValueChange={field.onChange}>
                            <SelectTrigger className="bg-background">
                              <SelectValue placeholder="Select year" />
                            </SelectTrigger>
                            <SelectContent className="bg-background z-50">
                              <SelectItem value="1st Year">1st Year</SelectItem>
                              <SelectItem value="2nd Year">2nd Year</SelectItem>
                              <SelectItem value="3rd Year">3rd Year</SelectItem>
                              <SelectItem value="4th Year">4th Year</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : null}

                <FormField
                  control={form.control}
                  name="contactNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Number</FormLabel>
                      <FormControl>
                        <Input type="tel" placeholder="Enter contact number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="Enter email (gmail.com or ndkc.edu.ph)" {...field} pattern="^[A-Za-z0-9._%+-]+@(gmail\\.com|ndkc\\.edu\\.ph)$" title="Use gmail.com or ndkc.edu.ph email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div>
                  <Label htmlFor="rfidCode">RFID Code</Label>
                  <Input
                    id="rfidCode"
                    type="text"
                    placeholder="Enter RFID code (e.g., 0005768022)"
                    value={rfidData}
                    onChange={(e) => setRfidData(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" className="flex-1">
                  Register {watchedUserType === 'teacher' ? 'Teacher' : 'Student'}
                </Button>
                </div>
            </form>
          </Form>
        </div>
      </CardContent>
    </Card>
  );
};

export default StudentRegistration;
