// Dev-only: writes the set-or-individual `variants` blocks for Rubber Hex and
// Kettlebells into data/products.json. Real prices where the live catalog has
// them; the missing side is deduced at each product's own per-lb rate and
// flagged "placeholder": true. Re-runnable (slug-anchored, replaces the current
// "variants" object). Run: node tools/gen-soi-data.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const path = 'data/products.json';
let s = readFileSync(path, 'utf8');
const nl = s.includes('\r\n') ? '\r\n' : '\n';
const money = (n) => Math.round(n * 100) / 100;

// Rubber Hex: sets REAL ($1.465/lb); individual units = weight * 1.465 (placeholder).
const HEX_WEIGHTS = [2.5, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100, 105, 110, 115, 120, 125];
const rubberHex = {
  type: 'set-or-individual', default: 'bundle', bundleLabel: 'Set',
  bundles: [
    { label: '5 – 50 lb Set', price: 805.81 },
    { label: '55 – 100 lb Set', price: 2270.91 },
    { label: '105 – 125 lb Set', price: 1684.80 },
  ],
  individual: HEX_WEIGHTS.map((w) => ({ weight: `${w} lb`, price: money(w * 1.465), placeholder: true })),
};

// Kettlebells: individual weights REAL ($1.69/lb); packages = sum(weights)*1.69 (placeholder).
const KB = { 5: 8.45, 10: 16.90, 15: 25.35, 20: 33.80, 25: 42.25, 30: 50.70, 35: 59.15, 40: 67.60, 45: 76.05, 50: 84.50, 60: 101.40, 70: 118.30, 80: 135.20 };
const pack = (label, weights) => ({ label, price: money(weights.reduce((a, w) => a + w, 0) * 1.69), placeholder: true });
const kettlebells = {
  type: 'set-or-individual', default: 'individual', bundleLabel: 'Package',
  bundles: [
    pack('5 – 20 lb Pack', [5, 10, 15, 20]),
    pack('25 – 50 lb Pack', [25, 30, 35, 40, 45, 50]),
    pack('60 – 80 lb Pack', [60, 70, 80]),
  ],
  individual: Object.entries(KB).map(([w, price]) => ({ weight: `${w} lb`, price })),
};

// Build the "variants" block as text at 4-space base indent with the file's newline.
function block(v) {
  const opt = (o) => {
    const parts = Object.entries(o).map(([k, val]) =>
      `"${k}": ${typeof val === 'string' ? JSON.stringify(val) : val}`);
    return `        { ${parts.join(', ')} }`;
  };
  const bundles = v.bundles.map(opt).join(',' + nl);
  const individual = v.individual.map(opt).join(',' + nl);
  return [
    '"variants": {',
    '      "type": "set-or-individual",',
    `      "default": ${JSON.stringify(v.default)},`,
    `      "bundleLabel": ${JSON.stringify(v.bundleLabel)},`,
    '      "bundles": [',
    bundles,
    '      ],',
    '      "individual": [',
    individual,
    '      ]',
    '    }',
  ].join(nl);
}

const QTY_RE = /"variants": \{\r?\n\s*"type": "quantity"\r?\n\s*\}/;
for (const [slug, v] of [['rubber-hex-dumbbell-set', rubberHex], ['kettlebells', kettlebells]]) {
  const i = s.indexOf(`"slug": "${slug}"`);
  if (i === -1) throw new Error(`slug not found: ${slug}`);
  const m = s.slice(i).match(QTY_RE);
  if (!m) throw new Error(`quantity variants not found after ${slug}`);
  const abs = i + m.index;
  s = s.slice(0, abs) + block(v) + s.slice(abs + m[0].length);
  console.log(`set ${slug}: bundles=${v.bundles.length}, individual=${v.individual.length}`);
}
writeFileSync(path, s, 'utf8');
