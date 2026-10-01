/**
 * Client-side helpers for the Farmer Members "Import Excel" flow.
 *
 * The spreadsheet columns mirror the Register Farmer Member form:
 *   Full Name | Farm Location / Sector | Farm Size (hectares) | Mobile Number
 *
 * Accepts real Excel workbooks (.xlsx / .xls) and .csv files, including files
 * exported by this app (letterhead + metadata rows before the column headers).
 */
import * as XLSX from 'xlsx';

export interface ImportedMemberRow {
  /** 1-based row number in the source spreadsheet (for error reporting). */
  rowNumber: number;
  full_name: string;
  farm_location: string;
  farm_size_hectares: string;
  contact_number: string;
}

export interface MemberImportIssue {
  rowNumber: number;
  message: string;
}

export interface MemberImportResult {
  fileName: string;
  sheetName: string;
  /** Detected column headers, in spreadsheet order. */
  headers: string[];
  rows: ImportedMemberRow[];
  issues: MemberImportIssue[];
}

type ColumnKey = 'full_name' | 'farm_location' | 'farm_size_hectares' | 'contact_number';

/** Accepted header spellings for each Register Farmer Member field. */
const COLUMN_KEYWORDS: Record<ColumnKey, string[]> = {
  full_name: ['full name', 'name', 'member name', 'farmer name'],
  farm_location: ['farm location / sector', 'farm location', 'location', 'sector', 'lateral / section'],
  farm_size_hectares: ['farm size (hectares)', 'farm size hectares', 'farm size', 'farm area (ha)', 'farm area', 'hectares'],
  contact_number: ['mobile number', 'mobile no', 'mobile', 'contact number', 'contact no', 'contact', 'phone number', 'phone'],
};

/** Header cells used to (re)detect a header row while scanning data rows. */
const NAME_HEADER_CELLS = COLUMN_KEYWORDS.full_name;

const norm = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  const text = value instanceof Date ? value.toISOString() : String(value);
  return text.replace(/\s+/g, ' ').trim();
};

/** Loose header key: lowercase, punctuation/asterisks stripped, trimmed. */
const normHeader = (value: unknown): string =>
  norm(value)
    .toLowerCase()
    .replace(/[*#:.\-–—_/]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const matchesKeyword = (cell: string, keywords: string[]): boolean => {
  if (!cell) return false;
  return keywords.some((keyword) => cell === keyword || cell.startsWith(keyword + ' ') || cell.endsWith(' ' + keyword));
};

function findHeaderRow(grid: string[][]): number {
  // Pass 1: exact header cells (e.g. "Full Name").
  for (let i = 0; i < grid.length; i++) {
    if (grid[i].some((cell) => NAME_HEADER_CELLS.includes(normHeader(cell)))) return i;
  }
  // Pass 2: tolerant match (e.g. "Full Name of Member", "MEMBER FULL NAME").
  for (let i = 0; i < grid.length; i++) {
    if (grid[i].some((cell) => matchesKeyword(normHeader(cell), NAME_HEADER_CELLS))) return i;
  }
  return -1;
}

function mapColumns(headerRow: string[]): Partial<Record<ColumnKey, number>> {
  const headers = headerRow.map(normHeader);
  const columns: Partial<Record<ColumnKey, number>> = {};

  (Object.keys(COLUMN_KEYWORDS) as ColumnKey[]).forEach((key) => {
    const keywords = COLUMN_KEYWORDS[key];
    // Prefer an exact keyword hit, then fall back to a loose match.
    let index = headers.findIndex((header) => header && keywords.includes(header));
    if (index === -1) index = headers.findIndex((header) => matchesKeyword(header, keywords));
    if (index !== -1) columns[key] = index;
  });

  return columns;
}

/**
 * Reads an .xlsx / .xls / .csv file and returns validated member rows plus any
 * row-level issues. Throws an Error with a user-friendly message when the file
 * cannot be read or has no usable "Full Name" column.
 */
export async function parseMemberSpreadsheet(file: File): Promise<MemberImportResult> {
  let workbook: XLSX.WorkBook;
  try {
    const buffer = await file.arrayBuffer();
    workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  } catch {
    throw new Error(`Could not read "${file.name}". Please upload a valid Excel (.xlsx, .xls) or CSV file.`);
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error('This workbook has no sheets.');

  const sheet = workbook.Sheets[sheetName];
  const grid = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: '',
    blankrows: false,
    raw: false,
  }).map((row) => row.map(norm));

  const headerRowIndex = findHeaderRow(grid);
  const hasHeader = headerRowIndex !== -1;
  const columns = hasHeader ? mapColumns(grid[headerRowIndex]) : {};

  // Headerless files are read left-to-right in template column order.
  const col = (key: ColumnKey, fallback: number): number => columns[key] ?? fallback;
  if (!hasHeader && !grid.length) {
    throw new Error(`"${file.name}" is empty. Add members using the template columns, then re-upload.`);
  }
  if (hasHeader && columns.full_name === undefined) {
    throw new Error('No "Full Name" column was found. Use the downloadable template so the headers match.');
  }

  const rows: ImportedMemberRow[] = [];
  const issues: MemberImportIssue[] = [];
  const seen = new Set<string>();

  const startAt = hasHeader ? headerRowIndex + 1 : 0;
  for (let i = startAt; i < grid.length; i++) {
    const cells = grid[i];
    if (cells.every((cell) => !cell)) continue;
    // Skip repeated header rows (multi-header sheets / pasted blocks).
    if (cells.some((cell) => NAME_HEADER_CELLS.includes(normHeader(cell)))) continue;

    const rowNumber = i + 1;

    const full_name = norm(cells[col('full_name', 0)]);
    if (!full_name) {
      issues.push({ rowNumber, message: 'Full Name is required.' });
      continue;
    }
    if (full_name.length < 2) {
      issues.push({ rowNumber, message: `"${full_name}" is too short — Full Name needs at least 2 characters.` });
      continue;
    }

    const sizeRaw = norm(cells[col('farm_size_hectares', 2)]);
    let farm_size_hectares = '';
    if (sizeRaw) {
      const cleaned = sizeRaw.replace(/,/g, '').replace(/\s*(ha|hectares?)\s*$/i, '').trim();
      const parsed = Number(cleaned);
      if (cleaned === '' || Number.isNaN(parsed) || parsed < 0) {
        issues.push({ rowNumber, message: `Farm size "${sizeRaw}" must be a number of hectares (e.g. 1.5).` });
        continue;
      }
      farm_size_hectares = String(parsed);
    }

    const phoneRaw = norm(cells[col('contact_number', 3)]);
    let contact_number = '';
    if (phoneRaw) {
      let digits = phoneRaw.replace(/\D/g, '');
      // Accept "+63 917 123 4567" / "639171234567" written in spreadsheets.
      if (digits.startsWith('63') && digits.length >= 12) digits = '0' + digits.slice(2, 12);
      if (!/^09\d{9}$/.test(digits)) {
        issues.push({ rowNumber, message: `Mobile number "${phoneRaw}" must be an 11-digit 09XXXXXXXXX number.` });
        continue;
      }
      contact_number = digits;
    }

    const dedupeKey = full_name.toLowerCase();
    if (seen.has(dedupeKey)) {
      issues.push({ rowNumber, message: `"${full_name}" appears more than once in this file — duplicate skipped.` });
      continue;
    }
    seen.add(dedupeKey);

    rows.push({
      rowNumber,
      full_name,
      farm_location: norm(cells[col('farm_location', 1)]),
      farm_size_hectares,
      contact_number,
    });
  }

  if (!rows.length && !issues.length) {
    issues.push({ rowNumber: 0, message: 'No member rows found below the header. Add members, then re-upload.' });
  }

  const headers = hasHeader
    ? grid[headerRowIndex].filter(Boolean)
    : ['Full Name', 'Farm Location / Sector', 'Farm Size (hectares)', 'Mobile Number'];

  return { fileName: file.name, sheetName, headers, rows, issues };
}

/**
 * Downloads a ready-to-fill .xlsx template using the Register Farmer Member
 * columns (with one sample row).
 */
export function downloadMemberImportTemplate() {
  const worksheet = XLSX.utils.aoa_to_sheet([
    ['Full Name', 'Farm Location / Sector', 'Farm Size (hectares)', 'Mobile Number'],
    ['Juan Dela Cruz', 'Danak Lateral, Zone 1', '1.5', '09171234567'],
    ['Maria Santos', 'Main Canal, Zone 2', '0.75', '09181234567'],
  ]);
  worksheet['!cols'] = [{ wch: 24 }, { wch: 28 }, { wch: 20 }, { wch: 18 }];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Farmer Members');
  XLSX.writeFile(workbook, 'Farmer_Member_Import_Template.xlsx');
}
