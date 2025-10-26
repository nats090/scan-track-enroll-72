import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { LogIn, Users, Clock, UserPlus, Wifi, Activity, RefreshCw } from 'lucide-react';
import { attendanceService } from '@/services/attendanceService';
import { studentService } from '@/services/studentService';
import { Student } from '@/types/Student';
import { AttendanceEntry } from '@/types/AttendanceEntry';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

import BackButton from '@/components/BackButton';
import AttendanceTable from '@/components/AttendanceTable';
import { useMidnightReset } from '@/hooks/useMidnightReset';

const CheckInDashboard = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [recentCheckIns, setRecentCheckIns] = useState<AttendanceEntry[]>([]);
  const [currentCount, setCurrentCount] = useState(0);
  const [visitorDialog, setVisitorDialog] = useState(false);
  const [studentDialog, setStudentDialog] = useState(false);
  const [studentSearchId, setStudentSearchId] = useState('');
  const [searchResults, setSearchResults] = useState<Student[]>([]);
  const [isRFIDActive, setIsRFIDActive] = useState(false);
  const [visitorData, setVisitorData] = useState({
    name: '',
    purpose: '',
    contact: '',
    organization: ''
  });
  const [rfidInput, setRfidInput] = useState('');
  const rfidInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  // Always refocus RFID input when dialogs close
  useEffect(() => {
    if (!studentDialog && !visitorDialog) {
      const id = window.setTimeout(() => {
        rfidInputRef.current?.focus();
      }, 50);
      return () => window.clearTimeout(id);
    }
  }, [studentDialog, visitorDialog]);

  const loadData = async () => {
    try {
      const [studentsData, attendanceData] = await Promise.all([
        studentService.getStudents(),
        attendanceService.getAttendanceRecords()
      ]);

      setStudents(studentsData);
      
      // Get today's records starting from 12am (midnight reset)
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      
      const todayRecords = attendanceData.filter(record => 
        new Date(record.timestamp) >= todayStart
      );
      
      // Get all check-ins from today
      const recentCheckIns = todayRecords
        .filter(record => record.type === 'check-in')
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      // Get today's count for the stats card
      const todayCheckInsCount = todayRecords.filter(record => record.type === 'check-in').length;
      
      setRecentCheckIns(recentCheckIns);
      setCurrentCount(todayCheckInsCount);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  // Automatically refresh at midnight to reset daily displays
  useMidnightReset(loadData);

  const handleVisitorCheckIn = async () => {
    try {
      if (!visitorData.name || !visitorData.purpose) {
        toast({
          title: "Error",
          description: "Name and purpose are required",
          variant: "destructive",
        });
        return;
      }

      // Use visitor name as unique identifier (prefixed to distinguish from student IDs)
      const visitorId = `VISITOR_${visitorData.name.toUpperCase().replace(/\s+/g, '_')}`;
      

      const visitorRecord: Omit<AttendanceEntry, 'id'> = {
        studentId: visitorId,
        studentName: visitorData.name,
        timestamp: new Date(),
        type: 'check-in',
        method: 'manual',
        purpose: visitorData.purpose,
        contact: visitorData.contact
      };

      try {
        await attendanceService.addAttendanceRecord(visitorRecord);
      } catch (error: any) {
        if (error.message?.startsWith('COOLDOWN:')) {
          const remainingSeconds = error.message.split(':')[1];
          toast({
            title: "⏱️ Please wait",
            description: `Please wait ${remainingSeconds} more seconds before checking in again`,
            variant: "destructive",
          });
          return;
        } else {
          throw error;
        }
      }
      
      toast({
        title: "Welcome!",
        description: `Visitor ${visitorData.name} checked in successfully`,
      });

      setVisitorData({ name: '', purpose: '', contact: '', organization: '' });
      setVisitorDialog(false);
      loadData(); // Refresh data
      // Focus RFID input for next scan
      setTimeout(() => {
        rfidInputRef.current?.focus();
      }, 100);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to check in visitor",
        variant: "destructive",
      });
    }
  };

  const handleStudentSearch = (searchId: string) => {
    setStudentSearchId(searchId);
    if (searchId.trim()) {
      const results = students.filter(student => 
        student.studentId.toLowerCase().includes(searchId.toLowerCase()) ||
        student.name.toLowerCase().includes(searchId.toLowerCase())
      );
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  };

  const handleRfidInput = async (rfidValue: string) => {
    if (!rfidValue.trim()) return;
    
    try {
      // Find student by RFID
      const student = students.find(s => 
        s.rfid === rfidValue.trim() || 
        s.studentId === rfidValue.trim() ||
        s.id === rfidValue.trim()
      );
      
      if (student) {

        const newRecord: Omit<AttendanceEntry, 'id'> = {
          studentDatabaseId: student.id,
          studentId: student.studentId,
          studentName: student.name,
          timestamp: new Date(),
          type: 'check-in',
          method: 'rfid',
          course: student.course,
          year: student.year,
          userType: student.userType || 'student',
          studentType: student.studentType,
          level: student.level,
          strand: student.strand
        };
        
        try {
          await attendanceService.addAttendanceRecord(newRecord);
        } catch (error: any) {
          if (error.message?.startsWith('COOLDOWN:')) {
            const remainingSeconds = error.message.split(':')[1];
            toast({
              title: "⏱️ Please wait",
              description: `Please wait ${remainingSeconds} more seconds before checking in again`,
              variant: "destructive",
            });
            setRfidInput(''); // Clear input
            return;
          } else {
            throw error;
          }
        }
        
        toast({
          title: "Welcome!",
          description: `${student.name} checked in successfully via RFID`,
          duration: 3000,
        });
        
        setRfidInput(''); // Clear input for next scan
        loadData(); // Refresh data
      } else {
        toast({
          title: "Student Not Found",
          description: "RFID not registered. Please register student first.",
          variant: "destructive",
        });
        setRfidInput(''); // Clear input
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
      setRfidInput(''); // Clear input
    }
  };

  const handleStudentCheckIn = async (student: Student) => {
    try {

      const studentRecord: Omit<AttendanceEntry, 'id'> = {
        studentDatabaseId: student.id,
        studentId: student.studentId,
        studentName: student.name,
        timestamp: new Date(),
        type: 'check-in',
        method: 'manual',
        course: student.course,
        year: student.year,
        userType: student.userType || 'student',
        studentType: student.studentType,
        level: student.level,
        strand: student.strand
      };

      try {
        await attendanceService.addAttendanceRecord(studentRecord);
      } catch (error: any) {
        if (error.message?.startsWith('COOLDOWN:')) {
          const remainingSeconds = error.message.split(':')[1];
          toast({
            title: "⏱️ Please wait",
            description: `Please wait ${remainingSeconds} more seconds before checking in again`,
            variant: "destructive",
          });
          return;
        } else {
          throw error;
        }
      }

      toast({
        title: "Welcome!",
        description: `${student.name} checked in successfully`,
      });

      setStudentSearchId('');
      setSearchResults([]);
      setStudentDialog(false);
      loadData(); // Refresh data
      // Focus RFID input for next scan
      setTimeout(() => {
        rfidInputRef.current?.focus();
      }, 100);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to check in student",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4" onKeyDownCapture={(e) => {
      if (!studentDialog && !visitorDialog) {
        if (document.activeElement !== rfidInputRef.current) {
          rfidInputRef.current?.focus();
        }
      }
    }}>

      <div className="max-w-7xl mx-auto">
        {/* Back Button */}
        <div className="mb-6">
          <BackButton to="/" />
        </div>
        
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-green-700 flex items-center gap-3">
            <LogIn size={32} />
            Check In Dashboard
          </h1>
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-green-500 text-white">
            <CardHeader className="text-center py-4">
              <CardTitle className="text-2xl font-bold">{currentCount}</CardTitle>
              <p className="text-sm">Today's Check-ins</p>
            </CardHeader>
          </Card>

          <Card className="bg-blue-500 text-white">
            <CardHeader className="text-center py-4">
              <CardTitle className="text-2xl font-bold">{students.length}</CardTitle>
              <p className="text-sm">Total Students</p>
            </CardHeader>
          </Card>

          <Card className="bg-purple-500 text-white">
            <CardHeader className="text-center py-4">
              <CardTitle className="text-2xl font-bold">
                {format(new Date(), 'HH:mm')}
              </CardTitle>
              <p className="text-sm">{format(new Date(), 'MMM dd, yyyy')}</p>
            </CardHeader>
          </Card>
        </div>

        {/* RFID Scanner Input */}
        <Card className="mb-4">
          <CardHeader className="py-2">
            <CardTitle className="text-sm flex items-center gap-1">
              <span>🏷️</span>
              <span>RFID Scanner</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="py-3">
            <div className="space-y-1.5">
              <Label htmlFor="rfidInput" className="text-xs">RFID Input</Label>
              <Input
                id="rfidInput"
                ref={rfidInputRef}
                value={rfidInput}
                onChange={(e) => setRfidInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && rfidInput.trim()) {
                    handleRfidInput(rfidInput);
                  }
                }}
                placeholder="Scan RFID card here..."
                className="text-center h-8 text-sm"
                autoFocus
              />
              <p className="text-[10px] text-muted-foreground text-center">
                RFID scanners will automatically input data here
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-center gap-3 mb-6">
          <Dialog open={studentDialog} onOpenChange={setStudentDialog}>
            <DialogTrigger asChild>
              <Button className="bg-blue-500 hover:bg-blue-600">
                <UserPlus className="mr-2" size={18} />
                Manual Entry
              </Button>
            </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-2xl text-center">Student Check In</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="student-search">Search Student ID or Name</Label>
                    <Input
                      id="student-search"
                      value={studentSearchId}
                      onChange={(e) => handleStudentSearch(e.target.value)}
                      placeholder="Enter student ID (e.g., 2021-033) or name"
                      className="text-lg p-3"
                    />
                  </div>
                  
                  {searchResults.length > 0 && (
                    <div className="max-h-48 overflow-y-auto border rounded-lg">
                      <div className="text-sm font-medium p-2 bg-gray-50 border-b">
                        Found {searchResults.length} student(s):
                      </div>
                      {searchResults.map((student) => (
                        <button
                          key={student.id}
                          onClick={() => handleStudentCheckIn(student)}
                          className="w-full p-3 text-left hover:bg-blue-50 border-b last:border-b-0 transition-colors"
                        >
                          <div className="font-medium text-blue-600">{student.name}</div>
                          <div className="text-sm text-gray-600">ID: {student.studentId}</div>
                          {student.email && (
                            <div className="text-xs text-gray-500">{student.email}</div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {studentSearchId && searchResults.length === 0 && (
                    <div className="text-center p-4 text-gray-500">
                      No students found matching "{studentSearchId}"
                    </div>
                  )}
                  
                  <Button 
                    onClick={() => {
                      setStudentDialog(false);
                      setStudentSearchId('');
                      setSearchResults([]);
                    }} 
                    variant="outline" 
                    className="w-full text-lg py-3"
                  >
                    Cancel
                  </Button>
                </div>
            </DialogContent>
          </Dialog>

          <Dialog open={visitorDialog} onOpenChange={setVisitorDialog}>
            <DialogTrigger asChild>
              <Button className="bg-orange-500 hover:bg-orange-600">
                <UserPlus className="mr-2" size={18} />
                Visitor Check In
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="text-2xl text-center">Visitor Check In</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="visitor-name">Full Name *</Label>
                  <Input
                    id="visitor-name"
                    value={visitorData.name}
                    onChange={(e) => setVisitorData({...visitorData, name: e.target.value})}
                    placeholder="Enter visitor's full name"
                    className="text-lg p-3"
                  />
                </div>
                <div>
                  <Label htmlFor="visitor-purpose">Purpose of Visit *</Label>
                  <Textarea
                    id="visitor-purpose"
                    value={visitorData.purpose}
                    onChange={(e) => setVisitorData({...visitorData, purpose: e.target.value})}
                    placeholder="Why are you visiting? (e.g., Research, Study, Meeting)"
                    className="text-lg p-3"
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="visitor-contact">Contact Number</Label>
                  <Input
                    id="visitor-contact"
                    value={visitorData.contact}
                    onChange={(e) => setVisitorData({...visitorData, contact: e.target.value})}
                    placeholder="Phone number (optional)"
                    className="text-lg p-3"
                  />
                </div>
                <div>
                  <Label htmlFor="visitor-org">Organization</Label>
                  <Input
                    id="visitor-org"
                    value={visitorData.organization}
                    onChange={(e) => setVisitorData({...visitorData, organization: e.target.value})}
                    placeholder="School/Company (optional)"
                    className="text-lg p-3"
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <Button onClick={handleVisitorCheckIn} className="flex-1 text-lg py-3">
                    Check In
                  </Button>
                  <Button 
                    onClick={() => setVisitorDialog(false)} 
                    variant="outline" 
                    className="flex-1 text-lg py-3"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Recent Check-ins Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity size={20} />
              Recent Check-ins
            </CardTitle>
            <p className="text-sm text-muted-foreground">All entries from past 24 hours</p>
          </CardHeader>
          <CardContent>
            <AttendanceTable records={recentCheckIns} students={students} type="check-in" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CheckInDashboard;