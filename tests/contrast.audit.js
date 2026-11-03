'use strict';
// WCAG AA contrast audit of the shipped palette (WCAG 2.2, 1.4.3 / 1.4.6).
function lum(hex) {
  const c = hex.replace('#', '');
  const rgb = [0, 1, 2].map((i) => parseInt(c.slice(i * 2, i * 2 + 2), 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}
function ratio(a, b) {
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}
const pairs = [
  ['body text on background', '#3d2c20', '#f8efe3', 4.5],
  ['muted text on background', '#5d4a3a', '#f8efe3', 4.5],
  ['muted text on panel', '#5d4a3a', '#fffdf9', 4.5],
  ['body text on panel', '#3d2c20', '#fffdf9', 4.5],
  ['primary button text', '#ffffff', '#6b3b12', 4.5],
  ['primary hover text', '#ffffff', '#55300e', 4.5],
  ['danger button text', '#ffffff', '#8c2f1b', 4.5],
  ['badge text', '#7a2e0e', '#fbe9d7', 4.5],
  ['quiet button text on panel', '#6b3b12', '#fffdf9', 4.5],
  ['footer muted on panel', '#5d4a3a', '#fffdf9', 4.5]
];
let failed = 0;
for (const [name, fg, bg, min] of pairs) {
  const r = ratio(fg, bg);
  const ok = r >= min;
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${r.toFixed(2)}:1 (need ${min}:1) — ${name}`);
}
process.exit(failed ? 1 : 0);
