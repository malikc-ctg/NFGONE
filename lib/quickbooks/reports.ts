import { qboFetch } from './client';

export interface ProfitAndLossData {
  income: number;
  expenses: number;
  netIncome: number;
}

export interface BalanceSheetData {
  assets: number;
  liabilities: number;
  equity: number;
  bankAccounts: { name: string; balance: number }[];
}

export interface AgedReceivable {
  customer: string;
  amount: number;
  daysOverdue: number;
}

export interface TaxSummaryData {
  taxCollected: number;
  taxPaid: number;
  netHstOwed: number;
}

// Helpers for QBO Report Parsing
function extractColData(row: any, index: number = 1): number {
  if (!row || !row.Summary || !row.Summary.ColData || !row.Summary.ColData[index]) return 0;
  return parseFloat(row.Summary.ColData[index].value || '0');
}

function findRowByGroup(rows: any[], groupName: string): any {
  if (!rows) return null;
  for (const row of rows) {
    if (row.group === groupName) return row;
    if (row.Rows && row.Rows.Row) {
      const found = findRowByGroup(row.Rows.Row, groupName);
      if (found) return found;
    }
  }
  return null;
}

export async function getProfitAndLoss(startDate: string, endDate: string): Promise<ProfitAndLossData> {
  const { data, error } = await qboFetch<any>(`/reports/ProfitAndLoss?start_date=${startDate}&end_date=${endDate}`);
  if (error || !data) throw new Error(error || 'Failed to fetch P&L');

  const rows = data.Rows?.Row || [];
  
  const incomeRow = findRowByGroup(rows, 'Income');
  const expenseRow = findRowByGroup(rows, 'Expenses');
  const netIncomeRow = rows[rows.length - 1]; // Net Income is usually the last row

  const income = incomeRow ? extractColData(incomeRow) : 0;
  const expenses = expenseRow ? extractColData(expenseRow) : 0;
  const netIncome = netIncomeRow && netIncomeRow.Summary ? extractColData(netIncomeRow) : 0;

  return { income, expenses, netIncome };
}

export async function getBalanceSheet(): Promise<BalanceSheetData> {
  const { data, error } = await qboFetch<any>('/reports/BalanceSheet');
  if (error || !data) throw new Error(error || 'Failed to fetch Balance Sheet');

  const rows = data.Rows?.Row || [];

  const assetsRow = findRowByGroup(rows, 'TotalAssets');
  const liabilitiesRow = findRowByGroup(rows, 'TotalLiabilities');
  const equityRow = findRowByGroup(rows, 'TotalEquity');

  const bankAccountsRow = findRowByGroup(rows, 'BankAccounts');
  const bankAccounts: { name: string; balance: number }[] = [];
  
  if (bankAccountsRow && bankAccountsRow.Rows && bankAccountsRow.Rows.Row) {
    for (const bank of bankAccountsRow.Rows.Row) {
      if (bank.ColData && bank.ColData.length > 1) {
         bankAccounts.push({
           name: bank.ColData[0].value || '',
           balance: parseFloat(bank.ColData[1].value || '0')
         });
      }
    }
  }

  return {
    assets: assetsRow ? extractColData(assetsRow) : 0,
    liabilities: liabilitiesRow ? extractColData(liabilitiesRow) : 0,
    equity: equityRow ? extractColData(equityRow) : 0,
    bankAccounts
  };
}

export async function getAgedReceivables(): Promise<AgedReceivable[]> {
  const { data, error } = await qboFetch<any>('/reports/AgedReceivableDetail');
  if (error || !data) throw new Error(error || 'Failed to fetch Aged Receivables');

  const receivables: AgedReceivable[] = [];
  const rows = data.Rows?.Row || [];

  for (const customerRow of rows) {
    if (customerRow.type === 'Section' && customerRow.Header && customerRow.Header.ColData) {
      const customer = customerRow.Header.ColData[0]?.value || 'Unknown';
      if (customerRow.Rows && customerRow.Rows.Row) {
        for (const detailRow of customerRow.Rows.Row) {
          if (detailRow.type === 'Data' && detailRow.ColData) {
            const amount = parseFloat(detailRow.ColData[5]?.value || '0');
            const daysOverdue = parseInt(detailRow.ColData[3]?.value || '0', 10) || 0;
            receivables.push({ customer, amount, daysOverdue });
          }
        }
      }
    }
  }
  
  return receivables;
}

export async function getTaxSummary(startDate: string, endDate: string): Promise<TaxSummaryData> {
  const { data, error } = await qboFetch<any>(`/reports/TaxSummary?start_date=${startDate}&end_date=${endDate}`);
  if (error || !data) throw new Error(error || 'Failed to fetch Tax Summary');

  const rows = data.Rows?.Row || [];
  
  const taxCollectedRow = findRowByGroup(rows, 'TaxCollected');
  const taxPaidRow = findRowByGroup(rows, 'TaxPaid');
  
  const taxCollected = taxCollectedRow ? extractColData(taxCollectedRow) : 0;
  const taxPaid = taxPaidRow ? extractColData(taxPaidRow) : 0;
  
  return {
    taxCollected,
    taxPaid,
    netHstOwed: taxCollected - taxPaid
  };
}

export async function getInvoiceById(invoiceId: string): Promise<any> {
  const { data, error } = await qboFetch<any>(`/query?query=select * from Invoice where Id = '${invoiceId}'`);
  if (error || !data) throw new Error(error || 'Failed to fetch invoice');
  return data.QueryResponse?.Invoice?.[0] || null;
}

export async function getCustomerBalance(customerId: string): Promise<any> {
  const { data, error } = await qboFetch<any>(`/query?query=select * from Customer where Id = '${customerId}'`);
  if (error || !data) throw new Error(error || 'Failed to fetch customer balance');
  return data.QueryResponse?.Customer?.[0]?.Balance || 0;
}

export async function getVendorExpenses(startDate: string, endDate: string): Promise<any[]> {
  const query = `select * from Purchase where TxnDate >= '${startDate}' and TxnDate <= '${endDate}' order by TxnDate desc`;
  const { data, error } = await qboFetch<any>(`/query?query=${encodeURIComponent(query)}`);
  if (error || !data) throw new Error(error || 'Failed to fetch vendor expenses');
  return data.QueryResponse?.Purchase || [];
}

export async function getVendors(): Promise<any[]> {
  const { data, error } = await qboFetch<any>('/query?query=select * from Vendor');
  if (error || !data) throw new Error(error || 'Failed to fetch vendors');
  return data.QueryResponse?.Vendor || [];
}

export async function getAccountBalances(): Promise<any[]> {
  const { data, error } = await qboFetch<any>('/query?query=select * from Account where AccountType in (\'Bank\', \'Credit Card\')');
  if (error || !data) throw new Error(error || 'Failed to fetch accounts');
  return data.QueryResponse?.Account || [];
}
