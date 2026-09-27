// Centralized LinkedIn selectors.
// Prefer: role, aria-label, autocomplete, data-id, label text
// Avoid: generated CSS class names (Tailwind-like, hashed)

/**
 * Auth-wall and login detection selectors.
 */
export const AUTH_WALL = {
  /** The contextual sign-in modal dialog */
  signInModal: 'div[role="dialog"]:visible',
  /** Global "Sign in" link in the page header/nav */
  globalSignInLink: 'a[href*="/login"]:visible, a[data-tracking-control-name*="sign-in"]:visible',
  /** Any visible sign-in call-to-action */
  signInCTA: '[data-tracking-control-name*="auth_wall"]:visible, .authwall-join-form:visible',
  /** Auth wall container (blocks content) */
  authWallOverlay: '.authentication-outlet:visible, [data-test-id="authwall-content"]:visible',
};

/**
 * Login form selectors — for the contextual modal flow.
 */
export const LOGIN_FORM = {
  /** "Sign in with Email" button/link inside the modal */
  signInWithEmail:
    'button:visible:has-text("Sign in with Email"), ' +
    'button:visible:has-text("Sign in with email"), ' +
    'a:visible:has-text("Sign in with Email"), ' +
    'a:visible:has-text("Sign in with email")',

  /** Email / phone input field */
  emailInput: 'input[autocomplete="username"]:visible',

  /** Password input field */
  passwordInput: 'input[autocomplete="current-password"]:visible',

  /** Sign in submit button */
  submitButton:
    'button[data-id="sign-in-form__submit-btn"]:visible, ' +
    'button[type="submit"]:visible:has-text("Sign in")',
};

/**
 * Authenticated state indicators (signals that login succeeded).
 */
export const AUTHENTICATED = {
  /** Global nav that only appears for logged-in users */
  globalNav: '#global-nav:visible, [data-test-id="global-nav"]:visible',
  /** Profile/me link in the nav */
  meNav: 'a[href*="/me/"]:visible, a[href*="/in/"]:visible:has-text("Me")',
  /** Feed link — only for authenticated users */
  feedLink: 'a[href*="/feed"]:visible',
  /** Messaging icon */
  messagingIcon: 'a[href*="/messaging"]:visible',
};

/**
 * Challenge / security check indicators.
 */
export const CHALLENGE = {
  /** CAPTCHA iframe or container */
  captcha:
    'iframe[src*="captcha"]:visible, ' +
    '#captcha-internal:visible, ' +
    '[data-test-id="captcha"]:visible',
  /** Security verification page */
  securityCheck:
    '[data-test-id="security-challenge"]:visible, ' +
    'h1:has-text("Security Verification"):visible, ' +
    'h1:has-text("Let\'s do a quick security check"):visible',
  /** Phone/email verification step */
  verificationStep:
    'input[name="pin"]:visible, ' +
    'h1:has-text("verification"):visible',
};

/**
 * Error indicators after login attempt.
 */
export const LOGIN_ERROR = {
  /** Inline error message on the form */
  formError:
    '[data-test-id="form-error"]:visible, ' +
    '.alert-content:visible, ' +
    '[role="alert"]:visible',
  /** Specific wrong-credentials error */
  credentialError:
    ':visible:has-text("wrong password"), ' +
    ':visible:has-text("couldn\'t find an account"), ' +
    ':visible:has-text("Hmm, that's not the right password")',
};

/**
 * Profile content selectors (to determine if target content is accessible).
 */
export const PROFILE_CONTENT = {
  /** Main profile section — visible means content is accessible */
  profileSection: 'section.profile:visible, main[role="main"]:visible .pv-top-card:visible',
  /** Profile name heading */
  profileName: 'h1:visible',
  /** Any substantial profile content area */
  contentArea:
    '.core-rail:visible, ' +
    'main[role="main"]:visible, ' +
    'section[data-member-id]:visible',
};
