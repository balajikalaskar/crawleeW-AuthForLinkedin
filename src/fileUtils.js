// Directory and file creation utilities

import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';

/**
 * Ensure a directory exists, creating it recursively if needed.
 */
export async function ensureDir(dirPath) {
  await mkdir(dirPath, { recursive: true });
}

/**
 * Write content to a file, creating parent directories if needed.
 */
export async function writeFileSafe(filePath, content) {
  const dir = filePath.substring(0, filePath.lastIndexOf('/') || filePath.lastIndexOf('\\'));
  if (dir) {
    await ensureDir(dir);
  }
  await writeFile(filePath, content, 'utf-8');
}

/**
 * Build the output directory path for a scraped URL.
 */
export function buildOutputDir(baseOutputDir, hostDir, pathDir) {
  if (pathDir) {
    return join(baseOutputDir, hostDir, pathDir);
  }
  return join(baseOutputDir, hostDir);
}
