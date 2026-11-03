'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { createApp } = require('../app.js');
const {
  fakeDoc,
  fakeStorage,
  findButtons,
  findAll,
  click
} = require('./harness');

function setup(storageInitial) {
  const doc = fakeDoc();
  const storage = fakeStorage(storageInitial);
  const app = createApp({ storage, doc });
  const ui = app.mount(doc.createElement('div'));
  return { app, ui, storage };
}

function clickOne(ui, action, dataId) {
  const candidates = findButtons(ui.root, action);
  const btn = dataId ? candidates.find((b) => b.attributes['data-id'] === dataId) : candidates[0];
  assert.ok(btn, `expected a ${action} button to click`);
  click(btn);
  return btn;
}

function logRowForText(ui, needle) {
  return findAll(ui.root, (n) => n.tagName === 'li' && n.textContent.includes(needle));
}

test('mounts with a seeded default checklist when storage is empty', () => {
  const { ui } = setup();
  const rows = findAll(ui.root, (n) => n.tagName === 'li');
  const names = rows.map((r) => r.textContent).join('\n');
  assert.match(names, /Tincture of Strength/);
  assert.match(names, /Savage Aim Materia X/);
  assert.ok(findAll(ui.root, (n) => n.textContent.includes('Baked Eggplant')).length > 0);
});

test('shows the app title and warm intro copy', () => {
  const { ui } = setup();
  assert.match(ui.root.textContent, /Raid Night Pantry/);
  assert.match(ui.root.textContent, /no accounts/i);
});

test('every field input has a matching label for screen readers', () => {
  const { ui } = setup();
  const ids = ['log-date', 'log-name', 'log-type', 'log-qty', 'log-cost', 'stock-name', 'stock-type', 'stock-count', 'stock-threshold'];
  ids.forEach((id) => {
    const labels = findAll(ui.root, (n) => n.tagName === 'label' && n.getAttribute('for') === id);
    assert.ok(labels.length === 1, `label missing for input ${id}`);
  });
});

test('rejects a log entry without a name and explains why', () => {
  const { app, ui } = setup();
  clickOne(ui, 'add-log');
  assert.match(ui.logError.textContent, /Give the item a name/);
  assert.strictEqual(app.nightTotals().length, 0);
});

test('adds a log entry with quantity math and shows the cost', () => {
  const { app, ui } = setup();
  ui.logName.value = 'Tincture of Strength (HQ)';
  ui.logType.value = 'potion';
  ui.logQty.value = '2';
  ui.logCost.value = '5000';
  clickOne(ui, 'add-log');

  const row = logRowForText(ui, 'Tincture of Strength');
  assert.ok(row.length >= 1, 'log row missing');
  assert.match(row[0].textContent, /× 2/);
  assert.match(row[0].textContent, /10,000 gil/);
  assert.match(row[0].textContent, /Potion \(meds\)/);
  assert.strictEqual(app.nightTotals()[0].total, 10000);
  assert.match(ui.root.textContent, /10,000 gil/);
});

test('blank quantity defaults to 1 and blank cost to 0 gil', () => {
  const { app, ui } = setup();
  ui.logName.value = 'Baked Eggplant';
  ui.logQty.value = '';
  ui.logCost.value = '';
  clickOne(ui, 'add-log');
  assert.strictEqual(app.nightTotals()[0].total, 0);
});

test('cost per night groups multiple entries by date with an average', () => {
  const { app, ui } = setup();
  ui.logDate.value = '2026-11-01';
  ui.logName.value = 'Tincture of Strength (HQ)';
  ui.logCost.value = '5000';
  clickOne(ui, 'add-log');

  ui.logDate.value = '2026-11-01';
  ui.logName.value = 'Baked Eggplant';
  ui.logCost.value = '2000';
  clickOne(ui, 'add-log');

  ui.logDate.value = '2026-10-25';
  ui.logName.value = 'Savage Aim Materia X';
  ui.logCost.value = '30000';
  clickOne(ui, 'add-log');

  const totals = app.nightTotals().map((n) => ({ date: n.date, total: n.total }));
  assert.deepStrictEqual(totals, [
    { date: '2026-11-01', total: 7000 },
    { date: '2026-10-25', total: 30000 }
  ]);
  const text = ui.root.textContent;
  assert.match(text, /37,000 gil total/);
  assert.match(text, /18,500 gil per night on average/);
});

test('removing a log entry updates the night totals', () => {
  const { app, ui } = setup();
  ui.logName.value = 'Baked Eggplant';
  ui.logCost.value = '2000';
  clickOne(ui, 'add-log');
  clickOne(ui, 'del-log');
  assert.strictEqual(app.nightTotals().length, 0);
  assert.match(ui.root.textContent, /Nothing logged yet/);
});

test('using one stock item decrements the count (never below 0)', () => {
  const { ui } = setup();
  const diceRow = findAll(ui.root, (n) => n.tagName === 'li' && n.textContent.includes('Sleeper Dice'))[0];
  assert.ok(diceRow, 'Sleeper Dice row missing');
  const useBtn = findAll(diceRow, (n) => n.tagName === 'button' && n.attributes['data-action'] === 'use-stock')[0];
  click(useBtn);
  click(useBtn);
  const diceRow2 = findAll(ui.root, (n) => n.tagName === 'li' && n.textContent.includes('Sleeper Dice'))[0];
  assert.match(diceRow2.textContent, /Have 0/);
});

test('restocking +5 takes an item off the restock-soon reminder', () => {
  const { ui } = setup();
  const find = () => findAll(ui.root, (n) => n.tagName === 'li' && n.textContent.includes('Sleeper Dice'))[0];
  assert.match(find().textContent, /restock soon/);
  assert.match(ui.restockBanner.textContent, /Sleeper Dice/);

  const restockBtn = findAll(find(), (n) => n.tagName === 'button' && n.attributes['data-action'] === 'restock-5')[0];
  click(restockBtn);
  // Sleeper Dice now has 6 vs threshold 4, so it should drop off the banner
  // even though items sitting exactly *at* threshold (6 of 6 tinctures) rightly stay.
  assert.match(find().textContent, /Have 6 · restock at 4/);
  assert.doesNotMatch(find().textContent, /restock soon/);
  assert.doesNotMatch(ui.restockBanner.textContent, /Sleeper Dice/);
  assert.match(ui.restockBanner.textContent, /Restock soon/); // at-threshold items remain
});

test('adds and removes a custom stock item', () => {
  const { ui } = setup();
  ui.stockName.value = 'Honey Muffin';
  ui.stockCount.value = '3';
  ui.stockThreshold.value = '10';
  clickOne(ui, 'add-stock');

  const row = findAll(ui.root, (n) => n.tagName === 'li' && n.textContent.includes('Honey Muffin'))[0];
  assert.match(row.textContent, /Have 3 · restock at 10/);
  assert.match(row.textContent, /restock soon/);

  const removeBtn = findAll(row, (n) => n.tagName === 'button' && n.attributes['data-action'] === 'del-stock')[0];
  click(removeBtn);
  assert.strictEqual(findAll(ui.root, (n) => n.tagName === 'li' && n.textContent.includes('Honey Muffin')).length, 0);
});

test('stock validation blocks an unnamed checklist row', () => {
  const { ui } = setup();
  clickOne(ui, 'add-stock');
  assert.match(ui.stockError.textContent, /Give the item a name/);
});

test('data persists across app instances sharing the same storage', () => {
  const first = setup();
  first.ui.logName.value = 'Tincture of Dexterity (HQ)';
  first.ui.logCost.value = '4500';
  clickOne(first.ui, 'add-log');

  const second = setup({
    'raid-night-pantry.logs.v1': first.storage.getItem('raid-night-pantry.logs.v1'),
    'raid-night-pantry.stock.v1': first.storage.getItem('raid-night-pantry.stock.v1')
  });
  assert.strictEqual(second.app.nightTotals()[0].total, 4500);
  assert.match(second.ui.root.textContent, /Tincture of Dexterity \(HQ\)/);
  assert.match(second.ui.root.textContent, /Tincture of Strength/); // stock loaded too
});

test('corrupt or hostile storage payloads fall back to safe defaults', () => {
  const broken = new Map();
  broken.set('raid-night-pantry.logs.v1', '{not json at all]');
  broken.set('raid-night-pantry.stock.v1', '[[[[null');
  const doc = fakeDoc();
  const app = createApp({ storage: fakeStorage(Object.fromEntries(broken)), doc });
  const ui = app.mount(doc.createElement('div'));
  assert.strictEqual(app.nightTotals().length, 0);
  assert.match(ui.root.textContent, /Tincture of Strength/); // default checklist re-seeded
});

test('entry rows expose screen-reader labels for their action buttons', () => {
  const { ui } = setup();
  ui.logName.value = 'Baked Eggplant';
  ui.logCost.value = '1000';
  clickOne(ui, 'add-log');
  const removeBtns = findButtons(ui.root, 'del-log');
  assert.match(removeBtns[0].getAttribute('aria-label'), /Remove Baked Eggplant/);
});

test('aria-live regions exist for the restock banner and summary', () => {
  const { ui } = setup();
  assert.strictEqual(ui.restockBanner.getAttribute('aria-live'), 'polite');
  assert.strictEqual(ui.nightsSummary.getAttribute('aria-live'), 'polite');
});

test('clear-data wipes logs and stock when no confirm dialog is available', () => {
  const { app, ui, storage } = setup();
  ui.logName.value = 'Baked Eggplant';
  ui.logCost.value = '1000';
  clickOne(ui, 'add-log');
  const rootClickBtn = findButtons(ui.root, 'clear-data')[0];
  click(rootClickBtn);
  assert.strictEqual(app.nightTotals().length, 0);
  assert.strictEqual(JSON.parse(storage.getItem('raid-night-pantry.logs.v1')).length, 0);
  assert.strictEqual(JSON.parse(storage.getItem('raid-night-pantry.stock.v1')).length, 0);
});
