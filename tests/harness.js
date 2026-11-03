/*
 * Lightweight DOM harness: a tiny fake DOM just rich enough for app.js.
 * No dependencies, no headless browser. Uses only bubbling events and
 * data-attribute delegation, which is all the app relies on.
 */
'use strict';

class FakeElement {
  constructor(tag) {
    this.tagName = tag;
    this.children = [];
    this.attributes = {};
    this.listeners = {};
    this.parentNode = null;
    this.value = '';
    this.checked = false;
    this.files = null;
    this._text = '';
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
    return value;
  }

  getAttribute(name) {
    const value = this.attributes[name];
    return value === undefined ? null : value;
  }

  get className() {
    return this.attributes['class'] || '';
  }

  get dataset() {
    const data = {};
    Object.keys(this.attributes).forEach((key) => {
      if (key.startsWith('data-')) {
        const prop = key.slice(5).replace(/-([a-z])/g, (m, c) => c.toUpperCase());
        data[prop] = this.attributes[key];
      }
    });
    return data;
  }

  get textContent() {
    let text = this._text;
    this.children.forEach((child) => {
      text += child.textContent;
    });
    return text;
  }

  set textContent(value) {
    this._text = String(value);
    this.children = [];
  }

  appendChild(child) {
    if (child && child.parentNode) {
      const siblings = child.parentNode.children;
      const idx = siblings.indexOf(child);
      if (idx !== -1) siblings.splice(idx, 1);
    }
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  replaceChildren(...nodes) {
    this.children.forEach((child) => {
      child.parentNode = null;
    });
    this.children = [];
    nodes.forEach((node) => this.appendChild(node));
  }

  get classList() {
    const self = this;
    function parts() {
      return (self.attributes['class'] || '').split(/\s+/).filter(Boolean);
    }
    function write(list) {
      self.setAttribute('class', list.join(' ').trim());
    }
    return {
      add(...names) { write([...new Set([...parts(), ...names])]); },
      remove(...names) { write(parts().filter((n) => !names.includes(n))); },
      toggle(name) { parts().includes(name) ? this.remove(name) : this.add(name); },
      contains(name) { return parts().includes(name); }
    };
  }

  addEventListener(type, handler) {
    (this.listeners[type] = this.listeners[type] || []).push(handler);
  }

  dispatchEvent(event) {
    let node = this;
    while (node) {
      const handlers = node.listeners[event.type] || [];
      handlers.slice().forEach((handler) => handler.call(node, event));
      node = node.parentNode;
    }
    return true;
  }

  closest(selector) {
    const match = selector.match(/^\[([^\]=]+)(?:="([^"]*)")?\]$/);
    if (!match) return null;
    const [, attr, value] = match;
    let node = this;
    while (node instanceof FakeElement) {
      const own = node.getAttribute(attr);
      if (own !== null && (value === undefined || own === value)) return node;
      node = node.parentNode;
    }
    return null;
  }

  click() {
    this.dispatchEvent({ type: 'click', target: this, preventDefault() {}, stopPropagation() {} });
  }
}

function click(node) {
  // Bubble a synthetic click up to any delegated listener (e.g. the app root).
  node.dispatchEvent({ type: 'click', target: node, preventDefault() {}, stopPropagation() {} });
}

function clickRoot(root) {
  root.dispatchEvent({ type: 'click', target: root, preventDefault() {}, stopPropagation() {} });
}

function findAll(node, predicate, out = []) {
  (node.children || []).forEach((child) => {
    if (predicate(child)) out.push(child);
    findAll(child, predicate, out);
  });
  return out;
}

// FakeElement exposes tagName directly, so findButtons just needs the
// app's delegated data-action attributes.
function findButtons(root, action) {
  return findAll(root, (n) => n instanceof FakeElement && n.tagName === 'button' && n.attributes['data-action'] === action);
}

function findText(roots, needle) {
  return findAll(roots, (n) => typeof n._text === 'string' && n._text.includes(needle));
}

function fakeDoc() {
  const registry = new Map();
  return {
    getElementById(id) {
      return registry.get(id) || null;
    },
    createElement(tag) {
      const el = new FakeElement(tag);
      return el;
    },
    registerId(el, id) {
      registry.set(id, el);
    }
  };
}

function fakeStorage(initial) {
  const map = new Map(Object.entries(initial || {}));
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => { map.set(key, String(value)); },
    removeItem: (key) => { map.delete(key); }
  };
}

module.exports = { FakeElement, fakeDoc, fakeStorage, findButtons, findText, findAll, click, clickRoot };
