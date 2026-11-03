'use strict';
// Browser-boot smoke test: run app.js in a sandbox shaped like a real browser
// (document + window.localStorage) so the self-mount branch executes.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { FakeElement } = require('./harness');

const root = new FakeElement('div');
root.setAttribute('id', 'app');
const reg = new Map([['app', root]]);
const seenIds = new Set();
const documentStub = {
  getElementById: (id) => reg.get(id) || null,
  createElement: (tag) => {
    const el = new FakeElement(tag);
    const realSet = el.setAttribute.bind(el);
    el.setAttribute = (k, v) => {
      if (k === 'id') { reg.set(v, el); seenIds.add(v); }
      return realSet(k, v);
    };
    return el;
  }
};
const backing = new Map();
const windowStub = {
  document: documentStub,
  localStorage: {
    getItem: (k) => (backing.has(k) ? backing.get(k) : null),
    setItem: (k, v) => { backing.set(k, String(v)); },
    removeItem: (k) => { backing.delete(k); }
  }
};
windowStub.window = windowStub;

const source = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
vm.runInNewContext(source, { window: windowStub, document: documentStub, Blob: undefined, URL: undefined, setTimeout, Date, Math, JSON, Object, Array, String, Number, isFinite }, { timeout: 2000 });

// Weight-bearing element ids from the shell markup must have been created.
const required = ['log-date', 'log-name', 'log-type', 'log-qty', 'log-cost', 'stock-name', 'stock-count', 'stock-threshold'];
const missing = required.filter((id) => !seenIds.has(id));
if (missing.length) {
  console.error('MISSING app-rendered ids:', missing.join(', '));
  process.exit(1);
}
const text = root.textContent;
if (!/Raid Night Pantry/.test(text) || !/Tincture of Strength/.test(text)) {
  console.error('Auto-mount did not render the expected app content.');
  process.exit(1);
}
console.log('BROWSER BOOT OK: app self-mounted, ids =', seenIds.size, ', localStorage keys =', backing.size);
