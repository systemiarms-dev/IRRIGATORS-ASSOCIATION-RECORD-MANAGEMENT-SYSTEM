# IRRIGATORS ASSOCIATION RECORD MANAGEMENT SYSTEM (IARMS)
## Comprehensive System Guidebook & Financial Computation Manual
**Document Version:** 2.0 (Official NIA-SEC Statutory Release)  
**Mathematical Anchor & Case Study:** Nangurisan Laya Farmers Irrigators Association, Inc. (NLFIA)  
**System Standard:** National Irrigation Administration (NIA) Modified Irrigation Management Transfer (IMT) Contract & SEC-Compliant Financial Reporting

---

## 1. Executive Overview & System Purpose

### 1.1 Purpose and Statutory Context
The **Irrigators Association Record Management System (IARMS)** is an enterprise-grade cloud accounting and administrative platform designed specifically for Irrigators Associations (IAs) operating under the National Irrigation Administration (NIA) and registered with the Securities and Exchange Commission (SEC) and Bureau of Internal Revenue (BIR).

The platform transforms manual, error-prone paper ledgers into an automated, mathematically unified double-entry accounting engine. It ensures:
1. **Statutory NIA Compliance:** Native generation of the 4 official NIA financial statement packages (FS-1, FS-2, FS-3, FS-4).
2. **Double-Entry Equilibrium:** Real-time alignment between the cash ledger, multi-fund bank accounts, fixed assets, liabilities, and members' equity.
3. **Audit Trail Integrity:** Strict multi-role segregation of duties with full voucher tracking and irreversible historical logs.

---

## 2. User Roles & Permission Matrix

The system enforces strict **Separation of Duties (SoD)** to prevent financial fraud and meet Philippine Commission on Audit (COA) and NIA guidelines:

| Role | Operational Scope | Can Add Transactions? | Can Edit Chart of Accounts? | Can Generate Statements? | Can Sign / Notarize? |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **Super Admin** | System-wide oversight across all IAs, system configuration, database backup | Yes | Yes | Yes | Yes |
| **IA President** | Executive leadership, governance, administrative approval, signatory | View Only | View Only | View Only | Yes |
| **Bookkeeper / Encoder** | Daily recording of collections, expenses, vouchers, and asset registry | **Yes** | **Yes** | **Yes** | No |
| **Treasurer** | Fiduciary custodian of cash vault and bank accounts; certification signatory | View Only | View Only | View Only | **Yes** |
| **Auditor** | Independent verification, examination of receipts/vouchers, audit overrides | View Only | View Only | View Only | **Yes** |
| **Farmer Member** | View individual dues, payments, land parcel records, and published reports | No | No | No | No |

---

## 3. Sidebar Navigation & Module-by-Module Operational Handbook

The system sidebar is divided into three distinct operational suites: **Core Management**, **Financial Suite**, and **Administration**.

```
[Core Management]
├── Overview Dashboard         (/dashboard)
├── Irrigators Associations    (/dashboard/associations) [Super Admin]
└── Farmer Members             (/dashboard/members)

[Financial Suite]
├── Collections & Expenses     (/dashboard/treasurer)
├── Verification & Audit Queue (/dashboard/auditor)
├── Financial Statements       (/dashboard/statements)
└── Chart of Accounts          (/dashboard/chart-of-accounts)

[Administration]
├── User Account Manager       (/dashboard/admin) [Super Admin / Admin]
└── My Account Settings        (/dashboard/account)
```

### 3.1 Overview Dashboard (`/dashboard`)
1. **Association Scope Bar (for Super Admin):** Quick-tap buttons allow switching between **`All Associations (Consolidated)`** or specific IAs (e.g. `NLFIA • Nangurisan`).
2. **Executive Header Action Buttons:**
   - **`Log Payment / Voucher`**: Directly opens the financial transaction modal.
   - **`Open Auditor Queue`**: Navigates straight to the internal audit and receipt verification queue.
3. **Real-Time Key KPI Metric Cards:**
   - **`Total Collections`**: Member ISF & subsidies cash inflow.
   - **`Total Disbursements`**: Canal clearing, payroll honoraria, repairs, and operational outflow.
   - **`Ending Net Cash`**: Displays net surplus balance (or deficit balance).
   - **`Pending Vouchers`**: Real-time counter of vouchers awaiting audit examination.
4. **Association Financial Summary Table (Consolidated View):**
   - Header title: **`IARMS • Association Financial Summary`**.
   - Navigation link: **`Manage IAs`** (leads to `/dashboard/associations`).
   - Displays per-IA breakdown of Collections, Disbursements, and Net Cash Flow with quick **`Filter View`** buttons.
5. **Interactive Visual Analytics:**
   - **`Monthly Cash Inflow vs. Outflow`**: 12-month comparative trend line chart.
   - **`Expense Breakdown by NIA Category`**: Pie/donut chart showing operational allocation and utilization across statutory accounts.

### 3.2 Irrigators Associations (`/dashboard/associations`) &mdash; *Super Admin Only*
1. **Header Banner & Registration Action:**
   - Click the **`Register New Association`** button in the top banner.
2. **Register New Irrigators Association Modal:**
   - Official NIA profile fields: `Official Association Name *`, `Short Code (Acronym) *`, `Former Name (if applicable)`, `Mailing / Office Address`, `IA President Full Name`, `President / Office Contact Number`, `SEC Registration Number`, `Association TIN Number`, `Total Service Area (ha)`, `Operational Area (ha)`, `Turnout Service Area Groups (TSAGs)`, and `IMT Contract Type`.
   - Action buttons: Click **`Create Association`** (or **`Save Changes`** when editing) to persist, or **`Cancel`**.
3. **Statutory Account Auto-Provisioning:** Upon association registration, the system automatically initializes the **21 Official NIA Statutory Chart of Accounts** for that new IA.
4. **Managing Existing Associations:**
   - Click **`Edit Profile`** (Pencil icon) to modify association parameters.
   - Click the **Trash icon** to open the **`Confirm Association Removal`** modal &rarr; click **`Delete Association`** or **`Cancel`**.

### 3.3 Farmer Members (`/dashboard/members`)
1. **Header Banner & Member Registration:**
   - Click the **`Register Farmer Member`** button in the top banner.
   - Click the **`RefreshCw icon`** to refresh member data.
   - For Auditor/Treasurer roles, a read-only badge indicates `Read & View Only`.
2. **Register Farmer Member Modal:**
   - **`Target Irrigators Association *`**: Select target IA (for Super Admins).
   - **`Full Name *`**: Complete legal name of the farmer member.
   - **`Farm Location / Sector`**: Turnout Service Area Group (TSAG), lateral canal location, or barangay (e.g., *Lateral B Station 0+500, Sta. Cruz*).
   - **`Farm Size (hectares)`**: Cultivated land area with precision **`+ 0.25 ha`** and **`- 0.25 ha`** quick stepper buttons.
   - **`Mobile Number`**: 11-digit Philippine mobile format (starting with `09`).
   - Action buttons: Click **`Register Member`** (or **`Save Changes`** when editing) to persist, or **`Cancel`**.
3. **Member Directory & Card Actions:**
   - Click **`Edit Member`** (Pencil icon) to update parcel size or contact info.
   - Click **`Remove Member`** (Trash icon) to open the **`Remove Farmer Member`** confirmation dialog &rarr; click **`Remove Member`** or **`Cancel`**.

### 3.4 Collections & Expenses Ledger (`/dashboard/treasurer`)
This is the double-entry bookkeeping engine for all daily cash, bank, and voucher movements.
1. **Header Banner Actions:**
   - Click **`Log Payment / Voucher`** to record financial movements.
   - Click **`Chart of Accounts`** to open budget line configurations.
   - Click **`Export CSV`** (tooltip: *Export to Excel CSV*) to export the filtered ledger to spreadsheet format.
2. **Summary Metric Cards & Fund Breakdown:**
   - Cards display `Filtered Collections`, `Filtered Disbursements`, and `Net Ledger Balance`.
   - Continuity strip tracks real-time balances: `Cash on Hand` (Vault & Petty Cash Box), `Bank (Regular Fund)` (General Operations), and `Bank (CBU Fund)` (Capital Build-Up Equity).
3. **Filter Tabs & Search:**
   - Type filter tabs: **`All Ledger Records (N)`**, **`Collections (Money IN) (N)`**, and **`Disbursements (Money OUT) (N)`**.
   - Search input: `Search by Tx #, Voucher #, Payee, Particulars...` with **`From:`** and **`To:`** date pickers and **`Clear`** filter button.
   - Click **`Refresh`** to reload transactions.
4. **Log New Financial Transaction / Voucher Modal:**
   - **Transaction Type Toggle:** Choose **`Money IN (Collection)`** or **`Money OUT (Disbursement / Expense)`**.
   - **Cash Destination / Source Selector:**
     - Select **`Cash on Hand`** (Vault / Petty Cash Box) with live `Avail: ₱...` display.
     - OR select **`Cash in Bank`** (Official IA Bank Accounts) &rarr; choose **`Regular Fund`** (Operating & Admin Expenses) or **`CBU Fund`** (Capital Build-Up Equity) with live available balance guards.
     - *Live Insufficient Balance Guard:* Disallows disbursement submission if amount exceeds the selected fund balance.
   - **`Transaction Date *`**: Date money was collected or disbursed.
   - **`Transaction Amount (PHP) *`**: Numeric peso amount.
   - **`NIA Budget Category *`**: Select statutory account (or choose `+ Add Custom Budget Category`).
   - **`Associated Farmer Members / Beneficiaries`**: Multi-select picker with real-time member search.
   - **`Official Voucher / Receipt # (Optional)`**: Collection Receipt (CR) or Disbursement Voucher (DV) number.
   - **`Payee / Payer Name`**: Farmer, contractor, or officer name.
   - **`Lateral / Turnout Section`**: Turnout service section.
   - **`Particulars / Operational Notes`**: Complete operational audit narrative.
   - **`Attach Receipt / Voucher (Optional)`**: Upload receipt photo or PDF (up to 10MB).
   - Action buttons: Click **`Save to Ledger`** (or **`Cancel`**).
5. **Ledger Table Row Actions:**
   - **Receipt Status Button:** Click the status pill (`Verified`, `Flagged`, `Rejected`, or `Review`) to open the **Voucher Preview** lightbox modal.
   - **`Delete Record`** (Trash icon): Opens the **`Confirm Transaction Deletion`** dialog &rarr; click **`Delete Transaction`** or **`Cancel`**.

### 3.5 Verification & Audit Queue (`/dashboard/auditor`)
1. **Header Banner Actions:**
   - Click **`Verify All Pending (N)`** (switches to **`Confirm — Verify All?`**) to batch-approve pending receipts.
   - Click **`Refresh Queue`** to update audit submissions.
2. **Status Filter Tabs:**
   - Filter items by **`Pending Review (N)`**, **`Verified (N)`**, **`Flagged (N)`**, **`Rejected (N)`**, or **`All Items (N)`**.
3. **Audit Examination & Lightbox Preview:**
   - Click any voucher thumbnail or link to open the full-screen **Voucher Preview** lightbox with zoom and PDF document rendering.
   - Click **`Open File Link Directly`** or **`← Back`** to return.
4. **Audit Decision Modal:**
   - Click the **`Audit Decision`** button on any pending queue card to open the **`Auditor Verification Decision`** modal.
   - Enter audit findings in **`Auditor Notes / Findings`** (textarea).
   - Action buttons:
     - Click **`Verify`** (green) to confirm compliance and approve voucher for official statement inclusion.
     - Click **`Flag`** (orange) if voucher shows discrepancies with audit notes.
     - Click **`Reject`** (red) if invalid or unauthorized.

### 3.6 Financial Statements (`/dashboard/statements`)
1. **Header Banner & Statement Compilation:**
   - Click the **`Generate FS Report`** button in the top banner.
2. **Generate Official FS Report (FS1 – FS4) Modal:**
   - Select **`Target Irrigators Association *`** (for Super Admins).
   - Configure **`Comparative Reporting Period`**:
     - Select **`Reporting Year (Current) *`** (e.g. `CY 2026`).
     - **`Comparative Prior Year *`** is automatically locked to `CY 2025 (Prior Year)`.
   - Enter **`Report Title`** (e.g. `Annual Financial Statement CY 2026`).
   - Review or modify **`Period Start Date *`** and **`Period End Date *`**.
   - Input **`Authorized Signatories`**: **`IA President`**, **`IA Treasurer`**, and **`IA Auditor`**.
   - Action buttons: Click **`Generate FS Report`** (or **`Cancel`**).
3. **Exploring the 4 Official Statements:** Use the top sub-tabs:
   - **`FS1: Receipts & Expenses`**: Comparative Statement of Cash Receipts & Disbursements.
   - **`FS2: Cash Flows`**: Statement of Financial Condition & Cash Flows.
   - **`FS3: Cash Statement`**: Statement of Cash Receipts, Disbursements & Section F Composition.
   - **`FS4: Balance Sheet`**: Statement of Net Worth & Balance Sheet.
4. **Active Statement Management (Left Panel):**
   - Displays all compiled statements under **`Active Statement`**.
   - Click **`Rename statement`** (Pencil icon) to edit statement title inline (press Enter to confirm).
   - Click **`Delete statement`** (Trash icon) to open the **`Confirm Statement Deletion`** dialog &rarr; click **`Delete Statement`** or **`Cancel`**.
5. **Mode Switcher Bar & In-Line Adjustments:**
   - **`View Only`** (Layers icon): Read-only view generated from the ledger and transactions.
   - **`Edit`** (Pencil icon): Click directly on line items to input Certified Public Accountant (CPA) adjustments. All totals, net surplus, cash balances, and equity auto-recompute in real-time across all 4 sheets.
   - Action buttons: Click **`Save Changes`** (Save icon) or **`Discard`** (X icon).
6. **Print & PDF Export:**
   - While in **`View Only`** mode, click **`Print {FS_TAB_LABEL}`** (e.g., **`Print FS1: Receipts & Expenses`**, **`Print FS2: Cash Flows`**, **`Print FS3: Cash Statement`**, or **`Print FS4: Balance Sheet`**) to generate official, borderless, audit-ready NIA printouts.

### 3.7 Chart of Accounts & Fixed Asset Registry (`/dashboard/chart-of-accounts`)
1. **View Switcher Navigation Tabs:**
   - **`Chart of Accounts (N)`** (BookOpen icon): Manage collection, disbursement, asset, and liability accounts.
   - **`Fixed Asset Registry (N)`** (Tractor icon): Manage capital machinery, irrigation pumps, buildings, and automatic depreciation.
2. **Managing Chart of Accounts:**
   - Click **`Restore Standard Accounts`** to automatically check and reinstate any missing official NIA statutory accounts.
   - Click **`Add Budget Category`** to open the **`Add New Budget Category`** modal (specify `Account Classification`, `Account Code`, `Account Name`, and `Transaction Type` &rarr; click **`Add Category`**).
   - Account Row Actions:
     - Click **`Edit`** (Pencil icon) &rarr; opens `Edit Budget Category` modal &rarr; click **`Save Changes`** or **`Cancel`**.
     - Click the **`Power / PowerOff icon`** to toggle **Active / Inactive** status (soft deactivation preserves historical transactions while hiding from daily entry forms).
     - Standard NIA accounts are strictly locked from deletion.
3. **Managing Fixed Assets & Equipment:**
   - Switch to the **`Fixed Asset Registry (N)`** tab.
   - Click **`Register Equipment / Asset`** to open the **`Register Equipment / Fixed Asset`** modal.
   - Encode fields: `Equipment / Asset Name *`, `Asset Classification *`, `Acquisition Date *`, `Acquisition Cost (₱) *`, `Estimated Salvage Value (₱)`, and choose a `Depreciation Preset *`:
     - Heavy Machinery (10 years, 10% annual rate)
     - Irrigation Pump Stations (10 years, 10% annual rate)
     - Buildings & Concrete Structures (20 years, 5% annual rate)
     - Office Equipment & Electronics (5 years, 20% annual rate)
     - Custom Annual Rate (%)
   - Click **`Save Asset`** (or **`Cancel`**). The engine dynamically transmits Net Book Value (NBV) to **FS-2 (Non-Current Assets)** and **FS-4 (Fixed Assets)**.
   - Click the **Trash icon** on any asset card to open the delete confirmation dialog &rarr; click **`Delete Asset`** or **`Cancel`**.

### 3.8 User Account Manager (`/dashboard/admin`) &mdash; *Super Admin / Admin Only*
1. **Header Banner Actions:**
   - Click **`Create Officer Account`** (UserPlus icon) to register officer credentials.
   - Click **`Print Accounts (PDF)`** (Printer icon) to print the authorized officer directory roster.
   - Click **`Purge Records`** (or **`Purge Association Records`**) to wipe transaction data when resetting fiscal environments.
2. **Role Filter Tabs:**
   - Filter directory by **`All Accounts (N)`**, **`Head Admins`**, **`Bookkeepers`**, **`Treasurers`**, or **`Auditors`**.
   - Click **`Refresh`** to reload user accounts.
3. **Register New Officer Account Modal:**
   - Encode `Full Legal Name *`, `System Username *` (automatically generated and locked to `{role}_{code}` for Treasurer, Auditor, and Bookkeeper), `Initial Password *` (with show/hide eye toggle), `Officer Role *`, `Associated Irrigators Association *`, and `Mobile / Contact Number` (11-digit Philippine format).
   - Click **`Create Account`** (or **`Cancel`**).
4. **Directory Table Actions:**
   - Inline role dropdown: Change permissions instantly (Super Admin).
   - Click **`Edit Account Details`** (Pencil icon) &rarr; opens `Edit Officer Account Details` modal &rarr; click **`Save Changes`** or **`Cancel`**.
   - Click **`Reset Password`** (Key icon button with text `Reset Password`) &rarr; opens `Reset Password for {name}` modal &rarr; enter new password &rarr; click **`Reset Password`** or **`Cancel`**.
   - Click **`Delete Account`** (Trash icon) &rarr; opens `Confirm Account Deletion` dialog &rarr; click **`Delete Account`** or **`Cancel`**.

### 3.9 My Account Settings (`/dashboard/account`)
1. **My Account & Profile Settings Header:** Displays current assigned role badge (`Super Admin`, `Head Admin`, `Bookkeeper`, `Treasurer`, `Auditor`).
2. **Personal Information Card (Official Credentials):**
   - Update `Full Name *`, `Mobile / Contact Number` (11-digit format starting with `09`), `Farm Sector / Location`, and `Farm Size (Hectares)`.
   - Click the **`Save Profile Changes`** button (Save icon).
3. **Security & Password Update Card:**
   - Enter `Current Password`, `New Password` (at least 6 characters), and `Confirm New Password` (each equipped with show/hide eye toggle buttons).
   - Click the **`Update Password`** button (Lock icon).
4. **Role Privilege Summary Card:** Details authorized administrative and fiduciary boundaries for the active account.

---

## 4. Comprehensive Automated vs. Manual Breakdown

The table below provides a complete audit of every single field across the financial statements, specifying whether it is automated or manual, and providing the statutory and operational justification.

### 4.1 Summary Table Across All Statements

| Statement | Field / Line Item | Mode | Data Origin & Formula | Why is it Manual? (Operational / Statutory Rationale) |
| :--- | :--- | :---: | :--- | :--- |
| **FS-1** | Membership Fees | **Automated** | Sum of all collections under REC-MEM | Fully automated from official membership receipts. |
| **FS-1** | Annual Dues | **Automated** | Sum of all collections under REC-DUE | Fully automated from annual dues ledger. |
| **FS-1** | O&M Subsidy (ISF + Subsidy) | **Automated** | Sum of all collections under REC-ISF and REC-SUB | Fully automated from NIA subsidy advice & dry/wet season ISF. |
| **FS-1** | Canal Remuneration Incentive | **Automated** | Sum of all collections under REC-REMU | Fully automated from NIA performance incentive releases. |
| **FS-1** | Fines & Penalties | **Automated** | Sum of all collections under REC-FIN | Fully automated from water violation penalties and bank interest. |
| **FS-1** | Other Income / Grants | **Automated** | Sum of collections under REC-DON + Custom Extra Receipts | Fully automated from LGU grants and miscellaneous donations. |
| **FS-1** | **Total Receipts** | **Automated** | Sum of all collection line items | **LOCKED.** System strictly prohibits manual overrides to prevent unbalanced books. |
| **FS-1** | Registration & Permit Fees | **Automated** | Sum of all disbursements under DISB-TAX | Fully automated from SEC, BIR, and municipal permit vouchers. |
| **FS-1** | Travel & Representation | **Automated** | Sum of all disbursements under DISB-TRAV | Fully automated from official travel vouchers. |
| **FS-1** | Meeting Expenses | **Automated** | Sum of all disbursements under DISB-MEET | Fully automated from General Assembly meal vouchers. |
| **FS-1** | Office Equipment & Supplies | **Automated** | Sum of all disbursements under DISB-SUPP | Fully automated from stationery and field supply invoices. |
| **FS-1** | Honorarium, Salaries & Wages | **Automated** | Sum of all disbursements under DISB-HON | Fully automated from monthly gatekeeper and officer payroll vouchers. |
| **FS-1** | Canal Clearing & Maintenance | **Automated** | Sum of all disbursements under DISB-CLEAR | Fully automated from canal desilting and clearing payroll. |
| **FS-1** | Emergency Canal Gate Repairs | **Automated** | Sum of all disbursements under DISB-REPAIR | Fully automated from welder and cement repair receipts. |
| **FS-1** | Professional CPA Fee | **Automated** | Sum of all disbursements under DISB-PROF | Fully automated from CPA audit retaining fee vouchers. |
| **FS-1** | Federation Contribution Share | **Automated** | Sum of all disbursements under DISB-FED | Fully automated from Baua River IA Federation remittances. |
| **FS-1** | Piso Mula sa Puso Emergency Fund | **Automated** | Sum of all disbursements under DISB-PISO | Fully automated from community welfare releases. |
| **FS-1** | Lateral / TSAG Incentive Share | **Automated** | Sum of all disbursements under DISB-LATERAL | Fully automated from turnout service group distributions. |
| **FS-1** | Other / Miscellaneous Expenses | **Automated** | Sum of disbursements under DISB-MISC + Custom Extra Lines | Fully automated from petty expenses. |
| **FS-1** | **Total Disbursements** | **Automated** | Sum of all disbursement line items | **LOCKED.** Strictly auto-computed. |
| **FS-1** | **Net Operating Surplus** | **Automated** | Total Receipts minus Total Disbursements | **LOCKED.** Pure mathematical delta. |
| **FS-1** | Fund Balance, Beginning | **Automated** | Prior Year Net Surplus (Automatic Rollover) | Fully automated from previous fiscal period closing. |
| **FS-1** | **Fund Balance, End** | **Automated** | Fund Balance Beginning plus Net Surplus Current | **LOCKED.** Cumulative operating reserve. |
| **FS-2** | Cash Flows from Operations | **Automated** | Transferred directly from FS-1 Net Surplus | Exact mirror of FS-1 operating result. |
| **FS-2** | Depreciation of Non-Current Assets | **Automated** | Sum of annual depreciation from Fixed Asset Registry | Straight-line formula computed from asset acquisition date and lifespan. |
| **FS-2** | Cash Balance, Beginning | **Automated** | Transferred directly from FS-1 Fund Balance Beginning | Exact mirror of prior year ending cash. |
| **FS-2** | Cash Balance, End | **Automated** | Cash Balance Beginning plus Net Surplus Current | Reconciles to the last centavo with the physical bank accounts. |
| **FS-2** | Current Assets (Cash & Receivables) | **Automated** | Transferred from FS-2 Cash Balance End | Represents liquid operational cash. |
| **FS-2** | Non-Current Assets (IA Office Building) | **Automated** | Net Book Value (NBV) of Office Building & Fixed Assets | Auto-pulled from asset registry (₱714,000.00 NBV for NLFIA). |
| **FS-2** | **Total Assets** | **Automated** | Current Assets plus Non-Current Assets | Combined wealth of the association. |
| **FS-2** | Current Liabilities (Accrued Wages) | **Automated** | Sum of vouchers under Current Liabilities | Auto-aggregated from unpaid operational obligations. |
| **FS-2** | Non-Current Liabilities (Loan Payable) | **Automated** | Sum of vouchers under Non-Current Liabilities | Auto-aggregated from long-term financing debts. |
| **FS-2** | Members' Equity | **Automated** | Total Assets minus Total Liabilities | Represents net members' residual stake. |
| **FS-2** | **Total Liabilities & Members' Equity**| **Automated** | Total Liabilities plus Members' Equity | **LOCKED.** Strictly equals Total Assets. |
| **FS-3** | Section A (Cash Receipts Breakdown)| **Automated** | Mirror of FS-1 Receipts Lines | 1-to-1 reflection of all validated inflow vouchers. |
| **FS-3** | Section B (Disbursements Breakdown) | **Automated** | Mirror of FS-1 Disbursements Lines | 1-to-1 reflection of all validated outflow vouchers. |
| **FS-3** | Section C (Cash Balance This Year) | **Automated** | Current Year Receipts minus Current Year Disbursements | Net change in cash for the reporting period. |
| **FS-3** | Section D (Fund Balance Last Report)| **Automated** | Rolled over from prior year closing | Verified unspent cash brought forward. |
| **FS-3** | Section E (Total Cash Balance) | **Automated** | Section C plus Section D | Reconciled total liquid funds. |
| **FS-3** | Sec. F: Cash on Hand (Petty/Vault) | **Automated** | Cumulative inflows minus outflows tagged cash_on_hand | Auto-tracked physical vault cash. |
| **FS-3** | Sec. F: Cash in Bank - Regular | **Automated** | Cumulative inflows minus outflows tagged bank_regular | Auto-tracked Land Bank of the Philippines operational checking account. |
| **FS-3** | Sec. F: Cash in Bank - CBU | **Automated** | Cumulative inflows minus outflows tagged bank_cbu | Auto-tracked restricted Capital Build-Up bank savings account. |
| **FS-3** | **Sec. F: Total Cash Composition** | **Automated** | Cash on Hand + Bank Regular + Bank CBU | **Must exactly equal Section E.** |
| **FS-4** | Cash on Hand & in Bank | **Automated** | Transferred directly from FS-3 Section F | Liquid assets transferred to the Balance Sheet. |
| **FS-4** | Non-Current Assets (Fixed Assets NBV) | **Automated** | Transferred directly from Fixed Asset Registry | Net book value of IA office building, pump stations, and tools. |
| **FS-4** | Current & Long-Term Liabilities | **Automated** | Sum of Current & Non-Current Liabilities from Ledger | Total debt obligations owed to third parties. |
| **FS-4** | **Net Worth** | **Automated** | Total Assets minus Total Liabilities | True legal net worth of the association. |
| **FS-4** | Treasurer Certification Block | **Automated** | Pulled from Association Profile (Name, TIN) | Verified officer credentials. |
| **FS-4** | **Community Tax Certificate (CTC) #** | **MANUAL** | User typed in modal during notary filing | **LEGAL REQUIREMENT:** Philippine Notarial Law (A.M. No. 02-8-13-SC) requires the physical Community Tax Certificate (Cedula) or Government Passport/Driver's License presented in person before the Notary Public. Software cannot fabricate legal identity documents. |
| **FS-4** | **CTC Date & Place of Issue** | **MANUAL** | User typed in modal during notary filing | **LEGAL REQUIREMENT:** Must reflect the physical municipality where the Treasurer paid their annual local community tax. |
| **FS-1..4**| **Auditor Discretionary Overrides** | **MANUAL** | Inline click-to-edit pencil tool (Auditor only) | **ACCOUNTING STANDARDS (PFRS for SMEs):** Certified Public Accountants (CPAs) require audit adjustment journal entries (e.g., physical inventory shrinkage write-down, unbilled legal accruals) discovered after the ledger has been closed for the year. |

---

## 5. Concrete Mathematical Proof & Computation Engine
### Case Study: Nangurisan Laya Farmers Irrigators Association, Inc. (NLFIA)

To prove that the generated Financial Statements are 100% interconnected with the underlying database transactions, this section walks through the complete mathematical derivation using the live NLFIA dataset.

### 5.1 Association Profile
- **Association Name:** Nangurisan Laya Farmers Irrigators Association, Inc.
- **Office Address:** Sta. Cruz, Gonzaga, Cagayan
- **Irrigation System:** Baua River Irrigation System
- **SEC Registration:** CN202060557 | **TIN:** 769-207-601-000
- **President:** Meynard A. Tomaneng | **Treasurer:** Ric Unday | **Auditor:** Artur Guiang
- **Total Beneficiaries:** 75 Farmers | **Service Area:** 88.41 Hectares

---

### 5.2 The Underlying Transactions (29 Ledger Vouchers)

#### Phase I: Prior Year (2025) Ledger Transactions
The 2025 transactions establish the historical baseline and calculate the **Beginning Cash Balance** and **Fund Balance Last Report** for 2026.

| Voucher # | Date | Category & Code | Type | Payment Fund | Particulars | Amount (₱) |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| `CR-2025-001` | 2025-03-10 | `REC-MEM` (Membership) | Collection | `cash_on_hand` | 2025 Annual Membership Fees | ₱24,000.00 |
| `CR-2025-002` | 2025-05-15 | `REC-ISF` (ISF Dry Season) | Collection | `cash_on_hand` | Irrigation Service Fee Dry Season | ₱195,000.00 |
| `CR-2025-003` | 2025-06-20 | `REC-SUB` (NIA Subsidy) | Collection | `bank_regular` | NIA Canal O&M Subsidy Release | ₱140,000.00 |
| `CR-2025-004` | 2025-09-12 | `REC-FIN` (Fines & Interest) | Collection | `bank_regular` | Surcharges & Bank Interest | ₱6,000.00 |
| `CR-2025-005` | 2025-11-28 | `REC-DON` (LGU Grant) | Collection | `bank_regular` | Municipal Fuel Assistance Grant | ₱25,000.00 |
| `DV-2025-001` | 2025-04-18 | `DISB-CLEAR` (Canal Maint.) | Disbursement | `cash_on_hand` | Lateral Canal Desilting Labor | ₱85,000.00 |
| `DV-2025-002` | 2025-07-22 | `DISB-HON` (Wages) | Disbursement | `cash_on_hand` | 2025 Officers & Tender Honorarium | ₱50,000.00 |
| `DV-2025-003` | 2025-08-14 | `DISB-SUPP` (Supplies) | Disbursement | `cash_on_hand` | Office Stationery & Materials | ₱12,000.00 |
| `DV-2025-004` | 2025-10-10 | `DISB-REPAIR` (Repairs) | Disbursement | `bank_regular` | Station B Steel Gate Repair | ₱28,000.00 |
| `DV-2025-005` | 2025-12-05 | `DISB-TAX` (Taxes & Permits) | Disbursement | `bank_regular` | SEC & Municipal Registration | ₱15,000.00 |

- **2025 Total Collections:** ₱24,000 + ₱195,000 + ₱140,000 + ₱6,000 + ₱25,000 = **₱390,000.00**
- **2025 Total Disbursements:** ₱85,000 + ₱50,000 + ₱12,000 + ₱28,000 + ₱15,000 = **₱190,000.00**
- **2025 Net Operating Surplus:** ₱390,000.00 - ₱190,000.00 = **₱200,000.00**

> [!IMPORTANT]
> This ₱200,000.00 net operating surplus automatically rolls over into 2026 as:
> 1. **FS-1:** Beginning Fund Balance = ₱200,000.00
> 2. **FS-2:** Beginning Cash Balance = ₱200,000.00
> 3. **FS-3:** Fund Balance Last Report = ₱200,000.00

---

#### Phase II: Current Year (2026) Ledger Transactions

| Voucher # | Date | Category & Code | Type | Fund Source | Particulars | Amount (₱) |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| `CR-2026-001` | 2026-01-15 | `REC-MEM` | Collection | `cash_on_hand` | 2026 Annual Membership Renewals | ₱18,000.00 |
| `CR-2026-002` | 2026-02-10 | `REC-CBU` | Collection | `bank_cbu` | Member Capital Build-Up (CBU) | ₱45,000.00 |
| `CR-2026-003` | 2026-02-28 | `REC-ISF` | Collection | `cash_on_hand` | Dry Season ISF Collections | ₱185,000.00 |
| `CR-2026-004` | 2026-03-05 | `REC-SUB` | Collection | `bank_regular` | NIA O&M Canal Subsidy (1st Tranche)| ₱95,000.00 |
| `CR-2026-005` | 2026-03-12 | `REC-FIN` | Collection | `cash_on_hand` | Water Scheduling Fines & Penalties | ₱7,500.00 |
| `CR-2026-006` | 2026-03-18 | `REC-DON` | Collection | `bank_regular` | LGU Gonzaga Canal Grant | ₱30,000.00 |
| **Subtotal** | | **2026 Collections** | | | | **₱380,500.00** |
| `DV-2026-001` | 2026-01-20 | `DISB-CLEAR`| Disbursement | `cash_on_hand` | Lateral Canal Clearing Labor | ₱42,000.00 |
| `DV-2026-002` | 2026-02-05 | `DISB-HON` | Disbursement | `cash_on_hand` | Gatekeepers & Officers Honorarium | ₱38,000.00 |
| `DV-2026-003` | 2026-02-14 | `DISB-SUPP` | Disbursement | `cash_on_hand` | Office Supplies & Field Tools | ₱9,500.00 |
| `DV-2026-004` | 2026-02-22 | `DISB-TRAV` | Disbursement | `cash_on_hand` | General Assembly Travel & Meals | ₱14,000.00 |
| `DV-2026-005` | 2026-03-02 | `DISB-REPAIR`| Disbursement | `bank_regular` | Main Canal Gate Repair & Welding | ₱32,000.00 |
| `DV-2026-006` | 2026-03-08 | `DISB-TAX` | Disbursement | `bank_regular` | LGU Permits & SEC Compliance | ₱8,500.00 |
| `DV-2026-007` | 2026-03-15 | `DISB-LATERAL`| Disbursement| `bank_regular` | Turnout Service Group Incentive | ₱25,000.00 |
| `DV-2026-008` | 2026-03-19 | `DISB-PROF` | Disbursement | `bank_regular` | Certified Public Accountant Fee | ₱18,000.00 |
| `DV-2026-009` | 2026-03-22 | `DISB-FED` | Disbursement | `bank_regular` | Baua River IA Federation Share | ₱20,000.00 |
| `DV-2026-010` | 2026-03-25 | `DISB-PISO` | Disbursement | `cash_on_hand` | Piso Mula sa Puso Emergency Fund | ₱3,000.00 |
| `DV-2026-011` | 2026-03-28 | `DISB-MISC` | Disbursement | `cash_on_hand` | Bank Fees & Communication | ₱3,000.00 |
| `DV-2026-012` | 2026-03-29 | `LIAB-CUR-WAGES`| Disbursement | `cash_on_hand` | Accrued Wages Liability Obligation | ₱16,500.00 |
| `DV-2026-013` | 2026-03-30 | `LIAB-NONCUR-LOAN`| Disbursement| `bank_regular` | Long-Term Facility Loan Amortization | ₱15,500.00 |
| **Subtotal** | | **2026 Disbursements** | | | | **₱245,000.00** |

- **2026 Net Operating Surplus:** ₱380,500.00 - ₱245,000.00 = **₱135,500.00**

---

### 5.3 Step-by-Step Report Connection & Proof

#### Step 1: FS-1 (Comparative Statement of Cash Receipts & Disbursements)
- **Current Year Total Receipts:** **₱380,500.00** (Prior Year: ₱390,000.00)
- **Current Year Total Disbursements:** **₱245,000.00** (Prior Year: ₱190,000.00)
- **Net Operating Surplus:** ₱380,500.00 - ₱245,000.00 = **₱135,500.00**
- **Members' Equity Roll-Forward:**
  - Beginning Fund Balance (from 2025 Net): **₱200,000.00**
  - Add Net Savings for the Year (2026): **₱135,500.00**
  - **Ending Fund Balance (December 31, 2026):** ₱200,000.00 + ₱135,500.00 = **₱335,500.00**

#### Step 2: FS-3 (Cash Statement & Bank Reconciliation)
- **Section C (Cash Balance This Year):** ₱380,500.00 - ₱245,000.00 = **₱135,500.00**
- **Section D (Add: Fund Balance Last Report):** **₱200,000.00**
- **Section E (Total Cash Balance):** ₱135,500.00 + ₱200,000.00 = **₱335,500.00**

**Section F: Multi-Fund Cash Breakdown (from Daily Vouchers):**
- **Cash on Hand (Physical Office Vault):**
  - Inflows received in cash: ₱234,500.00
  - Less cash disbursements: -₱83,500.00
  - **Ending Cash on Hand = ₱151,000.00**
- **Cash in Bank - Regular Operations (Land Bank Checking Account):**
  - Inflows deposited in bank: ₱296,000.00
  - Less checks and bank transfers: -₱156,500.00
  - **Ending Regular Bank Balance = ₱139,500.00**
- **Cash in Bank - Capital Build-Up (Restricted CBU Savings Account):**
  - Member equity deposits: ₱45,000.00
  - Less withdrawals: -₱0.00
  - **Ending CBU Bank Balance = ₱45,000.00**
- **Total Section F Cash Composition:**
  - ₱151,000.00 + ₱139,500.00 + ₱45,000.00 = **₱335,500.00**
  - **Reconciliation:** Section E (₱335,500.00) and Section F (₱335,500.00) match 100%!

#### Step 3: FS-2 (Statement of Financial Condition) & FS-4 (Balance Sheet)
- **Current Assets:** Cash in Banks & on Hand = **₱335,500.00**
- **Non-Current Assets:**
  - IA OFFICE BUILDING (Acquisition Cost ₱850,000 - Accumulated Depreciation ₱136,000) = **₱714,000.00**
  - **Total Assets:** ₱335,500.00 + ₱714,000.00 = **₱1,049,500.00**

- **Liabilities:**
  - Current Liabilities (Accrued Wages / Payables) = **₱16,500.00**
  - Non-Current Liabilities (Long-Term Facility Loan) = **₱35,000.00**
  - **Total Liabilities:** ₱16,500.00 + ₱35,000.00 = **₱51,500.00**

- **Net Worth Calculation:**
  - Total Assets (₱1,049,500.00) minus Total Liabilities (₱51,500.00) = **₱998,000.00**

- **Balance Sheet Equilibrium Proof:**
  - Total Liabilities (₱51,500.00) + Members' Equity (₱998,000.00) = **₱1,049,500.00**
  - **Verification:** Total Assets (₱1,049,500.00) exactly equals Total Liabilities & Equity (₱1,049,500.00) — 100% Balanced!

---

## 6. Audit & Reconciliation Troubleshooting Guide

### 6.1 What happens if a Chart of Account is edited or renamed after transactions are logged?
The system utilizes a relational foreign-key database architecture (`category_id` &rarr; `budget_categories.id`).
- Renaming an account (e.g., from *Canal Desilting* to *Canal Desilting & Trimming*) updates the account label retroactively across all reports without losing transaction integrity.
- In FS-1, standard lines remain bound to their official statutory positions, while the descriptive display label updates.

### 6.2 What happens if an account is accidentally deleted?
1. **Statutory Account Protection:** The system's API rejects deletion requests for the 21 standard NIA accounts.
2. **Ledger Integrity Constraint:** If an account contains existing transactions, deletion is blocked by foreign key constraints. The system prompts the user to **Deactivate** the account instead.
3. **One-Click Restore:** If a custom category is wiped or an association was initialized with an empty chart, administrators can click **Restore Standard Accounts** on the Chart of Accounts page to automatically reinstate all 21 NIA statutory accounts.

### 6.3 Multi-Association Tenant Scoping
Each association possesses an isolated namespace (`association_id`). Transactions, members, land parcels, fixed assets, and financial reports from NLFIA can never cross-pollinate with another Irrigators Association.

---

## 7. Official Document Sign-Off & Notarization Workflow

When an annual statement is ready for submission to NIA, SEC, and BIR:
1. **Compilation:** The Bookkeeper clicks the **`Generate FS Report`** button &rarr; configures **Comparative Reporting Period** (e.g. CY 2026 vs CY 2025) &rarr; reviews authorized signatories &rarr; clicks **`Generate FS Report`**.
2. **Review & Audit Adjustments:** The Auditor inspects the statements. If an off-ledger CPA adjustment is needed, the Auditor switches the mode toggle from **`View Only`** to **`Edit`**, inputs the certified override directly on the line item, and clicks **`Save Changes`** (or **`Discard`**). All dependent sheets auto-recompute immediately.
3. **Fiduciary Certification:** The Treasurer reviews Section F (Cash Composition) against physical Land Bank passbooks and signs the certification block.
4. **Notary Acknowledgment:** The Treasurer enters the Community Tax Certificate (CTC / Cedula) Number, Date of Issue, and Place of Issue in the FS-4 Notary Block.
5. **Print & PDF Export:** While in **`View Only`** mode, click **`Print FS1: Receipts & Expenses`** (or **`Print FS2: Cash Flows`**, **`Print FS3: Cash Statement`**, **`Print FS4: Balance Sheet`**) to generate the crisp, borderless, audit-ready physical document package.

