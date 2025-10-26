import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { AttendanceEntry } from '@/types/AttendanceEntry';
import { Student } from '@/types/Student';

interface AttendanceTableProps {
  records: AttendanceEntry[];
  students: Student[];
  type: 'check-in' | 'check-out';
}

const ITEMS_PER_PAGE = 50;

const AttendanceTable: React.FC<AttendanceTableProps> = ({ records, students, type }) => {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(records.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentRecords = records.slice(startIndex, endIndex);
  const getDisplayInfo = (record: AttendanceEntry) => {
    // Debug log to see what data we're receiving
    console.log('Record data:', {
      name: record.studentName,
      userType: record.userType,
      studentType: record.studentType,
      level: record.level,
      course: record.course,
      year: record.year,
      strand: record.strand
    });

    // Check if it's a visitor (starts with VISITOR_)
    if (record.studentId.startsWith('VISITOR_')) {
      return {
        type: 'visitor',
        field1: record.purpose || 'Visit',
        field2: record.contact || null
      };
    }

    // Check if it's a teacher - check userType field
    if (record.userType === 'teacher') {
      return {
        type: 'teacher',
        field1: record.course && record.course !== 'N/A' ? record.course : null,
        field2: 'Teacher'
      };
    }

    // Check if it's an IBED student - check studentType OR presence of level field
    if (record.studentType === 'ibed' || (record.level && record.level !== 'N/A')) {
      // For Grade 11-12 (SHS), show strand instead of level
      const isGrade11or12 = record.year === 'Grade 11' || record.year === 'Grade 12' || 
                            record.year === '11' || record.year === '12';
      
      return {
        type: 'ibed',
        field1: isGrade11or12 && record.strand && record.strand !== 'N/A' 
          ? record.strand 
          : (record.level && record.level !== 'N/A' ? record.level : null),
        field2: record.year && record.year !== 'N/A' ? record.year : null
      };
    }

    // Default to college student - show course and year
    return {
      type: 'college',
      field1: record.course && record.course !== 'N/A' ? record.course : null,
      field2: record.year && record.year !== 'N/A' ? record.year : null
    };
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Info 1</TableHead>
              <TableHead>Info 2</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentRecords.length > 0 ? (
              currentRecords.map((record) => {
                const displayInfo = getDisplayInfo(record);
                const rowColorClass = 
                  displayInfo.type === 'visitor' ? 'bg-orange-50 hover:bg-orange-100' :
                  displayInfo.type === 'teacher' ? 'bg-purple-50 hover:bg-purple-100' :
                  displayInfo.type === 'ibed' ? 'bg-blue-50 hover:bg-blue-100' :
                  'bg-green-50 hover:bg-green-100';
                
                return (
                  <TableRow key={record.id} className={rowColorClass}>
                    <TableCell className="font-medium">{record.studentName}</TableCell>
                    <TableCell>
                      {displayInfo.type === 'visitor' && displayInfo.field1 && (
                        <span className="text-orange-700 font-medium">Purpose: {displayInfo.field1}</span>
                      )}
                      {displayInfo.type === 'teacher' && displayInfo.field1 && (
                        <span className="text-purple-700 font-medium">Dept: {displayInfo.field1}</span>
                      )}
                      {displayInfo.type === 'ibed' && displayInfo.field1 && (
                        <span className="text-blue-700 font-medium">
                          {displayInfo.field1.includes('STEM') || displayInfo.field1.includes('HUMSS') || 
                           displayInfo.field1.includes('ABM') || displayInfo.field1.includes('TVL') ||
                           displayInfo.field1.includes('GAS') ? 'Strand: ' : 'Level: '}
                          {displayInfo.field1}
                        </span>
                      )}
                      {displayInfo.type === 'college' && displayInfo.field1 && (
                        <span className="text-green-700 font-medium">Course: {displayInfo.field1}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {displayInfo.type === 'visitor' && displayInfo.field2 && (
                        <span className="text-orange-700 font-medium">Contact: {displayInfo.field2}</span>
                      )}
                      {displayInfo.type === 'teacher' && (
                        <span className="text-purple-700 font-medium">Role: {displayInfo.field2}</span>
                      )}
                      {displayInfo.type === 'ibed' && displayInfo.field2 && (
                        <span className="text-blue-700 font-medium">Year: {displayInfo.field2}</span>
                      )}
                      {displayInfo.type === 'college' && displayInfo.field2 && (
                        <span className="text-green-700 font-medium">Year: {displayInfo.field2}</span>
                      )}
                    </TableCell>
                    <TableCell>{format(new Date(record.timestamp), 'HH:mm:ss')}</TableCell>
                    <TableCell>{format(new Date(record.timestamp), 'MMM dd, yyyy')}</TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No {type === 'check-in' ? 'check-ins' : 'check-outs'} today
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {startIndex + 1} to {Math.min(endIndex, records.length)} of {records.length} entries
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="text-sm">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceTable;
