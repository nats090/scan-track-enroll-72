import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  UserCheck, 
  UserX, 
  Clock, 
  TrendingUp, 
  Search, 
  Calendar,
  Timer,
  AlertTriangle,
  Activity,
  BarChart3,
  RefreshCw
} from 'lucide-react';
import BackButton from '@/components/BackButton';
import { supabaseService } from '@/services/supabaseService';
import { Student } from '@/types/Student';
import { AttendanceEntry } from '@/types/AttendanceEntry';
import { format, isToday, differenceInHours } from 'date-fns';

const EnhancedAdminDashboard = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [studentsData, attendanceData] = await Promise.all([
        supabaseService.getStudents(),
        supabaseService.getAttendanceRecords()
      ]);

      setStudents(studentsData);
      setAttendanceRecords(attendanceData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Analytics calculations
  const todayRecords = attendanceRecords.filter(record => isToday(new Date(record.timestamp)));
  const uniqueStudentsToday = new Set(todayRecords.map(r => r.studentId)).size;
  const visitorsToday = todayRecords.filter(r => r.studentId === 'VISITOR').length;
  const currentlyInside = todayRecords.length; // Simplified
  const averageStayTime = todayRecords.length > 0 
    ? Math.round(todayRecords.reduce((acc, record) => 
        acc + differenceInHours(new Date(), new Date(record.timestamp)), 0) / todayRecords.length)
    : 0;

  // Get peak hours data
  const hourlyData = Array.from({ length: 24 }, (_, hour) => {
    const hourRecords = todayRecords.filter(record => 
      new Date(record.timestamp).getHours() === hour
    );
    return { hour, count: hourRecords.length };
  });

  const peakHour = hourlyData.reduce((max, current) => 
    current.count > max.count ? current : max, { hour: 0, count: 0 });

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.studentId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-lg">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Back Button */}
        <div className="mb-6">
          <BackButton to="/" />
        </div>
        
        {/* Header with Action Bar */}
        <div className="mb-8">
          {/* Title Section */}
          <div className="text-center mb-6">
            <h1 className="text-4xl font-bold text-gray-800 flex items-center justify-center gap-3 mb-2">
              <BarChart3 size={32} />
              Enhanced Admin Dashboard
            </h1>
            <p className="text-xl text-gray-600">Real-time Library Analytics & Management</p>
          </div>
          
          {/* Action Bar */}
          <Card className="shadow-sm border-0 bg-white/60 backdrop-blur-sm">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>System Online</span>
                  <span className="text-gray-400">•</span>
                  <span>Live Analytics</span>
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
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Real-time Stats Bar */}
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

        {/* Analytics Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Hourly Activity Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Today's Activity Pattern
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {hourlyData.filter(h => h.count > 0).slice(0, 10).map((item) => (
                  <div key={item.hour} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{item.hour}:00 - {item.hour + 1}:00</span>
                    <div className="flex items-center gap-2">
                      <div 
                        className="bg-blue-500 h-4 rounded"
                        style={{ width: `${(item.count / Math.max(...hourlyData.map(h => h.count))) * 100}px` }}
                      ></div>
                      <span className="text-sm text-gray-600 w-8">{item.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Timer className="h-5 w-5" />
                Quick Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded">
                <span>Average Stay Time</span>
                <Badge variant="secondary">{averageStayTime}h</Badge>
              </div>
              <div className="flex justify-between items-center p-3 bg-green-50 rounded">
                <span>Current Occupancy</span>
                <Badge variant="secondary">{currentlyInside}</Badge>
              </div>
              <div className="flex justify-between items-center p-3 bg-orange-50 rounded">
                <span>Weekly Growth</span>
                <Badge variant="secondary">+12%</Badge>
              </div>
              <div className="flex justify-between items-center p-3 bg-purple-50 rounded">
                <span>System Status</span>
                <Badge className="bg-green-500">Online</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity & Student Search */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {todayRecords.slice(0, 8).map((record, index) => (
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

          {/* Student Directory */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Student Directory
              </CardTitle>
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search students..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredStudents.slice(0, 10).map((student) => (
                  <div key={student.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div>
                      <p className="font-medium">{student.name}</p>
                      <p className="text-sm text-gray-600">ID: {student.studentId}</p>
                      {student.course && (
                        <p className="text-xs text-gray-500">{student.course}</p>
                      )}
                    </div>
                    <div className="text-right">
                      {student.lastScan ? (
                        <div>
                          <p className="text-xs text-green-600">Last seen</p>
                          <p className="text-xs">{format(new Date(student.lastScan), 'MMM dd')}</p>
                        </div>
                      ) : (
                        <Badge variant="outline">No visits</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
};

export default EnhancedAdminDashboard;