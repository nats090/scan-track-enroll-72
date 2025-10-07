import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  UserPlus, 
  Edit2, 
  Trash2, 
  Download, 
  Calendar, 
  BarChart3, 
  TrendingUp,
  RefreshCw,
  Search,
  RotateCcw,
  Shield,
  Activity,
  Clock,
  Users
} from 'lucide-react';
import BackButton from '@/components/BackButton';
import RFIDDataManager from '@/components/RFIDDataManager';
import { attendanceService } from '@/services/attendanceService';
import { supabaseService } from '@/services/supabaseService';
import { Student } from '@/types/Student';
import { AttendanceEntry } from '@/types/AttendanceEntry';
import { toast } from '@/components/ui/use-toast';
import { format, startOfDay, endOfDay, subDays, subWeeks, subMonths } from 'date-fns';
import { ChartTimeSeries, ChartCourseDistribution } from '@/components/analytics/ReportCharts';

const EnhancedAdminPage = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('add-student');
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<string>('all');
  
  const [newStudent, setNewStudent] = useState({
    name: '',
    studentId: '',
    email: '',
    course: '',
    year: '',
    contactNumber: '',
    rfid: ''
  });
  
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  
  const [reportFilter, setReportFilter] = useState({
    period: 'today',
    studentId: '',
    userType: 'all',
    reportType: 'attendance'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [studentsData, attendanceData] = await Promise.all([
        supabaseService.getStudents(),
        attendanceService.getAttendanceRecords()
      ]);

      setStudents(studentsData);
      setAttendanceRecords(attendanceData);
      
      const unsyncedRecords = attendanceData.filter(r => r.id?.toString().startsWith('local_'));
      if (unsyncedRecords.length > 0) {
        toast({
          title: "Sync Status",
          description: `${unsyncedRecords.length} records are pending sync to server`,
          variant: "default",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddStudent = async () => {
    try {
      if (!newStudent.name || !newStudent.studentId || !newStudent.email || !newStudent.course || !newStudent.year || !newStudent.contactNumber) {
        toast({
          title: "Error",
          description: "Name, Student ID, Email, Course, Year, and Contact Number are required",
          variant: "destructive",
        });
        return;
      }

      const studentData: Omit<Student, 'id'> = {
        ...newStudent,
        registrationDate: new Date(),
      };

      await supabaseService.addStudent(studentData);
      
      toast({
        title: "Success",
        description: "Student added successfully",
      });

      setNewStudent({
        name: '',
        studentId: '',
        email: '',
        course: '',
        year: '',
        contactNumber: '',
        rfid: ''
      });
      loadData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add student",
        variant: "destructive",
      });
    }
  };

  const handleEditStudent = async () => {
    try {
      if (!editingStudent) return;

      await supabaseService.updateStudent(editingStudent.id, editingStudent);
      
      toast({
        title: "Success",
        description: "Student updated successfully",
      });

      setEditingStudent(null);
      loadData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update student",
        variant: "destructive",
      });
    }
  };

  const handleDeleteStudent = async (studentId: string) => {
    if (!confirm('Are you sure you want to delete this student?')) return;
    
    try {
      await supabaseService.deleteStudent(studentId);
      toast({
        title: "Success",
        description: "Student deleted successfully",
      });
      loadData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete student",
        variant: "destructive",
      });
    }
  };

  const getFilteredRecords = () => {
    let filtered = attendanceRecords;
    const now = new Date();

    switch (reportFilter.period) {
      case 'today':
        filtered = filtered.filter(record => 
          new Date(record.timestamp) >= startOfDay(now) &&
          new Date(record.timestamp) <= endOfDay(now)
        );
        break;
      case 'yesterday':
        const yesterday = subDays(now, 1);
        filtered = filtered.filter(record => 
          new Date(record.timestamp) >= startOfDay(yesterday) &&
          new Date(record.timestamp) <= endOfDay(yesterday)
        );
        break;
      case 'week':
        filtered = filtered.filter(record => 
          new Date(record.timestamp) >= subWeeks(now, 1)
        );
        break;
      case 'month':
        filtered = filtered.filter(record => 
          new Date(record.timestamp) >= subMonths(now, 1)
        );
        break;
    }

    // Filter by user type
    if (reportFilter.userType && reportFilter.userType !== "all") {
      if (reportFilter.userType === "visitor") {
        filtered = filtered.filter(record => record.studentId === 'VISITOR');
      } else if (reportFilter.userType === "student") {
        filtered = filtered.filter(record => record.studentId !== 'VISITOR' && record.purpose !== 'Teacher');
      } else if (reportFilter.userType === "teacher") {
        filtered = filtered.filter(record => record.purpose === 'Teacher');
      }
    }

    // Filter by specific student
    if (reportFilter.studentId && reportFilter.studentId !== "all") {
      filtered = filtered.filter(record => 
        record.studentId === reportFilter.studentId
      );
    }

    return filtered;
  };

  const generateAdvancedReport = () => {
    const filteredRecords = getFilteredRecords();
    
    if (reportFilter.reportType === 'analytics') {
      const uniqueStudents = new Set(filteredRecords.map(r => r.studentId)).size;
      const visitors = filteredRecords.filter(r => r.studentId === 'VISITOR').length;
      const avgVisitsPerDay = filteredRecords.length / 
        (reportFilter.period === 'today' ? 1 : 
         reportFilter.period === 'week' ? 7 : 30);

      const csvContent = [
        ['Library Analytics Report'],
        ['Period', reportFilter.period],
        ['Generated', format(new Date(), 'yyyy-MM-dd HH:mm:ss')],
        [''],
        ['Metric', 'Value'],
        ['Total Visits', filteredRecords.length.toString()],
        ['Unique Students', uniqueStudents.toString()],
        ['Visitors', visitors.toString()],
        ['Average Visits/Day', avgVisitsPerDay.toFixed(1)],
        [''],
        ['Detailed Records'],
        ['Student Name', 'Student ID', 'Date', 'Time', 'Type']
      ].concat(
        filteredRecords.map(record => [
          record.studentName,
          record.studentId,
          format(new Date(record.timestamp), 'yyyy-MM-dd'),
          format(new Date(record.timestamp), 'HH:mm:ss'),
          record.studentId === 'VISITOR' ? 'Visitor' : 'Student'
        ])
      ).map(row => row.join(',')).join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `library-analytics-${reportFilter.period}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
    } else {
      const csvContent = [
        ['Student Name', 'Student ID', 'Date', 'Time', 'Purpose', 'Contact'],
        ...filteredRecords.map(record => [
          record.studentName,
          record.studentId,
          format(new Date(record.timestamp), 'yyyy-MM-dd'),
          format(new Date(record.timestamp), 'HH:mm:ss'),
          record.purpose || 'Library Visit',
          record.contact || 'N/A'
        ])
      ].map(row => row.join(',')).join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `library-attendance-${reportFilter.period}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
    }

    toast({
      title: "Success",
      description: "Report exported successfully",
    });
  };

  const filteredStudents = students
    .filter(student =>
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.studentId.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .filter(student => (courseFilter === 'all' || (student.course || student.department || '').toLowerCase() === courseFilter.toLowerCase()))
    .filter(student => (yearFilter === 'all' || (student.year || '').toLowerCase() === yearFilter.toLowerCase()));

  const todayRecords = attendanceRecords.filter(record => 
    new Date(record.timestamp).toDateString() === new Date().toDateString()
  );
  const uniqueStudentsToday = new Set(todayRecords.map(r => r.studentId)).size;
  const visitorsToday = todayRecords.filter(r => r.studentId === 'VISITOR').length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-lg">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <BackButton to="/" />
        </div>
        
        <div className="mb-8">
          <div className="text-center mb-6">
            <h1 className="text-4xl font-bold text-gray-800 flex items-center justify-center gap-3 mb-2">
              <Shield className="h-10 w-10" />
              Enhanced Admin Panel
            </h1>
            <p className="text-xl text-gray-600">Complete System Management & Analytics</p>
          </div>
          
          <Card className="shadow-sm border-0 bg-white/60 backdrop-blur-sm">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>System Online</span>
                  <span className="text-gray-400">•</span>
                  <span>Auto-sync every 10s</span>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={loadData}
                    disabled={loading}
                    className="gap-2"
                  >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                  
                  <Button 
                    onClick={() => {
                      import('@/utils/dataIntegrityCheck').then(module => {
                        module.logDataIntegrityReport().then(report => {
                          toast({
                            title: "Data Integrity Check",
                            description: `Local: ${report.localRecords}, Server: ${report.supabaseRecords}, Unsynced: ${report.unsyncedRecords}`,
                          });
                        });
                      });
                    }} 
                    variant="ghost" 
                    size="sm"
                    className="gap-2"
                  >
                    <Search className="h-4 w-4" />
                    Check Data
                  </Button>
                  
                  <Button 
                    onClick={async () => {
                      try {
                        const { autoSyncService } = await import('@/services/autoSyncService');
                        await autoSyncService.forceSync();
                        await loadData();
                        toast({
                          title: "Sync Complete",
                          description: "All data has been synchronized with the server",
                        });
                      } catch (error) {
                        toast({
                          title: "Sync Failed", 
                          description: "Could not sync data to server",
                          variant: "destructive"
                        });
                      }
                    }} 
                    variant="ghost" 
                    size="sm"
                    className="gap-2"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Force Sync
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-green-500 text-white">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{todayRecords.length}</div>
              <p className="text-sm">Today's Visits</p>
            </CardContent>
          </Card>
          <Card className="bg-blue-500 text-white">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{uniqueStudentsToday}</div>
              <p className="text-sm">Unique Students</p>
            </CardContent>
          </Card>
          <Card className="bg-orange-500 text-white">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{visitorsToday}</div>
              <p className="text-sm">Visitors Today</p>
            </CardContent>
          </Card>
          <Card className="bg-purple-500 text-white">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{students.length}</div>
              <p className="text-sm">Total Students</p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="add-student">Add Student</TabsTrigger>
            <TabsTrigger value="edit-students">Manage Students</TabsTrigger>
            <TabsTrigger value="rfid-manager">RFID Manager</TabsTrigger>
            <TabsTrigger value="reports">Advanced Reports</TabsTrigger>
            <TabsTrigger value="analytics">Live Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="add-student">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="h-6 w-6" />
                  Add New Student
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Student Name *</Label>
                    <Input
                      id="name"
                      value={newStudent.name}
                      onChange={(e) => setNewStudent({...newStudent, name: e.target.value})}
                      placeholder="Enter full name"
                      className="text-lg p-3"
                    />
                  </div>
                  <div>
                    <Label htmlFor="studentId">Student ID *</Label>
                    <Input
                      id="studentId"
                      value={newStudent.studentId}
                      onChange={(e) => setNewStudent({...newStudent, studentId: e.target.value})}
                      placeholder="Enter student ID (for RF ID)"
                      className="text-lg p-3"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newStudent.email}
                      onChange={(e) => setNewStudent({...newStudent, email: e.target.value})}
                      placeholder="Enter email"
                      className="text-lg p-3"
                    />
                  </div>
                  <div>
                    <Label htmlFor="course">Course *</Label>
                    <Input
                      id="course"
                      value={newStudent.course}
                      onChange={(e) => setNewStudent({...newStudent, course: e.target.value})}
                      placeholder="Enter course/program"
                      className="text-lg p-3"
                    />
                  </div>
                  <div>
                    <Label htmlFor="year">Year *</Label>
                    <Select value={newStudent.year} onValueChange={(value) => setNewStudent({...newStudent, year: value})}>
                      <SelectTrigger className="text-lg p-3">
                        <SelectValue placeholder="Select year" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1st Year">1st Year</SelectItem>
                        <SelectItem value="2nd Year">2nd Year</SelectItem>
                        <SelectItem value="3rd Year">3rd Year</SelectItem>
                        <SelectItem value="4th Year">4th Year</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="contactNumber">Contact Number *</Label>
                    <Input
                      id="contactNumber"
                      value={newStudent.contactNumber}
                      onChange={(e) => setNewStudent({...newStudent, contactNumber: e.target.value})}
                      placeholder="Enter contact number"
                      className="text-lg p-3"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="rfid">RFID Tag (Optional)</Label>
                    <Input
                      id="rfid"
                      value={newStudent.rfid}
                      onChange={(e) => setNewStudent({...newStudent, rfid: e.target.value})}
                      placeholder="Tap RFID card to scan"
                      className="text-lg p-3"
                    />
                  </div>
                </div>
                <Button onClick={handleAddStudent} size="lg" className="w-full">
                  <UserPlus className="mr-2 h-5 w-5" />
                  Add Student
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="edit-students">
            <Card>
              <CardHeader>
                <CardTitle>Manage Students</CardTitle>
                <div className="flex flex-col md:flex-row gap-2 mt-4">
                  <div className="flex items-center gap-2 flex-1">
                    <Search className="h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search by name or ID..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Select value={courseFilter} onValueChange={setCourseFilter}>
                    <SelectTrigger className="w-full md:w-48">
                      <SelectValue placeholder="Filter by course" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Courses</SelectItem>
                      <SelectItem value="bsit">BSIT</SelectItem>
                      <SelectItem value="bscs">BSCS</SelectItem>
                      <SelectItem value="bsis">BSIS</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={yearFilter} onValueChange={setYearFilter}>
                    <SelectTrigger className="w-full md:w-48">
                      <SelectValue placeholder="Filter by year" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Years</SelectItem>
                      <SelectItem value="1st year">1st Year</SelectItem>
                      <SelectItem value="2nd year">2nd Year</SelectItem>
                      <SelectItem value="3rd year">3rd Year</SelectItem>
                      <SelectItem value="4th year">4th Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {filteredStudents.map((student) => (
                    <div key={student.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{student.name}</h3>
                        <div className="flex flex-wrap gap-2 mt-1">
                          <Badge variant="secondary">ID: {student.studentId}</Badge>
                          {student.course && <Badge variant="outline">{student.course}</Badge>}
                          {student.year && <Badge variant="outline">{student.year}</Badge>}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{student.email}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingStudent(student)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteStudent(student.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {editingStudent && (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle>Edit Student</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Name</Label>
                      <Input
                        value={editingStudent.name}
                        onChange={(e) => setEditingStudent({...editingStudent, name: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label>Student ID</Label>
                      <Input
                        value={editingStudent.studentId}
                        onChange={(e) => setEditingStudent({...editingStudent, studentId: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input
                        value={editingStudent.email}
                        onChange={(e) => setEditingStudent({...editingStudent, email: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label>Course</Label>
                      <Input
                        value={editingStudent.course || ''}
                        onChange={(e) => setEditingStudent({...editingStudent, course: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleEditStudent}>Save Changes</Button>
                    <Button variant="outline" onClick={() => setEditingStudent(null)}>Cancel</Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="rfid-manager">
            <RFIDDataManager students={students} onDataUpdated={loadData} />
          </TabsContent>

          <TabsContent value="reports">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-6 w-6" />
                  Advanced Reports
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label>Report Type</Label>
                    <Select value={reportFilter.reportType} onValueChange={(value) => setReportFilter({...reportFilter, reportType: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        <SelectItem value="attendance">Attendance Report</SelectItem>
                        <SelectItem value="analytics">Analytics Report</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Time Period</Label>
                    <Select value={reportFilter.period} onValueChange={(value) => setReportFilter({...reportFilter, period: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        <SelectItem value="today">Today</SelectItem>
                        <SelectItem value="yesterday">Yesterday</SelectItem>
                        <SelectItem value="week">This Week</SelectItem>
                        <SelectItem value="month">This Month</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>User Type</Label>
                    <Select value={reportFilter.userType} onValueChange={(value) => setReportFilter({...reportFilter, userType: value, studentId: ''})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        <SelectItem value="all">All Users</SelectItem>
                        <SelectItem value="student">Students</SelectItem>
                        <SelectItem value="teacher">Teachers</SelectItem>
                        <SelectItem value="visitor">Visitors</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Specific Person</Label>
                    <Select value={reportFilter.studentId} onValueChange={(value) => setReportFilter({...reportFilter, studentId: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="All" />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50 max-h-[300px]">
                        <SelectItem value="all">All</SelectItem>
                        {reportFilter.userType === 'visitor' ? (
                          <SelectItem value="VISITOR">All Visitors</SelectItem>
                        ) : (
                          students
                            .filter(student => {
                              if (reportFilter.userType === 'all') return true;
                              if (reportFilter.userType === 'student') return true;
                              return false;
                            })
                            .map(student => (
                              <SelectItem key={student.id} value={student.studentId}>
                                {student.name} {student.course ? `(${student.course})` : ''}
                              </SelectItem>
                            ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <Button onClick={generateAdvancedReport} className="w-full">
                  <Download className="mr-2 h-4 w-4" />
                  Export Report
                </Button>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                  <ChartTimeSeries attendanceRecords={getFilteredRecords()} />
                  <ChartCourseDistribution attendanceRecords={getFilteredRecords()} students={students} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {todayRecords.slice(0, 10).map((record, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                            record.studentId === 'VISITOR' ? 'bg-orange-500' : 'bg-blue-500'
                          }`}>
                            {record.studentId === 'VISITOR' ? 'V' : record.studentName.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{record.studentName}</p>
                            <p className="text-xs text-gray-500">
                              {record.studentId === 'VISITOR' ? 'Visitor' : record.studentId}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            {format(new Date(record.timestamp), 'HH:mm')}
                          </p>
                          <Badge variant="outline" className="text-xs">
                            {record.method || 'RF ID'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    System Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded">
                    <span>Total Records</span>
                    <Badge variant="secondary">{attendanceRecords.length}</Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded">
                    <span>Registered Students</span>
                    <Badge variant="secondary">{students.length}</Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-orange-50 rounded">
                    <span>Today's Activity</span>
                    <Badge variant="secondary">{todayRecords.length}</Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-purple-50 rounded">
                    <span>System Status</span>
                    <Badge className="bg-green-500">Online</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default EnhancedAdminPage;
