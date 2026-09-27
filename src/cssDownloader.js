// Downloads external CSS files and handles @import resolution

import { resolveUrl, normalizeUrl } from './urlUtils.js';

const IMPORT_REGEX = /@import\s+(?:url\(\s*['"]?([^'"\)]+)['"]?\s*\)|['"]([^'"]+)['"])\s*;?/g;
const URL_REGEX = /url\(\s*['"]?(?!data:|#)([^'"\)\s]+)['"]?\s*\)/g;

/**
 * Download a single CSS file and return its content.
 */
async function fetchCss(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/css,*/*;q=0.1',
    },
    redirect: 'follow',
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }

  return response.text();
}

/**
 * Resolve relative url() references in CSS to absolute URLs
 * so they still work when the CSS is served from a local file.
 */
function resolveUrlReferences(cssContent, cssFileUrl) {
  return cssContent.replace(URL_REGEX, (match, rawUrl) => {
    // Skip data URIs, fragments, and already-absolute URLs
    if (rawUrl.startsWith('data:') || rawUrl.startsWith('#')) {
      return match;
    }
    const resolved = resolveUrl(rawUrl, cssFileUrl);
    if (resolved) {
      return `url("${resolved}")`;
    }
    return match;
  });
}

/**
 * Find @import rules in CSS content and return their URLs.
 */
function findImports(cssContent, cssFileUrl) {
  const imports = [];
  let match;
  // Reset regex state
  const regex = new RegExp(IMPORT_REGEX.source, IMPORT_REGEX.flags);
  while ((match = regex.exec(cssContent)) !== null) {
    const importUrl = match[1] || match[2];
    if (importUrl) {
      const resolved = resolveUrl(importUrl, cssFileUrl);
      if (resolved) {
        imports.push({ raw: match[0], importUrl, resolvedUrl: resolved });
      }
    }
  }
  return imports;
}

/**
 * Download all external stylesheets and their @import dependencies.
 *
 * Returns:
 *   downloadedFiles: Array<{ url, filename, content, error? }>
 */
export async function downloadAllCss(externalStylesheets, logger) {
  const downloaded = [];
  const visitedUrls = new Set();
  let fileCounter = 0;

  async function downloadRecursive(url, depth = 0) {
    const normalized = normalizeUrl(url);
    if (visitedUrls.has(normalized)) return;
    if (depth > 10) {
      logger.warn(`@import depth limit reached for: ${url}`);
      return;
    }
    visitedUrls.add(normalized);

    fileCounter++;
    const filename = `stylesheet-${String(fileCounter).padStart(3, '0')}.css`;
    const entry = { url, filename, content: null, error: null };

    try {
      logger.info(`Downloading: ${url}`);
      let content = await fetchCss(url);

      // Resolve relative url() references to absolute
      content = resolveUrlReferences(content, url);

      // Find and process @import rules
      const imports = findImports(content, url);
      for (const imp of imports) {
        const impNormalized = normalizeUrl(imp.resolvedUrl);
        if (!visitedUrls.has(impNormalized)) {
          await downloadRecursive(imp.resolvedUrl, depth + 1);
          // Find the downloaded entry for this import to get its filename
          const impEntry = downloaded.find((d) => normalizeUrl(d.url) === impNormalized);
          if (impEntry && !impEntry.error) {
            // Rewrite the @import to point to the local file
            content = content.replace(imp.raw, `@import url("./${impEntry.filename}");`);
          }
        } else {
          // Already downloaded — rewrite to local filename
          const impEntry = downloaded.find((d) => normalizeUrl(d.url) === impNormalized);
          if (impEntry && !impEntry.error) {
            content = content.replace(imp.raw, `@import url("./${impEntry.filename}");`);
          }
        }
      }

      entry.content = content;
    } catch (err) {
      entry.error = err.message;
      logger.warn(`Failed to download CSS: ${url} — ${err.message}`);
    }

    downloaded.push(entry);
  }

  // Download all external stylesheets (order preserved)
  for (const sheet of externalStylesheets) {
    await downloadRecursive(sheet.resolvedUrl);
  }

  return downloaded;
}
