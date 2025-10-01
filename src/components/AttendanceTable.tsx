import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { AttendanceEntry } from '@/types/AttendanceEntry';
import { Student } from '@/types/Student';

interface AttendanceTableProps {
  records: AttendanceEntry[];
  students: Student[];
  type: 'check-in' | 'check-out';
}

const AttendanceTable: React.FC<AttendanceTableProps> = ({ records, students, type }) => {
  const getStudentInfo = (studentId: string) => {
    const student = students.find(s => s.studentId === studentId);
    return {
      course: student?.course || 'N/A',
      year: student?.year || 'N/A'
    };
  };

  return (
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
          {records.length > 0 ? (
            records.map((record) => {
              const studentInfo = record.studentId !== 'VISITOR' ? getStudentInfo(record.studentId) : { course: 'Visitor', year: '-' };
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
  );
};

export default AttendanceTable;
