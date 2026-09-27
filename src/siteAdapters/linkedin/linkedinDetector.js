// LinkedIn page state detection — small pure-ish functions.
// Each answers one question about the current page state.
// All return false on uncertainty (fail-safe).

import { PageAuthState } from '../../auth/authTypes.js';
import {
  AUTH_WALL,
  LOGIN_FORM,
  AUTHENTICATED,
  CHALLENGE,
  LOGIN_ERROR,
  PROFILE_CONTENT,
} from './linkedinSelectors.js';

const DETECT_TIMEOUT = 3000;

/**
 * Is the user currently authenticated on this page?
 * Checks for authenticated navigation elements.
 */
export async function isAuthenticated(page) {
  try {
    const signals = await Promise.all([
      page.locator(AUTHENTICATED.globalNav).count(),
      page.locator(AUTHENTICATED.feedLink).count(),
      page.locator(AUTHENTICATED.messagingIcon).count(),
    ]);
    // Require at least 2 signals to be confident
    const positiveSignals = signals.filter((c) => c > 0).length;
    return positiveSignals >= 2;
  } catch {
    return false;
  }
}

/**
 * Is a login wall / auth gate visible on the page?
 */
export async function isLoginVisible(page) {
  try {
    const signals = await Promise.all([
      page.locator(AUTH_WALL.signInModal).count(),
      page.locator(AUTH_WALL.globalSignInLink).count(),
      page.locator(AUTH_WALL.signInCTA).count(),
      page.locator(AUTH_WALL.authWallOverlay).count(),
    ]);
    return signals.some((c) => c > 0);
  } catch {
    return false;
  }
}

/**
 * Is the contextual sign-in modal (dialog) currently active and visible?
 */
export async function isSignInModalActive(page) {
  try {
    return (await page.locator(AUTH_WALL.signInModal).count()) > 0;
  } catch {
    return false;
  }
}

/**
 * Is the "Sign in with Email" option available?
 */
export async function isEmailLoginAvailable(page) {
  try {
    return (await page.locator(LOGIN_FORM.signInWithEmail).count()) > 0;
  } catch {
    return false;
  }
}

/**
 * Is the email/username input field visible and ready for input?
 */
export async function isUsernameFieldVisible(page) {
  try {
    const field = page.locator(LOGIN_FORM.emailInput).first();
    return await field.isVisible();
  } catch {
    return false;
  }
}

/**
 * Is the password input field visible and ready for input?
 */
export async function isPasswordFieldVisible(page) {
  try {
    const field = page.locator(LOGIN_FORM.passwordInput).first();
    return await field.isVisible();
  } catch {
    return false;
  }
}

/**
 * Is a CAPTCHA, MFA, or other security challenge visible?
 */
export async function isChallengeVisible(page) {
  try {
    const signals = await Promise.all([
      page.locator(CHALLENGE.captcha).count(),
      page.locator(CHALLENGE.securityCheck).count(),
      page.locator(CHALLENGE.verificationStep).count(),
    ]);
    return signals.some((c) => c > 0);
  } catch {
    return false;
  }
}

/**
 * Is a login error message visible after a submission attempt?
 */
export async function isLoginErrorVisible(page) {
  try {
    const signals = await Promise.all([
      page.locator(LOGIN_ERROR.formError).count(),
      page.locator(LOGIN_ERROR.credentialError).count(),
    ]);
    return signals.some((c) => c > 0);
  } catch {
    return false;
  }
}

/**
 * Is the target content (e.g. profile) accessible on the current page?
 * Uses multiple signals to avoid false positives.
 */
export async function isTargetAccessible(page) {
  try {
    const hasContent = (await page.locator(PROFILE_CONTENT.contentArea).count()) > 0;
    const hasName = (await page.locator(PROFILE_CONTENT.profileName).count()) > 0;
    const noAuthWall = !(await isLoginVisible(page));

    // Content is accessible if we see profile content and no auth wall
    return hasContent && hasName && noAuthWall;
  } catch {
    return false;
  }
}

/**
 * Determine the overall authentication state of the page.
 * Combines multiple detection functions into a single classification.
 *
 * Returns a PageAuthState value.
 */
export async function detectPageAuthState(page) {
  try {
    // Check challenge first — it takes priority
    if (await isChallengeVisible(page)) {
      return PageAuthState.CHALLENGE_REQUIRED;
    }

    // Check if already authenticated
    if (await isAuthenticated(page)) {
      return PageAuthState.AUTHENTICATED;
    }

    // Check if target content is accessible without auth
    if (await isTargetAccessible(page)) {
      return PageAuthState.ACCESSIBLE;
    }

    // Check if login is required
    if (await isLoginVisible(page)) {
      return PageAuthState.AUTH_REQUIRED;
    }

    // Can't determine — fail safe
    return PageAuthState.UNKNOWN;
  } catch {
    return PageAuthState.UNKNOWN;
  }
}

/**
 * Check if the current page URL indicates a login/auth flow.
 */
export function isLoginUrl(url) {
  try {
    const parsed = new URL(url);
    const loginPaths = ['/login', '/uas/login', '/checkpoint/', '/challenge/'];
    return loginPaths.some((p) => parsed.pathname.startsWith(p));
  } catch {
    return false;
  }
}
