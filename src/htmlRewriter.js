// Replaces remote stylesheet URLs with local relative paths and handles <base href>

/**
 * Rewrite captured HTML to use local CSS files.
 *
 * Operations:
 *   1. Neutralize <base href> to prevent it from breaking local relative paths
 *   2. Replace external <link rel="stylesheet"> hrefs with local paths
 *   3. Replace inline <style> blocks with <link> tags pointing to local CSS files
 */
export function rewriteHtml(html, replacements) {
  let result = html;

  // 1. Handle <base href> — remove or comment it out so local paths work
  result = result.replace(
    /<base\s+[^>]*href\s*=\s*['"][^'"]*['"][^>]*\/?>/gi,
    (match) => `<!-- base tag removed for local viewing: ${match.replace(/--/g, '\u2014')} -->`
  );

  // 2. Replace external stylesheet links
  for (const rep of replacements.externalReplacements) {
    // Match the specific <link> tag by its href
    // We escape special regex chars in the href
    const escapedHref = escapeRegex(rep.originalHref);
    const pattern = new RegExp(
      `(<link\\s+[^>]*href\\s*=\\s*['"])${escapedHref}(['"][^>]*>)`,
      'gi'
    );

    // Only replace the first occurrence for each (to handle duplicates correctly)
    let replaced = false;
    result = result.replace(pattern, (match, prefix, suffix) => {
      if (!replaced) {
        replaced = true;
        return `${prefix}${rep.localPath}${suffix}`;
      }
      return match;
    });

    // Fallback: try matching with the resolved full URL too
    if (!replaced && rep.resolvedUrl) {
      const escapedResolved = escapeRegex(rep.resolvedUrl);
      const fallbackPattern = new RegExp(
        `(<link\\s+[^>]*href\\s*=\\s*['"])${escapedResolved}(['"][^>]*>)`,
        'gi'
      );
      result = result.replace(fallbackPattern, (match, prefix, suffix) => {
        if (!replaced) {
          replaced = true;
          return `${prefix}${rep.localPath}${suffix}`;
        }
        return match;
      });
    }
  }

  // 3. Replace inline <style> blocks with <link> tags
  // Process in reverse order of appearance to preserve positions
  const sortedInline = [...replacements.inlineReplacements].sort(
    (a, b) => b.index - a.index
  );

  for (const rep of sortedInline) {
    // Find the Nth <style>...</style> block and replace it
    result = replaceNthStyleBlock(result, rep.occurrenceIndex, rep.localPath);
  }

  return result;
}

/**
 * Replace the Nth <style>...</style> block with a <link> tag.
 * occurrenceIndex is 0-based.
 */
function replaceNthStyleBlock(html, occurrenceIndex, localPath) {
  const styleRegex = /<style[^>]*>[\s\S]*?<\/style>/gi;
  let count = 0;
  
  return html.replace(styleRegex, (match) => {
    if (count === occurrenceIndex) {
      count++;
      return `<link rel="stylesheet" href="${localPath}">`;
    }
    count++;
    return match;
  });
}

/**
 * Escape special regex characters in a string.
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
