// Creates and runs PlaywrightCrawler to navigate and capture page data

import { PlaywrightCrawler, Configuration } from 'crawlee';
import { extractAndSave } from './extractor.js';

/**
 * Scrape a single URL using PlaywrightCrawler.
 *
 * Returns { metadata, outputDir, htmlPath } on success.
 * Throws on fatal errors.
 */
export async function scrapeUrl(url, logger) {
  let result = null;
  let scrapeError = null;

  // Suppress Crawlee's default storage to keep the project directory clean
  const config = new Configuration({
    persistStorage: false,
    purgeOnStart: true,
  });

  const crawler = new PlaywrightCrawler(
    {
      maxRequestRetries: 0,
      requestHandlerTimeoutSecs: 120,
      navigationTimeoutSecs: 60,

      launchContext: {
        launchOptions: {
          headless: true,
          args: ['--disable-blink-features=AutomationControlled'],
        },
      },

      browserPoolOptions: {
        useFingerprints: false,
      },

      preNavigationHooks: [
        async ({ page }) => {
          await page.setViewportSize({ width: 1440, height: 900 });
          await page.setExtraHTTPHeaders({
            'Accept-Language': 'en-US,en;q=0.9',
          });
        },
      ],

      async requestHandler({ request, page, response, log }) {
        // Suppress Crawlee's internal logging
        log.setLevel(log.LEVELS.OFF);

        logger.step('Page loaded');

        // Progressive wait strategy
        try {
          await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
        } catch {
          // Already past this state, continue
        }

        try {
          await page.waitForLoadState('load', { timeout: 15000 });
        } catch {
          logger.warn('Load event timed out, continuing...');
        }

        // Short additional wait for late JS execution
        await page.waitForTimeout(1500);

        try {
          await page.waitForLoadState('networkidle', { timeout: 10000 });
        } catch {
          logger.warn('Network idle timed out (this is normal for pages with analytics/ads)');
        }

        // Extract and save everything
        result = await extractAndSave(page, request, response, logger);
      },

      async failedRequestHandler({ request, error }) {
        scrapeError = error || new Error(`Failed to scrape: ${request.url}`);
      },
    },
    config
  );

  logger.step('Opening URL...');
  await crawler.run([url]);

  if (scrapeError) {
    throw scrapeError;
  }

  if (!result) {
    throw new Error('Scraping completed but no data was captured');
  }

  return result;
}
