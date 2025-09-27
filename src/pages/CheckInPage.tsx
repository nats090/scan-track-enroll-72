import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LogIn, Scan, UserPlus, ContactRound } from 'lucide-react';
import BarcodeScanner from '@/components/BarcodeScanner';
import RFIDScanner from '@/components/RFIDScanner';

import BackButton from '@/components/BackButton';
import { toast } from '@/components/ui/use-toast';
import { attendanceService } from '@/services/attendanceService';
import { studentService } from '@/services/studentService';
import { AttendanceEntry } from '@/types/AttendanceEntry';
import { getFromLocalStorage } from '@/utils/offlineStorage';

const CheckInPage = () => {
  const [scannerMode, setScannerMode] = useState<'barcode' | 'rfid' | 'manual'>('barcode');
  const [studentId, setStudentId] = useState('');
  const [studentName, setStudentName] = useState('');
  const [rfidInput, setRfidInput] = useState('');

  const rfidInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (scannerMode === 'rfid') {
      rfidInputRef.current?.focus();
    }
  }, [scannerMode]);

  const findStudent = async (searchId: string) => {
    // First check local storage
    const localData = await getFromLocalStorage();
    const localStudent = localData.students.find(s =>
      s.studentId === searchId || s.id === searchId || s.rfid === searchId
    );
    
    if (localStudent) {
      return localStudent;
    }

    // Try online lookup if available
    try {
      if (navigator.onLine) {
        // Try finding by barcode/student ID first
        let student = await studentService.findStudentByBarcode(searchId);
        
        // If not found by barcode, try RFID
        if (!student) {
          student = await studentService.findStudentByRFID(searchId);
        }
        
        return student;
      }
    } catch (error) {
      console.log('Online lookup failed, using local data only');
    }
    
    return null;
  };

  const handleRfidInput = async (rfidValue: string) => {
    if (!rfidValue.trim()) return;
    
    try {
      const student = await findStudent(rfidValue.trim());
      
      if (student) {
        // Check current status before allowing check-in
        const currentStatus = await attendanceService.getStudentCurrentStatus(student.studentId);
        
        if (currentStatus === 'checked-in') {
          toast({
            title: "Already Checked In",
            description: `${student.name} is already checked in. Please check out first.`,
            variant: "destructive",
          });
          setRfidInput(''); // Clear input
          return;
        }

        const newRecord: Omit<AttendanceEntry, 'id'> = {
          studentId: student.studentId,
          studentName: student.name,
          timestamp: new Date(),
          type: 'check-in',
          method: 'rfid'
        };
        
        await attendanceService.addAttendanceRecord(newRecord);
        
        toast({
          title: "Welcome!",
          description: `${student.name} checked in successfully`,
          duration: 3000,
        });
        
        setRfidInput(''); // Clear input for next scan
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

  const handleBarcodeDetected = async (barcode: string) => {
    try {
      const student = await findStudent(barcode);
      
      if (student) {
        // Check current status before allowing check-in
        const currentStatus = await attendanceService.getStudentCurrentStatus(student.studentId);
        
        if (currentStatus === 'checked-in') {
          toast({
            title: "Already Checked In",
            description: `${student.name} is already checked in. Please check out first.`,
            variant: "destructive",
          });
          return;
        }

        const newRecord: Omit<AttendanceEntry, 'id'> = {
          studentId: student.studentId,
          studentName: student.name,
          timestamp: new Date(),
          type: 'check-in',
          barcode: barcode,
          method: 'barcode'
        };
        
        await attendanceService.addAttendanceRecord(newRecord);
        
        toast({
          title: "Welcome!",
          description: `${student.name} checked in successfully`,
          duration: 3000,
        });
      } else {
        toast({
          title: "Student Not Found",
          description: "Student not found. Try manual entry or register new student.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleManualCheckIn = async () => {
    if (!studentId.trim()) {
      toast({
        title: "Error",
        description: "Please enter a student ID",
        variant: "destructive",
      });
      return;
    }

    try {
      const student = await findStudent(studentId.trim());
      let finalStudentName = studentName.trim();
      
      if (student) {
        finalStudentName = student.name;
        
        // Check current status before allowing check-in
        const currentStatus = await attendanceService.getStudentCurrentStatus(student.studentId);
        
        if (currentStatus === 'checked-in') {
          toast({
            title: "Already Checked In",
            description: `${student.name} is already checked in. Please check out first.`,
            variant: "destructive",
          });
          return;
        }
      } else if (!finalStudentName) {
        toast({
          title: "Error",
          description: "Student not found. Please enter student name or register first.",
          variant: "destructive",
        });
        return;
      }

      const newRecord: Omit<AttendanceEntry, 'id'> = {
        studentId: studentId.trim(),
        studentName: finalStudentName,
        timestamp: new Date(),
        type: 'check-in',
        method: 'manual'
      };
      
      await attendanceService.addAttendanceRecord(newRecord);
      
      toast({
        title: "Welcome!",
        description: `${finalStudentName} checked in successfully`,
        duration: 3000,
      });

      // Reset form and switch to RFID mode for next user
      setStudentId('');
      setStudentName('');
      setScannerMode('rfid');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to record check-in. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4 flex items-center justify-center">
      <Card className="w-full max-w-2xl shadow-2xl">
        <CardHeader className="text-center bg-green-500 text-white rounded-t-lg">
          <CardTitle className="text-4xl font-bold flex items-center justify-center gap-4">
            <LogIn size={48} />
            Library Check In
          </CardTitle>
          <p className="text-xl mt-2">
            {scannerMode === 'manual' ? 'Manual check-in entry' : 
             scannerMode === 'rfid' ? 'Use your RFID card to enter the library' :
             'Scan your student ID to enter the library'}
          </p>
        </CardHeader>
        
        <CardContent className="p-8">
          <div className="mb-4">
            <BackButton to="/" />
          </div>
          
          
          <div className="text-center space-y-6">
            <div className="flex gap-2 justify-center mb-6 flex-wrap">
              <Button 
                onClick={() => setScannerMode('barcode')}
                variant={scannerMode === 'barcode' ? "default" : "outline"}
                size="sm"
              >
                <Scan className="h-4 w-4 mr-2" />
                Barcode
              </Button>
              <Button 
                onClick={() => setScannerMode('rfid')}
                variant={scannerMode === 'rfid' ? "default" : "outline"}
                size="sm"
              >
                <ContactRound className="h-4 w-4 mr-2" />
                RFID
              </Button>
              <Button 
                onClick={() => setScannerMode('manual')}
                variant={scannerMode === 'manual' ? "default" : "outline"}
                size="sm"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Manual
              </Button>
            </div>

            {scannerMode === 'barcode' ? (
              <>
                <div className="bg-gray-50 rounded-lg p-6">
                  <Scan size={64} className="mx-auto mb-4 text-gray-600" />
                  <h3 className="text-2xl font-semibold mb-2">Scan Your Student ID Barcode</h3>
                  <p className="text-gray-600 text-lg">Hold your student ID barcode to the camera</p>
                </div>
                
                <BarcodeScanner onBarcodeDetected={handleBarcodeDetected} isActive={true} />
              </>
            ) : scannerMode === 'rfid' ? (
              <>
                <div className="bg-gray-50 rounded-lg p-6 mb-4">
                  <ContactRound size={64} className="mx-auto mb-4 text-gray-600" />
                  <h3 className="text-2xl font-semibold mb-2">Scan Your RFID Card</h3>
                  <p className="text-gray-600 text-lg mb-4">Tap your RFID card on the scanner or click in the field below</p>
                </div>
                
                <div className="max-w-md mx-auto">
                  <Label htmlFor="rfidInput" className="text-lg font-medium">RFID Scanner Input</Label>
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
                    className="text-center text-lg py-3 mt-2"
                    autoFocus
                  />
                  <p className="text-sm text-gray-500 mt-2 text-center">
                    RFID scanners will automatically input the card data here. Press Enter or scan will auto-submit.
                  </p>
                </div>
              </>
            ) : (
              <div className="bg-gray-50 rounded-lg p-6 text-left max-w-md mx-auto">
                <h3 className="text-2xl font-semibold mb-4 text-center">Manual Check-In</h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="studentId">Student ID *</Label>
                    <Input
                      id="studentId"
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value)}
                      placeholder="Enter student ID"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="studentName">Student Name (optional if ID exists)</Label>
                    <Input
                      id="studentName"
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      placeholder="Enter student name"
                    />
                  </div>
                  <Button onClick={handleManualCheckIn} className="w-full">
                    Check In
                  </Button>
                </div>
              </div>
            )}
            
            <div className="mt-8 p-4 bg-blue-50 rounded-lg">
              <p className="text-lg text-blue-800">
                <strong>Need help?</strong> Please ask library staff for assistance.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CheckInPage;