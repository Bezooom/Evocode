#!/usr/bin/env node
/**
 * F2.2 — Merge Эвокод brand identity into VSCodium product.json.
 *
 * Source of truth: packages/ide/product.evocode.json (brand keys only).
 * Target:          packages/ide/vscodium/product.json (VSCodium base + brand overlay).
 *
 * Merge rule: deep-merge where brand wins on scalar keys, but empty arrays/objects
 * from the brand file do NOT wipe non-empty base collections (API proposals, etc.).
 *
 * Usage:
 *   node packages/ide/scripts/apply-product-brand.mjs
 *   node packages/ide/scripts/apply-product-brand.mjs --check
 *   npm run ide:apply-brand
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IDE_DIR = path.resolve(__dirname, '..');
const BRAND_PATH = path.join(IDE_DIR, 'product.evocode.json');
const TARGET_PATH = path.join(IDE_DIR, 'vscodium', 'product.json');
const VSC_DIR = path.dirname(TARGET_PATH);

/** Identity keys that must match after apply (acceptance for F2.2). */
const REQUIRED_IDENTITY = {
  nameShort: 'Эвокод',
  nameLong: 'Эвокод — AI IDE',
  applicationName: 'evocode',
  dataFolderName: '.evocode-ide',
  urlProtocol: 'evocode',
  linuxIconName: 'evocode',
  darwinBundleIdentifier: 'ru.evocode.app',
  serverApplicationName: 'evocode-server',
  serverDataFolderName: '.evocode-server',
  tunnelApplicationName: 'evocode-tunnel',
  win32MutexName: 'evocode',
  quality: 'stable',
};

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function isEmptyCollection(v) {
  if (Array.isArray(v)) return v.length === 0;
  if (isPlainObject(v)) return Object.keys(v).length === 0;
  return false;
}

/**
 * Deep merge: brand overlays base.
 * Empty brand arrays/objects do not replace non-empty base (protects
 * extensionEnabledApiProposals and similar VSCodium metadata).
 */
function mergeProduct(base, brand) {
  const out = { ...base };
  for (const [key, brandVal] of Object.entries(brand)) {
    const baseVal = out[key];
    if (isEmptyCollection(brandVal) && baseVal !== undefined && !isEmptyCollection(baseVal)) {
      continue;
    }
    if (isPlainObject(brandVal) && isPlainObject(baseVal)) {
      out[key] = mergeProduct(baseVal, brandVal);
    } else {
      out[key] = brandVal;
    }
  }
  return out;
}

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function writeJson(p, data) {
  fs.writeFileSync(p, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function checkIdentity(product) {
  const failures = [];
  for (const [k, expected] of Object.entries(REQUIRED_IDENTITY)) {
    if (product[k] !== expected) {
      failures.push(`${k}: got ${JSON.stringify(product[k])} want ${JSON.stringify(expected)}`);
    }
  }
  return failures;
}

function restoreBaseFromGit() {
  execSync('git checkout HEAD -- product.json', { cwd: VSC_DIR, stdio: 'pipe' });
  return readJson(TARGET_PATH);
}

function main() {
  const checkOnly = process.argv.includes('--check');

  if (!fs.existsSync(BRAND_PATH)) {
    console.error(`Brand file missing: ${BRAND_PATH}`);
    process.exit(1);
  }
  if (!fs.existsSync(TARGET_PATH)) {
    console.error(`VSCodium product.json missing: ${TARGET_PATH}`);
    console.error('Run: npm run bootstrap:ide');
    process.exit(1);
  }

  const brand = readJson(BRAND_PATH);
  let base = readJson(TARGET_PATH);

  if (checkOnly) {
    const failures = checkIdentity(base);
    const proposals = Object.keys(base.extensionEnabledApiProposals || {}).length;
    if (failures.length) {
      console.error('F2.2 brand check FAILED:');
      for (const f of failures) console.error(`  - ${f}`);
      process.exit(1);
    }
    // Upstream always ships proposals; empty means a bad prior overwrite.
    if (proposals === 0) {
      console.error('F2.2 brand check FAILED: extensionEnabledApiProposals is empty (base was wiped)');
      process.exit(1);
    }
    console.log('F2.2 brand check OK');
    console.log(`  nameShort=${base.nameShort} applicationName=${base.applicationName}`);
    console.log(`  extensionEnabledApiProposals keys: ${proposals}`);
    process.exit(0);
  }

  const proposalsBefore = Object.keys(base.extensionEnabledApiProposals || {}).length;

  // Self-heal: previous shallow overwrite wiped proposals while brand keys remain.
  if (proposalsBefore === 0) {
    console.warn(
      'Warning: extensionEnabledApiProposals is empty — restoring product.json from git HEAD…',
    );
    try {
      base = restoreBaseFromGit();
      console.log(
        `  Restored: extensionEnabledApiProposals keys = ${
          Object.keys(base.extensionEnabledApiProposals || {}).length
        }`,
      );
    } catch (e) {
      console.error(`  git restore failed: ${e.message}`);
      process.exit(1);
    }
  }

  const merged = mergeProduct(base, brand);
  writeJson(TARGET_PATH, merged);

  const failures = checkIdentity(merged);
  if (failures.length) {
    console.error('Merge wrote file but identity check failed:');
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }

  const proposalsAfter = Object.keys(merged.extensionEnabledApiProposals || {}).length;
  if (proposalsAfter === 0) {
    console.error('ERROR: merge left extensionEnabledApiProposals empty');
    process.exit(1);
  }

  console.log('=== Эвокод F2.2: product brand applied ===');
  console.log(`  brand:  ${BRAND_PATH}`);
  console.log(`  target: ${TARGET_PATH}`);
  console.log(`  nameShort=${merged.nameShort}`);
  console.log(`  nameLong=${merged.nameLong}`);
  console.log(`  applicationName=${merged.applicationName}`);
  console.log(`  dataFolderName=${merged.dataFolderName}`);
  console.log(`  urlProtocol=${merged.urlProtocol}`);
  console.log(
    `  keys: base=${Object.keys(base).length} → merged=${Object.keys(merged).length}`,
  );
  console.log(`  extensionEnabledApiProposals: ${proposalsAfter}`);
}

main();
