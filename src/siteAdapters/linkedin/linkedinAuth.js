// LinkedIn login state machine.
// Implements the email-based authentication flow with explicit state transitions.
// Each transition uses Playwright waits — not arbitrary sleeps.
// Never logs credentials.

import { LoginFlowState, AuthStatus } from '../../auth/authTypes.js';
import { LOGIN_FORM, AUTH_WALL } from './linkedinSelectors.js';
import {
  isSignInModalActive,
  isEmailLoginAvailable,
  isUsernameFieldVisible,
  isPasswordFieldVisible,
  isChallengeVisible,
  isLoginErrorVisible,
  isAuthenticated,
  isLoginUrl,
} from './linkedinDetector.js';

/** Timeout for individual login steps (ms) */
const STEP_TIMEOUT = 10000;
/** Timeout for post-submission verification (ms) */
const VERIFY_TIMEOUT = 15000;
/** Small stabilization delay only after form submission */
const POST_SUBMIT_STABILIZE_MS = 2000;

/**
 * Execute the LinkedIn email login flow.
 *
 * Precondition: page is already at the target URL and auth is required.
 *
 * @param {import('playwright').Page} page
 * @param {{ email: string, password: string }} credentials
 * @param {object} logger
 * @returns {Promise<{ status: AuthStatus, finalState: LoginFlowState }>}
 */
export async function executeLoginFlow(page, credentials, logger) {
  let state = LoginFlowState.AUTH_REQUIRED;
  logger.auth(`Login flow starting — state: ${state}`);

  try {
    // ── Step 1: Locate the active login entry ──
    state = await locateLoginEntry(page, logger);
    if (state === LoginFlowState.CHALLENGE_REQUIRED) {
      return { status: AuthStatus.CHALLENGE_REQUIRED, finalState: state };
    }

    // ── Step 2: Select email login if needed ──
    state = await selectEmailLogin(page, state, logger);
    if (state === LoginFlowState.CHALLENGE_REQUIRED) {
      return { status: AuthStatus.CHALLENGE_REQUIRED, finalState: state };
    }

    // ── Step 3: Enter username ──
    state = await enterUsername(page, credentials.email, logger);

    // ── Step 4: Enter password ──
    state = await enterPassword(page, credentials.password, logger);

    // ── Step 5: Submit ──
    state = await submitLogin(page, logger);

    // ── Step 6: Evaluate result ──
    const result = await evaluateLoginResult(page, logger);
    return result;
  } catch (err) {
    logger.auth(`Login flow error at state ${state}: ${err.message}`);
    return { status: AuthStatus.FAILED, finalState: state };
  }
}

/**
 * Locate the active authentication entry point.
 * Could be a contextual modal or a global sign-in link.
 */
async function locateLoginEntry(page, logger) {
  // Check if a challenge appeared before we even start
  if (await isChallengeVisible(page)) {
    logger.auth('Challenge detected before login entry');
    return LoginFlowState.CHALLENGE_REQUIRED;
  }

  // Check for contextual sign-in modal first
  if (await isSignInModalActive(page)) {
    logger.auth('Contextual sign-in modal detected');
    return LoginFlowState.LOGIN_ENTRY_FOUND;
  }

  // Try clicking a global sign-in link to trigger the modal/form
  const globalLink = page.locator(AUTH_WALL.globalSignInLink).first();
  if ((await globalLink.count()) > 0) {
    logger.auth('Global sign-in link found — clicking');
    await globalLink.click({ timeout: STEP_TIMEOUT });
    // Wait for either a modal to appear or navigation to a login page
    await page.waitForTimeout(1500);

    if (await isSignInModalActive(page)) {
      logger.auth('Sign-in modal appeared after click');
      return LoginFlowState.LOGIN_ENTRY_FOUND;
    }

    // May have navigated to /login page
    if (isLoginUrl(page.url())) {
      logger.auth('Navigated to login page');
      return LoginFlowState.LOGIN_ENTRY_FOUND;
    }
  }

  // As a fallback, check if the email field is already visible
  if (await isUsernameFieldVisible(page)) {
    logger.auth('Email field already visible');
    return LoginFlowState.LOGIN_ENTRY_FOUND;
  }

  throw new Error('Could not locate login entry point');
}

/**
 * Click "Sign in with Email" if the modal offers multiple sign-in options.
 * If email input is already visible, skip this step.
 */
async function selectEmailLogin(page, currentState, logger) {
  // If username field is already visible, skip
  if (await isUsernameFieldVisible(page)) {
    logger.auth('Email input already visible — skipping email-login selection');
    return LoginFlowState.USERNAME_VISIBLE;
  }

  // Check for challenge
  if (await isChallengeVisible(page)) {
    return LoginFlowState.CHALLENGE_REQUIRED;
  }

  // Try clicking "Sign in with Email"
  if (await isEmailLoginAvailable(page)) {
    logger.auth('Clicking "Sign in with Email"');
    const emailLoginBtn = page.locator(LOGIN_FORM.signInWithEmail).first();
    await emailLoginBtn.click({ timeout: STEP_TIMEOUT });
    logger.auth('Waiting for email input to appear');

    // Wait for the username field to become visible
    await page.locator(LOGIN_FORM.emailInput).first().waitFor({
      state: 'visible',
      timeout: STEP_TIMEOUT,
    });
    logger.auth('Email input is now visible');
    return LoginFlowState.EMAIL_LOGIN_SELECTED;
  }

  // If we're on a dedicated login page, the email field might just need time
  await page.locator(LOGIN_FORM.emailInput).first().waitFor({
    state: 'visible',
    timeout: STEP_TIMEOUT,
  });

  return LoginFlowState.EMAIL_LOGIN_SELECTED;
}

/**
 * Type the email/username into the input field.
 */
async function enterUsername(page, email, logger) {
  logger.auth('Entering email');
  const field = page.locator(LOGIN_FORM.emailInput).first();
  await field.waitFor({ state: 'visible', timeout: STEP_TIMEOUT });
  await field.click();
  await field.fill(email);
  logger.auth('Email entered');
  return LoginFlowState.USERNAME_VISIBLE;
}

/**
 * Type the password into the input field.
 * The password field may appear immediately or after a next-step interaction.
 */
async function enterPassword(page, password, logger) {
  // Wait for password field to be visible
  logger.auth('Waiting for password field');
  const field = page.locator(LOGIN_FORM.passwordInput).first();
  await field.waitFor({ state: 'visible', timeout: STEP_TIMEOUT });
  await field.click();
  await field.fill(password);
  logger.auth('Password entered');
  return LoginFlowState.PASSWORD_VISIBLE;
}

/**
 * Click the submit button to submit credentials.
 */
async function submitLogin(page, logger) {
  logger.auth('Submitting credentials');
  const submitBtn = page.locator(LOGIN_FORM.submitButton).first();
  await submitBtn.waitFor({ state: 'visible', timeout: STEP_TIMEOUT });
  await submitBtn.click();
  logger.auth('Credentials submitted — waiting for response');
  return LoginFlowState.SUBMITTING;
}

/**
 * Evaluate the outcome of the login submission.
 * Waits for the page to settle, then checks multiple signals.
 */
async function evaluateLoginResult(page, logger) {
  // Give the page a moment to respond to the submission
  await page.waitForTimeout(POST_SUBMIT_STABILIZE_MS);

  // Check for challenge first (highest priority)
  if (await isChallengeVisible(page)) {
    logger.auth('Challenge/CAPTCHA detected after submission');
    return {
      status: AuthStatus.CHALLENGE_REQUIRED,
      finalState: LoginFlowState.CHALLENGE_REQUIRED,
    };
  }

  // Check for login error
  if (await isLoginErrorVisible(page)) {
    logger.auth('Login error detected — credentials may be incorrect');
    return {
      status: AuthStatus.FAILED,
      finalState: LoginFlowState.AUTH_FAILED,
    };
  }

  // Check if still on login page with form visible (submission may have failed silently)
  if (await isUsernameFieldVisible(page) || await isPasswordFieldVisible(page)) {
    // Still showing the login form — likely a soft failure
    logger.auth('Login form still visible after submission — possible silent failure');
    return {
      status: AuthStatus.FAILED,
      finalState: LoginFlowState.AUTH_FAILED,
    };
  }

  // Check if authenticated (best-case outcome)
  if (await isAuthenticated(page)) {
    logger.auth('Authentication verified — logged in successfully');
    return {
      status: AuthStatus.AUTHENTICATED,
      finalState: LoginFlowState.AUTHENTICATED,
    };
  }

  // Try waiting a bit longer for navigation to complete
  try {
    await page.waitForLoadState('domcontentloaded', { timeout: VERIFY_TIMEOUT });
  } catch {
    // timeout is okay
  }

  // Re-check after waiting
  if (await isChallengeVisible(page)) {
    logger.auth('Challenge detected after extended wait');
    return {
      status: AuthStatus.CHALLENGE_REQUIRED,
      finalState: LoginFlowState.CHALLENGE_REQUIRED,
    };
  }

  if (await isAuthenticated(page)) {
    logger.auth('Authentication verified after extended wait');
    return {
      status: AuthStatus.AUTHENTICATED,
      finalState: LoginFlowState.AUTHENTICATED,
    };
  }

  // If we navigated away from login and no error is visible, tentatively treat as success
  if (!isLoginUrl(page.url()) && !(await isLoginVisible(page))) {
    logger.auth('Login UI no longer visible — tentatively authenticated');
    return {
      status: AuthStatus.AUTHENTICATED,
      finalState: LoginFlowState.AUTHENTICATED,
    };
  }

  // Genuinely uncertain
  logger.auth('Authentication result uncertain');
  return {
    status: AuthStatus.UNKNOWN,
    finalState: LoginFlowState.UNKNOWN,
  };
}
