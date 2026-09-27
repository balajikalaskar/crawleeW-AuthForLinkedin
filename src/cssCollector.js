// Finds external stylesheets, inline styles, and dynamically inserted styles from the live DOM

import { resolveUrl } from './urlUtils.js';

/**
 * Collect all CSS references from the live rendered page.
 * Runs inside the Playwright page context.
 *
 * Returns:
 *   externalStylesheets: Array<{ href, resolvedUrl, index }>
 *   inlineStyles: Array<{ content, index }>
 */
export async function collectCss(page, baseUrl) {
  // Evaluate in browser context to get all stylesheet info
  const rawData = await page.evaluate(() => {
    const externals = [];
    const inlines = [];
    let index = 0;

    // Walk all elements in document order to preserve ordering
    // between external <link> and inline <style> tags
    const allElements = document.querySelectorAll('link[rel="stylesheet"], style');

    allElements.forEach((el) => {
      if (el.tagName === 'LINK' && el.rel === 'stylesheet' && el.href) {
        externals.push({
          href: el.getAttribute('href'),
          fullHref: el.href, // browser-resolved
          index: index++,
        });
      } else if (el.tagName === 'STYLE') {
        inlines.push({
          content: el.textContent || '',
          index: index++,
        });
      }
    });

    // Also check document.styleSheets for any dynamically added sheets
    // that might not have corresponding DOM elements we found above
    const foundHrefs = new Set(externals.map((e) => e.fullHref));
    const foundInlineContents = new Set(inlines.map((i) => i.content));

    for (const sheet of document.styleSheets) {
      try {
        if (sheet.href && !foundHrefs.has(sheet.href)) {
          externals.push({
            href: sheet.href,
            fullHref: sheet.href,
            index: index++,
          });
          foundHrefs.add(sheet.href);
        } else if (!sheet.href && sheet.ownerNode && sheet.ownerNode.tagName === 'STYLE') {
          const content = sheet.ownerNode.textContent || '';
          if (content && !foundInlineContents.has(content)) {
            inlines.push({
              content,
              index: index++,
            });
            foundInlineContents.add(content);
          }
        }
      } catch {
        // CORS-restricted stylesheets — we'll still try to download via href if available
      }
    }

    return { externals, inlines };
  });

  // Resolve URLs server-side for safety
  const externalStylesheets = rawData.externals.map((ext) => ({
    href: ext.href,
    resolvedUrl: resolveUrl(ext.fullHref, baseUrl) || ext.fullHref,
    index: ext.index,
  }));

  const inlineStyles = rawData.inlines.map((inl) => ({
    content: inl.content,
    index: inl.index,
  }));

  return { externalStylesheets, inlineStyles };
}
