#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

function flattenKeys(obj, prefix = '') {
  const keys = [];
  Object.keys(obj).sort().forEach((k) => {
    const value = obj[k];
    const full = prefix ? `${prefix}.${k}` : k;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      keys.push(...flattenKeys(value, full));
    } else {
      keys.push(full);
    }
  });
  return keys;
}

function diff(a, b) {
  const setA = new Set(a);
  const setB = new Set(b);
  const onlyA = a.filter((k) => !setB.has(k));
  const onlyB = b.filter((k) => !setA.has(k));
  return { onlyA, onlyB };
}

function main() {
  const baseDir = process.cwd();
  const itPath = path.join(baseDir, 'locales', 'it.json');
  const enPath = path.join(baseDir, 'locales', 'en.json');

  if (!fs.existsSync(itPath) || !fs.existsSync(enPath)) {
    console.error('Missing locales/it.json or locales/en.json');
    process.exit(1);
  }

  const it = readJson(itPath);
  const en = readJson(enPath);

  const itKeys = flattenKeys(it);
  const enKeys = flattenKeys(en);

  const { onlyA: itOnly, onlyB: enOnly } = diff(itKeys, enKeys);

  const total = new Set([...itKeys, ...enKeys]).size;
  const missing = itOnly.length + enOnly.length;

  console.log('i18n coverage report');
  console.log('---------------------');
  console.log(`Total keys: ${total}`);
  console.log(`Missing (it not in en): ${itOnly.length}`);
  console.log(`Missing (en not in it): ${enOnly.length}`);

  if (itOnly.length) {
    console.log('\nKeys present in it.json and missing in en.json:');
    itOnly.forEach((k) => console.log(` - ${k}`));
  }
  if (enOnly.length) {
    console.log('\nKeys present in en.json and missing in it.json:');
    enOnly.forEach((k) => console.log(` - ${k}`));
  }

  if (missing > 0) {
    process.exit(1);
  }

  process.exit(0);
}

main();
