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

Create a `.env.local` file in the root directory:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# App
NEXT_PUBLIC_SYSTEM_TITLE="Irrigators Association Record Management System"
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

## Default Accounts

After seeding the database, these accounts are created:

| Role | Username | Password |
|------|----------|----------|
| Super Admin | `superadmin` | `admin123` |
| Head Admin | `admin_nlfia` | `admin123` |
| Treasurer | `treasurer_nlfia` | `admin123` |
| Auditor | `auditor_nlfia` | `admin123` |

> **Important:** Change all passwords after first login.

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

## User Roles

| Role | Permissions |
|------|-------------|
| **Super Admin** | Full system access, manage all IAs, create officers, purge records |
| **Head Admin** | Manage own IA officers, edit association profile, view statements |
| **Treasurer** | Log transactions, upload vouchers, view/edit FS reports |
| **Auditor** | Verify/reject vouchers, view statements, audit queue |

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

This project is proprietary software developed for the **National Irrigation Administration (NIA)**.

---

<div align="center">

  **Built with care for Filipino Irrigators Associations**

  National Irrigation Administration • Region 02 • Gonzaga, Cagayan

</div>
