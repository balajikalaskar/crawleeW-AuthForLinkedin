// Authentication status codes, states, and error classification

/**
 * High-level authentication status returned by authManager and adapters.
 */
export const AuthStatus = Object.freeze({
  /** No authentication was needed or attempted */
  NOT_REQUIRED: 'NOT_REQUIRED',
  /** Authentication succeeded */
  AUTHENTICATED: 'AUTHENTICATED',
  /** Credentials are not configured */
  NOT_CONFIGURED: 'AUTH_NOT_CONFIGURED',
  /** Authentication was attempted but failed (wrong credentials, etc.) */
  FAILED: 'AUTH_FAILED',
  /** A CAPTCHA, MFA, or other challenge was encountered */
  CHALLENGE_REQUIRED: 'AUTH_CHALLENGE_REQUIRED',
  /** The stored session has expired and re-auth is needed */
  SESSION_EXPIRED: 'AUTH_SESSION_EXPIRED',
  /** Access is explicitly denied (e.g. account restricted) */
  ACCESS_DENIED: 'AUTH_ACCESS_DENIED',
  /** An operation timed out during authentication */
  TIMEOUT: 'AUTH_TIMEOUT',
  /** The auth state could not be confidently determined */
  UNKNOWN: 'AUTH_UNKNOWN',
  /** No adapter supports this site */
  UNSUPPORTED: 'AUTH_UNSUPPORTED',
  /** Stored auth state file is corrupt or unreadable */
  STORAGE_INVALID: 'AUTH_STORAGE_INVALID',
});

/**
 * Page-level auth detection states used by site detectors.
 */
export const PageAuthState = Object.freeze({
  /** Cannot determine auth status */
  UNKNOWN: 'UNKNOWN',
  /** Target content is accessible without login */
  ACCESSIBLE: 'ACCESSIBLE',
  /** A login wall / gate is blocking content */
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  /** User is authenticated and content is visible */
  AUTHENTICATED: 'AUTHENTICATED',
  /** A challenge (CAPTCHA/MFA) is blocking access */
  CHALLENGE_REQUIRED: 'CHALLENGE_REQUIRED',
  /** Access is explicitly denied */
  ACCESS_DENIED: 'ACCESS_DENIED',
});

/**
 * Login flow state machine states for the LinkedIn auth flow.
 */
export const LoginFlowState = Object.freeze({
  UNKNOWN: 'UNKNOWN',
  TARGET_LOADED: 'TARGET_LOADED',
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  LOGIN_ENTRY_FOUND: 'LOGIN_ENTRY_FOUND',
  EMAIL_LOGIN_SELECTED: 'EMAIL_LOGIN_SELECTED',
  USERNAME_VISIBLE: 'USERNAME_VISIBLE',
  PASSWORD_VISIBLE: 'PASSWORD_VISIBLE',
  SUBMITTING: 'SUBMITTING',
  AUTHENTICATED: 'AUTHENTICATED',
  CHALLENGE_REQUIRED: 'CHALLENGE_REQUIRED',
  AUTH_FAILED: 'AUTH_FAILED',
});

/**
 * Auth mode — whether authentication is enabled for a crawl request.
 */
export const AuthMode = Object.freeze({
  DISABLED: 'disabled',
  ENABLED: 'enabled',
  /** Future: allow human to complete challenges interactively */
  INTERACTIVE: 'interactive',
});

/**
 * Structured authentication result returned from authManager.
 */
export function createAuthResult(status, details = {}) {
  return {
    status,
    provider: details.provider ?? null,
    method: details.method ?? null,
    error: details.error ?? null,
    stateRestored: details.stateRestored ?? false,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Build a safe metadata-friendly representation (never includes secrets).
 */
export function toAuthMetadata(authResult) {
  if (!authResult || authResult.status === AuthStatus.NOT_REQUIRED) {
    return undefined;
  }
  return {
    required: true,
    provider: authResult.provider,
    method: authResult.method,
    status: authResult.status,
  };
}
