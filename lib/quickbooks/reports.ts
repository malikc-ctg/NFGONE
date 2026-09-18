import { qboFetch } from './client';

export interface ProfitAndLossData {
  income: number;
  expenses: number;
  netIncome: number;
}

export interface BankAccountItem {
  name: string;
  type: string;
  balance: number;
}

export interface AgedReceivableRow {
  customerName: string;
  invoiceNumber: string;
  amount: number;
  openBalance: number;
  dueDate: string;
  daysOverdue: number;
  status: string;
}

export interface AgedReceivablesData {
  rows: AgedReceivableRow[];
  totalOverdue: number;
}

export interface TaxSummaryData {
  taxCollected: number;
  taxPaid: number;
  netTaxOwed: number;
}

export interface QboInvoiceItem {
  id: string;
  docNumber: string;
  customerName: string;
  txnDate: string;
  dueDate: string;
  totalAmt: number;
  balance: number;
  status: 'paid' | 'overdue' | 'unpaid';
}

function parseNumber(val: any): number {
  if (val === null || val === undefined) return 0;
  const num = parseFloat(String(val).replace(/[^0-9.-]+/g, ''));
  return isNaN(num) ? 0 : num;
}

function findRowByGroup(rows: any[], groupName: string): any {
  if (!rows || !Array.isArray(rows)) return null;
  for (const row of rows) {
    if (row.group === groupName) return row;
    if (row.Rows && row.Rows.Row) {
      const found = findRowByGroup(row.Rows.Row, groupName);
      if (found) return found;
    }
  }
  return null;
}

export async function getProfitAndLoss(startDate?: string, endDate?: string): Promise<ProfitAndLossData> {
  const queryParams = new URLSearchParams();
  if (startDate) queryParams.set('start_date', startDate);
  if (endDate) queryParams.set('end_date', endDate);
  const endpoint = `/reports/ProfitAndLoss${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

  const { data, error } = await qboFetch<any>(endpoint);
  if (error || !data) {
    console.error('[QuickBooks] Error fetching P&L report:', error);
    return { income: 0, expenses: 0, netIncome: 0 };
  }

  const rows = data.Rows?.Row || [];

  const incomeRow = findRowByGroup(rows, 'Income');
  const expenseRow = findRowByGroup(rows, 'Expenses');
  const netIncomeRow = rows[rows.length - 1];

  const income = incomeRow?.Summary?.ColData?.[1]?.value ? parseNumber(incomeRow.Summary.ColData[1].value) : 0;
  const expenses = expenseRow?.Summary?.ColData?.[1]?.value ? parseNumber(expenseRow.Summary.ColData[1].value) : 0;
  const netIncome = netIncomeRow?.Summary?.ColData?.[1]?.value
    ? parseNumber(netIncomeRow.Summary.ColData[1].value)
    : income - expenses;

  return { income, expenses, netIncome };
}

export async function getAccountBalances(): Promise<BankAccountItem[]> {
  const query = "select * from Account where AccountType in ('Bank', 'Credit Card')";
  const { data, error } = await qboFetch<any>(`/query?query=${encodeURIComponent(query)}`);

  if (error || !data) {
    console.error('[QuickBooks] Error fetching accounts:', error);
    return [];
  }

  const rawAccounts = data.QueryResponse?.Account || [];
  return rawAccounts.map((a: any) => ({
    name: a.Name || 'Account',
    type: a.AccountType || 'Bank',
    balance: parseNumber(a.CurrentBalance),
  }));
}

export async function getAgedReceivables(): Promise<AgedReceivablesData> {
  const { data, error } = await qboFetch<any>('/reports/AgedReceivableDetail');
  if (error || !data) {
    console.error('[QuickBooks] Error fetching Aged Receivables:', error);
    return { rows: [], totalOverdue: 0 };
  }

  const rows: AgedReceivableRow[] = [];
  let totalOverdue = 0;
  const sections = data.Rows?.Row || [];
  const today = new Date();

  for (const section of sections) {
    const sectionTitle = section.Header?.ColData?.[0]?.value || '';
    const sectionRows = section.Rows?.Row || [];

    for (const item of sectionRows) {
      if (item.type === 'Data' && Array.isArray(item.ColData)) {
        const dateStr = item.ColData[0]?.value || '';
        const invoiceNum = item.ColData[2]?.value || '—';
        const customerName = item.ColData[3]?.value || 'Unknown Customer';
        const dueDate = item.ColData[4]?.value || dateStr;
        const amount = parseNumber(item.ColData[5]?.value);
        const openBalance = parseNumber(item.ColData[6]?.value);

        let daysOverdue = 0;
        if (dueDate) {
          const due = new Date(dueDate);
          const diffMs = today.getTime() - due.getTime();
          daysOverdue = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
        }

        const isPastDue = sectionTitle.toLowerCase().includes('past due') || daysOverdue > 0;
        if (isPastDue) {
          totalOverdue += openBalance;
        }

        rows.push({
          customerName,
          invoiceNumber: invoiceNum,
          amount,
          openBalance,
          dueDate,
          daysOverdue,
          status: isPastDue ? 'Overdue' : 'Current',
        });
      }
    }
  }

  return { rows, totalOverdue };
}

export async function getRecentInvoices(limit = 20): Promise<QboInvoiceItem[]> {
  const query = `select * from Invoice order by TxnDate desc maxresults ${limit}`;
  const { data, error } = await qboFetch<any>(`/query?query=${encodeURIComponent(query)}`);

  if (error || !data) {
    console.error('[QuickBooks] Error fetching recent invoices:', error);
    return [];
  }

  const invoices = data.QueryResponse?.Invoice || [];
  const today = new Date().toISOString().split('T')[0];

  return invoices.map((inv: any) => {
    const totalAmt = parseNumber(inv.TotalAmt);
    const balance = parseNumber(inv.Balance);
    const dueDate = inv.DueDate || inv.TxnDate || '';
    let status: 'paid' | 'overdue' | 'unpaid' = 'unpaid';

    if (balance <= 0 && totalAmt > 0) {
      status = 'paid';
    } else if (dueDate && dueDate < today) {
      status = 'overdue';
    }

    return {
      id: inv.Id,
      docNumber: inv.DocNumber || `#${inv.Id}`,
      customerName: inv.CustomerRef?.name || 'Customer',
      txnDate: inv.TxnDate || '',
      dueDate,
      totalAmt,
      balance,
      status,
    };
  });
}

export async function getTaxSummary(startDate?: string, endDate?: string): Promise<TaxSummaryData> {
  try {
    // Calculate accurate tax directly from Invoice records in QuickBooks
    const invQuery = 'select * from Invoice maxresults 100';
    const { data: invData } = await qboFetch<any>(`/query?query=${encodeURIComponent(invQuery)}`);
    const invoices = invData?.QueryResponse?.Invoice || [];

    let taxCollected = 0;
    for (const inv of invoices) {
      taxCollected += parseNumber(inv.TxnTaxDetail?.TotalTax);
    }

    // Purchases / ITCs
    const purchQuery = 'select * from Purchase maxresults 100';
    const { data: purchData } = await qboFetch<any>(`/query?query=${encodeURIComponent(purchQuery)}`);
    const purchases = purchData?.QueryResponse?.Purchase || [];

    let taxPaid = 0;
    for (const p of purchases) {
      taxPaid += parseNumber(p.TxnTaxDetail?.TotalTax);
    }

    return {
      taxCollected,
      taxPaid,
      netTaxOwed: Math.max(0, taxCollected - taxPaid),
    };
  } catch {
    return { taxCollected: 0, taxPaid: 0, netTaxOwed: 0 };
  }
}

export async function getCustomerBalance(customerId: string): Promise<{ balance: number; lifetimeSpend: number }> {
  try {
    const custRes = await qboFetch<any>(`/query?query=select * from Customer where Id = '${customerId}'`);
    const balance = parseNumber(custRes.data?.QueryResponse?.Customer?.[0]?.Balance);

    const invRes = await qboFetch<any>(`/query?query=select * from Invoice where CustomerRef = '${customerId}'`);
    const invoices = invRes.data?.QueryResponse?.Invoice || [];
    const lifetimeSpend = invoices.reduce((sum: number, i: any) => sum + parseNumber(i.TotalAmt), 0);

    return { balance, lifetimeSpend };
  } catch {
    return { balance: 0, lifetimeSpend: 0 };
  }
}

export async function getInvoiceById(invoiceId: string): Promise<any> {
  try {
    const { data } = await qboFetch<any>(`/query?query=select * from Invoice where Id = '${invoiceId}'`);
    return data?.QueryResponse?.Invoice?.[0] || null;
  } catch {
    return null;
  }
}

export async function getVendorExpenses(startDate: string, endDate: string): Promise<any[]> {
  const query = `select * from Purchase where TxnDate >= '${startDate}' and TxnDate <= '${endDate}' order by TxnDate desc`;
  const { data } = await qboFetch<any>(`/query?query=${encodeURIComponent(query)}`);
  return data?.QueryResponse?.Purchase || [];
}
