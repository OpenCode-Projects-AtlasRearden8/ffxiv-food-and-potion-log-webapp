/*
 * Raid Night Pantry — offline FFXIV consumable log.
 * Unofficial FINAL FANTASY XIV fan content; not affiliated with Square Enix.
 * MIT licensed. Copyright (c) 2026 Asdale Dynamics, LLC.
 */
(function (globalScope) {
  'use strict';

  var APP_ID = 'raid-night-pantry';
  var STORAGE_KEYS = {
    logs: 'raid-night-pantry.logs.v1',
    stock: 'raid-night-pantry.stock.v1'
  };

  var TYPES = [
    { id: 'food', label: 'Food' },
    { id: 'potion', label: 'Potion (meds)' },
    { id: 'meld', label: 'Meld (materia)' }
  ];

  function typeLabel(typeId) {
    for (var i = 0; i < TYPES.length; i++) {
      if (TYPES[i].id === typeId) return TYPES[i].label;
    }
    return typeId ? String(typeId) : 'Other';
  }

  function uid() {
    return 'e-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  }

  function todayLocal() {
    var d = new Date();
    function p(n) { return (n < 10 ? '0' : '') + n; }
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }

  function fmtGil(amount) {
    var rounded = Math.round(Number(amount) || 0);
    return rounded.toLocaleString('en-US') + ' gil';
  }

  function defaultStock() {
    var samples = [
      { name: 'Tincture of Strength (HQ)', type: 'potion', count: 6, threshold: 6 },
      { name: 'Tincture of Dexterity (HQ)', type: 'potion', count: 3, threshold: 6 },
      { name: 'Tincture of Intelligence (HQ)', type: 'potion', count: 5, threshold: 6 },
      { name: 'Baked Eggplant', type: 'food', count: 12, threshold: 8 },
      { name: 'Sleeper Dice', type: 'food', count: 1, threshold: 4 },
      { name: 'Savage Aim Materia X', type: 'meld', count: 9, threshold: 6 },
      { name: 'Phoenix Down', type: 'potion', count: 2, threshold: 4 }
    ];
    return samples.map(function (item) {
      return {
        id: uid(),
        name: item.name,
        type: item.type,
        count: item.count,
        threshold: item.threshold
      };
    });
  }

  function createApp(env) {
    var storage = env.storage;
    var doc = env.doc;
    var state = loadState();
    var els = null;

    function loadState() {
      var logs = [];
      var stock = null;
      try {
        var rawLogs = storage.getItem(STORAGE_KEYS.logs);
        if (rawLogs) logs = JSON.parse(rawLogs);
      } catch (err) { logs = []; }
      try {
        var rawStock = storage.getItem(STORAGE_KEYS.stock);
        if (rawStock) stock = JSON.parse(rawStock);
      } catch (err) { stock = null; }

      if (!Array.isArray(logs)) logs = [];
      logs = logs.filter(function (log) {
        return log && typeof log === 'object' && typeof log.name === 'string' && log.name.trim() !== '';
      }).map(function (log) {
        return {
          id: log.id || uid(),
          date: typeof log.date === 'string' && log.date.trim() !== '' ? log.date : todayLocal(),
          name: log.name.trim(),
          type: isTypeValid(log.type) ? String(log.type) : 'food',
          qty: clampQty(log.qty),
          unitCost: clampCost(log.unitCost)
        };
      });

      if (!Array.isArray(stock)) stock = defaultStock();
      stock = stock.filter(function (item) {
        return item && typeof item === 'object' && typeof item.name === 'string' && item.name.trim() !== '';
      }).map(function (item) {
        return {
          id: item.id || uid(),
          name: item.name.trim(),
          type: typeof item.type === 'string' && item.type !== '' ? item.type : 'food',
          count: Math.max(0, Math.round(Number(item.count) || 0)),
          threshold: Math.max(0, Math.round(Number(item.threshold) || 0))
        };
      });

      return { logs: logs, stock: stock };
    }

    function isTypeValid(typeValue) {
      return TYPES.some(function (type) { return type.id === typeValue; });
    }

    function clampQty(value) {
      var n = Math.round(Number(value));
      return n >= 1 ? n : 1;
    }

    function clampCost(value) {
      var n = Number(value);
      if (!isFinite(n) || n < 0) return 0;
      return Math.round(n);
    }

    function save() {
      try {
        storage.setItem(STORAGE_KEYS.logs, JSON.stringify(state.logs));
        storage.setItem(STORAGE_KEYS.stock, JSON.stringify(state.stock));
      } catch (err) { /* storage may be full or unavailable; the app still works in-session */ }
    }

    function h(tag, attrs, children) {
      var node = doc.createElement(tag);
      if (attrs) {
        Object.keys(attrs).forEach(function (key) {
          if (key === 'value') return;
          if (key === 'text') return;
          node.setAttribute(key, String(attrs[key]));
        });
      }
      if (attrs && attrs.text !== undefined) node.textContent = String(attrs.text);
      if (children) {
        children.forEach(function (child) {
          if (child) node.appendChild(child);
        });
      }
      if (attrs && attrs.value !== undefined) node.value = String(attrs.value);
      return node;
    }

    function typeSelect(id) {
      var optionNodes = TYPES.map(function (type) {
        return h('option', { value: type.id, text: type.label });
      });
      return h('select', { id: id, value: 'food' }, optionNodes);
    }

    function field(labelText, hint, inputNode) {
      var label = h('label', { 'class': 'field-label', 'for': inputNode.getAttribute('id'), text: labelText });
      if (hint) label.appendChild(h('span', { 'class': 'field-hint', text: hint }));
      var wrap = h('div', { 'class': 'field' }, [label, inputNode]);
      return wrap;
    }

    function section(titleBadge, heading, bodyNodes) {
      var sectionNode = h('section', { 'class': 'panel', 'aria-labelledby': heading.getAttribute('id') });
      sectionNode.appendChild(heading);
      if (titleBadge) sectionNode.insertBefore(titleBadge, heading);
      bodyNodes.forEach(function (node) { sectionNode.appendChild(node); });
      return sectionNode;
    }

    function mount(root) {
      els = {};

      var logHeading = h('h2', { id: 'log-heading', text: 'Log a consumable' });
      els.logDate = h('input', { id: 'log-date', type: 'date', value: todayLocal() });
      els.logName = h('input', { id: 'log-name', type: 'text' });
      els.logType = typeSelect('log-type');
      els.logQty = h('input', { id: 'log-qty', type: 'number', min: '1', step: '1', value: '1' });
      els.logCost = h('input', { id: 'log-cost', type: 'number', min: '0', step: '1000', placeholder: '0' });
      els.logError = h('p', { id: 'log-error', 'class': 'error', role: 'alert' });
      els.logList = h('ul', { id: 'log-list', 'class': 'entry-list' });
      var logAddBtn = h('button', { 'class': 'btn', type: 'button', 'data-action': 'add-log', text: 'Add to log' });

      var logSection = section(null, logHeading, [
        field('Date', 'Which raid night this was', els.logDate),
        field('Item name', 'e.g. Tincture of Strength', els.logName),
        field('Type', 'Food, potions (meds), or melds (materia)', els.logType),
        field('Quantity used', 'How many you went through', els.logQty),
        field('Unit cost (gil)', 'What one costs to buy or craft', els.logCost),
        els.logError,
        h('div', { 'class': 'btn-row' }, [logAddBtn]),
        h('h3', { text: 'Logged consumables' }),
        els.logList
      ]);

      var stockHeading = h('h2', { id: 'stock-heading', text: 'Stock checklist' });
      els.stockName = h('input', { id: 'stock-name', type: 'text' });
      els.stockType = typeSelect('stock-type');
      els.stockCount = h('input', { id: 'stock-count', type: 'number', min: '0', step: '1', value: '0' });
      els.stockThreshold = h('input', { id: 'stock-threshold', type: 'number', min: '0', step: '1', value: '6' });
      els.stockError = h('p', { id: 'stock-error', 'class': 'error', role: 'alert' });
      els.stockList = h('ul', { id: 'stock-list', 'class': 'entry-list' });
      els.restockBanner = h('p', { id: 'restock-banner', 'class': 'banner', 'aria-live': 'polite', 'data-empty': 'true' });
      var stockAddBtn = h('button', { 'class': 'btn', type: 'button', 'data-action': 'add-stock', text: 'Add to checklist' });

      var stockSection = section(null, stockHeading, [
        els.restockBanner,
        h('p', { text: 'Restock reminder: an item shows a “restock soon” badge when the count on hand is at or below its threshold.' }),
        field('Item name', '', els.stockName),
        field('Type', '', els.stockType),
        field('Count on hand', 'How many you have right now', els.stockCount),
        field('Restock threshold', 'Remind me when I have this many or fewer', els.stockThreshold),
        els.stockError,
        h('div', { 'class': 'btn-row' }, [stockAddBtn]),
        h('h3', { text: 'On hand' }),
        els.stockList
      ]);

      var summaryHeading = h('h2', { id: 'summary-heading', text: 'Cost per raid night' });
      els.nightsSummary = h('div', { id: 'nights-summary', 'aria-live': 'polite' });

      var summarySection = section(null, summaryHeading, [els.nightsSummary]);

      els.exportBtn = h('button', { 'class': 'btn btn-quiet', type: 'button', 'data-action': 'export-data', text: 'Export JSON backup' });
      els.clearBtn = h('button', { 'class': 'btn btn-danger', type: 'button', 'data-action': 'clear-data', text: 'Clear all data' });
      els.importFile = h('input', { id: 'import-file', type: 'file', 'class': 'hidden-file', 'aria-label': 'Import JSON backup' });
      els.importFile.addEventListener('change', onImportFile);

      var heading = h('h1', { 'class': 'heading', text: 'Raid Night Pantry' });
      var tagline = h('p', { 'class': 'tagline', text: 'Log food, potions (meds) and melds for your raid nights, keep a restock checklist, and see what a night costs you — right here in your browser. No accounts, no internet needed, nothing leaves your device.' });

      var tools = h('div', { 'class': 'panel tools-panel' });
      tools.appendChild(heading);
      tools.appendChild(tagline);
      tools.appendChild(logSection);
      tools.appendChild(stockSection);
      tools.appendChild(summarySection);
      var footer = h('div', { 'class': 'tools' }, [
        els.importFile,
        els.exportBtn,
        els.clearBtn
      ]);
      tools.appendChild(footer);

      root.appendChild(tools);
      root.addEventListener('click', onRootClick);

      els.root = root;
      render();
      return els;
    }

    function onRootClick(ev) {
      var target = ev.target;
      if (!target || typeof target.closest !== 'function') return;
      var btn = target.closest('[data-action]');
      if (!btn) return;
      var action = btn.getAttribute('data-action');
      var id = btn.getAttribute('data-id') || null;

      if (action === 'add-log') addLog();
      else if (action === 'del-log') deleteLog(id);
      else if (action === 'add-stock') addStock();
      else if (action === 'del-stock') deleteStock(id);
      else if (action === 'use-stock') useStock(id);
      else if (action === 'restock-5') restockFive(id);
      else if (action === 'export-data') exportData();
      else if (action === 'clear-data') clearData();
    }

    function readNumber(input, fallback) {
      var n = Number(String(input.value).trim());
      return isFinite(n) ? n : fallback;
    }

    function addLog() {
      var name = String(els.logName.value || '').trim();
      var date = String(els.logDate.value || '').trim() || todayLocal();
      var typeId = String(els.logType.value || 'food');
      var qty = Math.round(readNumber(els.logQty, 0));
      var unitCost = readNumber(els.logCost, NaN);

      if (name === '') {
        els.logError.textContent = 'Give the item a name (e.g. “Tincture of Strength”).';
        return;
      }
      if (!isFinite(Number(String(els.logQty.value)))) {
        els.logError.textContent = 'Quantity needs to be a number (1 or more).';
        return;
      }
      var costRaw = String(els.logCost.value).trim();
      if (costRaw !== '' && !isFinite(Number(costRaw))) {
        els.logError.textContent = 'Unit cost needs to be a number of gil (empty or 0 is allowed).';
        return;
      }
      var cost = costRaw === '' ? 0 : Number(costRaw);

      els.logError.textContent = '';
      state.logs.unshift({
        id: uid(),
        date: date,
        name: name,
        type: typeId,
        qty: qty < 1 ? 1 : qty,
        unitCost: cost < 0 ? 0 : Math.round(cost)
      });
      els.logName.value = '';
      els.logQty.value = '1';
      els.logCost.value = '';
      save();
      render();
    }

    function deleteLog(id) {
      state.logs = state.logs.filter(function (log) { return log.id !== id; });
      save();
      render();
    }

    function addStock() {
      var name = String(els.stockName.value || '').trim();
      var typeId = String(els.stockType.value || 'food');
      var count = Math.round(readNumber(els.stockCount, NaN));
      var threshold = Math.round(readNumber(els.stockThreshold, NaN));

      if (name === '') {
        els.stockError.textContent = 'Give the item a name for your checklist.';
        return;
      }
      if (!isFinite(Number(String(els.stockCount.value)))) {
        els.stockError.textContent = 'Count on hand needs to be a number (0 or more).';
        return;
      }
      if (!isFinite(Number(String(els.stockThreshold.value)))) {
        els.stockError.textContent = 'Restock threshold needs to be a number (0 or more).';
        return;
      }

      els.stockError.textContent = '';
      state.stock.unshift({
        id: uid(),
        name: name,
        type: typeId,
        count: count < 0 ? 0 : count,
        threshold: threshold < 0 ? 0 : threshold
      });
      els.stockName.value = '';
      els.stockCount.value = '0';
      els.stockThreshold.value = '6';
      save();
      render();
    }

    function deleteStock(id) {
      state.stock = state.stock.filter(function (item) { return item.id !== id; });
      save();
      render();
    }

    function useStock(id) {
      state.stock = state.stock.map(function (item) {
        if (item.id !== id) return item;
        return Object.assign({}, item, { count: Math.max(0, item.count - 1) });
      });
      save();
      render();
    }

    function restockFive(id) {
      state.stock = state.stock.map(function (item) {
        if (item.id !== id) return item;
        return Object.assign({}, item, { count: item.count + 5 });
      });
      save();
      render();
    }

    function nightTotals() {
      var totals = {};
      var order = [];
      state.logs.forEach(function (log) {
        if (!totals[log.date]) {
          totals[log.date] = 0;
          order.push(log.date);
        }
        totals[log.date] += log.qty * log.unitCost;
      });
      return order.map(function (date) {
        return { date: date, total: totals[date] };
      }).sort(function (a, b) {
        // Newest night first, so callers and the summary agree.
        return a.date < b.date ? 1 : (a.date > b.date ? -1 : 0);
      });
    }

    function render() {
      renderLogs();
      renderStock();
      renderSummary();
    }

    function renderLogs() {
      els.logList.replaceChildren.apply(els.logList, []);
      if (state.logs.length === 0) {
        els.logList.appendChild(h('li', { 'class': 'empty-state', text: 'Nothing logged yet. Add your first raid-night item above — food, potions, or melds.' }));
        return;
      }
      var sorted = state.logs.slice().sort(function (a, b) {
        if (a.date !== b.date) return a.date < b.date ? 1 : -1;
        return 0;
      });
      sorted.forEach(function (log) {
        var removeBtn = h('button', {
          'class': 'btn btn-quiet btn-small',
          type: 'button',
          'data-action': 'del-log',
          'data-id': log.id,
          text: 'Remove',
          'aria-label': 'Remove ' + log.name + ' from the log for ' + log.date
        });
        els.logList.appendChild(h('li', { 'class': 'entry' }, [
          h('div', { 'class': 'entry-main' }, [
            h('span', { 'class': 'entry-title', text: log.name + ' × ' + log.qty }),
            h('span', { 'class': 'entry-meta', text: log.date + ' · ' + typeLabel(log.type) })
          ]),
          h('span', { 'class': 'entry-cost', text: fmtGil(log.qty * log.unitCost) }),
          removeBtn
        ]));
      });
    }

    function renderStock() {
      var lows = state.stock.filter(function (item) { return item.threshold >= item.count && item.threshold > 0; });
      if (lows.length > 0) {
        var names = lows.map(function (item) { return item.name + ' (have ' + item.count + ')'; }).join(', ');
        els.restockBanner.setAttribute('data-empty', 'false');
        els.restockBanner.textContent = 'Restock soon: ' + lows.length + (lows.length === 1 ? ' item is' : ' items are') + ' at or below threshold — ' + names + '.';
      } else {
        els.restockBanner.setAttribute('data-empty', 'true');
        els.restockBanner.textContent = '';
      }

      els.stockList.replaceChildren.apply(els.stockList, []);
      if (state.stock.length === 0) {
        els.stockList.appendChild(h('li', { 'class': 'empty-state', text: 'Your checklist is empty. Add what you stock before raid nights.' }));
        return;
      }
      state.stock.forEach(function (item) {
        var isLow = item.threshold >= item.count && item.threshold > 0;
        var badge = isLow ? h('span', { 'class': 'badge', text: 'restock soon' }) : null;
        var useBtn = h('button', {
          'class': 'btn btn-quiet btn-small',
          type: 'button',
          'data-action': 'use-stock',
          'data-id': item.id,
          text: '−1',
          'aria-label': 'Use one ' + item.name
        });
        var restockBtn = h('button', {
          'class': 'btn btn-quiet btn-small',
          type: 'button',
          'data-action': 'restock-5',
          'data-id': item.id,
          text: '+5',
          'aria-label': 'Restock five ' + item.name
        });
        var removeBtn = h('button', {
          'class': 'btn btn-danger btn-small',
          type: 'button',
          'data-action': 'del-stock',
          'data-id': item.id,
          text: 'Remove',
          'aria-label': 'Remove ' + item.name + ' from checklist'
        });
        var rowChildren = [
          h('div', { 'class': 'entry-main' }, [
            h('span', { 'class': 'entry-title', text: item.name }),
            h('span', { 'class': 'entry-meta', text: 'Have ' + item.count + ' · restock at ' + item.threshold + ' · ' + typeLabel(item.type) })
          ]),
          h('div', null, [useBtn, restockBtn, removeBtn])
        ];
        if (badge) rowChildren.splice(1, 0, badge);
        els.stockList.appendChild(h('li', { 'class': 'entry' }, rowChildren));
      });
    }

    function renderSummary() {
      els.nightsSummary.replaceChildren.apply(els.nightsSummary, []);
      var totals = nightTotals();
      if (totals.length === 0) {
        els.nightsSummary.appendChild(h('p', { 'class': 'empty-state', text: 'Log a consumable and each raid night’s running cost will show up here.' }));
        return;
      }
      totals.sort(function (a, b) { return a.date < b.date ? 1 : -1; });
      els.nightsSummary.appendChild(h('ul', { 'class': 'entry-list' }, totals.map(function (night) {
        return h('li', { 'class': 'night' }, [
          h('span', { 'class': 'night-date', text: night.date }),
          h('span', { 'class': 'night-total', text: fmtGil(night.total) })
        ]);
      })));
      var grandTotal = totals.reduce(function (sum, night) { return sum + night.total; }, 0);
      var average = grandTotal / totals.length;
      els.nightsSummary.appendChild(h('p', { 'class': 'summary-line', text: totals.length + (totals.length === 1 ? ' night' : ' nights') + ' logged · ' + fmtGil(grandTotal) + ' total · ' + fmtGil(average) + ' per night on average.' }));
    }

    function exportData() {
      if (typeof Blob === 'undefined' || typeof URL === 'undefined') return;
      var payload = {
        app: APP_ID,
        version: 1,
        exportedAt: new Date().toISOString(),
        logs: state.logs,
        stock: state.stock
      };
      var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var link = doc.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', 'raid-night-pantry-backup.json');
      link.click();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    }

    function clearData() {
      var dialogFn = typeof globalScope.confirm === 'function' ? globalScope.confirm : null;
      if (dialogFn && !dialogFn('Delete all logged consumables and checklist data? This cannot be undone.')) return;
      state = { logs: [], stock: [] };
      save();
      render();
    }

    function onImportFile(ev) {
      var input = ev && ev.target ? ev.target : els.importFile;
      var file = input.files && input.files[0];
      if (!file || typeof FileReader === 'undefined') return;
      var reader = new FileReader();
      reader.onload = function () {
        var text = String(reader.result || '');
        try {
          var parsed = JSON.parse(text);
          if (!parsed || parsed.app !== APP_ID || !Array.isArray(parsed.logs) || !Array.isArray(parsed.stock)) {
            return;
          }
          try {
            storage.setItem(STORAGE_KEYS.logs, JSON.stringify(parsed.logs.slice(0, 5000)));
            storage.setItem(STORAGE_KEYS.stock, JSON.stringify(parsed.stock.slice(0, 5000)));
          } catch (err) { /* keep going with in-memory state */ }
          state = loadState();
          render();
        } catch (err) {
          return;
        }
      };
      reader.readAsText(file);
    }

    return {
      mount: mount,
      addLog: addLog,
      addStock: addStock,
      deleteLog: deleteLog,
      deleteStock: deleteStock,
      useStock: useStock,
      restockFive: restockFive,
      nightTotals: nightTotals,
      todayLocal: todayLocal
    };
  }

  globalScope.RaidNightPantry = { createApp: createApp, defaultStock: defaultStock };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { createApp: createApp, defaultStock: defaultStock, STORAGE_KEYS: STORAGE_KEYS };
  }
  if (typeof document !== 'undefined' && typeof document.getElementById === 'function') {
      var bootRoot = document.getElementById('app');
    if (bootRoot && typeof bootRoot.appendChild === 'function' && typeof window !== 'undefined' && window.localStorage) {
      createApp({ storage: window.localStorage, doc: document }).mount(bootRoot);
    }
  }
})(typeof window !== 'undefined' ? window : globalThis);
