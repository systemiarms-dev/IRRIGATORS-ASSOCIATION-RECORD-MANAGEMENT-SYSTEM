import { BudgetCategory, AccountClassification } from '@/types';

export interface StandardAccountTemplate {
  slug: string;
  name: string;
  category_type: 'collection' | 'disbursement';
  account_classification: AccountClassification;
  allocated_amount: number;
  description: string;
}

export const STANDARD_NIA_ACCOUNT_TEMPLATES: StandardAccountTemplate[] = [
  // --- Current Assets ---
  {
    slug: 'AST-CUR-REC-ISF',
    name: 'Receivables from Members (ISF Dues)',
    category_type: 'collection',
    account_classification: 'current_asset',
    allocated_amount: 120000,
    description: '[class:current_asset] Short-term outstanding irrigation fee receivables from members',
  },
  {
    slug: 'AST-CUR-ADV-OPS',
    name: 'Operating Advances & Petty Cash Fund',
    category_type: 'collection',
    account_classification: 'current_asset',
    allocated_amount: 30000,
    description: '[class:current_asset] Revolving petty cash advances for emergency gate and field operations',
  },

  // --- Current Liabilities ---
  {
    slug: 'LIAB-CUR-WAGES',
    name: 'Accrued Honorarium & Gatekeeper Wages Payable',
    category_type: 'disbursement',
    account_classification: 'current_liability',
    allocated_amount: 45000,
    description: '[class:current_liability] Accrued but unreleased monthly wages and honorarium for canal tenders',
  },
  {
    slug: 'LIAB-CUR-SUPPLIERS',
    name: 'Accounts Payable - Hardware & Fuel Suppliers',
    category_type: 'disbursement',
    account_classification: 'current_liability',
    allocated_amount: 25000,
    description: '[class:current_liability] Outstanding short-term credit balances with local diesel and hardware suppliers',
  },

  // --- Non-Current Liabilities ---
  {
    slug: 'LIAB-NONCUR-LOAN',
    name: 'Long-Term Facility & Equipment Loan Payable',
    category_type: 'disbursement',
    account_classification: 'non_current_liability',
    allocated_amount: 150000,
    description: '[class:non_current_liability] Long-term subsidized agricultural financing for communal irrigation assets',
  },

  // --- Collections (Income / Money IN) ---
  {
    slug: 'REC-ISF',
    name: 'Irrigation Service Fee (ISF) Collections',
    category_type: 'collection',
    account_classification: 'collection',
    allocated_amount: 250000,
    description: '[class:collection] Seasonal wet & dry irrigation service fees collected from farmer beneficiaries',
  },
  {
    slug: 'REC-MEM',
    name: 'Membership Fees & Annual Dues',
    category_type: 'collection',
    account_classification: 'collection',
    allocated_amount: 60000,
    description: '[class:collection] Official IA member onboarding fees and annual solidarity dues',
  },
  {
    slug: 'REC-SUB',
    name: 'O&M Subsidy & Canal Remuneration (NIA)',
    category_type: 'collection',
    account_classification: 'collection',
    allocated_amount: 180000,
    description: '[class:collection] National Irrigation Administration Operations & Maintenance management subsidy',
  },
  {
    slug: 'REC-CBU',
    name: 'Capital Build-Up (CBU) Equity Contributions',
    category_type: 'collection',
    account_classification: 'collection',
    allocated_amount: 100000,
    description: '[class:collection] Long-term capital equity contributions paid by farmer members for association ownership',
  },
  {
    slug: 'REC-FIN',
    name: 'Fines, Penalties & Bank Interest',
    category_type: 'collection',
    account_classification: 'collection',
    allocated_amount: 20000,
    description: '[class:collection] Late fee surcharges, water distribution violation fines, and bank interest',
  },
  {
    slug: 'REC-DON',
    name: 'Donations, Grants & LGU Financial Assistance',
    category_type: 'collection',
    account_classification: 'collection',
    allocated_amount: 50000,
    description: '[class:collection] Local Government Unit (LGU) and NGO agricultural equipment grants and donations',
  },

  // --- Disbursements (Expenses / Money OUT) ---
  {
    slug: 'DISB-CLEAR',
    name: 'Canal Clearing, Desilting & Vegetation Maintenance',
    category_type: 'disbursement',
    account_classification: 'disbursement',
    allocated_amount: 110000,
    description: '[class:disbursement] Labor and heavy equipment rentals for desilting lateral and main irrigation canals',
  },
  {
    slug: 'DISB-SUPP',
    name: 'Office, Station & Field Supplies',
    category_type: 'disbursement',
    account_classification: 'disbursement',
    allocated_amount: 35000,
    description: '[class:disbursement] Accounting stationery, official receipt booklets, measuring tapes, and field tools',
  },
  {
    slug: 'DISB-HON',
    name: 'Officers Honorarium & Personnel Allowances',
    category_type: 'disbursement',
    account_classification: 'disbursement',
    allocated_amount: 80000,
    description: '[class:disbursement] Monthly operational allowances for President, Treasurer, Bookkeeper, and Auditors',
  },
  {
    slug: 'DISB-TRAV',
    name: 'Travel, Meeting & General Assembly Expenses',
    category_type: 'disbursement',
    account_classification: 'disbursement',
    allocated_amount: 30000,
    description: '[class:disbursement] Representation travel to NIA division offices and general farmer assembly meals',
  },
  {
    slug: 'DISB-TAX',
    name: 'Registration, Legal Permits & LGU Taxes',
    category_type: 'disbursement',
    account_classification: 'disbursement',
    allocated_amount: 18000,
    description: '[class:disbursement] SEC annual reportorial compliance, BIR stamp taxes, and municipal permits',
  },
  {
    slug: 'DISB-LATERAL',
    name: 'Lateral & TSAG Share Incentive Distribution',
    category_type: 'disbursement',
    account_classification: 'disbursement',
    allocated_amount: 45000,
    description: '[class:disbursement] Performance-based collection incentives returned to turn-out service area groups',
  },
  {
    slug: 'DISB-REPAIR',
    name: 'Emergency Canal Gate Repairs & Water Control',
    category_type: 'disbursement',
    account_classification: 'disbursement',
    allocated_amount: 70000,
    description: '[class:disbursement] Steel gate welding, turnout replacement, cement seals, and water control repairs',
  },
  {
    slug: 'DISB-PROF',
    name: 'Professional Auditing & Accounting Fees',
    category_type: 'disbursement',
    account_classification: 'disbursement',
    allocated_amount: 35000,
    description: '[class:disbursement] Certified Public Accountant fees for annual financial statement certification',
  },
  {
    slug: 'DISB-FED',
    name: 'Baua River IA Federation Contribution Share',
    category_type: 'disbursement',
    account_classification: 'disbursement',
    allocated_amount: 40000,
    description: '[class:disbursement] Remittance to Baua River Federation of Irrigators Associations',
  },
  {
    slug: 'DISB-PISO',
    name: 'Piso Mula sa Puso Community Emergency Fund',
    category_type: 'disbursement',
    account_classification: 'disbursement',
    allocated_amount: 20000,
    description: '[class:disbursement] Mutual aid community assistance for member calamity and health emergencies',
  },
];

/**
 * Returns true if a code is one of the standard statutory NIA accounts.
 */
export function isStandardNiaAccount(code: string): boolean {
  if (!code) return false;
  const upper = code.toUpperCase();
  return STANDARD_NIA_ACCOUNT_TEMPLATES.some((t) => upper === t.slug || upper.endsWith(`-${t.slug}`));
}

/**
 * Seed missing standard NIA accounts for an Irrigators Association.
 * Preserves any existing accounts and transactions.
 */
export async function seedStandardCategoriesForAssociation(
  associationId: string,
  associationCode: string
): Promise<{ added: number; existing: number; total: number }> {
  const { localDb } = await import('@/lib/db/localDb');
  const cleanCode = (associationCode || 'IA').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const existingCategories = await localDb.getBudgetCategories(associationId);

  let addedCount = 0;
  for (const tpl of STANDARD_NIA_ACCOUNT_TEMPLATES) {
    const fullCode = `${cleanCode}-${tpl.slug}`;
    const alreadyExists = existingCategories.some(
      (c) =>
        c.code.toUpperCase() === fullCode ||
        c.code.toUpperCase().endsWith(`-${tpl.slug}`) ||
        c.name.toLowerCase() === tpl.name.toLowerCase()
    );
    if (!alreadyExists) {
      const catId = `cat-${cleanCode.toLowerCase()}-${tpl.slug.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
      const newCategory: BudgetCategory = {
        id: catId,
        code: fullCode,
        name: tpl.name,
        category_type: tpl.category_type,
        account_classification: tpl.account_classification,
        allocated_amount: tpl.allocated_amount,
        description: tpl.description,
        association_id: associationId,
        is_active: true,
      };
      await localDb.createBudgetCategory(newCategory);
      addedCount++;
    }
  }

  return {
    added: addedCount,
    existing: STANDARD_NIA_ACCOUNT_TEMPLATES.length - addedCount,
    total: STANDARD_NIA_ACCOUNT_TEMPLATES.length,
  };
}
