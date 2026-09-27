// Credential retrieval abstraction — currently backed by environment variables.
// Never logs, prints, or persists raw credential values.

import { AuthStatus } from './authTypes.js';

/**
 * Mapping from provider name → required environment variable names.
 */
const PROVIDER_ENV_KEYS = {
  linkedin: {
    email: 'LINKEDIN_EMAIL',
    password: 'LINKEDIN_PASSWORD',
  },
};

/**
 * Retrieve credentials for a given provider.
 *
 * Returns { ok: true, credentials } or { ok: false, status, error }.
 *
 * The credentials object shape depends on the provider.
 * For linkedin: { email, password }
 */
export function getCredentials(provider) {
  const envKeys = PROVIDER_ENV_KEYS[provider];

  if (!envKeys) {
    return {
      ok: false,
      status: AuthStatus.UNSUPPORTED,
      error: `No credential configuration for provider: ${provider}`,
    };
  }

  const missing = [];
  const credentials = {};

  for (const [field, envKey] of Object.entries(envKeys)) {
    const value = process.env[envKey];
    if (!value || value.trim().length === 0) {
      missing.push(envKey);
    } else {
      credentials[field] = value.trim();
    }
  }

  if (missing.length > 0) {
    return {
      ok: false,
      status: AuthStatus.NOT_CONFIGURED,
      error: `Missing environment variable(s): ${missing.join(', ')}`,
    };
  }

  return { ok: true, credentials };
}

/**
 * Check whether credentials are available without retrieving them.
 */
export function hasCredentials(provider) {
  const envKeys = PROVIDER_ENV_KEYS[provider];
  if (!envKeys) return false;
  return Object.values(envKeys).every((key) => {
    const val = process.env[key];
    return val && val.trim().length > 0;
  });
}

/**
 * Return a redacted summary for logging (never includes actual values).
 */
export function describeCredentials(provider) {
  const envKeys = PROVIDER_ENV_KEYS[provider];
  if (!envKeys) return `[provider "${provider}" not configured]`;

  const summary = Object.entries(envKeys).map(([field, envKey]) => {
    const present = process.env[envKey] && process.env[envKey].trim().length > 0;
    return `${field}(${envKey}): ${present ? 'set' : 'MISSING'}`;
  });

  return summary.join(', ');
}
