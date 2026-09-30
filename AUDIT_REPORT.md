# IARMS — Full Codebase Audit Report

**Date:** 2026-09-27
**Scope:** Root Next.js 14 (App Router) + Supabase project (`app/`, `components/`, `lib/`, `types/`, `scripts/`, SQL schemas, config).
**Excluded:** `node_modules/`, `.next/`, build caches.
**Baseline:** commit `8be9fa9` — working tree clean, `npx tsc --noEmit` → 0 errors, `npx next lint` → clean.

> **Note on repo state:** during this audit the working tree changed — the 7 uncommitted files
> (`app/actions/statements.ts`, `components/statements/FS2View.tsx`, `lib/financial/recompute.ts`,
> `types/database.ts` + `System/` copies) were committed as `61d0b8f` and merged with 21 commits from
> `origin/main` (`8be9fa9`). All findings below were re-verified against the final tree.

---

## 1. Executive Summary

The **application-layer code is in good shape**: all 44 server actions are gated, roles are read from
the DB (not the cookie), passwords use scrypt with per-password salts and constant-time comparison,
session tokens are HMAC-SHA256 verified in constant time, upload/download routes reject path traversal
and validate magic bytes, and there are **no XSS sinks and no SQL-injection surface** anywhere.

The serious problems are at the **data layer and identity layer**:

1. **Zero Row Level Security** — no `ENABLE ROW LEVEL SECURITY` or policy on any of the 7 tables, while
   every query runs as the **service-role key**. The entire multi-tenant model exists only in TypeScript.
2. **Every production credential is published** in tracked files (`ONLINE_DEPLOYMENT_GUIDE.md`,
   `supabase_schema.sql` seed, `scripts/test_all_phases_and_roles.js`), and re-running the schema
   **resets all passwords back to those public defaults**.
3. **Financial totals don't equal their own line items** — several FS1–FS4 formulas are structurally
   inconsistent between generation, recompute, and the UI, so statements drift after the first edit.
4. **No transactional integrity** — fund checks, bulk wipes, and association create/delete are all
   read-then-write with swallowed errors.

**Verdict: not production-ready as a multi-tenant financial system** until §2 (Critical) is fixed.

| Area | Grade | Comment |
|---|---|---|
| Auth / session crypto | B+ | Solid primitives; weak secret handling (H-1) |
| RBAC / action layer | B | Consistent, 1 IDOR, some fail-open scoping |
| Database security (RLS) | F | Absent entirely |
| Financial correctness | D+ | Multiple totals ≠ line-item bugs |
| Concurrency / transactions | D | No locks, no RPCs, swallowed errors |
| Code quality / hygiene | B- | Clean lint/type, but dead code, god files, no tests |
| Dependency health | C- | 1 critical + 2 high vulns in `next` |

---

## 2. CRITICAL

### C-1 · No Row Level Security; every query runs as the service role
**`supabase_schema.sql` (7 tables, 0 policies), `supabase_migration_bookkeeper.sql`, `lib/supabase/server.ts:4`, `lib/db/supabaseDb.ts:28-36`**

```ts
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
```
No `ALTER TABLE … ENABLE ROW LEVEL SECURITY` and no `CREATE POLICY` anywhere. Under Supabase default
privileges, `anon`/`authenticated` can read `profiles` (including password hashes), `transactions`,
`receipts`, `financial_statements`, `audit_logs` via PostgREST. The app simultaneously **bypasses RLS**
by using the service-role key for 100% of access, so policies would be irrelevant anyway.

**Fix:** Enable RLS on all 7 tables, `REVOKE ALL … FROM anon`, keep the service-role key server-only,
remove `NEXT_PUBLIC_` from any key var, delete the unused `lib/supabase/client.ts` browser client.

### C-2 · All account credentials published in tracked files; seed re-resets them
**`ONLINE_DEPLOYMENT_GUIDE.md:75-86`, `supabase_schema.sql:176,192-199`, `app/actions/associations.ts:124-132,216`**

`superadmin/superadmin123`, plus deterministic usernames (`admin_<code>`) with `admin123`,
`bookkeeper123`, `treasurer123`, `auditor123` are printed in tracked docs. The seed's
`ON CONFLICT (username) DO UPDATE SET password = EXCLUDED.password` reverts any changed password to the
public default on re-run. New associations are created with the same hardcoded passwords and the
passwords are echoed back in the success message. **No forced password change on first login.**

**Fix:** Remove credentials from tracked files; generate random passwords via the existing
`generateRandomPassword()` (`lib/auth/password.ts:49`) and show once; add `must_change_password`;
drop `password = EXCLUDED.password` from the seed.

### C-3 · Known account codes silently dropped from FS1 totals
**`app/actions/statements.ts:162-163,180,215,223,231,258`**

`REC-CBU`, `REC-DUE`, `REC-REMU`, `REC-INT`, `DISB-MEET` are listed in `KNOWN_*_CODES` (so they never
become "extra" lines either) but have **no `sumByCategory` backing** — they resolve to `overrides ?? 0`.
`REC-CBU` is a real seeded account (`lib/financial/standardAccounts.ts:85`, allocated ₱100,000).
Affected transactions contribute **nothing** to `receipts.total`/`disbursements.total`, so `netSurplus`,
`fundBalanceEnd`, FS2, FS3 and FS4 are all understated, while the dashboard (`dashboard.ts:47-51`)
counts them — statements and dashboard disagree by exactly Σ(those amounts).

**Fix:** Map every known code to a real line (add a `REC-CBU` field), and add an invariant test
`receipts.total == Σ(line items) == Σ(transactions in period)`.

### C-4 · FS3 "Total Disbursement" ≠ sum of its rows; drops again on first recompute
**`statements.ts:484-499` vs `lib/financial/recompute.ts:266-279`**

Generation copies the total from FS1 (`total: fs1.disbursements.total.current`), which includes
`repairMaintenance` + `taxLicenses`. Those fields **don't exist** on `FS3Data.cashDisbursements`
(`types/database.ts:255-271`), so `recomputeBreakdown` rebuilds the total from rows only → after the
first inline edit the stored total **drops** by `repairMaintenance + taxLicenses(overrides)`.

**Fix:** Add the missing fields to `FS3Data`, map them at generation, and make `recompute.ts` use the
identical field set (share one `sumSection()` helper).

### C-5 · TOCTOU fund check allows over-disbursement
**`app/actions/transactions.ts:457-476` → insert at `:515`**

Balance is read, checked, then the insert happens — with **no DB transaction, no lock, no RPC** (the only
`rpc` call in the codebase is `ensure_iarms_schema` at `members.ts:20`). Two concurrent disbursements both
pass and both insert → fund goes negative. `localDb` is just `export * from './supabaseDb'`
(`lib/db/localDb.ts:1`), so "local" writes are remote PostgREST calls.

**Fix:** Single Postgres function (`SECURITY DEFINER`, `SELECT … FOR UPDATE` / advisory lock keyed by
association+fund) called via `client.rpc('create_transaction_checked', …)`.

### C-6 · Bulk wipe ignores errors, no audit log, reports success on partial failure
**`app/actions/admin.ts:413-436` → `lib/db/supabaseDb.ts:937-949`**

Every `{ error }` from the deletes is discarded; `admin.ts:432` still returns "cleared successfully".
Non-transactional (statements gone, transactions kept). No `addAuditLog`. `requireRole('admin')` also
admits `super_admin`, and with no `associationId` it takes the `.neq('id','0')` path → **wipes all associations**.

**Fix:** Check every error, require explicit `associationId` unless super_admin + typed confirmation,
log an `AUDIT_CLEAR_ALL` entry with counts.

### C-7 · `next@14.2.35` — 1 critical + 2 high vulnerabilities, no patched 14.x
**`package.json`, `package-lock.json`**

`npm audit --omit=dev` → **1 critical, 2 high** (`next` 9.3.4-canary.0–16.3.0-preview.10, `nanoid`,
`postcss`). 16 advisories including App-Router CSP-nonce XSS, RSC deserialization DoS, middleware cache
poisoning, HTTP request smuggling in rewrites, unbounded Server Action payload in Edge. The app is
self-hosted with `next start -H 0.0.0.0`.

**Fix:** `npm audit fix` (clears `nanoid`), then plan a **Next 14 → 16.3.6** major upgrade — every 14.x
release is in the affected range. Also `eslint-config-next` is pinned `14.2.10` vs installed `14.2.35`.

---

## 3. HIGH

### H-1 · Hardcoded session-signing secret committed to source
**`lib/auth/sessionShared.ts:11,13-22`**
```ts
export const DEV_SESSION_SECRET = 'iarms-multi-association-secret-key-2026';
```
Used whenever `NODE_ENV !== 'production'` or the env var is missing/short. `package.json:6` binds
`next dev -H 0.0.0.0`, so a LAN-exposed dev server accepts tokens forged with a value readable on GitHub.
Production fails closed (good), but safety is a single env var.

**Fix:** Delete `DEV_SESSION_SECRET`; throw unconditionally if `IARMS_SESSION_SECRET` is absent/short.

### H-2 · Cross-association IDOR in `deleteFixedAssetAction`
**`app/actions/fixedAssets.ts:117-129` → `lib/db/supabaseDb.ts:564-567`**

The only mutation with **no association scoping**: auth check + a treasurer/auditor block, then
`.delete().eq('id', id)` with no `.eq('association_id', …)`. Any admin/bookkeeper in association A can
delete association B's fixed-asset/chart-of-accounts rows by ID. All sibling actions do check
(`transactions.ts:716`, `statements.ts:656`, `audit.ts:101`, `members.ts:150`, `admin.ts:82/160/211/267`).

**Fix:** Load the row first and apply the established ownership check.

### H-3 · Login lockout bypassable via spoofable `X-Forwarded-For`
**`app/actions/auth.ts:24-33,48,57`, `lib/auth/ratelimit.ts:7-8,31-41`**

Lock key is `` `${username}:${x-forwarded-for}` `` — both halves attacker-controlled when not behind a
trusted proxy. Counter also resets to zero after each lock, the store is per-process in-memory (resets on
redeploy, broken multi-instance), and `updatePasswordAction`/`resetUserPasswordAction` are not rate-limited.

**Fix:** Key on username only (or a server-derived IP), progressive backoff, shared store (Redis/Upstash),
limit all password-mutation endpoints.

### H-4 · No audit trail for transactions/statements; hard delete incl. receipt file
**`transactions.ts:699-748`, `statements.ts:580-605,650-686`, `supabaseDb.ts:685-690`**

`grep addAuditLog` in `transactions.ts` → 0; in `statements.ts` → 0. `deleteTransactionAction` removes the
transaction, then the receipt row, then the storage file — no log, no `deleted_at` column anywhere.
Members/associations/admin actions *do* log, so policy is inconsistent.

**Fix:** Add `addAuditLog` (with `before` snapshot) to all transaction/statement mutations; soft-delete.

### H-5 · Non-transactional multi-step writes with swallowed errors
**`supabaseDb.ts:99-114` (`deleteAssociation`), `app/actions/associations.ts:119-198` (`createAssociationAction`)**

`deleteAssociation` deletes `budget_categories` first (always fails on `ON DELETE RESTRICT`, error
discarded), then children, then checks only the final error — a failure at the last step leaves an
association whose transactions/receipts/statements/users are already destroyed. `createAssociationAction`
does `createAssociation` → 4× `createUser` → `seedStandardCategories` → `addAuditLog` with no rollback.

**Fix:** Postgres RPCs with `BEGIN/COMMIT` and `RAISE`; at minimum check every error and abort.

### H-6 · Client-supplied FS1–FS4 persisted with no server-side validation or recompute
**`app/actions/statements.ts:660-681`** — `grep recomputeBreakdown app/actions/statements.ts` → 0 matches.

Whatever the browser sends becomes the official statement and the summary columns. No `isFinite` check,
no `total` vs row-sum reconciliation. A stale or tampered client silently rewrites statutory totals.

**Fix:** Recompute server-side before persisting, validate every numeric leaf with `Number.isFinite`,
derive the three summary columns from the *recomputed* FS1.

### H-7 · "Recalculate" saves new values but retains stale pins → numbers revert
**`app/dashboard/statements/page.tsx:340-356`, `statements.ts:674`**

The page recomputes with `edits: {}` but **never sends `edits`**, and the server does
`edits: updatedData.edits ?? existingReport.edits` → old pins survive. Next load reapplies them via
`applyForcedPins`, overwriting the recalculated values with pre-recalculation numbers (plus phantom
"forced" badges).

**Fix:** Send `edits: rd.edits` from the page (or honour `updatedData.edits` without the `??` fallback).

### H-8 · FS2 and FS4 use structurally different balance-sheet formulas
**`statements.ts:371,376,379` vs `:525,531`; mirrored in `recompute.ts:178-204` vs `:293-313`**

FS2 counts liabilities *inside* assets (`totalCurrentAssets = fundBalanceEnd + totalCurrentLiabilities + …`)
then subtracts them for equity; FS4 builds assets from cash+receivables+inventory+building and subtracts
liabilities. The two bottom lines of the same report package disagree by
`fundBalanceEnd − cashTotal − receivables + totalLiabilities` whenever liabilities/receivables ≠ 0.

**Fix:** One shared balance-sheet identity with both sides built from the same cash source; add a
reconciliation assertion.

### H-9 · FS3 Section E vs Section F use incompatible cash bases
**`statements.ts:439-447,458-464` (cumulative-since-inception) vs `:320-323,503-505` (2-year FS1, prior
opening hardcoded to `0`); `recompute.ts:287` then forces F's total to E.**

At generation E ≠ F whenever history predates the prior year; after the first edit F's *total* is replaced
by E while F's *rows* stay cumulative → total no longer equals its own rows.

### H-10 · Hardcoded NLFIA officers, TINs and SEC number on other associations' statements
**`statements.ts:84-91`** (fallbacks `'RIC UNDAY'`, `'ARTUR GUIANG'`, TIN `440-615-026-000`,
`CN202060557`, `769-207-601-000`), duplicated in `FS1View.tsx:303-317` and
**`lib/utils/export.ts:22-23`** (CSV export hardcodes the NLFIA letterhead for every association).

**Fix:** Fail validation when officer metadata is missing; source only from the association row; pass
identity into the export metadata param.

### H-11 · Nested legacy fork `System/` — outdated offline/JSON version, committed and pushed
**`System/`** — older fork: `System/lib/db/localDb.ts` is a 18 KB JSON file engine (root's is a 1-line
alias to Supabase), `System/package.json` has **no `@supabase/supabase-js`**, and root-only modules
(`supabaseDb.ts`, `recompute.ts`, `standardAccounts.ts`, `pwa/*`, `fixedAssets.ts`) are absent. Features
were being hand-applied to **both** copies (proof: `61d0b8f` diffs root *and* `System/` copies).

It **was type-checked** (root `tsconfig.json` `include: ["**/*.ts"]` matched it; upstream fixed this in
`81a0a71` adding `exclude: ["node_modules","System"]`), but never served (0 imports) and never linted.
Removed from git by merge `8be9fa9`, but **~547 MB of disk residue remains** (`System/node_modules`,
`System/.next`, `System/.data/backups/*` account data, `System/iarms_local_data.json*`, `System/.env.local`).

**Fix:** Delete `System/` from disk; keep the tsconfig `exclude` as belt-and-braces.

### H-12 · No security headers anywhere
**`next.config.js` (no `headers()`), `middleware.ts` (returns `NextResponse.next()` with no headers),
matcher `['/dashboard/:path*', '/login']`**

No CSP, `X-Frame-Options` (login page is frameable → clickjacking), `X-Content-Type-Options: nosniff`,
`Referrer-Policy`, HSTS, `Permissions-Policy`. Upload responses serve user bytes `inline` with an
extension-derived MIME and no `nosniff` (`app/uploads/[...path]/route.ts:68-75`).

**Fix:** Add a `headers()` block in `next.config.js` (mind the PWA inline script and Supabase blob URLs
when writing CSP); add `nosniff` to the uploads route.

### H-13 · No test framework and no CI
0 `*.test.*`/`*.spec.*` files; no jest/vitest/playwright; no `.github/`. `package.json` scripts are only
`dev/dev:local/build/start/lint`. The "test suites" in commit messages are ad-hoc `scripts/*.js` needing a
live Supabase + `.env.local`.

**Fix:** Add Vitest + a GitHub Actions workflow running `tsc --noEmit`, `next lint`, `next build`.

---

## 4. MEDIUM

### Security
- **M-1 · Treasurer ("Read & View Only") can write.** `transactions.ts:561` and
  `app/api/upload-receipt/route.ts:62` both include `'treasurer'` in the allow-list, contradicting
  `transactions.ts:380` and the documented role. `transactions.ts:666-667` also accepts an arbitrary
  client `/uploads/…` string as a receipt path with **no validation**, bypassing the magic-byte/size
  checks the data-URL branch enforces.
- **M-2 · `association_id || undefined` fails open.** `statements.ts:27-30`, `transactions.ts:359-362,535-538`,
  `audit.ts:66-69`, `dashboard.ts:16-19`, `fixedAssets.ts:15-18`, `members.ts:37`,
  `supabaseDb.ts:582-584,717-719` — `undefined` means **no WHERE clause** → a non-super user with a NULL
  `association_id` reads every association's data. `statements.ts:78-81` even falls back to the *first*
  association. (Counter-examples that fail closed: `transactions.ts:397-399`, `fixedAssets.ts:65-70`.)
- **M-3 · `association_id IS NULL` rows bypass every cross-association guard.** `transactions.ts:152-158,
  210-216, 301-307` load all categories then guard with `target.association_id && …` → NULL passes.
  All 15 seeded standard categories are NULL (`supabase_schema.sql:205`), and **update/toggle have no
  statutory-account protection** (only delete does, via `isStandardNiaAccount`).
- **M-4 · Service worker caches authenticated pages cache-first, never cleared on sign-out.**
  `public/sw.js:37-48,51-63` caches `/dashboard/*` HTML and RSC payloads by URL (no `Vary: Cookie`);
  `signOutAction` (`auth.ts:89-98`) only deletes the cookie. Previous user's financial data stays readable
  offline on a shared machine.
- **M-5 · Middleware coverage gaps.** Not covered: `/`, `/register`, `/uploads/:path*`, `/api/upload-receipt`
  — both upload routes self-authenticate (verified), so no live gap today, but future routes inherit no
  protection. The `/login` matcher entry does nothing.

### Financial / data integrity
- **M-6 · FS2View hides `inventorySupplies` while `totalAssets` includes it** — `FS2View.tsx:143-157` vs
  `statements.ts:376` / `recompute.ts:189`. Visible rows don't sum to the printed total.
- **M-7 · FS2 depreciation participates in no total** — `statements.ts:393,395`; `depreciation.prior`
  hardcoded `0`. Readers assume `beginning + surplus + depreciation = end`.
- **M-8 · Cache race + dead invalidation prefix.** `lib/db/cache.ts:6-25` — stale loader can re-cache
  invalidated data; no in-flight dedupe; per-process `Map`. Every `invalidateCache('s:')` call matches
  **no key** (only `as:`, `u:`, `bc:` exist) → statements/user-list invalidation is dead code.
- **M-9 · ID / transaction-number collisions.** `tx-${Date.now()}`, `stmt-${Date.now()}`,
  `FS-…-${random 4-digit}` against `UNIQUE` columns (`transactions.ts:446-449,485`,
  `statements.ts:580,583`, `supabaseDb.ts:517-518`) → same-millisecond collision, opaque insert failure.
- **M-10 · FS4 dumps non-current liabilities into "Other Accounts Payable"** — `statements.ts:528-529`
  (FS2 separates them at `:368-369`).
- **M-11 · Dead, contradictory mapping tables; tax expenses land on the wrong line.**
  `statements.ts:123-144` (`RECEIPT_LINE_BY_CODE`/`DISBURSEMENT_LINE_BY_CODE`) is never referenced, yet
  says `'DISB-TAX': 'taxLicenses'` while the live code puts it in `registrationPermits` (`:250`) and the
  tax line is a constant zero (`:273-276`) → FS1/FS3 mislabeled rows.
- **M-12 · `activeBudgetUtilizationPercentage` is an expense ratio, not budget utilization** —
  `dashboard.ts:119` divides by collections instead of `Σ allocated_amount`.
- **M-13 · No optimistic concurrency** on statement/transaction read-modify-write (`statements.ts:650-681`,
  `supabaseDb.ts:915-928`) → last write wins.
- **M-14 · `member_ids` JSONB orphans on member delete** — `supabase_schema.sql:93` (no FK) vs `member_id`
  `ON DELETE SET NULL` at `:92`; `members.ts:198-234` doesn't scrub it (`supabaseDb.ts:612-613` silently drops).

### Code quality / hygiene
- **M-15 · 23 ad-hoc `scripts/`, zero wiring, 8 destructive.** 0 references from `package.json` or any doc;
  `purge_and_recreate_all.js` (636 L), `audit_all_tabs_crud.js`, `audit_stress_and_concurrency.js`,
  `simulate_user_session.js` etc. `.delete()` production rows against live Supabase. Not linted by
  `next lint`. (No hardcoded secrets — they read `.env.local`.)
- **M-16 · `localDb` is a lie.** `lib/db/localDb.ts` = `export * from './supabaseDb';` — 11 files import
  `localDb` believing it's a local/offline layer. The JSON/offline mode is gone; only dead
  `lib/utils/network.ts` (`isOfflineMode`) remains.
- **M-17 · God files.** `chart-of-accounts/page.tsx` 1,737 L/87 KB · `statements/page.tsx` 1,177 L/54 KB ·
  `admin/page.tsx` 1,003 L/45 KB · `supabaseDb.ts` 981 L/38 KB · `TransactionFormModal.tsx` 909 L/42 KB ·
  `actions/statements.ts` 757 L · `actions/transactions.ts` 754 L. Total source ≈ 25,339 lines.
- **M-18 · 10 unused files → 5 removable deps.** Never imported: `components/layout/Logo.tsx`,
  `components/ui/{accordion,alert,dropdown-menu,popover,select,skeleton,tooltip}.tsx`,
  `lib/supabase/client.ts`, `lib/utils/network.ts`. Removable: `@radix-ui/react-accordion`,
  `react-dropdown-menu`, `react-popover`, `react-select`, `react-tooltip`.
  (*Not* dead: `types/index.ts` — imported by 33 files; `recompute.ts` — used by the statements page.)

---

## 5. LOW

- **L-1 · Sign-out doesn't revoke the token** — 7-day replay window (`sessionShared.ts:7`,
  `auth.ts:89-98`). Password changes *do* revoke via `token_version` (`supabaseDb.ts:254-261`).
- **L-2 · Cookie `secure` flag is env-disableable in production** (`auth.ts:74`,
  `IARMS_COOKIE_SECURE !== 'false'`); no `maxAge` despite a 7-day token.
- **L-3 · Login lookup uses unsanitized `ilike`** (`supabaseDb.ts:198-202`) — `%`/`_` act as wildcards and
  can resolve to a different account; raw Postgres `error.message` returned to the client (`auth.ts:39-44`).
- **L-4 · Client gating ≠ server policy** — `Sidebar.tsx:64-136` hides nav, but `dashboard/layout.tsx:9-13`
  only checks authentication → a treasurer can load `/dashboard/admin` directly; `treasurer/page.tsx:88`
  renders a "Clear" button wired to an action that always returns UNAUTHORIZED; `admin.ts:75-88` blocks
  `super_admin` but never `admin` (stopped only incidentally by the one-holder rule).
- **L-5 · Weak password policy** — `password.ts:59-61` requires only `length >= 6`; `hashPassword` uses
  blocking `scryptSync` on account creation.
- **L-6 · `Database = Record<string, any>`** (`types/database.ts:2`); nullable columns typed non-null
  (`:145,441-446`). Should be `supabase gen types typescript`.
- **L-7 · Missing indexes** — `transactions.receipt_id`, `.category_id`, `.member_id`,
  `receipts.uploader_id`, and `audit_logs` has none (`supabase_schema.sql:141-146`).
- **L-8 · Three competing PHP formatters** — `formatPHP` (2 dp, null-safe), ad-hoc
  `toLocaleString` without `maximumFractionDigits` (`TransactionFormModal.tsx:175,413,…`,
  `transactions.ts:469-470`), and `` `PHP ${…}` `` (`formatters.ts:125`); treasurer CSV mixes formatted
  totals with a raw amount column (`treasurer/page.tsx:166-180`) → Excel sums won't match.
- **L-9 · `.kilo/worktrees/dog-salt` leftover worktree** (6 MB, detached at `origin/main`), excluded only
  via `.git/info/exclude` — a fresh clone shows it as untracked. Add `.kilo/` to `.gitignore`.
- **L-10 · Stray root files, all correctly ignored and never committed** (verified with `git log --all`):
  `tsconfig.tsbuildinfo`, `.env.local`, `ACCOUNT_CREDENTIALS.txt`, `SECURITY_AUDIT_CHECKLIST.txt`,
  `bg.png` (2.3 MB), `logo.png`, `storage/receipts/*.png`, `.next/`. **Recommend deleting
  `ACCOUNT_CREDENTIALS.txt` from disk and rotating those passwords.**
- **L-11 · `: any` ×97** (worst: dashboard pages, `actions/{statements,transactions,admin,associations}.ts`,
  `supabaseDb.ts`). No Prettier / `.editorconfig`. `tailwind.config.ts` has stale `./pages/**` and
  `./src/**` globs. `eslint@8` is EOL; `eslint-config-next` version-mismatched.
- **L-12 · Debug leftovers are clean** — `console.log` = 0, `TODO/FIXME/HACK` = 0, `console.warn/error` = 19
  (all in catch paths), `eslint-disable` = 8 (all justified).

---

## 6. What Checked Out Good (verified, not assumed)

- **Session crypto:** HMAC-SHA256 + `timingSafeEqual` (`session.ts:47-51`); edge middleware uses Web
  Crypto `crypto.subtle.verify` (`middleware.ts:38-44`) — both constant-time. 7-day expiry enforced.
- **Roles are server-derived:** `getSessionUser` discards the cookie's role and reloads from the DB
  (`session.ts:82-94`); `requireRole` grants super_admin inheritance explicitly (`session.ts:114`).
  All **44** exported actions are gated.
- **Password hashing:** scrypt N=16384/r=8/p=1, 16-byte random salt, `timingSafeEqual`
  (`password.ts:7-24`); hashes stripped from every read path.
- **Upload/download routes:** session + role gate, size caps, **magic-byte sniffing vs declared MIME**,
  sanitized filenames, private bucket; download rejects `..` three ways, enforces the association folder
  prefix, `Cache-Control: private, no-store`. Files cannot be fetched unauthenticated.
- **No SQL injection surface** — no template-literal queries; the only RPC is the fixed
  `ensure_iarms_schema`. **No XSS sinks** — zero `dangerouslySetInnerHTML`/`innerHTML`/`eval`.
- **Git hygiene** — `.env.local` and `ACCOUNT_CREDENTIALS.txt` are untracked and gitignored
  (confirmed with `git check-ignore`); no JWT literals anywhere; `.git` is only 5 MB.
- **Amount validation:** `transactions.ts:402` rejects non-finite/≤0 before insert; DB
  `CHECK (amount > 0)` + `NUMERIC(15,2)` (`supabase_schema.sql:96`); every `.reduce` in scope passes an
  initial `0`; no `toFixed` used for persistence.
- **Recompute engine is pure** — deep-copies input, never touches the DB, `LOCKED_DERIVED_PATHS`
  (`recompute.ts:8-49,325-333`) correctly prevents pinning totals.
- **Type/lint health:** `tsc --noEmit` = 0 errors, `next lint` = clean, `strict: true`, no disabled ESLint rules.

---

## 7. Recommended Fix Order

**Immediate (money / data at risk)**
1. C-5 fund-check RPC · C-6 bulk-wipe errors + audit.
2. C-1 RLS + revoke anon · C-2 rotate and unpublish all credentials · H-1 remove the dev session secret.
3. C-3 + C-4 + H-8 + H-9 — one theme: *totals don't equal their line items*. Extract a shared
   `sumSection()` used by generation **and** `recompute.ts`, plus a reconciliation test.
4. H-6 + H-7 — make the server authoritative: recompute on save, persist `edits` intentionally.
5. C-7 `npm audit fix`, then schedule Next 14 → 16.

**Short term**
6. H-2 IDOR · H-3 rate limiting · M-1 treasurer writes · M-2/M-3 fail-open scoping.
7. H-4 audit trail + soft delete · H-5 transactional RPCs · H-10 hardcoded identity.
8. H-12 security headers · M-4 service-worker cache scoping.

**Housekeeping**
9. H-11 delete `System/` (~547 MB) · L-10 delete `ACCOUNT_CREDENTIALS.txt` + rotate ·
   L-9 remove the `.kilo` worktree + fix `.gitignore`.
10. M-18 delete 10 dead files + 5 deps · M-16 rename `localDb` → `db` · M-15 quarantine destructive scripts.
11. H-13 add Vitest + CI · split M-17 god files · reduce L-6/L-11 typing debt.
