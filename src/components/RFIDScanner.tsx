import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ContactRound, Wifi, WifiOff, Check, X, Zap, Shield, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { attendanceService } from '@/services/attendanceService';
import { studentService } from '@/services/studentService';
import { getFromLocalStorage } from '@/utils/offlineStorage';

// Web Serial API type definitions
interface SerialOptions {
  baudRate: number;
  dataBits?: number;
  stopBits?: number;
  parity?: 'none' | 'even' | 'odd';
  bufferSize?: number;
  flowControl?: 'none' | 'hardware';
}

interface SerialPort {
  open(options: SerialOptions): Promise<void>;
  close(): Promise<void>;
  readable: ReadableStream<Uint8Array>;
  writable: WritableStream<Uint8Array>;
}

interface SerialPortRequestOptions {
  filters?: Array<{
    usbVendorId?: number;
    usbProductId?: number;
  }>;
}

interface Serial {
  requestPort(options?: SerialPortRequestOptions): Promise<SerialPort>;
  getPorts(): Promise<SerialPort[]>;
}

declare global {
  interface Navigator {
    serial: Serial;
  }
}

interface RFIDScannerProps {
  onRFIDDetected?: (rfidData: string) => void;
  isActive: boolean;
  currentRFID?: string;
  mode?: 'check-in' | 'check-out' | 'register' | 'general';
  onCheckIn?: (studentData: any) => void;
  onCheckOut?: (studentData: any) => void;
  onRegister?: (rfidData: string) => void;
}

const RFIDScanner: React.FC<RFIDScannerProps> = ({ 
  onRFIDDetected, 
  isActive, 
  currentRFID,
  mode = 'general',
  onCheckIn,
  onCheckOut,
  onRegister
}) => {
  const [manualRFID, setManualRFID] = useState(currentRFID || '');
  const [isScanning, setIsScanning] = useState(false);
  const [rfidReaderStatus, setRfidReaderStatus] = useState<'ready' | 'scanning' | 'error' | 'offline'>('offline');
  const [lastScanTime, setLastScanTime] = useState<Date | null>(null);
  const [serialPort, setSerialPort] = useState<SerialPort | null>(null);
  const [reader, setReader] = useState<ReadableStreamDefaultReader<Uint8Array> | null>(null);

  // Initialize RFID reader connection
  useEffect(() => {
    if (isActive) {
      initializeRFIDReader();
    } else {
      disconnectRFIDReader();
    }
    
    return () => {
      disconnectRFIDReader();
    };
  }, [isActive]);

  const initializeRFIDReader = async () => {
    try {
      // Check Web Serial API support
      if (!('serial' in navigator)) {
        setRfidReaderStatus('error');
        toast({
          title: "Web Serial API Not Supported",
          description: "Please use Chrome/Edge browser (version 89+) and enable Serial API in flags.",
          variant: "destructive",
        });
        return;
      }

      // Check if running in HTTPS context (required for Web Serial API)
      if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
        setRfidReaderStatus('error');
        toast({
          title: "HTTPS Required",
          description: "RFID scanner requires HTTPS or localhost environment.",
          variant: "destructive",
        });
        return;
      }

      // Try to get available serial ports to check for existing connections
      try {
        const availablePorts = await navigator.serial.getPorts();
        if (availablePorts.length > 0) {
          console.log(`Found ${availablePorts.length} available serial port(s)`);
          // Optionally auto-connect to the first available port
          // You can uncomment this to auto-connect if preferred
          // await connectExistingPort(availablePorts[0]);
        }
      } catch (portError) {
        console.log('Could not check for existing ports:', portError);
      }

      setRfidReaderStatus('ready');
      toast({
        title: "RFID Reader Ready",
        description: "Click 'Connect Reader' to connect your RFID device.",
      });
    } catch (error) {
      console.error('RFID initialization error:', error);
      setRfidReaderStatus('error');
      toast({
        title: "RFID Reader Error",
        description: "Failed to initialize RFID reader. Check browser permissions.",
        variant: "destructive",
      });
    }
  };

  // Helper function to connect to an existing port
  const connectExistingPort = async (port: SerialPort) => {
    try {
      console.log('Attempting to connect to existing port...');
      
      await port.open({ 
        baudRate: 9600,
        dataBits: 8,
        parity: 'none',
        stopBits: 1,
        flowControl: 'none'
      });

      setSerialPort(port);
      setRfidReaderStatus('scanning');
      
      const reader = port.readable.getReader();
      setReader(reader);
      startReading(reader);

      toast({
        title: "RFID Reader Auto-Connected",
        description: "Previously paired RFID reader connected automatically.",
      });
    } catch (error) {
      console.log('Auto-connect failed:', error);
      // Don't show error toast for auto-connect failures
    }
  };

  const connectRFIDReader = async () => {
    try {
      console.log('Requesting RFID reader connection...');
      
      // Request port with comprehensive filters for various RFID reader manufacturers
      const port = await navigator.serial.requestPort({
        filters: [
          { usbVendorId: 0x1FC9 }, // NXP (common RFID manufacturer)
          { usbVendorId: 0x072F }, // Advanced Card Systems Ltd
          { usbVendorId: 0x0BDA }, // Realtek (some RFID readers)
          { usbVendorId: 0x067B }, // Prolific Technology Inc
          { usbVendorId: 0x10C4 }, // Silicon Labs (CP210x series)
          { usbVendorId: 0x0403 }, // FTDI (FT232 series)
          { usbVendorId: 0x1A86 }, // QinHeng Electronics (CH340/CH341)
          { usbVendorId: 0x2341 }, // Arduino LLC
          { usbVendorId: 0x16C0 }, // Van Ooijen Technische Informatica
        ]
      });

      console.log('Port selected, opening connection...');

      // Try different baud rates common for RFID readers
      const baudRates = [9600, 115200, 38400, 19200, 57600];
      let connected = false;

      for (const baudRate of baudRates) {
        try {
          await port.open({ 
            baudRate,
            dataBits: 8,
            parity: 'none',
            stopBits: 1,
            flowControl: 'none'
          });
          
          console.log(`Successfully connected at ${baudRate} baud`);
          connected = true;
          break;
        } catch (baudError) {
          console.log(`Failed to connect at ${baudRate} baud:`, baudError);
          if (baudRate !== baudRates[baudRates.length - 1]) {
            try {
              await port.close();
            } catch (closeError) {
              // Ignore close errors when trying different baud rates
            }
          }
        }
      }

      if (!connected) {
        throw new Error('Could not establish connection at any supported baud rate');
      }

      setSerialPort(port);
      setRfidReaderStatus('scanning');
      
      // Start reading from the RFID reader
      const reader = port.readable.getReader();
      setReader(reader);
      startReading(reader);

      toast({
        title: "RFID Reader Connected",
        description: "Successfully connected! Place an RFID card near the reader to scan.",
      });
    } catch (error: any) {
      console.error('RFID connection error:', error);
      setRfidReaderStatus('error');
      
      let errorMessage = "Failed to connect to RFID reader.";
      
      if (error.name === 'NotFoundError') {
        errorMessage = "No RFID reader selected. Please try again and select your device.";
      } else if (error.name === 'SecurityError') {
        errorMessage = "Permission denied. Please allow access to the serial port.";
      } else if (error.name === 'NetworkError') {
        errorMessage = "Device connection failed. Check if RFID reader is properly connected.";
      } else if (error.name === 'InvalidStateError') {
        errorMessage = "Device is already in use or disconnected.";
      }
      
      toast({
        title: "Connection Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const startReading = async (reader: ReadableStreamDefaultReader<Uint8Array>) => {
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
    if (value) {
      const data = new TextDecoder().decode(value);
      await processRFIDData(data);
    }
      }
    } catch (error) {
      console.error('Error reading from RFID device:', error);
      setRfidReaderStatus('error');
    }
  };

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
        // Try finding by RFID
        const student = await studentService.findStudentByRFID(searchId);
        return student;
      }
    } catch (error) {
      console.log('Online lookup failed, using local data only');
    }
    
    return null;
  };

  const processRFIDData = async (data: string) => {
    // Process incoming RFID data (format varies by reader manufacturer)
    const cleanData = data.trim().replace(/[\r\n]/g, '');
    
    if (cleanData.length >= 8) { // Valid RFID UID typically 8+ characters
      setManualRFID(cleanData.toUpperCase());
      setLastScanTime(new Date());

      // Handle different modes
      if (mode === 'check-in') {
        await handleCheckIn(cleanData.toUpperCase());
      } else if (mode === 'check-out') {
        await handleCheckOut(cleanData.toUpperCase());
      } else if (onRFIDDetected) {
        // For registration mode, just pass the clean RFID code
        onRFIDDetected(cleanData.toUpperCase());
        toast({
          title: "RFID Card Read Successfully",
          description: `Card UID: ${cleanData.toUpperCase()}`,
          duration: 3000,
        });
      }
    }
  };

  const handleCheckIn = async (rfidUID: string) => {
    try {
      const student = await findStudent(rfidUID);
      
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

        const newRecord = {
          studentId: student.studentId,
          studentName: student.name,
          timestamp: new Date(),
          type: 'check-in' as const,
          method: 'rfid' as const
        };
        
        await attendanceService.addAttendanceRecord(newRecord);
        
        toast({
          title: "Welcome!",
          description: `${student.name} checked in successfully via RFID`,
          duration: 3000,
        });
      } else {
        toast({
          title: "Student Not Found",
          description: "RFID card not registered. Please register first or use manual entry.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong during check-in. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCheckOut = async (rfidUID: string) => {
    try {
      const student = await findStudent(rfidUID);
      
      if (student) {
        // Check current status before allowing check-out
        const currentStatus = await attendanceService.getStudentCurrentStatus(student.studentId);
        
        if (currentStatus === 'checked-out') {
          toast({
            title: "Already Checked Out",
            description: `${student.name} is not currently checked in.`,
            variant: "destructive",
          });
          return;
        }
        
        if (currentStatus === 'unknown') {
          toast({
            title: "No Check-in Record",
            description: `${student.name} has no active check-in record.`,
            variant: "destructive",
          });
          return;
        }

        const newRecord = {
          studentId: student.studentId,
          studentName: student.name,
          timestamp: new Date(),
          type: 'check-out' as const,
          method: 'rfid' as const
        };
        
        await attendanceService.addAttendanceRecord(newRecord);
        
        toast({
          title: "Goodbye!",
          description: `${student.name} checked out successfully via RFID`,
          duration: 3000,
        });
      } else {
        toast({
          title: "Student Not Found",
          description: "RFID card not registered. Please register first or use manual entry.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong during check-out. Please try again.",
        variant: "destructive",
      });
    }
  };

  const disconnectRFIDReader = async () => {
    try {
      if (reader) {
        await reader.cancel();
        setReader(null);
      }
      if (serialPort) {
        await serialPort.close();
        setSerialPort(null);
      }
      setRfidReaderStatus('offline');
    } catch (error) {
      console.error('Error disconnecting RFID reader:', error);
    }
  };

  // Manual scan trigger for testing/demo purposes
  const startManualScan = useCallback(() => {
    if (!isActive) return;
    
    if (!serialPort) {
      toast({
        title: "No RFID Reader Connected",
        description: "Please connect an RFID reader first.",
        variant: "destructive",
      });
      return;
    }
    
    toast({
      title: "RFID Reader Active",
      description: "Place your RFID card near the reader...",
      duration: 3000,
    });
  }, [isActive, serialPort]);

  const handleManualInput = async () => {
    if (manualRFID.trim()) {
      // Validate RFID format
      const rfidPattern = /^[A-Fa-f0-9]{8,16}$/;
      const cleanRFID = manualRFID.replace(/[^A-Fa-f0-9]/g, '');
      
      if (rfidPattern.test(cleanRFID)) {
        const formattedRFID = `RFID:${cleanRFID.toUpperCase()}:${Date.now()}`;
        setLastScanTime(new Date());

        // Handle different modes for manual input too
        if (mode === 'check-in') {
          await handleCheckIn(cleanRFID.toUpperCase());
        } else if (mode === 'check-out') {
          await handleCheckOut(cleanRFID.toUpperCase());
        } else if (onRFIDDetected) {
          onRFIDDetected(cleanRFID.toUpperCase());
          toast({
            title: "RFID Set Successfully",
            description: `Card UID: ${cleanRFID.toUpperCase()}`,
          });
        }
      } else {
        toast({
          title: "Invalid RFID Format",
          description: "Please enter a valid hexadecimal RFID UID (8-16 characters)",
          variant: "destructive",
        });
      }
    }
  };

  const clearRFID = () => {
    setManualRFID('');
    if (onRFIDDetected) onRFIDDetected('');
    setLastScanTime(null);
  };

  const getStatusColor = () => {
    switch (rfidReaderStatus) {
      case 'ready': return 'bg-green-100 text-green-800 border-green-200';
      case 'scanning': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'error': return 'bg-red-100 text-red-800 border-red-200';
      case 'offline': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = () => {
    switch (rfidReaderStatus) {
      case 'ready': return <Shield className="h-4 w-4" />;
      case 'scanning': return <Zap className="h-4 w-4 animate-pulse" />;
      case 'error': return <AlertCircle className="h-4 w-4" />;
      case 'offline': return <WifiOff className="h-4 w-4" />;
      default: return <WifiOff className="h-4 w-4" />;
    }
  };

  return (
    <Card className="w-full border-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ContactRound className="h-5 w-5" />
          RFID Scanner ({mode.charAt(0).toUpperCase() + mode.slice(1)} Mode)
          <Badge variant="outline" className={`ml-auto ${getStatusColor()}`}>
            {getStatusIcon()}
            {rfidReaderStatus.toUpperCase()}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isActive ? (
          <>
            {/* RFID Reader Status */}
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
              <div className="flex items-center gap-2">
                <Wifi className={`h-4 w-4 ${serialPort ? 'text-green-600' : 'text-gray-400'}`} />
                <span className="text-sm font-medium">
                  Reader: {serialPort ? 'Connected' : 'Not Connected'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  rfidReaderStatus === 'scanning' ? 'bg-blue-500 animate-pulse' : 
                  serialPort ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                }`} />
                <span className="text-xs text-muted-foreground">
                  {serialPort ? '13.56MHz Active' : 'Disconnected'}
                </span>
              </div>
            </div>

            {/* Connection Controls */}
            {!serialPort ? (
              <div className="space-y-2">
                <Button
                  onClick={connectRFIDReader}
                  className="w-full"
                  variant="default"
                >
                  <Wifi className="mr-2 h-4 w-4" />
                  Connect RFID Reader
                </Button>
                <Button
                  onClick={async () => {
                    try {
                      const availablePorts = await navigator.serial.getPorts();
                      if (availablePorts.length > 0) {
                        await connectExistingPort(availablePorts[0]);
                      } else {
                        toast({
                          title: "No Paired Devices",
                          description: "No previously paired RFID readers found. Use 'Connect RFID Reader' to pair a new device.",
                        });
                      }
                    } catch (error) {
                      toast({
                        title: "Error",
                        description: "Failed to check for existing RFID readers.",
                        variant: "destructive",
                      });
                    }
                  }}
                  className="w-full"
                  variant="outline"
                  size="sm"
                >
                  <Shield className="mr-2 h-4 w-4" />
                  Check for Paired Devices
                </Button>
              </div>
            ) : (
              <Button
                onClick={disconnectRFIDReader}
                className="w-full mb-4"
                variant="outline"
              >
                <X className="mr-2 h-4 w-4" />
                Disconnect Reader
              </Button>
            )}

            {/* Scanning Area */}
            <div className={`p-6 border-2 border-dashed rounded-lg text-center transition-all ${
              rfidReaderStatus === 'scanning' ? 'border-blue-500 bg-blue-50' : 
              serialPort ? 'border-green-500 bg-green-50' : 
              'border-gray-300 bg-gray-50'
            }`}>
              <ContactRound size={48} className={`mx-auto mb-3 ${
                rfidReaderStatus === 'scanning' ? 'text-blue-600 animate-pulse' : 
                serialPort ? 'text-green-600' : 
                'text-gray-400'
              }`} />
              <h3 className="text-lg font-semibold mb-2">
                {rfidReaderStatus === 'scanning' ? 'Scanning for Cards...' : 
                 serialPort ? 'RFID Reader Active' : 
                 'Connect RFID Reader'}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {rfidReaderStatus === 'scanning' ? 'Place RFID card near reader and hold steady...' :
                 serialPort ? 'Reader is connected and waiting for RFID cards' :
                 'Connect your RFID reader to start scanning cards'}
              </p>
              
              {serialPort && (
                <>
                  <Button
                    onClick={startManualScan}
                    disabled={!serialPort}
                    variant={currentRFID ? "secondary" : "default"}
                    className="mb-3"
                  >
                    {currentRFID ? (
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4" />
                        Scan Another Card
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <ContactRound className="h-4 w-4" />
                        Ready to Scan
                      </div>
                    )}
                  </Button>
                  
                  {lastScanTime && (
                    <p className="text-xs text-muted-foreground">
                      Last scan: {lastScanTime.toLocaleTimeString()}
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Manual Input Section */}
            <div className="space-y-3 p-4 bg-slate-50 rounded-lg">
              <Label htmlFor="manual-rfid" className="text-sm font-medium">
                Manual RFID UID Entry (Advanced)
              </Label>
              <div className="flex gap-2">
                <Input
                  id="manual-rfid"
                  value={manualRFID}
                  onChange={(e) => setManualRFID(e.target.value.toUpperCase())}
                  placeholder="Enter hex UID (e.g., 045A2E92)"
                  className="font-mono text-sm"
                  maxLength={16}
                />
                <Button onClick={handleManualInput} variant="outline" size="sm">
                  Set
                </Button>
                {currentRFID && (
                  <Button onClick={clearRFID} variant="outline" size="sm">
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Enter 8-16 character hexadecimal UID (A-F, 0-9)
              </p>
            </div>

            {/* Current RFID Display */}
            {currentRFID && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-green-600 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-green-800 mb-1">
                      RFID Card Configured
                    </h4>
                    <code className="text-sm bg-green-100 text-green-700 px-2 py-1 rounded font-mono break-all">
                      {currentRFID}
                    </code>
                    <p className="text-xs text-green-600 mt-2">
                      This student can now use RFID for check-in/check-out
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center space-y-3 py-8">
            <WifiOff className="h-12 w-12 mx-auto text-gray-400" />
            <h3 className="text-lg font-medium text-gray-600">RFID Scanner Offline</h3>
            <p className="text-sm text-muted-foreground">
              Activate the scanner to begin reading RFID cards
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RFIDScanner;