// Base site adapter contract.
// All site-specific adapters extend this class and override each method.

/**
 * @abstract
 * Base class for site-specific authentication adapters.
 *
 * Responsibilities:
 *   - Determine if the adapter can handle a given URL
 *   - Detect whether authentication is required on a page
 *   - Execute the site-specific authentication flow
 *   - Verify that authentication succeeded
 *   - Classify failures
 */
export class BaseAdapter {
  /** Human-readable provider name (e.g. "linkedin") */
  get providerName() {
    throw new Error('BaseAdapter.providerName must be overridden');
  }

  /**
   * Determine whether this adapter should handle the given URL.
   * @param {string} url — the target URL
   * @returns {boolean}
   */
  canHandle(url) {
    throw new Error('BaseAdapter.canHandle() must be overridden');
  }

  /**
   * Detect the current authentication state of the page.
   * @param {import('playwright').Page} page
   * @returns {Promise<import('../auth/authTypes.js').PageAuthState>}
   */
  async detectAuthState(page) {
    throw new Error('BaseAdapter.detectAuthState() must be overridden');
  }

  /**
   * Execute the authentication flow on the page.
   * The page should already be navigated to the target URL.
   *
   * @param {import('playwright').Page} page
   * @param {object} credentials — provider-specific credential object
   * @param {object} logger
   * @returns {Promise<import('../auth/authTypes.js').AuthStatus>}
   */
  async authenticate(page, credentials, logger) {
    throw new Error('BaseAdapter.authenticate() must be overridden');
  }

  /**
   * Verify that the page is in an authenticated state after login.
   * @param {import('playwright').Page} page
   * @returns {Promise<boolean>}
   */
  async verifyAuth(page) {
    throw new Error('BaseAdapter.verifyAuth() must be overridden');
  }

  /**
   * Return the origin(s) that credentials should be submitted to.
   * Used for security validation — credentials are NEVER sent to other origins.
   * @returns {string[]}
   */
  getAllowedOrigins() {
    throw new Error('BaseAdapter.getAllowedOrigins() must be overridden');
  }
}
