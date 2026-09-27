// Persistent authenticated browser state management.
// StorageState files are HIGHLY SENSITIVE — they contain session cookies/tokens.
// Never log, print, or include their contents in crawl output.

import { readFile, writeFile, mkdir, access, unlink } from 'fs/promises';
import { join, dirname } from 'path';
import { createHash } from 'crypto';

const AUTH_STATE_BASE_DIR = join('storage', 'auth');

/**
 * Build the file path for a site's auth state.
 *
 * Uses a hash of the account identifier to avoid storing
 * the raw email/username in the filename.
 */
export function getStatePath(provider, accountIdentifier) {
  const hash = createHash('sha256')
    .update(accountIdentifier)
    .digest('hex')
    .substring(0, 12);
  return join(AUTH_STATE_BASE_DIR, provider, `${hash}.json`);
}

/**
 * Load an existing storage state from disk.
 *
 * Returns { ok: true, state } or { ok: false, reason }.
 */
export async function loadState(provider, accountIdentifier) {
  const filePath = getStatePath(provider, accountIdentifier);

  try {
    await access(filePath);
  } catch {
    return { ok: false, reason: 'no_file' };
  }

  try {
    const raw = await readFile(filePath, 'utf-8');
    const state = JSON.parse(raw);

    if (!isValidStorageState(state)) {
      return { ok: false, reason: 'invalid_format' };
    }

    // Check if state has a saved timestamp and if it's too old
    if (state._savedAt) {
      const age = Date.now() - new Date(state._savedAt).getTime();
      const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
      if (age > MAX_AGE_MS) {
        return { ok: false, reason: 'expired' };
      }
    }

    return { ok: true, state };
  } catch (err) {
    return { ok: false, reason: 'read_error' };
  }
}

/**
 * Save a Playwright storageState to disk.
 */
export async function saveState(provider, accountIdentifier, state) {
  const filePath = getStatePath(provider, accountIdentifier);
  const dir = dirname(filePath);
  await mkdir(dir, { recursive: true });

  // Add a timestamp so we can check freshness later
  const stateWithMeta = { ...state, _savedAt: new Date().toISOString() };

  await writeFile(filePath, JSON.stringify(stateWithMeta, null, 2), 'utf-8');
}

/**
 * Delete a stored state (e.g. after detecting session expiry).
 */
export async function clearState(provider, accountIdentifier) {
  const filePath = getStatePath(provider, accountIdentifier);
  try {
    await unlink(filePath);
  } catch {
    // File doesn't exist or already deleted — fine
  }
}

/**
 * Basic validation that a parsed object looks like a Playwright storageState.
 * Does NOT inspect cookie values (those are secrets).
 */
function isValidStorageState(obj) {
  if (!obj || typeof obj !== 'object') return false;
  // Playwright storageState must have cookies array and origins array
  if (!Array.isArray(obj.cookies)) return false;
  if (!Array.isArray(obj.origins)) return false;
  return true;
}
