/**
 * Utility functions for enhanced Excel CSV export and PDF Print generation.
 */

export interface ExportMetadata {
  [key: string]: string | number;
}

/**
 * Enhanced Excel CSV exporter with UTF-8 BOM, professional headers, and safe escaping.
 */
export function exportToExcelCSV(
  filename: string,
  reportTitle: string,
  metadata: ExportMetadata,
  headers: string[],
  rows: (string | number)[][]
) {
  const csvLines: string[] = [];

  // 1. Formal Association Header
  csvLines.push('"NANGURISAN LAYA FARMERS IRRIGATORS ASSOCIATION, INC. (NLFIA)"');
  csvLines.push('"Ipil, Gonzaga, Cagayan • SEC Reg. No. CN202060557 • NIA Recognized"');
  csvLines.push(`"Report Title: ${reportTitle.toUpperCase()}"`);
  csvLines.push(`"Generated On: ${new Date().toLocaleString('en-US')}"`);
  csvLines.push('');

  // 2. Report Metadata Key-Value pairs
  Object.entries(metadata).forEach(([key, value]) => {
    const safeKey = String(key).replace(/"/g, '""');
    const safeVal = String(value).replace(/"/g, '""');
    csvLines.push(`"${safeKey}","${safeVal}"`);
  });
  csvLines.push('');

  // 3. Column Headers
  const safeHeaders = headers.map((h) => `"${String(h).replace(/"/g, '""')}"`);
  csvLines.push(safeHeaders.join(','));

  // 4. Data Rows
  rows.forEach((row) => {
    const safeRow = row.map((cell) => {
      const cellStr = cell === null || cell === undefined ? '' : String(cell);
      return `"${cellStr.replace(/"/g, '""')}"`;
    });
    csvLines.push(safeRow.join(','));
  });

  // 5. UTF-8 BOM for Microsoft Excel compatibility
  const bom = '\uFEFF';
  const blob = new Blob([bom + csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Triggers clean PDF print view
 */
export function exportToPDFPrint() {
  if (typeof window !== 'undefined') {
    window.print();
  }
}


