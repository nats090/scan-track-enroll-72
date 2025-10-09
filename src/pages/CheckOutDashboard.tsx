import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { LogOut, Users, Clock, UserMinus, Wifi, Activity, Timer, RefreshCw } from 'lucide-react';
import { attendanceService } from '@/services/attendanceService';
import { studentService } from '@/services/studentService';
import { Student } from '@/types/Student';
import { AttendanceEntry } from '@/types/AttendanceEntry';
import { toast } from '@/hooks/use-toast';
import { format, differenceInHours, differenceInMinutes } from 'date-fns';

import BackButton from '@/components/BackButton';
import AttendanceTable from '@/components/AttendanceTable';

const CheckOutDashboard = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [recentCheckOuts, setRecentCheckOuts] = useState<AttendanceEntry[]>([]);
  const [currentCount, setCurrentCount] = useState(0);
  const [visitorDialog, setVisitorDialog] = useState(false);
  const [studentDialog, setStudentDialog] = useState(false);
  const [studentSearchId, setStudentSearchId] = useState('');
  const [searchResults, setSearchResults] = useState<Student[]>([]);
  const [isRFIDActive, setIsRFIDActive] = useState(false);
  const [visitorName, setVisitorName] = useState('');
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
      
      // Get today's records
      const today = new Date().toDateString();
      const todayRecords = attendanceData.filter(record => 
        new Date(record.timestamp).toDateString() === today
      );
      
      // Get all check-outs for today
      const recentCheckOuts = todayRecords
        .filter(record => record.type === 'check-out')
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      const todayCheckOutsCount = todayRecords.filter(record => record.type === 'check-out').length;
      
      setRecentCheckOuts(recentCheckOuts);
      setCurrentCount(todayCheckOutsCount);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleVisitorCheckOut = async () => {
    try {
      if (!visitorName.trim()) {
        toast({
          title: "Error",
          description: "Visitor name is required",
          variant: "destructive",
        });
        return;
      }

      // Use visitor name as identifier (must match check-in)
      const visitorId = `VISITOR_${visitorName.toUpperCase().replace(/\s+/g, '_')}`;
      
      // Check if visitor is checked in
      const currentStatus = await attendanceService.getStudentCurrentStatus(visitorId);
      if (currentStatus === 'checked-out') {
        toast({
          title: "Already Checked Out",
          description: `Visitor ${visitorName} is not currently checked in.`,
          variant: "destructive",
        });
        return;
      }
      if (currentStatus === 'unknown') {
        toast({
          title: "No Check-in Record",
          description: `Visitor ${visitorName} has no active check-in record.`,
          variant: "destructive",
        });
        return;
      }

      const visitorRecord: Omit<AttendanceEntry, 'id'> = {
        studentId: visitorId,
        studentName: visitorName,
        timestamp: new Date(),
        type: 'check-out',
        method: 'manual',
        purpose: 'Check Out'
      };

      await attendanceService.addAttendanceRecord(visitorRecord);
      
      toast({
        title: "Goodbye!",
        description: `Visitor ${visitorName} checked out successfully`,
      });

      setVisitorName('');
      setVisitorDialog(false);
      loadData(); // Refresh data
      // Focus RFID input for next scan
      setTimeout(() => {
        rfidInputRef.current?.focus();
      }, 100);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to check out visitor",
        variant: "destructive",
      });
    }
  };

  const calculateDuration = async (studentId: string, checkOutTime: Date) => {
    try {
      // Get the most recent check-in for this student before the check-out
      const attendanceData = await attendanceService.getAttendanceRecords();
      const studentRecords = attendanceData
        .filter(record => record.studentId === studentId && record.timestamp < checkOutTime)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      const lastCheckIn = studentRecords.find(record => record.type === 'check-in');
      
      if (!lastCheckIn) {
        return 'Unknown';
      }
      
      const checkInTime = new Date(lastCheckIn.timestamp);
      const hours = differenceInHours(checkOutTime, checkInTime);
      const minutes = differenceInMinutes(checkOutTime, checkInTime) % 60;
      
      if (hours > 0) {
        return `${hours}h ${minutes}m`;
      }
      return `${minutes}m`;
    } catch (error) {
      return 'Unknown';
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

  const handleStudentCheckOut = async (student: Student) => {
    try {
      const currentStatus = await attendanceService.getStudentCurrentStatus(student.id);
      if (currentStatus === 'checked-out') {
        toast({
          title: 'Already Checked Out',
          description: `${student.name} is not currently checked in.`,
          variant: 'destructive',
        });
        return;
      }
      if (currentStatus === 'unknown') {
        toast({
          title: 'No Check-in Record',
          description: `${student.name} has no active check-in record.`,
          variant: 'destructive',
        });
        return;
      }

      const studentRecord: Omit<AttendanceEntry, 'id'> = {
        studentDatabaseId: student.id,
        studentId: student.studentId,
        studentName: student.name,
        timestamp: new Date(),
        type: 'check-out',
        method: 'manual',
        course: student.course,
        year: student.year,
        userType: student.userType || 'student',
        studentType: student.studentType,
        level: student.level
      };

      await attendanceService.addAttendanceRecord(studentRecord);

      toast({
        title: "Goodbye!",
        description: `${student.name} checked out successfully`,
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
        description: "Failed to check out student",
        variant: "destructive",
      });
    }
  };

  const handleRfidInput = async (rfidValue: string) => {
    if (!rfidValue.trim()) return;
    
    try {
      // Find student by RFID in local data first
      const student = students.find(s => s.rfid === rfidValue.trim() || s.studentId === rfidValue.trim());
      
      if (student) {
        // Check current status before allowing check-out (using unique database ID)
        const currentStatus = await attendanceService.getStudentCurrentStatus(student.id);
        
        if (currentStatus === 'checked-out') {
          toast({
            title: "Already Checked Out",
            description: `${student.name} is not currently checked in.`,
            variant: "destructive",
          });
          setRfidInput(''); // Clear input
          return;
        }
        
        if (currentStatus === 'unknown') {
          toast({
            title: "No Check-in Record",
            description: `${student.name} has no active check-in record.`,
            variant: "destructive",
          });
          setRfidInput(''); // Clear input
          return;
        }

        const newRecord: Omit<AttendanceEntry, 'id'> = {
          studentDatabaseId: student.id,
          studentId: student.studentId,
          studentName: student.name,
          timestamp: new Date(),
          type: 'check-out',
          method: 'rfid',
          course: student.course,
          year: student.year,
          userType: student.userType || 'student',
          studentType: student.studentType,
          level: student.level
        };
        
        await attendanceService.addAttendanceRecord(newRecord);
        
        toast({
          title: "Goodbye!",
          description: `${student.name} checked out successfully`,
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 p-4" onKeyDownCapture={(e) => {
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
          <h1 className="text-3xl font-bold text-red-700 flex items-center gap-3">
            <LogOut size={32} />
            Check Out Dashboard
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
          <Card className="bg-red-500 text-white">
            <CardHeader className="text-center py-4">
              <CardTitle className="text-2xl font-bold">{currentCount}</CardTitle>
              <p className="text-sm">Today's Check-outs</p>
            </CardHeader>
          </Card>

          <Card className="bg-orange-500 text-white">
            <CardHeader className="text-center py-4">
              <CardTitle className="text-2xl font-bold">
                {currentCount - recentCheckOuts.filter(r => r.studentId === 'VISITOR').length}
              </CardTitle>
              <p className="text-sm">Student Check-outs</p>
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
                <UserMinus className="mr-2" size={18} />
                Manual Entry
              </Button>
            </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-2xl text-center">Student Check Out</DialogTitle>
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
                          onClick={() => handleStudentCheckOut(student)}
                          className="w-full p-3 text-left hover:bg-red-50 border-b last:border-b-0 transition-colors"
                        >
                          <div className="font-medium text-red-600">{student.name}</div>
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
                <UserMinus className="mr-2" size={18} />
                Visitor Check Out
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="text-2xl text-center">Visitor Check Out</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="visitor-name">Visitor Name *</Label>
                  <Input
                    id="visitor-name"
                    value={visitorName}
                    onChange={(e) => setVisitorName(e.target.value)}
                    placeholder="Enter visitor's full name"
                    className="text-lg p-3"
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <Button onClick={handleVisitorCheckOut} className="flex-1 text-lg py-3">
                    Check Out
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

        {/* Recent Check-outs Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity size={20} />
              Recent Check-outs
            </CardTitle>
            <p className="text-sm text-muted-foreground">All check-outs from today</p>
          </CardHeader>
          <CardContent>
            <AttendanceTable records={recentCheckOuts} students={students} type="check-out" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CheckOutDashboard;