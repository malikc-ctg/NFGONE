import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getQuickBooksConfig,
  getAuthorizationUrl,
  hasQuickBooksCredentials,
} from './client';

describe('QuickBooks Online Integration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  it('reads config correctly from environment variables', () => {
    process.env.QUICKBOOKS_CLIENT_ID = 'test_client_id_123';
    process.env.QUICKBOOKS_CLIENT_SECRET = 'test_client_secret_456';
    process.env.QUICKBOOKS_ENVIRONMENT = 'production';
    process.env.NEXT_PUBLIC_APP_URL = 'https://seaofblue.app';

    const config = getQuickBooksConfig();
    expect(config.clientId).toBe('test_client_id_123');
    expect(config.clientSecret).toBe('test_client_secret_456');
    expect(config.environment).toBe('production');
    expect(config.redirectUri).toBe('https://seaofblue.app/api/integrations/quickbooks/callback');
    expect(hasQuickBooksCredentials()).toBe(true);
  });

  it('detects when credentials are missing', () => {
    delete process.env.QUICKBOOKS_CLIENT_ID;
    delete process.env.QUICKBOOKS_CLIENT_SECRET;

    expect(hasQuickBooksCredentials()).toBe(false);
  });

  it('generates a valid Intuit OAuth 2.0 authorization URL with CSRF state', () => {
    process.env.QUICKBOOKS_CLIENT_ID = 'my_intuit_client';
    process.env.QUICKBOOKS_REDIRECT_URI = 'https://seaofblue.app/api/integrations/quickbooks/callback';

    const state = 'random_csrf_token_xyz';
    const authUrl = getAuthorizationUrl(state);

    expect(authUrl).toContain('https://appcenter.intuit.com/connect/oauth2');
    expect(authUrl).toContain('client_id=my_intuit_client');
    expect(authUrl).toContain('response_type=code');
    expect(authUrl).toContain('scope=com.intuit.quickbooks.accounting');
    expect(authUrl).toContain(`state=${state}`);
    expect(authUrl).toContain('redirect_uri=https%3A%2F%2Fseaofblue.app%2Fapi%2Fintegrations%2Fquickbooks%2Fcallback');
  });
});
