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

### Financial Suite
| Feature | Description |
|---------|-------------|
| **FS1** | Receipts & Expenses Statement |
| **FS2** | Financial Condition Statement |
| **FS3** | Cash Composition Statement |
| **FS4** | Balance Sheet |
| **Comparative Years** | Side-by-side current vs. prior year analysis |
| **Inline Editing** | Edit line items with auto-recompute of totals |

### Operations
| Feature | Description |
|---------|-------------|
| **Transaction Ledger** | Log collections and disbursements with categories |
| **Voucher Upload** | Attach receipt images/PDFs to transactions |
| **Audit Queue** | Review, verify, flag, or reject uploaded vouchers |
| **CSV Export** | Export filtered ledgers to Excel-compatible CSV |
| **PDF Print** | Print financial statements and user directories |

### Administration
| Feature | Description |
|---------|-------------|
| **Association Registry** | Manage multiple Irrigators Associations |
| **Officer Accounts** | Create and manage Head Admin, Treasurer, Auditor accounts |
| **One Role Per IA** | Enforced uniqueness — one Head Admin, one Treasurer, one Auditor per association |
| **Password Reset** | Admin can reset officer passwords |
| **Audit Logs** | Track all user actions with timestamps |

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

### Super Admin
- Full system access across all Irrigators Associations
- Create, edit, and delete association profiles
- Create and manage officer accounts (Head Admin, Treasurer, Auditor)
- Assign and change officer roles
- Reset any officer's password
- View consolidated financial statements across all IAs
- Purge all financial records and uploaded receipts
- Access the Overview Dashboard with cross-IA analytics

### Head Admin
- Manage officer accounts within own association only (Treasurer, Auditor)
- Edit own association profile (name, address, TIN, service area, etc.)
- View and print financial statements (FS1–FS4)
- View the transaction ledger
- Cannot create other Head Admin accounts
- Cannot modify Super Admin accounts

### Treasurer
- Log collection and disbursement transactions
- Upload receipt/voucher files (images, PDFs)
- Create custom budget categories
- View and edit financial statements (FS1–FS4)
- Export transaction ledger to CSV
- Print financial reports
- View own association's transaction history

### Auditor
- View and verify uploaded receipts/vouchers
- Approve, flag, or reject vouchers with notes
- View financial statements (FS1–FS4)
- View the transaction ledger (read-only)
- Cannot create or modify transactions
- Cannot edit financial statements

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
