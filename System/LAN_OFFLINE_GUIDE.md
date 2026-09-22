# LAN Offline Deployment & Operating Guide
## Nangurisan Laya Farmers Irrigators Association, Inc. (NLFIA)
### Irrigation Record & Financial Management System (IARMS)

This guide is the full operations manual for running the IARMS system **100% offline** on a
Local Area Network (LAN) or shared Wi-Fi. One **Host Server PC** runs the web application and
the local database; any device on the same network (smartphone, tablet, laptop, office PC)
accesses the system through a normal web browser. No internet connection is ever required
after the initial setup.

---

## Table of Contents

1. [Features](#1-features)
2. [How It Works (Architecture)](#2-how-it-works-architecture)
3. [Tech Stack](#3-tech-stack)
4. [Security Model](#4-security-model)
5. [Performance Notes](#5-performance-notes)
6. [Data Storage & Reliability](#6-data-storage--reliability)
7. [Roles & Accounts](#7-roles--accounts)
8. [First-Time Setup](#8-first-time-setup)
9. [Configuration](#9-configuration)
10. [Running the Server](#10-running-the-server)
11. [How Other Devices Connect](#11-how-other-devices-connect)
12. [Daily Operation](#12-daily-operation)
13. [Maintenance & Backups](#13-maintenance--backups)
14. [Troubleshooting](#14-troubleshooting)
15. [Known Limitations & Migration Path](#15-known-limitations--migration-path)

---

## 1. Features

IARMS is a browser-based record and financial management system for an irrigators'
association. It runs entirely inside your office network.

- **Executive Dashboard** — real-time totals for collections, expenses, ending cash balance,
  monthly collection/disbursement trends (area chart), and budget expenditure breakdown
  (pie chart). One dashboard per role.
- **Collections & Disbursements Ledger** — log member ISF collections and operational
  disbursements against NIA-standard budget categories; optionally attach a receipt
  (JPG/PNG/WebP/PDF, max 10 MB) that goes straight into the audit queue.
- **Audit & Verification Queue** — uploaded receipts stay `pending` until the Auditor marks
  them **Verified, Flagged, or Rejected**, with optional notes. Full audit trail is logged.
- **Automatic Financial Statements (FS1–FS4)** — compile NIA-standard statements from live
  transaction data for the current vs. prior year, then print them as clean official PDFs
  directly from the browser.
- **Account Management (Admin only)** — create accounts, assign roles, reset passwords,
  delete accounts, and clear all financial records.
- **Self-service** — every user can update their own profile and change their password.
- **CSV export & PDF printing** — export ledger data to Excel-compatible CSV (UTF-8) and
  print statements as official documents with the UI hidden.
- **Notifications** — live system notifications (pending audit queue, latest ledger entry,
  system events) shown in the header bell.

---

## 2. How It Works (Architecture)

```
                          ┌──────────────────────────┐
                          │   Host Server PC        │
                          │   (Windows / Linux)      │
                          │                          │
                          │  ┌────────────────────┐  │
                          │  │  Next.js          │  │
                          │  │  (port 3000)      │  │
                          │  │  - web app        │  │
                          │  │  - server actions │  │
                          │  └─────────┬──────────┘  │
                          │            │             │
                          │  ┌─────────▼──────────┐  │
                          │  │ Local JSON DB      │  │
                          │  │ iarms_local_data   │  │
                          │  │ .json              │  │
                          │  └────────────────────┘  │
                          └───────────▲──────────────┘
                                      │ (same Wi-Fi / ethernet / switch)
                  ┌───────────────────┼────────────────────┐
                  │                   │                    │
      ┌───────────┴──────┐ ┌─────────┴────────┐ ┌──────────┴────────┐
      │ Treasurer Laptop │ │ Auditor Tablet  │ │ President Phone   │
      │ browser          │ │ browser         │ │ browser           │
      └──────────────────┘ └──────────────────┘ └───────────────────┘
```

**Request flow**

1. A client device opens `http://<HOST_IP>:3000` in any web browser.
2. The Next.js server on the Host PC renders the React application and serves the web app
   over HTTP to that device.
3. Every data operation (login, saving a transaction, verifying a receipt, generating a
   statement) runs as a **Server Action inside the Host process**. Clients never touch the
   database or files directly — all reads/writes happen on the Host.
4. The edge middleware on the Host verifies the user's signed session cookie before any
   protected page is served. Then each server action **re-checks the role against the
   database** (the source of truth) before performing the work.
5. Uploaded receipt files are written to a **private folder** on the Host and served back
   only to signed-in users through an authenticated route — never as public files.

> "Synced across all devices" means every device reads and writes to the **same Host
> database**. It does not mean each device keeps its own copy — protect yourself with
> backups (see [Maintenance & Backups](#13-maintenance--backups)).

---

## 3. Tech Stack

| Layer | Technology | Role |
|---|---|---|
| Frontend framework | **Next.js 14 (App Router)** + **React 18** | Web app + server-side rendering |
| Language | **TypeScript 5.6** (strict mode) | Type-safe development |
| Styling | **Tailwind CSS 3** + **Radix UI** primitives | Styling and accessible UI |
| Charts | **Highcharts** | Dashboard trends and expense breakdown visuals |
| Forms | Native React forms + server-side validation | Input validation |
| HTTP server | Next.js production server (`next start`) | Serves the LAN |
| Database | Local JSON file (`iarms_local_data.json`) | All records, stored on the Host |
| Password storage | `scrypt` hashing (Node crypto) | Secure password storage |
| Sessions | HMAC-signed HttpOnly cookie (`iarms_session`) | Login / role control |
| Middleware | Edge runtime (Web Crypto) | Verifies session signature per request |

**Why this stack:** for one office, a handful of users, and a few hundred transactions per
year, a local file database is fast, requires zero configuration, and works fully offline.
The auth layer is custom-built so no cloud service is required. All data operations live in
the modular `app/actions/` layer backed by a typed schema, so the system could later be
re-pointed at Supabase/PostgreSQL (or any SQL database) without rewriting the UI.

---

## 4. Security Model

1. **Hashed passwords** — stored as scrypt hashes; plaintext is never written to disk and
   never returned to the browser.
2. **Signed session cookie** — after login the server issues a `iarms_session` cookie signed
   with HMAC using `IARMS_SESSION_SECRET`. It is `HttpOnly` + `SameSite=Lax` and expires
   after **24 hours**. Cookies cannot be forged or tampered with.
3. **Authorization at the data layer** — every server action (transactions, audit, statements,
   user management) resolves the session and **re-verifies the role against the database**
   before executing. Demotions/password resets apply immediately; UI-only restrictions are
   never trusted.
4. **Private uploads** — receipts live outside the public folder, are size-limited (10 MB)
   with a file-type whitelist (JPG/PNG/WebP/PDF), and are served only to signed-in users.
5. **No public registration** — accounts are created only by the Administrator.
6. **Transport note** — the app speaks plain HTTP inside your LAN. Anyone on the same network
   could theoretically intercept traffic. For a trusted office LAN this is acceptable; do not
   expose port 3000 to the public internet. (See also [Limitations](#15-known-limitations--migration-path).)

---

## 5. Performance Notes

- **In-memory reads** — the JSON database is loaded once into memory on the Host; reads are
  effectively instant. Performance is comfortable up to roughly a few thousand records.
- **Always use the production build** — `npm run build` + `npm run start` compiles
  optimized, minified bundles (smaller downloads, faster load on phones/tablets) versus the
  unoptimized dev server.
- **Write behavior** — each mutation rewrites the small JSON file atomically; this is fast at
  association scale. Backups are created automatically with every write.
- **Print/PDF** — statements print through browser print mode with all UI hidden, producing
  clean, fast official documents with no server-side PDF engine needed.

---

## 6. Data Storage & Reliability

**Where the data lives (all on the Host PC, inside the project folder):**

| Path | Purpose |
|------|---------|
| `iarms_local_data.json` | Main local database: users, categories, transactions, receipts, financial statements, audit logs. |
| `iarms_local_data.json.bak` | Rolling backup — a copy is written before every save. |
| `.data/backups/` | Daily snapshots (first save of each day). |
| `.data/uploads/receipts/` | Private receipt files (images/PDFs) — not served publicly. |

**Reliability features**

- **Atomic writes** — data is written to a temp file and renamed into place, so a crash or
  power failure mid-save cannot corrupt the database.
- **Automatic backups** — rolling `.bak` before every write, plus one daily snapshot.
- **Password migration** — any pre-upgrade plaintext passwords are automatically re-hashed on
  first boot after the security update.

**Manual restore (if ever needed)**

1. Stop the server (`Ctrl + C`).
2. Replace `iarms_local_data.json` with the backup file you want to restore.
3. If receipts were included in the backup, also restore `.data/` (or just the
   `uploads/receipts/` folder).
4. Start the server again.

---

## 7. Roles & Accounts

| Role | Default login | Typical duties |
|---|---|---|
| `admin` | `admin@iarms.org` | Full access, user management, clear records |
| `treasurer` | `treasurer@iarms.org` | Log collections & disbursements, upload receipts |
| `auditor` | `auditor@iarms.org` | Verify / flag / reject receipts in the audit queue |
| `member` | created by admin | View dashboard and published statements |

**Login identity** — sign in with your **email**, your **username** (the part before `@`),
or your **full name**.

**Password reset** — contact the Administrator. The Administrator resets passwords from
**Manage User Accounts** (`/dashboard/admin`). Self-service password change is available at
**My Account Settings** (`/dashboard/account`).

**Important:** the three seed accounts above ship with default passwords and MUST be changed
after first login (see [Configuration](#9-configuration)).

---

## 8. First-Time Setup

On the **Host Server PC** (one time):

1. Install **Node.js LTS** (v20 or newer) from <https://nodejs.org> — it includes `npm`.
2. Copy the entire project folder (e.g. `System`) to the Host PC, e.g. `C:\IARMS`.
3. Open a terminal **inside the project folder** and install dependencies:
   ```cmd
   npm install
   ```
4. Create the session secret and configure `.env.local` (see [Configuration](#9-configuration)).
5. Build the production bundle:
   ```cmd
   npm run build
   ```
6. Allow the port through Windows Firewall (run **as Administrator**):
   ```cmd
   netsh advfirewall firewall add rule name="IARMS LAN 3000" dir=in action=allow protocol=TCP localport=3000
   ```
7. Start the server:
   ```cmd
   npm run start
   ```
8. Open `http://localhost:3000`, sign in, and **change the default passwords**.

---

## 9. Configuration

All configuration lives in a file named `.env.local` in the project folder (a template is in
`.env.example`).

| Key | Purpose | Example |
|-----|---------|---------|
| `IARMS_SESSION_SECRET` | **Required.** Secret used to sign login cookies. | a long random hex string |
| `IARMS_COOKIE_SECURE` | Set to `true` **only** when served over HTTPS. Leave `false` on plain LAN HTTP. | `false` |

**Generate a secret** (run once in the project folder):

```cmd
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Paste the output into `.env.local`:

```env
IARMS_SESSION_SECRET=<paste here>
IARMS_COOKIE_SECURE=false
```

> If you change `IARMS_SESSION_SECRET`, every existing session becomes invalid and all users
> must sign in again. This is by design.

**Change the default passwords (mandatory before going live):**

- Admin: **Manage User Accounts → Reset Password** for each account, **or**
- Each user: **My Account Settings → Change Password**.

Do not keep running on `admin123` / `treasurer123` / `auditor123`.

---

## 10. Running the Server

Run inside the project folder.

**Production (recommended for daily use):**

```cmd
npm run build     # only needed after code changes
npm run start
```

`npm run start` binds to `0.0.0.0:3000`, so devices on the LAN can reach it. The dev script
(`npm run dev`) also binds to `0.0.0.0` but is unoptimized — use it only for development.

**Stop the server:** press `Ctrl + C` in the running terminal.

**Auto-start on boot (optional, Windows):**

- Create a shortcut of `cmd /k "cd /d C:\IARMS && npm run start"` in `shell:startup`, or
- Install PM2 (runs it as a background service):
  ```cmd
  npm install -g pm2
  pm2 start npm --name iarms -- start
  pm2 save
  pm2 startup
  ```

---

## 11. How Other Devices Connect

1. **Find the Host's IP address** (on the Host PC):
   - Windows: `ipconfig` — look for the **IPv4 Address** of your active Wi-Fi/Ethernet
     adapter (e.g. `192.168.1.150`).
   - Mac/Linux: `hostname -I`.
2. **Ensure the firewall rule** from Step 6 of [First-Time Setup](#8-first-time-setup) exists.
3. On each client device (laptop, phone, tablet) open a modern browser and go to:
   ```text
   http://<HOST_IP>:3000
   ```
   Example: `http://192.168.1.150:3000`
4. Sign in with the assigned username/email and password.

**Requirements for clients**

- Same Wi-Fi network (same SSID) or the same wired router/switch as the Host. If the Host is
  wired to the router, wireless clients on that same router can connect.
- No app installation needed — just a browser.
- If a phone can't connect while laptops can, check the router's "client isolation / AP
  isolation" setting and disable it.

---

## 12. Daily Operation

| Task | Who | Where |
|------|-----|-------|
| Create accounts, reset passwords, change roles, delete accounts, clear records | Admin | `/dashboard/admin` |
| Log ISF collections & disbursements, attach receipts | Treasurer | `/dashboard/treasurer` |
| Verify / flag / reject pending vouchers | Auditor | `/dashboard/auditor` |
| View dashboard, statements, monthly trends | All signed-in users | `/dashboard` |
| Export ledger to CSV / print reports | All signed-in users | Treasurer / statements pages |
| Generate FS1–FS4 and print official PDFs | Treasurer / Admin | `/dashboard/statements` |
| Change own password / profile | All users | `/dashboard/account` |

**Generating financial statements:** in **Financial Statements**, choose the period, click
**Generate**, then use **Print PDF** — the browser produces a clean single-page PDF with the
UI hidden.

---

## 13. Maintenance & Backups

**Weekly (or after major activity):**

- Copy to a USB drive / second drawer (at least 2 copies):
  - `iarms_local_data.json` — the complete database
  - `.data/` — daily snapshots and all uploaded receipt files (recommended)
  - Example (Windows):
    ```cmd
    xcopy /E /Y "C:\IARMS\.data" "D:\IARMS_Backup\.data"
    copy "C:\IARMS\iarms_local_data.json" "D:\IARMS_Backup\"
    ```

**Monthly:**

- Clean old snapshots (keep ~60 days):
  ```cmd
  forfiles /p "C:\IARMS\.data\backups" /m *.json /d -60 /c "cmd /c del @path"
  ```
- Verify a restore works: restore a copy on a test PC once every few months.
- Rotate `IARMS_SESSION_SECRET` occasionally (signs everyone out — plan for quiet hours).

**Before any code upgrade:**

1. Stop the server.
2. Back up `iarms_local_data.json` and `.data/`.
3. Pull/update the code, run `npm install` and `npm run build`.
4. Restart the server and test one login + one transaction.

---

## 14. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| "Site can't be reached" from client devices | Firewall blocking port 3000 | Run the firewall rule as Administrator |
| "Connection refused" | Server not running, or wrong port/IP | Confirm `npm run start` is running and the IP is the Host's |
| Devices on different subnets can't connect | Client on another Wi-Fi / AP isolation enabled | Put clients on the same SSID/router; disable AP/client isolation |
| User signed out unexpectedly | Session expired (24 h) | Sign in again |
| Receipt upload rejected | Wrong type or > 10 MB | Use JPG/PNG/WebP/PDF under 10 MB |
| Forgotten password | — | Admin resets it via Manage User Accounts |
| Role change doesn't seem to apply | The page was loaded before the change | Reload the page — the session role is re-checked against the database on every request, so demotions apply immediately |
| After upgrade, login fails | Old `IARMS_SESSION_SECRET` removed/changed, or stale build | Rebuild with `npm run build`; keep the secret constant across restarts |

---

## 15. Known Limitations & Migration Path

**This setup is the right size when:**

- One office **Host PC** is always on during business hours.
- Total records are well under a few thousand.
- Manual (or scheduled) backups to USB/network drive are acceptable.
- All users are on one trusted LAN.

**Plan a migration to Supabase/PostgreSQL when:**

- More than one branch/office needs access over the internet (not just the LAN).
- You need higher reliability, concurrent multi-writer safety, or strict DB-level
  transactions.
- You need granular per-record permissions enforced by the database.

**If you migrate:** the runtime actions are already isolated in `app/actions/`, and the
database access is confined to `lib/db/localDb.ts`, so the move requires re-pointing the
data layer at a hosted client instead of the JSON file.

---

*Last updated: 2026-08-09. If anything here disagrees with the code after an update, the
authoritative source is `app/actions/`, `lib/`, `middleware.ts`, and `.env.example`.*
