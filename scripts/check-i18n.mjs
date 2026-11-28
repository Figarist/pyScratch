#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const root = path.resolve(import.meta.dirname, '..');

const LOCALES = ['uk', 'en', 'pl', 'ru'];
const HTML_FILES = [
  { file: 'index.html', lang: 'uk' },
  { file: 'en/index.html', lang: 'en' },
  { file: 'pl/index.html', lang: 'pl' },
  { file: 'ru/index.html', lang: 'ru' }
];

const errors = [];
function fail(msg) {
  errors.push(msg);
}

function placeholders(str) {
  return [...new Set((String(str).match(/\{(\w+)\}/g) || []))].sort();
}

function checkKeyParity(name, tables) {
  const baseLang = 'uk';
  const baseKeys = Object.keys(tables[baseLang] || {}).sort();
  if (baseKeys.length === 0) {
    fail(`${name}: base locale "${baseLang}" has no keys`);
    return;
  }

  for (const lang of LOCALES) {
    const tbl = tables[lang];
    if (!tbl || typeof tbl !== 'object') {
      fail(`${name}: missing locale "${lang}"`);
      continue;
    }
    const keys = Object.keys(tbl).sort();
    const missing = baseKeys.filter((k) => !Object.prototype.hasOwnProperty.call(tbl, k));
    const extra = keys.filter((k) => !Object.prototype.hasOwnProperty.call(tables[baseLang], k));
    if (missing.length) fail(`${name}[${lang}] missing keys (${missing.length}): ${missing.slice(0, 10).join(', ')}`);
    if (extra.length) fail(`${name}[${lang}] extra keys (${extra.length}): ${extra.slice(0, 10).join(', ')}`);

    for (const k of baseKeys) {
      if (!Object.prototype.hasOwnProperty.call(tbl, k)) continue;
      if (typeof tbl[k] !== 'string' || tbl[k].trim() === '') {
        fail(`${name}[${lang}].${k} must be a non-empty string`);
        continue;
      }
      const pBase = placeholders(tables[baseLang][k]).join(',');
      const pLang = placeholders(tbl[k]).join(',');
      if (pBase !== pLang) {
        fail(`${name}[${lang}].${k} placeholder mismatch: expected [${pBase}], got [${pLang}]`);
      }
    }
  }
  console.log(`OK ${name}: ${baseKeys.length} keys x ${LOCALES.length} locales`);
}

// 1. Check js/i18n.js
const i18n = require(path.join(root, 'js/i18n.js'));
if (JSON.stringify([...i18n.SUPPORTED_LANGS].sort()) !== JSON.stringify([...LOCALES].sort())) {
  fail(`js/i18n.js SUPPORTED_LANGS mismatch: ${JSON.stringify(i18n.SUPPORTED_LANGS)}`);
}
checkKeyParity('js/i18n.js DICT', i18n.DICT);

// Check PALETTE_TIPS (4 entries per tip: uk, en, ru, pl)
const tipKeys = Object.keys(i18n.PALETTE_TIPS);
for (const k of tipKeys) {
  const arr = i18n.PALETTE_TIPS[k];
  if (!Array.isArray(arr) || arr.length !== 4 || arr.some((s) => typeof s !== 'string' || !s.trim())) {
    fail(`js/i18n.js PALETTE_TIPS["${k}"] must have 4 non-empty strings [uk, en, ru, pl]`);
  }
}
for (const fromLang of LOCALES) {
  const fromPath = fromLang === 'uk' ? '/pyScratch/' : `/pyScratch/${fromLang}/`;
  for (const toLang of LOCALES) {
    const expected = toLang === 'uk' ? '/pyScratch/' : `/pyScratch/${toLang}/`;
    const actual = i18n.getLangUrl(toLang, { pathname: fromPath, search: '', hash: '' });
    if (actual !== expected) {
      fail(`getLangUrl(${toLang}, ${fromPath}) returned "${actual}", expected "${expected}"`);
    }
  }
}
console.log(`OK js/i18n.js PALETTE_TIPS: ${tipKeys.length} entries x 4 locales`);

// 2. Check js/messages.js
const messages = require(path.join(root, 'js/messages.js'));
checkKeyParity('js/messages.js MESSAGES', messages.MESSAGES);

// 3. Check js/layout.js (load with minimal DOM stub)
const layoutSrc = fs.readFileSync(path.join(root, 'js/layout.js'), 'utf8');
// Expose L for key-parity inspection without modifying production runtime exports
const layoutInstrumented = layoutSrc.replace(
  'global.PyScratchLayout = {',
  'global.__LAYOUT_L = L; global.PyScratchLayout = {'
);
const layoutCtx = {
  window: undefined,
  globalThis: undefined,
  document: {
    documentElement: { lang: 'uk' },
    body: { classList: { toggle: () => {}, contains: () => false } },
    querySelectorAll: () => [],
    querySelector: () => null,
    getElementById: () => null,
    addEventListener: () => {},
    dispatchEvent: () => {}
  },
  CustomEvent: function CustomEvent() {},
  localStorage: { getItem: () => null, setItem: () => {} }
};
layoutCtx.window = layoutCtx;
layoutCtx.globalThis = layoutCtx;
vm.runInNewContext(layoutInstrumented, layoutCtx, { filename: 'js/layout.js' });
checkKeyParity('js/layout.js L', layoutCtx.__LAYOUT_L);

// 4. Check HTML entry points
function extractAttrKeys(html, attr) {
  const re = new RegExp(`\\b${attr}="([^"]+)"`, 'g');
  const set = new Set();
  let m;
  while ((m = re.exec(html)) !== null) set.add(m[1]);
  return [...set].sort();
}

const htmlI18nSets = {};
const htmlL10nSets = {};

for (const { file, lang } of HTML_FILES) {
  const fullPath = path.join(root, file);
  if (!fs.existsSync(fullPath)) {
    fail(`Missing HTML entry point: ${file}`);
    continue;
  }
  const html = fs.readFileSync(fullPath, 'utf8');

  const langMatch = html.match(/<html\s+lang="([^"]+)"/);
  if (!langMatch || langMatch[1] !== lang) {
    fail(`${file}: expected <html lang="${lang}">, got ${langMatch ? langMatch[1] : 'none'}`);
  }

  for (const hl of [...LOCALES, 'x-default']) {
    if (!new RegExp(`<link\\s+rel="alternate"\\s+hreflang="${hl}"`).test(html)) {
      fail(`${file}: missing hreflang="${hl}"`);
    }
  }

  for (const btnLang of LOCALES) {
    if (!new RegExp(`class="lang-btn[^"]*"[^>]*data-lang="${btnLang}"`).test(html)) {
      fail(`${file}: missing #menu-lang-list button for data-lang="${btnLang}"`);
    }
  }

  const i18nKeys = [
    ...extractAttrKeys(html, 'data-i18n'),
    ...extractAttrKeys(html, 'data-i18n-title'),
    ...extractAttrKeys(html, 'data-i18n-placeholder'),
    ...extractAttrKeys(html, 'data-i18n-aria')
  ];
  for (const k of i18nKeys) {
    if (!Object.prototype.hasOwnProperty.call(i18n.DICT.uk, k)) {
      fail(`${file}: unknown data-i18n* key "${k}"`);
    }
  }
  htmlI18nSets[file] = [...new Set(i18nKeys)].sort();

  const l10nKeys = [
    ...extractAttrKeys(html, 'data-l10n'),
    ...extractAttrKeys(html, 'data-l10n-title'),
    ...extractAttrKeys(html, 'data-l10n-aria')
  ];
  for (const k of l10nKeys) {
    if (!Object.prototype.hasOwnProperty.call(layoutCtx.__LAYOUT_L.uk, k)) {
      fail(`${file}: unknown data-l10n* key "${k}"`);
    }
  }
  htmlL10nSets[file] = [...new Set(l10nKeys)].sort();
}

const baseHtml = HTML_FILES[0].file;
for (const { file } of HTML_FILES.slice(1)) {
  if (!htmlI18nSets[file] || !htmlL10nSets[file]) continue;
  const a1 = JSON.stringify(htmlI18nSets[baseHtml]);
  const b1 = JSON.stringify(htmlI18nSets[file]);
  if (a1 !== b1) fail(`${file}: data-i18n* key set differs from ${baseHtml}`);

  const a2 = JSON.stringify(htmlL10nSets[baseHtml]);
  const b2 = JSON.stringify(htmlL10nSets[file]);
  if (a2 !== b2) fail(`${file}: data-l10n* key set differs from ${baseHtml}`);
}
console.log(`OK HTML entry points: ${HTML_FILES.length} files verified`);

// 5. Check sitemap.xml
const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
for (const lang of LOCALES) {
  const url = lang === 'uk' ? 'https://sivochka.com/pyScratch/' : `https://sivochka.com/pyScratch/${lang}/`;
  if (!sitemap.includes(`<loc>${url}</loc>`)) {
    fail(`sitemap.xml: missing <loc>${url}</loc>`);
  }
  if (!sitemap.includes(`hreflang="${lang}"`)) {
    fail(`sitemap.xml: missing hreflang="${lang}"`);
  }
}
console.log('OK sitemap.xml: all 4 locales present');

if (errors.length) {
  console.error(`\ni18n gate failed with ${errors.length} error(s):`);
  for (const e of errors) console.error(' - ' + e);
  process.exit(1);
}
console.log('\ni18n gate passed (100% parity across uk, en, pl, ru).');
