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
  const getStudentInfo = (record: AttendanceEntry) => {
    // Use course/year from attendance record if available (stored at check-in time)
    // Fall back to looking up in students table for old records
    if (record.course || record.year) {
      return {
        course: record.course || 'N/A',
        year: record.year || 'N/A'
      };
    }
    
    const student = students.find(s => s.studentId === record.studentId);
    return {
      course: student?.course || 'N/A',
      year: student?.year || 'N/A'
    };
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Course</TableHead>
              <TableHead>Year</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentRecords.length > 0 ? (
              currentRecords.map((record) => {
                const studentInfo = record.studentId !== 'VISITOR' ? getStudentInfo(record) : { course: 'Visitor', year: '-' };
                return (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">{record.studentName}</TableCell>
                    <TableCell>{studentInfo.course}</TableCell>
                    <TableCell>{studentInfo.year}</TableCell>
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
