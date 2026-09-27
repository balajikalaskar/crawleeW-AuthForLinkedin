// Orchestrates CSS collection, downloading, HTML rewriting, and file saving

import { join } from 'path';
import { collectCss } from './cssCollector.js';
import { downloadAllCss } from './cssDownloader.js';
import { rewriteHtml } from './htmlRewriter.js';
import { sanitizeUrlToPath } from './urlUtils.js';
import { ensureDir, writeFileSafe, buildOutputDir } from './fileUtils.js';

/**
 * Extract and save HTML + CSS from a fully loaded Playwright page.
 *
 * Returns the metadata object and output directory path.
 */
export async function extractAndSave(page, request, response, logger) {
  const requestedUrl = request.url;
  const finalUrl = page.url();
  const statusCode = response?.status() ?? null;

  // Step 3: Capture rendered HTML
  logger.step('Capturing rendered HTML...');
  let html = await page.content();
  const title = await page.title();

  // Step 4: Collect CSS references from the live DOM
  logger.step('Collecting CSS references...');
  const { externalStylesheets, inlineStyles } = await collectCss(page, finalUrl);

  const totalExternal = externalStylesheets.length;
  const totalInline = inlineStyles.length;
  logger.info(`Found ${totalExternal} external stylesheet${totalExternal !== 1 ? 's' : ''}, ${totalInline} inline style${totalInline !== 1 ? 's' : ''}`);

  // Step 5: Download external CSS
  logger.step('Downloading CSS...');
  const downloadedCss = await downloadAllCss(externalStylesheets, logger);

  // Build the output directory
  const { hostDir, pathDir } = sanitizeUrlToPath(finalUrl);
  const outputDir = buildOutputDir('output', hostDir, pathDir);
  const cssDir = join(outputDir, 'css');
  await ensureDir(cssDir);

  // Save external CSS files
  const cssFiles = [];
  const failedCss = [];

  // Build a map from resolvedUrl -> local filename for external sheets
  const urlToFilename = new Map();
  for (const dl of downloadedCss) {
    urlToFilename.set(dl.url, dl.filename);
  }

  for (const dl of downloadedCss) {
    if (dl.content !== null) {
      const filePath = join(cssDir, dl.filename);
      await writeFileSafe(filePath, dl.content);
      cssFiles.push(`css/${dl.filename}`);
    } else {
      failedCss.push({ url: dl.url, error: dl.error });
    }
  }

  // Save inline CSS files
  const inlineStyleFiles = [];
  for (let i = 0; i < inlineStyles.length; i++) {
    const filename = `inline-${String(i + 1).padStart(3, '0')}.css`;
    const filePath = join(cssDir, filename);
    await writeFileSafe(filePath, inlineStyles[i].content);
    inlineStyleFiles.push(`css/${filename}`);
  }

  // Step 6: Rewrite HTML
  logger.step('Rewriting HTML...');

  // Build replacement instructions
  const externalReplacements = [];
  for (const sheet of externalStylesheets) {
    const dlEntry = downloadedCss.find((d) => d.url === sheet.resolvedUrl);
    if (dlEntry && dlEntry.content !== null) {
      externalReplacements.push({
        originalHref: sheet.href,
        resolvedUrl: sheet.resolvedUrl,
        localPath: `./css/${dlEntry.filename}`,
      });
    }
  }

  // Track inline style occurrences for replacement
  // We need to figure out which <style> blocks (in DOM order) correspond to our inlines
  // The cssCollector gave us indices that interleave with externals.
  // We need the occurrence index among <style> blocks only.
  const inlineReplacements = inlineStyles.map((inl, i) => ({
    occurrenceIndex: i,
    localPath: `./css/inline-${String(i + 1).padStart(3, '0')}.css`,
    index: inl.index,
  }));

  html = rewriteHtml(html, {
    externalReplacements,
    inlineReplacements,
  });

  // Step 7: Save files
  logger.step('Saving files...');
  const htmlPath = join(outputDir, 'index.html');
  await writeFileSafe(htmlPath, html);

  // Generate metadata
  const metadata = {
    requestedUrl,
    finalUrl,
    title,
    scrapedAt: new Date().toISOString(),
    htmlFile: 'index.html',
    cssFiles,
    inlineStyleFiles,
    totalCssFiles: cssFiles.length + inlineStyleFiles.length,
    status: statusCode,
    ...(failedCss.length > 0 && { failedCss }),
  };

  const metadataPath = join(outputDir, 'metadata.json');
  await writeFileSafe(metadataPath, JSON.stringify(metadata, null, 2));

  return { metadata, outputDir, htmlPath };
}
