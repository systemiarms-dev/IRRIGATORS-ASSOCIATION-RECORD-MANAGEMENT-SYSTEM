# IARMS Cloud Online Deployment Guide
## GitHub + Vercel + Supabase Production Setup

This guide provides step-by-step instructions for deploying the **Irrigators Association Record Management System (IARMS)** online to **Vercel** with a **Supabase Cloud PostgreSQL Database**.

---

## 1. Prerequisites
- A free account on [GitHub](https://github.com/)
- A free account on [Vercel](https://vercel.com/)
- A free account on [Supabase](https://supabase.com/)

---

## 2. Step 1: Set Up Supabase Cloud Database

1. Log in to [Supabase Dashboard](https://supabase.com/dashboard) and click **"New Project"**.
2. Enter your project details:
   - **Name:** `IARMS Baua River NIS`
   - **Database Password:** (Generate and securely save a strong password)
   - **Region:** `Southeast Asia (Singapore)` *(recommended for fastest response time in the Philippines)*
   - **Pricing Plan:** **Free Tier** ($0/month)
3. Once the database is provisioned, navigate to the **SQL Editor** tab in the left sidebar.
4. Open the [`supabase_schema.sql`](./supabase_schema.sql) file from this repository, copy its entire contents, paste into the Supabase SQL editor, and click **"Run"**.
   - This automatically creates all tables (`associations`, `profiles`, `budget_categories`, `receipts`, `transactions`, `financial_statements`, `audit_logs`), indexes, and default accounts.
5. In Supabase, go to **Project Settings** &rarr; **API** and copy the following 3 values:
   - **Project URL:** `https://your-project-id.supabase.co`
   - **Project API Keys &rarr; `anon` `public`:** `eyJhbGciOi...`
   - **Project API Keys &rarr; `service_role` `secret`:** `eyJhbGciOi...`

---

## 3. Step 2: Push Repository to GitHub

1. Initialize git and commit your files:
   ```bash
   git init
   git add .
   git commit -m "Initial IARMS Multi-Association Release"
   ```
2. Create a new repository on GitHub (e.g. `iarms-irrigation-system`).
3. Link and push to GitHub:
   ```bash
   git remote add origin https://github.com/your-username/iarms-irrigation-system.git
   git branch -M main
   git push -u origin main
   ```

---

## 4. Step 3: Deploy to Vercel

1. Log in to [Vercel](https://vercel.com/) and click **"Add New..."** &rarr; **"Project"**.
2. Select your GitHub repository (`iarms-irrigation-system`) and click **"Import"**.
3. Under **Environment Variables**, add the following keys:

| Environment Variable Key | Required | Description / Value |
| :--- | :---: | :--- |
| `IARMS_SESSION_SECRET` | **Yes** | 64-character random hex string (e.g. `04d1add5ae666e2da4555d249ba581b4e47e3f6237cc335b91e847c20c0f64da`). Generate a fresh one with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. The app **refuses to run in production without it**. |
| `NEXT_PUBLIC_SUPABASE_URL` | **Yes** | Your Supabase Project URL (e.g. `https://xyz.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Yes** | Your Supabase public `anon` key |
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes** | Your Supabase `service_role` key (used for all server-side DB writes) |
| `IARMS_COOKIE_SECURE` | No | `true` (default in production). Only set `false` if you must test over plain HTTP. |

> **Note:** `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SYSTEM_TITLE`, `NEXT_PUBLIC_NIS_NAME`, and `NEXT_PUBLIC_REGION` are **not referenced by the code** and are optional. You do not need to add them.

4. Click **"Deploy"**. Vercel will build and launch your production web app in ~60 seconds.

---

## 5. Official Login Credentials for Production

All users sign in with **Username & Password** (no email format required):

| Role | Irrigators Association | Username | Default Password |
| :--- | :--- | :--- | :--- |
| **Super Admin** | All Associations (Baua River NIS) | `superadmin` | `superadmin123` |
| **Head Admin** | Nangurisan Laya FIA, Inc. | `admin_nlfia` | `admin123` |
| **Treasurer** | Nangurisan Laya FIA, Inc. | `treasurer_nlfia` | `treasurer123` |
| **Auditor** | Nangurisan Laya FIA, Inc. | `auditor_nlfia` | `auditor123` |
| **Head Admin** | Timog Sta. Cruz FIA, Inc. | `admin_tscfia` | `admin123` |
| **Treasurer** | Timog Sta. Cruz FIA, Inc. | `treasurer_tscfia` | `treasurer123` |
| **Auditor** | Timog Sta. Cruz FIA, Inc. | `auditor_tscfia` | `auditor123` |
| **Head Admin** | Gimong ti Eastern Sta. Cruz IA, Inc. | `admin_gtescia` | `admin123` |
| **Treasurer** | Gimong ti Eastern Sta. Cruz IA, Inc. | `treasurer_gtescia` | `treasurer123` |
| **Auditor** | Gimong ti Eastern Sta. Cruz IA, Inc. | `auditor_gtescia` | `auditor123` |

---

## 5.1 Rotate Default Passwords (IMPORTANT — do this right after first login)

The credentials in the table above are public, so every seeded account **must** change its password
immediately after the first successful sign-in:

1. Sign in as `superadmin` first.
2. Go to **Account** (`/dashboard/account`) and change the Super Admin password to a strong, unique one.
3. For each association, sign in as the `admin_*` account and use **Admin &rarr; Users** (`/dashboard/admin`)
   to reset the passwords of all `treasurer_*` and `auditor_*` accounts in that association.
4. Never reuse the `*123` defaults. New associations created inside the app are automatically seeded with
   cryptographically-random one-time passwords (shown once in the success message) — treat those the same way.

---

## 6. Post-Deployment Verification Checklist
- [ ] Visit your Vercel URL &rarr; Landing Page loads cleanly.
- [ ] Sign in as `superadmin` &rarr; Change the default password immediately (Section 5.1).
- [ ] Check consolidated overview dashboard across all 3 IAs.
- [ ] Navigate to **Irrigators Associations** &rarr; Verify profiles for Nangurisan Laya, Timog Sta. Cruz, and Gimong ti Eastern Sta. Cruz.
- [ ] Navigate to **Collections & Disbursements** &rarr; Log transaction with new Chart of Accounts categories (`DISB-TRAV`, `DISB-CLEAR`, `DISB-PROF`, `DISB-LATERAL`, etc.).
- [ ] Navigate to **Financial Statements** &rarr; Compile FS1–FS4 and test live inline figure recalculations.
