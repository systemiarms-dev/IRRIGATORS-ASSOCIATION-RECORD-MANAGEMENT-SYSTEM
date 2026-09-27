import { FundSource, PaymentMethod, Transaction } from '@/types';

export const FUND_SOURCE_OPTIONS: Array<{
  id: FundSource;
  label: string;
  shortLabel: string;
  description: string;
  icon: string;
}> = [
  {
    id: 'cash_on_hand',
    label: 'Cash on Hand (Vault / Petty Cash)',
    shortLabel: 'Cash on Hand',
    description: 'Physical cash held by the IA Treasurer / Petty Cash box',
    icon: '💵',
  },
  {
    id: 'bank_regular',
    label: 'Cash in Bank - Regular Fund (Operating Account)',
    shortLabel: 'Bank (Regular)',
    description: 'General operating bank account for day-to-day IA collections & expenses',
    icon: '🏦',
  },
  {
    id: 'bank_cbu',
    label: 'Cash in Bank - CBU Fund (Capital Build-Up)',
    shortLabel: 'Bank (CBU)',
    description: 'Dedicated Capital Build-Up / Member Equity bank deposit account',
    icon: '🌾',
  },
];

export function getFundLabel(fund: FundSource | string | undefined): string {
  if (fund === 'bank_regular') return 'Cash in Bank (Regular Fund)';
  if (fund === 'bank_cbu') return 'Cash in Bank (CBU Account)';
  return 'Cash on Hand (Vault / Petty Cash)';
}

export function getFundShortLabel(fund: FundSource | string | undefined): string {
  if (fund === 'bank_regular') return 'Bank Regular';
  if (fund === 'bank_cbu') return 'Bank CBU';
  return 'Cash on Hand';
}

/**
 * Robust fund source resolver for transactions.
 * Resolves fund across dedicated field, payment_method, particulars, or notes.
 */
export function determineFundSource(tx: {
  payment_method?: PaymentMethod | string;
  fund_source?: FundSource;
  notes?: string | null;
  particulars?: string | null;
}): FundSource {
  if (tx.fund_source) return tx.fund_source;

  if (tx.payment_method === 'bank_cbu') return 'bank_cbu';
  if (tx.payment_method === 'bank_regular') return 'bank_regular';
  if (tx.payment_method === 'cash_on_hand') return 'cash_on_hand';

  const combined = `${tx.notes || ''} ${tx.particulars || ''}`.toLowerCase();
  if (combined.includes('[fund:bank_cbu]') || combined.includes('cbu fund') || combined.includes('cbu account')) {
    return 'bank_cbu';
  }
  if (
    combined.includes('[fund:bank_regular]') ||
    tx.payment_method === 'bank_transfer' ||
    tx.payment_method === 'check'
  ) {
    return 'bank_regular';
  }
  if (combined.includes('[fund:cash_on_hand]')) {
    return 'cash_on_hand';
  }

  return 'cash_on_hand';
}

export interface FundBalances {
  cashOnHand: number;
  bankRegular: number;
  bankCBU: number;
  total: number;
}

/**
 * Calculates current available cash balances per fund source from transaction ledger.
 */
export function calculateFundBalances(
  transactions: Array<{
    type: 'collection' | 'disbursement';
    amount: number;
    payment_method?: PaymentMethod | string;
    fund_source?: FundSource;
    notes?: string | null;
    particulars?: string | null;
  }>
): FundBalances {
  let cashOnHand = 0;
  let bankRegular = 0;
  let bankCBU = 0;

  for (const tx of transactions) {
    const amt = Number(tx.amount || 0);
    const fund = determineFundSource(tx);
    const delta = tx.type === 'collection' ? amt : -amt;

    if (fund === 'bank_cbu') {
      bankCBU += delta;
    } else if (fund === 'bank_regular') {
      bankRegular += delta;
    } else {
      cashOnHand += delta;
    }
  }

  return {
    cashOnHand,
    bankRegular,
    bankCBU,
    total: cashOnHand + bankRegular + bankCBU,
  };
}
