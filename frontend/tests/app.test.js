const assert = require('node:assert/strict');
const app = require('../app');

class FakeClassList {
  constructor(element) {
    this.element = element;
  }

  add(className) {
    const classes = new Set(this.element.className.split(/\s+/).filter(Boolean));
    classes.add(className);
    this.element.className = [...classes].join(' ');
  }

  remove(className) {
    const classes = this.element.className
      .split(/\s+/)
      .filter((candidate) => candidate && candidate !== className);
    this.element.className = classes.join(' ');
  }

  contains(className) {
    return this.element.className.split(/\s+/).includes(className);
  }

  toggle(className) {
    if (this.contains(className)) {
      this.remove(className);
      return false;
    }
    this.add(className);
    return true;
  }
}

class FakeElement {
  constructor(tagName, id) {
    this.tagName = tagName.toUpperCase();
    this.id = id || '';
    this.children = [];
    this.parentElement = null;
    this.className = '';
    this.dataset = {};
    this.style = {};
    this.href = '';
    this.disabled = false;
    this._text = '';
    this._innerHTML = '';
    this.classList = new FakeClassList(this);
  }

  set textContent(value) {
    this._text = String(value);
    this.children = [];
    this._innerHTML = '';
  }

  get textContent() {
    return this._text + this.children.map((child) => child.textContent).join('');
  }

  set innerHTML(value) {
    this._innerHTML = String(value);
    this._text = '';
    this.children = [];
  }

  get innerHTML() {
    return this._innerHTML;
  }

  appendChild(child) {
    child.parentElement = this;
    this.children.push(child);
    return child;
  }

  addEventListener() {}

  closest(selector) {
    if (!selector.startsWith('.')) {
      return null;
    }
    const className = selector.slice(1);
    let current = this;
    while (current) {
      if (current.classList.contains(className)) {
        return current;
      }
      current = current.parentElement;
    }
    return null;
  }
}

class FakeDocument {
  constructor() {
    this.elements = new Map();
  }

  createElement(tagName) {
    return new FakeElement(tagName);
  }

  getElementById(id) {
    if (!this.elements.has(id)) {
      this.elements.set(id, new FakeElement('div', id));
    }
    return this.elements.get(id);
  }

  addEventListener() {}

  querySelectorAll(selector) {
    if (!selector.startsWith('.')) {
      return [];
    }
    const className = selector.slice(1);
    const matches = [];
    this.elements.forEach((element) => {
      walk(element, (candidate) => {
        if (candidate.classList.contains(className)) {
          matches.push(candidate);
        }
      });
    });
    return matches;
  }
}

function walk(element, visitor) {
  visitor(element);
  element.children.forEach((child) => walk(child, visitor));
}

function findTag(element, tagName) {
  let found = null;
  walk(element, (candidate) => {
    if (!found && candidate.tagName === tagName.toUpperCase()) {
      found = candidate;
    }
  });
  return found;
}

function setupDocument() {
  const documentRef = new FakeDocument();
  [
    'currentDay',
    'menuLink',
    'menuDateRange',
    'loading',
    'menuContent',
    'allergenInfo',
    'lastUpdate',
    'feedbackBtn',
  ].forEach((id) => documentRef.getElementById(id));

  documentRef.getElementById('allergenInfo').className = 'hidden';
  documentRef.getElementById('loading').className = 'hidden';
  return documentRef;
}

async function testLegacyMenuNormalization() {
  const normalized = app.normalizeMenuData({
    success: true,
    menu: [
      '🥗 MALICA: kruh – G | banana',
      '🍝 KOSILO: juha – L, GS',
      '🍎 POP. MALICA: jogurt – L',
    ].join('\n'),
  });

  assert.deepEqual(normalized.meals.malica, [
    { name: 'kruh', allergens: ['G'], raw: 'kruh – G' },
    { name: 'banana', allergens: [], raw: 'banana' },
  ]);
  assert.deepEqual(normalized.meals.kosilo[0].allergens, ['L', 'GS']);
  assert.equal(normalized.meals.popMalica[0].name, 'jogurt');
}

async function testStructuredMenuNormalization() {
  const normalized = app.normalizeMenuData({
    success: true,
    meals: {
      malica: [{ name: 'sadje', allergens: [], raw: 'sadje' }],
    },
  });

  assert.equal(normalized.meals.malica.length, 1);
  assert.deepEqual(normalized.meals.kosilo, []);
  assert.deepEqual(normalized.meals.popMalica, []);
}

async function testFoodNamesRenderAsText() {
  const documentRef = setupDocument();
  const menuContent = documentRef.getElementById('menuContent');

  app.displayMenu(
    {
      success: true,
      meals: {
        malica: [
          {
            name: '<img src=x onerror="window.__bad = true"> kruh',
            allergens: ['G'],
            raw: '<img src=x onerror="window.__bad = true"> kruh – G',
          },
        ],
        kosilo: [],
        popMalica: [],
      },
    },
    documentRef
  );

  assert.equal(findTag(menuContent, 'img'), null);
  assert.match(
    menuContent.textContent,
    /<img src=x onerror="window.__bad = true"> kruh/
  );
}

async function testAllergenBadgesDoNotUseDaisyTooltipClass() {
  const documentRef = setupDocument();

  app.displayMenu(
    {
      success: true,
      meals: {
        malica: [{ name: 'kruh', allergens: ['G'], raw: 'kruh – G' }],
        kosilo: [],
        popMalica: [],
      },
    },
    documentRef
  );

  const badges = documentRef.querySelectorAll('.allergen-badge');
  assert.equal(badges.length, 1);
  assert.equal(badges[0].classList.contains('tooltip'), false);
}

async function testTooltipPositionClampsInsideViewport() {
  const position = app.calculateTooltipPosition(
    { left: 1180, right: 1210, top: 420, bottom: 450, width: 30, height: 30 },
    { width: 180, height: 34 },
    1240,
    800
  );

  assert.equal(position.placement, 'top');
  assert.ok(position.left >= 10);
  assert.ok(position.left + 180 <= 1230);
  assert.equal(position.left, 1050);
}

async function testTooltipPositionMovesBelowNearTopEdge() {
  const position = app.calculateTooltipPosition(
    { left: 40, right: 70, top: 8, bottom: 38, width: 30, height: 30 },
    { width: 130, height: 34 },
    390,
    844
  );

  assert.equal(position.placement, 'bottom');
  assert.ok(position.top >= 46);
  assert.ok(position.left >= 10);
}

async function testErrorMessageRendersSafely() {
  const documentRef = setupDocument();
  const menuContent = documentRef.getElementById('menuContent');

  app.displayMenu(
    { success: false, menu: 'Napaka <script>alert(1)</script>' },
    documentRef
  );

  assert.equal(findTag(menuContent, 'script'), null);
  assert.match(menuContent.textContent, /Napaka <script>alert\(1\)<\/script>/);
}

async function testFetchFlow() {
  const documentRef = setupDocument();
  const calls = [];
  const fetchMock = async (url, options) => {
    calls.push([url, options]);
    return {
      ok: true,
      json: async () => ({
        success: true,
        date_range: '12.1.–16.1. 2026',
        source_url: 'https://ostrbovlje.si/prehrana/jedilnik/test',
        meals: {
          malica: [{ name: 'banana', allergens: [], raw: 'banana' }],
          kosilo: [],
          popMalica: [],
        },
      }),
    };
  };

  await app.fetchMenuInfo(documentRef, fetchMock);

  assert.deepEqual(calls, [['/api/menu', { cache: 'no-store' }]]);
  assert.equal(
    documentRef.getElementById('menuDateRange').textContent,
    'Jedilnik 12.1.–16.1. 2026'
  );
  assert.equal(
    documentRef.getElementById('menuLink').href,
    'https://ostrbovlje.si/prehrana/jedilnik/test'
  );
  assert.match(documentRef.getElementById('menuContent').textContent, /banana/);
}

async function testFetchFlowForSelectedDate() {
  const documentRef = setupDocument();
  const calls = [];
  const fetchMock = async (url, options) => {
    calls.push([url, options]);
    return {
      ok: true,
      json: async () => ({
        success: true,
        date_range: '1.6.–5.6. 2026',
        source_url: 'https://ostrbovlje.si/prehrana/jedilnik/test',
        menu: [
          '🥗 MALICA: banana',
          '🍝 KOSILO: riž',
          '🍎 POP. MALICA: voda',
        ].join('\n'),
      }),
    };
  };

  await app.fetchMenuInfo(documentRef, fetchMock, new Date(2026, 5, 3, 12));

  assert.deepEqual(calls, [
    ['/api/menu?test_date=2026-06-03', { cache: 'no-store' }],
  ]);
  assert.equal(
    documentRef.getElementById('currentDay').textContent,
    'Sreda, 03.06.2026'
  );
  assert.match(documentRef.getElementById('menuContent').textContent, /riž/);
}

async function run() {
  await testLegacyMenuNormalization();
  await testStructuredMenuNormalization();
  await testFoodNamesRenderAsText();
  await testAllergenBadgesDoNotUseDaisyTooltipClass();
  await testTooltipPositionClampsInsideViewport();
  await testTooltipPositionMovesBelowNearTopEdge();
  await testErrorMessageRendersSafely();
  await testFetchFlow();
  await testFetchFlowForSelectedDate();
  console.log('All frontend app tests passed.');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
