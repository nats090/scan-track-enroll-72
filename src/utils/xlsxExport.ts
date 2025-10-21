import * as XLSX from 'xlsx';

export type Row = (string | number | boolean | null | undefined)[];

// Generic XLSX export utility with column widths and safe string handling
export function exportXLSX({
  sheetName,
  headers,
  rows,
  filename,
  colWidths,
}: {
  sheetName: string;
  headers: string[];
  rows: Row[];
  filename: string;
  colWidths?: number[]; // in approx characters
}) {
  const wsData: Row[] = [headers, ...rows.map(r => r.map(cell => (cell ?? '')) )];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Column widths
  if (colWidths && colWidths.length) {
    (ws as any)['!cols'] = colWidths.map(wch => ({ wch }));
  } else {
    // Sensible defaults
    (ws as any)['!cols'] = headers.map((h, i) => ({ wch: Math.max(10, Math.min(40, (h.length + 4))) }));
  }

  // Build workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  link.click();
  window.URL.revokeObjectURL(url);
}
