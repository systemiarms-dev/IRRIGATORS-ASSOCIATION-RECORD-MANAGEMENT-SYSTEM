<div align="center">

  <img src="public/Iarmslogo.png" alt="IARMS Logo" width="120" />

  # IARMS

  ### Irrigators Association Record Management System

  **Official record management, financial statements (FS1–FS4), and collection ledgers for Irrigators Associations.**

  Built for the **National Irrigation Administration (NIA)** — Region 02, Gonzaga, Cagayan.

  [![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org)
  [![Supabase](https://img.shields.io/badge/Supabase-Database-3FCF8E?logo=supabase)](https://supabase.com)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38BDF8?logo=tailwindcss)](https://tailwindcss.com)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://typescriptlang.org)

</div>

---

## Overview

IARMS is a **progressive web application (PWA)** designed to digitize and streamline the financial and administrative operations of Irrigators Associations under the National Irrigation Administration. It replaces manual paper-based ledgers with a centralized, secure, and auditable digital system.

### Key Highlights

- **Financial Statements (FS1–FS4)** — Generate NIA-standard comparative reports with automated calculations
- **Collections & Disbursements Ledger** — Log payments, expenses, and track cash flow in real time
- **Receipt/Voucher Management** — Upload, verify, and audit official vouchers with status tracking
- **Multi-Association Support** — Super admin can manage multiple IAs from a single dashboard
- **Role-Based Access Control** — Super Admin, Head Admin, Treasurer, and Auditor roles
- **PWA Installable** — Works offline and installable on mobile devices

---

## Features

### Authentication & Security
| Feature | Description |
|---------|-------------|
| **Secure Login** | Username/password authentication with scrypt hashing |
| **Session Management** | HMAC-SHA256 signed HttpOnly cookies |
| **Rate Limiting** | Anti-brute-force: 5 failures = 60-second lockout |
| **Password Policy** | Minimum 6 characters, auto-generated for new accounts |
| **Forgot Password** | Dialog directing users to contact Head Admin |

### Dashboard
| Feature | Description |
|---------|-------------|
| **KPI Cards** | Total Collections, Total Disbursements, Ending Net Cash, Pending Vouchers |
| **Association Selector** | Filter by individual IA or "All Associations" (Super Admin) |
| **Summary Table** | Per-association financial breakdown (consolidated view) |
| **Monthly Chart** | 12-month Cash Inflow vs. Outflow (bar/line chart) |
| **Expense Breakdown** | Pie chart of expenses by NIA category |
| **Quick Actions** | Log Payment / Open Auditor Queue shortcuts |

### Financial Suite (FS1–FS4)
| Feature | Description |
|---------|-------------|
| **FS1 — Receipts & Expenses** | Membership fees, ISF, subsidies, canal remuneration, fines, donations, all disbursement categories, members' equity |
| **FS2 — Financial Condition** | Assets, liabilities, net worth, cash flows, depreciation |
| **FS3 — Cash Composition** | Cash on hand, undeposited collections, cash in bank, savings |
| **FS4 — Balance Sheet** | Assets breakdown, liabilities, net worth, notary block |
| **Comparative Years** | Side-by-side current vs. prior year analysis |
| **Inline Editing** | Click any editable line item, totals auto-recompute |
| **Pin/Unpin** | Track manual overrides with amber highlight, revert to computed values |
| **Custom Rows** | Add extra receipt/disbursement line items |
| **Generate Report** | Select IA, period, signatories, and compile from live ledger |
| **Rename Statements** | Inline rename with pencil icon |
| **Unsaved Changes Guard** | Save/Discard/Cancel dialog on navigation |

### Transaction Ledger
| Feature | Description |
|---------|-------------|
| **Log Collections** | Member ISF, subsidies, fines, donations, other income |
| **Log Disbursements** | Travel, canal clearing, salaries, repairs, federation share, etc. |
| **Budget Categories** | NIA Chart of Accounts + custom categories per IA |
| **Voucher & Particular Details** | Voucher #, payee, TSAG, check/deposit reference, description |
| **Receipt Attachment** | Upload JPG/PNG/WebP/PDF (max 10MB) with custom naming |
| **File Validation** | Magic byte sniffing to prevent extension spoofing |
| **Search & Filter** | Free-text search across 8 fields + date range filter |
| **Export to CSV** | Excel-compatible CSV with association header and timestamped filename |

### Receipt & Voucher Management
| Feature | Description |
|---------|-------------|
| **Status Tracking** | No Receipt, Pending Review, Verified, Flagged, Rejected |
| **Audit Queue** | Filter by status with live counts per status tab |
| **Voucher Preview** | Image lightbox or embedded PDF viewer |
| **Verify** | Approve receipt with optional auditor notes |
| **Flag** | Mark receipt for follow-up with notes |
| **Reject** | Reject receipt with reason |
| **Bulk Verify** | One-click "Verify All Pending" with confirmation |
| **Association Scope** | Super Admin can filter queue by IA |

### User Management
| Feature | Description |
|---------|-------------|
| **Create Accounts** | Create Head Admin, Treasurer, Auditor with auto-generated usernames |
| **Edit Profiles** | Full name, contact number, farm size, farm location |
| **Reset Password** | Admin-initiated password reset with new password |
| **Role Reassignment** | Change officer roles (one officer per role per IA enforced) |
| **Delete Accounts** | Remove officer accounts with confirmation |
| **Print Directory** | PDF print of all officer accounts |
| **Role Filter** | Filter by All / Head Admins / Treasurers / Auditors |
| **Association Filter** | Super Admin filters officers by IA |

### Association Management
| Feature | Description |
|---------|-------------|
| **Register IA** | Create new association with full profile |
| **Edit Profile** | Name, address, president, TIN, SEC #, service area, TSAG, contract type |
| **Delete IA** | Remove association + purge all receipts and records |
| **Auto-Seeding** | Creating an IA auto-generates 3 default officer accounts |
| **Card Grid** | Responsive 1/2/3 column display of all IAs |

### Account Settings
| Feature | Description |
|---------|-------------|
| **Profile Form** | Edit full name, mobile, farm sector, farm size |
| **Password Change** | Current + new password with show/hide toggles |
| **Role Summary** | Visual card showing role-specific permission summary |
| **Auto-Logout** | Session ends after password change |

### Export & Print
| Feature | Description |
|---------|-------------|
| **CSV Export** | UTF-8 BOM for Excel, timestamped filenames |
| **PDF Print** | Browser print dialog with custom PDF filename |
| **Print Directory** | Officer accounts directory (Admin page) |
| **FS Print** | Print individual FS tabs (FS1–FS4) |
| **Timestamped Names** | `IARMS_LABEL_YYYYMMDD_HHMMSS` format |

### PWA (Progressive Web App)
| Feature | Description |
|---------|-------------|
| **Installable** | Chrome, Edge, Safari (Add to Home Screen) |
| **Offline Support** | Service Worker pre-caching |
| **Mobile Optimized** | Responsive layout with mobile drawer |
| **Install Button** | Auto-hides when running in standalone mode |

### UI & UX
| Feature | Description |
|---------|-------------|
| **Responsive Design** | Mobile-first with sm/md/lg breakpoints |
| **Loading States** | Spinner animations on every data-fetching page |
| **Banner Notifications** | Auto-dismiss success/error banners (6s timeout) |
| **Animated Transitions** | Fade-in on page loads |
| **Philippine Phone Input** | Dedicated component with 09xx validation |
| **Role-Aware Sidebar** | Sections change based on user role |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 14 (App Router) |
| **Language** | TypeScript |
| **Styling** | Tailwind CSS + shadcn/ui |
| **Database** | Supabase (PostgreSQL) |
| **Storage** | Supabase Storage (receipt files) |
| **Charts** | Highcharts |
| **PWA** | Service Worker + Web App Manifest |
| **Icons** | Lucide React |

---

## Getting Started

### Prerequisites

- **Node.js** 18+ (recommended: 20)
- **npm** or **yarn**
- **Supabase Account** (free tier works)

### 1. Clone the Repository

```bash
git clone https://github.com/systemiarms-dev/IRRIGATORS-ASSOCIATION-RECORD-MANAGEMENT-SYSTEM.git
cd IRRIGATORS-ASSOCIATION-RECORD-MANAGEMENT-SYSTEM
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# ==============================================================================
# IARMS - Environment Configuration
# ==============================================================================

# 1. CORE APPLICATION & AUTHENTICATION SECURITY
# 64-character hex secret for signing session cookies
IARMS_SESSION_SECRET=your-64-char-hex-secret

# Set to true in production (HTTPS), false for localhost (HTTP)
IARMS_COOKIE_SECURE=false

# Root URL for the application
NEXT_PUBLIC_APP_URL=http://localhost:3000

# 2. SUPABASE CLOUD DATABASE & STORAGE
# Obtain from Supabase Dashboard → Project Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# 3. SYSTEM BRANDING & JURISDICTION
NEXT_PUBLIC_SYSTEM_TITLE="Irrigators Association Record Management System"
NEXT_PUBLIC_NIS_NAME="Baua River Irrigation System"
NEXT_PUBLIC_REGION="Region 02"
```

#### Environment Variable Guide

| Variable | Local Development | Production (Vercel) | Description |
|----------|-------------------|---------------------|-------------|
| `IARMS_SESSION_SECRET` | Any 64-char hex string | **Generate a new one** | Secret key for signing session cookies. Never use the same key in dev and production. |
| `IARMS_COOKIE_SECURE` | `false` | `true` | Set to `true` in production so cookies are only sent over HTTPS. |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | `https://your-app.vercel.app` | The full URL of your deployed site. Vercel provides this in **Settings → Domains** after deployment. |
| `NEXT_PUBLIC_SUPABASE_URL` | Same as production | `https://hbsdofevepvnnngzmjry.supabase.co` | Your Supabase project URL. Same across all environments. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same as production | From Supabase Dashboard | Your Supabase anonymous/public key. Same across all environments. |
| `SUPABASE_SERVICE_ROLE_KEY` | Same as production | From Supabase Dashboard | Your Supabase service role key. Same across all environments. **Never expose this client-side.** |
| `NEXT_PUBLIC_SYSTEM_TITLE` | `"Irrigators Association Record Management System"` | Same | Displayed in the browser tab and UI header. |
| `NEXT_PUBLIC_NIS_NAME` | `"Baua River Irrigation System"` | Same | NIS name shown in FS reports. Change to your NIS name. |
| `NEXT_PUBLIC_REGION` | `"Region 02"` | Same | NIA region shown in FS reports. Change to your region. |

> **Note:** After deploying to Vercel, update `NEXT_PUBLIC_APP_URL` to your production URL (e.g. `https://iarms.vercel.app`) and set `IARMS_COOKIE_SECURE=true`.

### 4. Set Up the Database

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Open the SQL Editor
3. Run the contents of `supabase_schema.sql`

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## User Roles & Permissions

| Permission | Super Admin | Head Admin | Treasurer | Auditor |
|:-----------|:----------:|:----------:|:---------:|:-------:|
| **Association Management** | | | | |
| Create / Edit / Delete IAs | ✅ | ❌ | ❌ | ❌ |
| View All IAs | ✅ | ❌ | ❌ | ❌ |
| View Own IA Only | ✅ | ✅ | ✅ | ✅ |
| **User Management** | | | | |
| Create Officer Accounts | ✅ | ✅* | ❌ | ❌ |
| Edit Officer Profiles | ✅ | ✅* | ❌ | ❌ |
| Reset Officer Passwords | ✅ | ✅* | ❌ | ❌ |
| Reassign Roles | ✅ | ❌ | ❌ | ❌ |
| Delete Officer Accounts | ✅ | ✅* | ❌ | ❌ |
| Print Officer Directory | ✅ | ❌ | ❌ | ❌ |
| **Financial Statements** | | | | |
| Generate FS1–FS4 | ✅ | ✅ | ✅ | ❌ |
| View FS1–FS4 | ✅ | ✅ | ✅ | ✅ |
| Edit FS Line Items | ✅ | ✅ | ✅ | ❌ |
| Rename / Delete Statements | ✅ | ✅ | ✅ | ❌ |
| **Transaction Ledger** | | | | |
| Log Collections | ✅ | ❌ | ✅ | ❌ |
| Log Disbursements | ✅ | ❌ | ✅ | ❌ |
| Delete Transactions | ✅ | ❌ | ✅ | ❌ |
| View Ledger | ✅ | ✅ | ✅ | ✅ |
| Search & Filter Ledger | ✅ | ✅ | ✅ | ✅ |
| Export Ledger to CSV | ✅ | ✅ | ✅ | ✅ |
| **Receipt / Voucher Management** | | | | |
| Upload Receipts | ✅ | ❌ | ✅ | ❌ |
| Review Audit Queue | ✅ | ❌ | ❌ | ✅ |
| Verify / Flag / Reject | ✅ | ❌ | ❌ | ✅ |
| Bulk Verify All Pending | ✅ | ❌ | ❌ | ✅ |
| **Dashboard** | | | | |
| View KPI Cards | ✅ | ✅ | ✅ | ✅ |
| View Consolidated Overview | ✅ | ❌ | ❌ | ❌ |
| View Monthly Charts | ✅ | ✅ | ✅ | ✅ |
| **Administration** | | | | |
| Purge All Financial Records | ✅ | ❌ | ❌ | ❌ |
| Edit Own Profile | ✅ | ✅ | ✅ | ✅ |
| Change Own Password | ✅ | ✅ | ✅ | ✅ |
| View Role Summary | ✅ | ✅ | ✅ | ✅ |

> \* Head Admin can only manage Treasurer and Auditor within their own association. Cannot create other Head Admins.

---

## Deployment (Vercel)

### 1. Push to GitHub

```bash
git add -A
git commit -m "Initial deployment"
git push
```

### 2. Deploy to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Vercel auto-detects Next.js — click **Deploy**
4. Add environment variables in **Settings → Environment Variables**

### 3. Custom Domain (Optional)

1. Go to **Settings → Domains**
2. Add your custom domain
3. Update DNS records as instructed

---

## Project Structure

```
├── app/
│   ├── (auth)/              # Login & Register pages
│   ├── actions/             # Server actions (API logic)
│   ├── api/                 # API routes (logo, background)
│   ├── dashboard/           # Main application pages
│   │   ├── account/         # Account settings
│   │   ├── admin/           # User management
│   │   ├── associations/    # Association registry
│   │   ├── auditor/         # Verification queue
│   │   ├── statements/      # FS1-FS4 reports
│   │   └── treasurer/       # Transaction ledger
│   ├── uploads/             # File upload routes
│   ├── layout.tsx           # Root layout
│   └── manifest.ts          # PWA manifest
├── components/
│   ├── charts/              # Highcharts wrappers
│   ├── forms/               # Transaction & Association modals
│   ├── layout/              # Header, Sidebar, Footer
│   ├── pwa/                 # Install button, Service worker
│   ├── statements/          # FS1-FS4 view components
│   └── ui/                  # shadcn/ui components
├── lib/
│   ├── auth/                # Session, password, rate limiting
│   ├── db/                  # Database clients & cache
│   ├── financial/           # FS recompute logic
│   ├── storage/             # Receipt file management
│   ├── supabase/            # Supabase client setup
│   └── utils/               # Formatters, export, phone utils
├── public/
│   ├── icons/               # PWA icons
│   └── sw.js                # Service worker
├── types/                   # TypeScript types
└── supabase_schema.sql      # Database schema
```

---

## Browser Support

| Browser | Support |
|---------|---------|
| Chrome | ✅ Full |
| Edge | ✅ Full |
| Safari | ✅ Full |
| Firefox | ✅ Full |
| Mobile | ✅ Responsive + PWA |

---

## License

Developed by CBEA Students for the **National Irrigation Administration (NIA)**.

---

<div align="center">

  **IARMS** — Irrigators Association Record Management System

  National Irrigation Administration • Region 02 • Gonzaga, Cagayan

</div>
