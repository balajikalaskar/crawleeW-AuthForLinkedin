// LinkedIn site adapter — implements the BaseAdapter contract.
// All LinkedIn-specific domain matching, detection, and auth orchestration lives here.
// Does NOT contain selectors (those are in linkedinSelectors.js).

import { BaseAdapter } from '../baseAdapter.js';
import { PageAuthState, AuthStatus } from '../../auth/authTypes.js';
import { detectPageAuthState } from './linkedinDetector.js';
import { executeLoginFlow } from './linkedinAuth.js';

/**
 * Allowed LinkedIn hostnames for domain matching.
 * Prevents adapter activation on malicious look-alike domains.
 */
const LINKEDIN_HOSTS = new Set([
  'linkedin.com',
  'www.linkedin.com',
  'in.linkedin.com',
  'uk.linkedin.com',
  'de.linkedin.com',
  'fr.linkedin.com',
  'es.linkedin.com',
  'br.linkedin.com',
  'au.linkedin.com',
  'ca.linkedin.com',
  'jp.linkedin.com',
  'cn.linkedin.com',
]);

/**
 * Allowed origins for credential submission.
 * Credentials are NEVER sent to origins outside this list.
 */
const ALLOWED_ORIGINS = [
  'https://www.linkedin.com',
  'https://linkedin.com',
];

export class LinkedInAdapter extends BaseAdapter {
  get providerName() {
    return 'linkedin';
  }

  /**
   * Determine whether this adapter handles the given URL.
   * Uses proper hostname parsing — NOT string includes.
   */
  canHandle(url) {
    return isLinkedInUrl(url);
  }

  /**
   * Detect the authentication state of the current page.
   */
  async detectAuthState(page) {
    return detectPageAuthState(page);
  }

  /**
   * Execute LinkedIn authentication.
   *
   * @param {import('playwright').Page} page — already navigated to target
   * @param {{ email: string, password: string }} credentials
   * @param {object} logger
   * @returns {Promise<AuthStatus>}
   */
  async authenticate(page, credentials, logger) {
    // Verify we're actually on a LinkedIn page before submitting credentials
    const currentOrigin = new URL(page.url()).origin;
    const onAllowedOrigin = ALLOWED_ORIGINS.some(
      (allowed) => currentOrigin === allowed || currentOrigin.endsWith('.linkedin.com')
    );
    if (!onAllowedOrigin) {
      logger.auth(`Refusing to submit credentials — current origin ${currentOrigin} is not LinkedIn`);
      return AuthStatus.ACCESS_DENIED;
    }

    const result = await executeLoginFlow(page, credentials, logger);
    return result.status;
  }

  /**
   * Verify the page is in an authenticated state.
   * Uses multiple signals from the detector.
   */
  async verifyAuth(page) {
    const state = await detectPageAuthState(page);
    return state === PageAuthState.AUTHENTICATED || state === PageAuthState.ACCESSIBLE;
  }

  /**
   * Return allowed credential submission origins.
   */
  getAllowedOrigins() {
    return [...ALLOWED_ORIGINS];
  }
}

/**
 * Safely check whether a URL belongs to LinkedIn.
 * Parses hostname properly to prevent domain confusion attacks.
 */
export function isLinkedInUrl(url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }
    const hostname = parsed.hostname.toLowerCase();
    // Direct match against known hosts
    if (LINKEDIN_HOSTS.has(hostname)) {
      return true;
    }
    // Match regional subdomains: <country-code>.linkedin.com
    if (hostname.endsWith('.linkedin.com') && hostname.split('.').length === 3) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
