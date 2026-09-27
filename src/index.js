#!/usr/bin/env node

// CLI entry point for the HTML + CSS scraper

import { resolve } from 'path';
import { exec } from 'child_process';
import { validateUrl } from './urlUtils.js';
import { scrapeUrl } from './crawler.js';
import { createLogger } from './logger.js';

const HELP_TEXT = `
Usage:
  node src/index.js <url>
  node src/index.js <url> --open
  node src/index.js --help

Examples:
  node src/index.js https://example.com
  node src/index.js https://example.com --open
`.trim();

function parseArgs(argv) {
  const args = argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    return { showHelp: true };
  }

  const url = args.find((a) => !a.startsWith('--'));
  const open = args.includes('--open');

  return { url, open, showHelp: false };
}

function openInBrowser(filePath) {
  const absolutePath = resolve(filePath);
  const platform = process.platform;

  let cmd;
  if (platform === 'win32') {
    cmd = `start "" "${absolutePath}"`;
  } else if (platform === 'darwin') {
    cmd = `open "${absolutePath}"`;
  } else {
    cmd = `xdg-open "${absolutePath}"`;
  }

  exec(cmd, (err) => {
    if (err) {
      console.error(`Could not open browser: ${err.message}`);
    }
  });
}

function getOpenCommand(filePath) {
  const platform = process.platform;
  if (platform === 'win32') return `start ${filePath}`;
  if (platform === 'darwin') return `open ${filePath}`;
  return `xdg-open ${filePath}`;
}

async function main() {
  const { url, open, showHelp } = parseArgs(process.argv);

  if (showHelp || !url) {
    console.log(HELP_TEXT);
    process.exit(0);
  }

  // Validate URL
  const validation = validateUrl(url);
  if (!validation.valid) {
    console.error(`Error: ${validation.error}`);
    process.exit(1);
  }

  const logger = createLogger();

  try {
    // Suppress Crawlee's noisy logging
    process.env.CRAWLEE_LOG_LEVEL = 'OFF';

    const { metadata, outputDir, htmlPath } = await scrapeUrl(validation.url, logger);

    const openCmd = getOpenCommand(htmlPath);
    logger.summary({
      htmlPath,
      cssCount: metadata.totalCssFiles,
      finalUrl: metadata.finalUrl,
      openCmd,
    });

    if (metadata.failedCss && metadata.failedCss.length > 0) {
      logger.warn(`${metadata.failedCss.length} CSS file(s) failed to download. See metadata.json for details.`);
    }

    if (open) {
      openInBrowser(htmlPath);
    }
  } catch (err) {
    logger.error(`Scraping failed: ${err.message}`);
    process.exit(1);
  }
}

main();
