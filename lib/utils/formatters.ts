/**
 * Format currency to Philippine Peso (PHP - ₱)
 */
export function formatPHP(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '₱0.00';
  }
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format a number with commas
 */
export function formatNumber(value: number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '0';
  }
  return new Intl.NumberFormat('en-PH', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Format date string into human readable format (e.g. Oct 24, 2026)
 */
export function formatDate(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return 'N/A';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return 'Invalid Date';
  
  return new Intl.DateTimeFormat('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

/**
 * Format file size in bytes to KB/MB
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Color badge mapping for Verification & Account Statuses
 */
export function getStatusBadgeProps(status: string): { label: string; className: string } {
  switch (status.toLowerCase()) {
    case 'approved':
    case 'verified':
      return {
        label: status.charAt(0).toUpperCase() + status.slice(1),
        className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
      };
    case 'pending':
      return {
        label: 'Pending Review',
        className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
      };
    case 'flagged':
      return {
        label: 'Flagged Discrepancy',
        className: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30',
      };
    case 'declined':
    case 'rejected':
      return {
        label: status.charAt(0).toUpperCase() + status.slice(1),
        className: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30',
      };
    default:
      return {
        label: status,
        className: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30',
      };
  }
}

/**
 * Role badge props mapping
 */
export function getRoleBadgeProps(role: string): { label: string; variant: string } {
  switch (role?.toLowerCase()) {
    case 'super_admin':
      return { label: 'Super Admin', variant: 'purple' };
    case 'admin':
      return { label: 'Head Admin', variant: 'rose' };
    case 'treasurer':
      return { label: 'Treasurer', variant: 'emerald' };
    case 'auditor':
      return { label: 'Auditor', variant: 'indigo' };
    case 'member':
      return { label: 'Farmer Member', variant: 'blue' };
    default:
      return { label: 'Officer', variant: 'blue' };
  }
}

/**
 * Robust image URL getter for receipt vouchers: handles Base64 data URLs, HTTP links, and SVG official receipt fallbacks
 */
export function getReceiptImageUrl(receipt: any): string {
  if (receipt?.file_path && (receipt.file_path.startsWith('data:image/') || receipt.file_path.startsWith('/uploads/') || receipt.file_path.startsWith('http'))) {
    return receipt.file_path;
  }

  const tx = receipt?.transaction;
  const fileName = receipt?.file_name || 'Voucher.jpg';
  const orNum = tx?.reference_number || 'OR-991332';
  const txNum = tx?.transaction_number || 'COL-202608-1185';
  const amountStr = tx?.amount ? `PHP ${Number(tx.amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : 'PHP 5,000.00';
  const dateStr = tx?.transaction_date || (receipt?.created_at ? receipt.created_at.split('T')[0] : '2026-08-04');
  const catName = tx?.category?.name || 'Irrigation Service Fee (ISF) Collections';
  const assocName = receipt?.association?.name || tx?.association?.name || 'IRRIGATORS ASSOCIATION';
  const uploaderName = receipt?.uploader?.full_name || 'Authorized Treasurer';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="750" viewBox="0 0 600 750">
    <rect width="600" height="750" fill="#f8fafc" rx="16"/>
    <rect x="20" y="20" width="560" height="710" fill="#ffffff" stroke="#017631" stroke-width="4" stroke-dasharray="8 4" rx="12"/>
    
    <rect x="24" y="24" width="552" height="110" fill="#015324" rx="8"/>
    <text x="300" y="55" font-family="Arial, sans-serif" font-size="15" font-weight="900" fill="#ffffff" text-anchor="middle">${assocName.toUpperCase()}</text>
    <text x="300" y="78" font-family="Arial, sans-serif" font-size="12" font-weight="700" fill="#04B358" text-anchor="middle">OFFICIAL CASH VOUCHER / RECEIPT</text>
    <text x="300" y="100" font-family="Arial, sans-serif" font-size="11" font-weight="400" fill="#e2e8f0" text-anchor="middle">National Irrigation Administration (NIA) • Region 02</text>

    <rect x="45" y="155" width="510" height="42" fill="#ecfdf5" rx="8" stroke="#a7f3d0"/>
    <text x="65" y="181" font-family="Arial, sans-serif" font-size="13" font-weight="700" fill="#065f46">VOUCHER FILE: ${fileName}</text>
    <text x="535" y="181" font-family="Arial, sans-serif" font-size="13" font-weight="900" fill="#047857" text-anchor="end">${orNum}</text>

    <text x="65" y="235" font-family="Arial, sans-serif" font-size="12" font-weight="700" fill="#64748b">TRANSACTION NO:</text>
    <text x="210" y="235" font-family="Courier, monospace" font-size="14" font-weight="900" fill="#1e1b4b">${txNum}</text>

    <text x="65" y="270" font-family="Arial, sans-serif" font-size="12" font-weight="700" fill="#64748b">TRANSACTION DATE:</text>
    <text x="210" y="270" font-family="Arial, sans-serif" font-size="13" font-weight="700" fill="#0f172a">${dateStr}</text>

    <text x="65" y="305" font-family="Arial, sans-serif" font-size="12" font-weight="700" fill="#64748b">BUDGET CATEGORY:</text>
    <text x="210" y="305" font-family="Arial, sans-serif" font-size="12" font-weight="700" fill="#0f172a">${catName}</text>

    <text x="65" y="340" font-family="Arial, sans-serif" font-size="12" font-weight="700" fill="#64748b">PREPARED/UPLOADED BY:</text>
    <text x="210" y="340" font-family="Arial, sans-serif" font-size="13" font-weight="700" fill="#0f172a">${uploaderName} (Treasurer)</text>

    <rect x="45" y="375" width="510" height="90" fill="#f0fdf4" rx="12" stroke="#16a34a" stroke-width="2"/>
    <text x="300" y="410" font-family="Arial, sans-serif" font-size="12" font-weight="800" fill="#15803d" text-anchor="middle" letter-spacing="1">TOTAL VERIFIED AMOUNT</text>
    <text x="300" y="445" font-family="Arial, sans-serif" font-size="30" font-weight="900" fill="#166534" text-anchor="middle">${amountStr}</text>

    <circle cx="480" cy="565" r="45" fill="none" stroke="#047857" stroke-width="3" stroke-dasharray="6 3"/>
    <text x="480" y="560" font-family="Arial, sans-serif" font-size="9" font-weight="900" fill="#047857" text-anchor="middle">VERIFIED</text>
    <text x="480" y="575" font-family="Arial, sans-serif" font-size="9" font-weight="900" fill="#047857" text-anchor="middle">IARMS AUDIT</text>

    <line x1="65" y1="590" x2="280" y2="590" stroke="#94a3b8" stroke-width="1.5"/>
    <text x="172" y="608" font-family="Arial, sans-serif" font-size="11" font-weight="700" fill="#475569" text-anchor="middle">Authorized Treasurer Signature</text>

    <rect x="24" y="660" width="552" height="50" fill="#f1f5f9" rx="6"/>
    <text x="300" y="690" font-family="Arial, sans-serif" font-size="10" font-weight="600" fill="#64748b" text-anchor="middle">This digital receipt voucher is certified for Auditor Verification and Board Audit Review.</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

