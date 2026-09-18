// QuickBooks Online API Client
// Handles OAuth2 authorization, token exchange, transparent token refreshing, and authenticated requests.

import { createServiceClient } from '@/lib/supabase/server';
import type {
  QuickBooksConfig,
  QuickBooksConnectionRecord,
  QuickBooksConnectionStatus,
  QuickBooksEnvironment,
} from './types';

const TOKEN_ENDPOINT = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';
const REVOKE_ENDPOINT = 'https://developer.api.intuit.com/v2/oauth2/tokens/revoke';
const AUTH_ENDPOINT = 'https://appcenter.intuit.com/connect/oauth2';

export function getQuickBooksConfig(): QuickBooksConfig {
  const clientId = process.env.QUICKBOOKS_CLIENT_ID || '';
  const clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET || '';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://seaofblue.app';
  const redirectUri =
    process.env.QUICKBOOKS_REDIRECT_URI || `${appUrl}/api/integrations/quickbooks/callback`;
  const environment = (process.env.QUICKBOOKS_ENVIRONMENT as QuickBooksEnvironment) || 'sandbox';

  return { clientId, clientSecret, redirectUri, environment };
}

export function hasQuickBooksCredentials(): boolean {
  const config = getQuickBooksConfig();
  return Boolean(config.clientId && config.clientSecret);
}

/**
 * Builds the Intuit OAuth 2.0 authorization URL
 */
export function getAuthorizationUrl(state: string): string {
  const config = getQuickBooksConfig();
  const params = new URLSearchParams({
    client_id: config.clientId,
    response_type: 'code',
    scope: 'com.intuit.quickbooks.accounting',
    redirect_uri: config.redirectUri,
    state,
  });

  return `${AUTH_ENDPOINT}?${params.toString()}`;
}

/**
 * Exchanges an authorization code for access and refresh tokens
 */
export async function exchangeCodeForTokens(
  code: string,
  realmId: string
): Promise<{ success: boolean; error?: string; companyName?: string }> {
  const config = getQuickBooksConfig();
  if (!config.clientId || !config.clientSecret) {
    return { success: false, error: 'Missing QuickBooks client credentials in environment.' };
  }

  const basicAuth = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: config.redirectUri,
  });

  try {
    const res = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: body.toString(),
    });

    const rawText = await res.text();
    let data: any = {};
    try {
      data = JSON.parse(rawText);
    } catch {
      return {
        success: false,
        error: `HTTP ${res.status}: ${rawText.slice(0, 200) || 'Empty response from Intuit token endpoint'}`,
      };
    }

    if (!res.ok) {
      return {
        success: false,
        error: data.error_description || data.error || `HTTP ${res.status} exchanging tokens`,
      };
    }

    const now = new Date();
    const accessTokenExpiresAt = new Date(now.getTime() + (data.expires_in || 3600) * 1000).toISOString();
    const refreshTokenExpiresAt = new Date(
      now.getTime() + (data.x_refresh_token_expires_in || 8726400) * 1000
    ).toISOString();

    // Fetch Company Info to store business legal name
    let companyName = 'QuickBooks Company';
    try {
      const baseUrl =
        config.environment === 'production'
          ? 'https://quickbooks.api.intuit.com'
          : 'https://sandbox-quickbooks.api.intuit.com';

      const companyRes = await fetch(`${baseUrl}/v3/company/${realmId}/companyinfo/${realmId}`, {
        headers: {
          Authorization: `Bearer ${data.access_token}`,
          Accept: 'application/json',
        },
      });

      if (companyRes.ok) {
        const companyData = await companyRes.json();
        companyName =
          companyData?.CompanyInfo?.CompanyName ||
          companyData?.CompanyInfo?.LegalName ||
          companyName;
      }
    } catch {
      // Non-blocking: continue with default company name
    }

    // Upsert into quickbooks_connections
    const supabase = await createServiceClient();
    const { error: dbError } = await supabase.from('quickbooks_connections').upsert(
      {
        realm_id: realmId,
        company_name: companyName,
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        access_token_expires_at: accessTokenExpiresAt,
        refresh_token_expires_at: refreshTokenExpiresAt,
        environment: config.environment,
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'realm_id' }
    );

    if (dbError) {
      return { success: false, error: `Database error storing tokens: ${dbError.message}` };
    }

    return { success: true, companyName };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Retrieves the active QuickBooks connection and automatically refreshes tokens if near expiry.
 */
export async function getValidConnection(): Promise<QuickBooksConnectionRecord | null> {
  const supabase = await createServiceClient();
  const { data: connection, error } = await supabase
    .from('quickbooks_connections')
    .select('*')
    .eq('is_active', true)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !connection) return null;

  const now = new Date();
  const expiresAt = new Date(connection.access_token_expires_at);
  const timeUntilExpiryMs = expiresAt.getTime() - now.getTime();

  // If token is valid for more than 5 minutes, return as is
  if (timeUntilExpiryMs > 5 * 60 * 1000) {
    return connection as QuickBooksConnectionRecord;
  }

  // Token is expired or expiring within 5 minutes — refresh it
  const config = getQuickBooksConfig();
  const basicAuth = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: connection.refresh_token,
  });

  try {
    const res = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: body.toString(),
    });

    const rawRefreshed = await res.text();
    let refreshed: any = {};
    try {
      refreshed = JSON.parse(rawRefreshed);
    } catch {
      console.error('[QuickBooks] Non-JSON refresh response:', rawRefreshed);
      return null;
    }

    if (!res.ok) {
      console.error('[QuickBooks] Token refresh failed:', refreshed);
      return null;
    }

    const newAccessTokenExpiresAt = new Date(
      now.getTime() + (refreshed.expires_in || 3600) * 1000
    ).toISOString();
    const newRefreshTokenExpiresAt = new Date(
      now.getTime() + (refreshed.x_refresh_token_expires_in || 8726400) * 1000
    ).toISOString();

    const { data: updatedRecord, error: updateError } = await supabase
      .from('quickbooks_connections')
      .update({
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token,
        access_token_expires_at: newAccessTokenExpiresAt,
        refresh_token_expires_at: newRefreshTokenExpiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', connection.id)
      .select('*')
      .single();

    if (updateError || !updatedRecord) {
      console.error('[QuickBooks] Failed to persist refreshed tokens:', updateError);
      return null;
    }

    return updatedRecord as QuickBooksConnectionRecord;
  } catch (err) {
    console.error('[QuickBooks] Exception refreshing token:', err);
    return null;
  }
}

/**
 * Returns current connection status
 */
export async function getQuickBooksStatus(): Promise<QuickBooksConnectionStatus> {
  const hasCreds = hasQuickBooksCredentials();
  const connection = await getValidConnection();

  if (!connection) {
    return {
      isConnected: false,
      hasCredentials: hasCreds,
    };
  }

  return {
    isConnected: true,
    realmId: connection.realm_id,
    companyName: connection.company_name || undefined,
    environment: connection.environment,
    expiresAt: connection.access_token_expires_at,
    lastSyncAt: connection.last_sync_at || undefined,
    hasCredentials: hasCreds,
  };
}

/**
 * Disconnects and revokes QuickBooks tokens
 */
export async function disconnectQuickBooks(): Promise<{ success: boolean; error?: string }> {
  const connection = await getValidConnection();
  if (!connection) {
    return { success: true };
  }

  const config = getQuickBooksConfig();
  const basicAuth = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');

  try {
    // Attempt token revocation with Intuit
    await fetch(REVOKE_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basicAuth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token: connection.refresh_token }),
    });
  } catch {
    // Continue with local deactivation even if Intuit revoke endpoint fails
  }

  const supabase = await createServiceClient();
  const { error } = await supabase
    .from('quickbooks_connections')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', connection.id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Authenticated fetch helper that communicates directly with the QuickBooks Online REST API
 */
export async function qboFetch<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ data: T | null; error: string | null; intuitTid?: string }> {
  const connection = await getValidConnection();
  if (!connection) {
    return { data: null, error: 'QuickBooks is not connected or tokens are invalid.' };
  }

  const baseUrl =
    connection.environment === 'production'
      ? `https://quickbooks.api.intuit.com/v3/company/${connection.realm_id}`
      : `https://sandbox-quickbooks.api.intuit.com/v3/company/${connection.realm_id}`;

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${baseUrl}${cleanEndpoint}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${connection.access_token}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    const intuitTid = res.headers.get('intuit_tid') || undefined;
    const body = await res.json();

    if (!res.ok) {
      const errorDetail =
        body?.Fault?.Error?.[0]?.Message ||
        body?.Fault?.Error?.[0]?.Detail ||
        `HTTP ${res.status}`;
      return { data: null, error: errorDetail, intuitTid };
    }

    return { data: body as T, error: null, intuitTid };
  } catch (err) {
    return { data: null, error: (err as Error).message };
  }
}
