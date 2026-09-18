// QuickBooks Online Integration Types

export type QuickBooksEnvironment = 'sandbox' | 'production';

export interface QuickBooksConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  environment: QuickBooksEnvironment;
}

export interface QuickBooksTokens {
  realmId: string;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string; // ISO 8601
  refreshTokenExpiresAt: string; // ISO 8601
  companyName?: string;
  environment: QuickBooksEnvironment;
}

export interface QuickBooksConnectionRecord {
  id: string;
  realm_id: string;
  company_name: string | null;
  access_token: string;
  refresh_token: string;
  access_token_expires_at: string;
  refresh_token_expires_at: string;
  environment: QuickBooksEnvironment;
  is_active: boolean;
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuickBooksConnectionStatus {
  isConnected: boolean;
  realmId?: string;
  companyName?: string;
  environment?: QuickBooksEnvironment;
  expiresAt?: string;
  lastSyncAt?: string;
  hasCredentials: boolean;
}

export interface QuickBooksCustomerPayload {
  DisplayName: string;
  GivenName?: string;
  FamilyName?: string;
  CompanyName?: string;
  PrimaryEmailAddr?: {
    Address: string;
  };
  PrimaryPhone?: {
    FreeFormNumber: string;
  };
  BillAddr?: {
    Line1?: string;
    City?: string;
    CountrySubDivisionCode?: string; // e.g. "ON"
    PostalCode?: string;
    Country?: string;
  };
}

export interface QuickBooksLineItem {
  DetailType: 'SalesItemLineDetail';
  Amount: number;
  Description?: string;
  SalesItemLineDetail: {
    UnitPrice?: number;
    Qty?: number;
    ItemRef?: {
      value: string;
      name?: string;
    };
    TaxCodeRef?: {
      value: string; // e.g. "TAX" or "NON"
    };
  };
}

export interface QuickBooksInvoicePayload {
  DocNumber?: string;
  TxnDate?: string; // YYYY-MM-DD
  DueDate?: string; // YYYY-MM-DD
  CustomerRef: {
    value: string;
    name?: string;
  };
  Line: QuickBooksLineItem[];
  CustomerMemo?: {
    value: string;
  };
  BillEmail?: {
    Address: string;
  };
  AllowOnlineCreditCardPayment?: boolean;
  AllowOnlineACHPayment?: boolean;
}

export interface QuickBooksSyncResult {
  success: boolean;
  qboId?: string;
  docNumber?: string;
  error?: string;
  intuitTid?: string;
}

export interface QuickBooksSyncLog {
  id: string;
  entity_type: 'partner_invoice' | 'job' | 'customer' | 'connection_test';
  entity_id: string | null;
  qbo_id: string | null;
  status: 'success' | 'failed' | 'pending';
  error_message: string | null;
  intuit_tid: string | null;
  created_at: string;
}
