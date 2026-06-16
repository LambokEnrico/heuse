#!/usr/bin/env node
/**
 * Helper script: parse .env and output KEY=VALUE lines for batch consumption.
 *
 * SECURITY:
 *   - This script PRINTS env values to stdout (necessary for `for /f` capture in .bat)
 *   - DO NOT run this script directly in terminal - it will dump all .env values
 *   - Only run via deploy-railway.bat, which captures output silently (no echo)
 *   - The .bat never echoes the captured value, only the key name
 *
 * Used by deploy-railway.bat to push all env vars to Railway.
 *
 * Skips:
 *   - Comment lines (starting with #)
 *   - Empty lines
 *   - DATABASE_URL (auto-set by Railway PostgreSQL plugin)
 *   - Empty values (e.g. TURNSTILE_SECRET_KEY="")
 *
 * Strips surrounding quotes from values.
 *
 * Output: one KEY=VALUE per line (captured by `for /f` in batch, NOT echoed).
 */

const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');
if (!fs.existsSync(envPath)) {
  console.error('ERROR: .env not found at ' + envPath);
  process.exit(1);
}

const SKIP = new Set(['DATABASE_URL']);
const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);

for (const rawLine of lines) {
  const line = rawLine.trim();

  // Skip comments and empty lines
  if (!line || line.startsWith('#')) continue;

  // Find first =
  const eq = line.indexOf('=');
  if (eq < 0) continue;

  const key = line.slice(0, eq).trim();
  let value = line.slice(eq + 1).trim();

  // Strip surrounding quotes (single or double)
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  // Skip Railway-managed vars
  if (SKIP.has(key)) continue;

  // Skip empty values (let Railway use defaults if any)
  if (!value) continue;

  // Output: KEY=VALUE
  process.stdout.write(`${key}=${value}\n`);
}
