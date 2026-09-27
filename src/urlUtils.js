// URL resolution, validation, normalization

/**
 * Validate that a string is a valid HTTP/HTTPS URL.
 */
export function validateUrl(input) {
  try {
    const url = new URL(input);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return { valid: false, error: 'URL must use http or https protocol' };
    }
    return { valid: true, url: url.href };
  } catch {
    return { valid: false, error: `Invalid URL: ${input}` };
  }
}

/**
 * Resolve a potentially relative URL against a base URL.
 */
export function resolveUrl(href, baseUrl) {
  try {
    return new URL(href, baseUrl).href;
  } catch {
    return null;
  }
}

/**
 * Create a safe directory name from a URL.
 * Returns { hostDir, pathDir } for the output structure.
 */
export function sanitizeUrlToPath(urlString) {
  const url = new URL(urlString);
  const hostDir = url.hostname.replace(/[^a-zA-Z0-9._-]/g, '_');

  let pathPart = url.pathname
    .replace(/^\//, '')
    .replace(/\/$/, '')
    .replace(/\//g, '-')
    .replace(/[^a-zA-Z0-9._-]/g, '_');

  // If path is empty or just index.html etc, don't create a subfolder
  if (!pathPart || pathPart === 'index.html' || pathPart === 'index.htm') {
    pathPart = '';
  }

  return { hostDir, pathDir: pathPart };
}

/**
 * Normalize a URL for deduplication (remove fragment, trailing slash normalization).
 */
export function normalizeUrl(urlString) {
  try {
    const url = new URL(urlString);
    url.hash = '';
    return url.href;
  } catch {
    return urlString;
  }
}
