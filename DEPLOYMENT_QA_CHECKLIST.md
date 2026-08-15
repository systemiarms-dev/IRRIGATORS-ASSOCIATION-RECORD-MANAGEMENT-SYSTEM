# Pre-Deployment QA Checklist (IARMS)

Work through this top to bottom. Tick each box only when it behaves as described.
If anything fails, note it and tell me — I'll fix it before deployment.

---

## 1. Environment & Setup

- [ ] `.env.local` has these values set:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `IARMS_SESSION_SECRET` (at least 32 characters)
- [ ] `npm run dev` starts without errors (no red text in the terminal).
- [ ] `npx tsc --noEmit` finishes with no errors.
- [ ] `npx next lint` shows "No ESLint warnings or errors".
- [ ] `npm run build` completes successfully (run once before the final check today).

---

## 2. Login & Accounts

- [ ] Super Admin can log in with the super-admin username + password.
- [ ] A Head Admin can log in.
- [ ] A Treasurer can log in.
- [ ] An Auditor can log in.
- [ ] Wrong password shows "Invalid username or password".
- [ ] Logging in with a **username that has no email** works (usernames only, no email field anywhere).
- [ ] Usernames do NOT show an `@` sign anywhere (header, account page, admin table).

**Account changes (lock the screen / browser):**
- [ ] Change your own password in My Account Settings → log back in with the new password.
- [ ] After changing password you're asked to log in again.

---

## 3. My Account Settings (every role)

- [ ] You can edit your Full Name, Farm Size, Farm Location.
- [ ] Mobile number input shows **11 boxes** starting with `0` and `9`.
- [ ] Typing a wrong number (e.g. `63` prefix, or 10 digits) shows an error and does NOT save.
- [ ] Saving a valid number like `09171234567` saves and displays it back.

---

## 4. Dashboard & Navigation

- [ ] Overview Dashboard loads with the association name and figures.
- [ ] Sidebar shows only the pages your role is allowed to see.
- [ ] System logo appears as the browser tab icon AND as the installed app icon (same logo).
- [ ] Header shows your username without `@` and your role.

---

## 5. Treasurer — Collections & Expenses (Transaction Ledger)

- [ ] Open Collections & Expenses.
- [ ] Record a collection (income) with: amount, date, category, payer(s).
- [ ] Record an expense with: amount, date, category, particulars, payee.
- [ ] The **NIA Budget Category dropdown** works: pick an existing category.
- [ ] "Custom category" option works: type a new category, it saves and appears on the next transaction.
- [ ] Voucher/receipt number fields accept input and are saved.
- [ ] The ledger table shows the association short code (e.g. `NLFIA`), NOT "IA".
- [ ] Edit a transaction and confirm the numbers change.
- [ ] Delete a transaction (own association only works; trying another assoc fails).

**Receipts / uploads:**
- [ ] Upload a receipt image — it attaches to the transaction and shows a preview.
- [ ] Upload a fake file renamed to `.png` — it is REJECTED (you should not be able to).
- [ ] Unauthorized access to another association's uploaded file returns an error (403), not the file.

---

## 6. Auditor — Verification & Audit Queue

- [ ] Auditor sees only their own association's pending receipts.
- [ ] Approve a receipt → it moves from Pending to Verified.
- [ ] Reject a receipt with notes → transaction stays but is marked rejected.
- [ ] Aggregated multiple-receipt verification works (verify all pending).

---

## 7. Financial Statements (FS1 – FS4)

- [ ] Statements page lists generated statements (FS1, FS2, FS3, FS4).
- [ ] Generate a new statement → totals are consistent.
- [ ] Edit a **line item** (e.g. one expense category) — save.
- [ ] Totals, net surplus, balance sheet re-calc correctly and **page does NOT crash** (no
  "Cannot read properties of undefined" / red screen).
- [ ] Rename a statement title, then delete a statement.
- [ ] Offline / downloadable exports (CSV, PDF Print) produce a file with data.

---

## 8. Associations Management (Super Admin only)

- [ ] Super Admin sees the full list of associations (Gimong, Nangurisan, Timog).
- [ ] Edit an association (e.g. president name, contact) → saves and shows.
- [ ] Association contact number also uses the 11-box 09 format.
- [ ] Create a new test association → you get the auto-generated officer accounts and
  one-time random passwords in the success message.

**Auto-generated accounts (for the new association):**
- [ ] Head Admin username is free-form (e.g. `admin_xxx`).
- [ ] Treasurer/auditor usernames are locked to `treasurer_xxx` / `auditor_xxx` and cannot be typed/changed.

---

## 9. User Account Manager (Roles & Permissions)

**Head Admin (log in as a Head Admin):**
- [ ] Only officers of their OWN association appear in the list.
- [ ] Can EDIT (pencil) a Treasurer/Auditor — change their name, contact, farm data.
- [ ] Can RESET a Treasurer/Auditor password (must enter the new initial password, min 6 chars).
- [ ] Can DELETE a Treasurer/Auditor.
- [ ] CANNOT edit/reset/delete a Head Admin or Super Admin (buttons hidden / server rejects).
- [ ] CANNOT change roles (no role dropdown).

**Super Admin:**
- [ ] Sees ALL associations' officers (filter by association works).
- [ ] Can change any officer's role via the dropdown.
- [ ] Can edit/reset/delete any officer including Head Admins.
- [ ] Cannot edit/reset/delete their own account here (use Account Settings instead).

**Register New Officer Account (Super Admin):**
- [ ] Creating a Treasurer → username shows `treasurer_<shortcode>` and is read-only.
- [ ] Creating an Auditor → username shows `auditor_<shortcode>` and is read-only.
- [ ] Creating a Head Admin → username is editable.
- [ ] Initial Password field has a show/hide (eye) icon.
- [ ] Saving an account with a mobile number uses the 09 / 11-digit format.
- [ ] Duplicate username is rejected with a message.

---

## 10. Security / Safety-Net Checks

- [ ] Super Admin can clear records (post a test, then it's emptied).
- [ ] Officer cannot clear records (no button / rejected).
- [ ] All important actions are recorded (check the database or logs show audit entries).
- [ ] `IARMS_SESSION_SECRET` is NOT shown anywhere on the site.
- [ ] No passwords/keys printed in the browser console or page source.

---

## 11. PWA / Installable App

- [ ] `manifest.webmanifest` loads (visit `/manifest.webmanifest`).
- [ ] "Add to Home Screen" (or the Install button) installs IARMS on your phone.
- [ ] Installed app opens full-screen (no browser URL bar) and shows the system logo.
- [ ] Open the installed app, go offline → the app still loads cached pages.
- [ ] Login / uploads still require the network (they may fail offline — that's expected).

---

## 12. Final Go / No-Go

- [ ] Fresh page load on every major page (dashboard, treasurer, auditor, statements,
      associations, admin, account) with no red/error screen.
- [ ] No console errors on the main flows (F12 → Console).
- [ ] `npm run build` passes one last time.
- [ ] Default passwords from seeding/creation have been handed out and users were told to
      change them (see the Deployment Guide Section 5.1).

---

**When you hit a failure:** tell me the page you were on, what you clicked/typed,
and the exact error message (screenshot or copy). I'll fix it and we re-run only the
failed section.