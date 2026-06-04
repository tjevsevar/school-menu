const assert = require('node:assert/strict');

const { _internals } = require('../functions/menu');

function dateUtc(year, month, day) {
  return new Date(Date.UTC(year, month - 1, day));
}

function buildMenus() {
  return [
    {
      url: 'https://ostrbovlje.si/prehrana/jedilnik/jedilnik-430',
      text: 'Jedilnik 5.1.–9.1. 2026',
      startDate: dateUtc(2026, 1, 5),
      endDate: dateUtc(2026, 1, 9),
    },
    {
      url: 'https://ostrbovlje.si/prehrana/jedilnik/jedilnik-431',
      text: 'Jedilnik 12.1.–16.1. 2026',
      startDate: dateUtc(2026, 1, 12),
      endDate: dateUtc(2026, 1, 16),
    },
    {
      url: 'https://ostrbovlje.si/prehrana/jedilnik/jedilnik-432',
      text: 'Jedilnik 19.1.–23.1. 2026',
      startDate: dateUtc(2026, 1, 19),
      endDate: dateUtc(2026, 1, 23),
    },
  ];
}

function runSelectionTests() {
  const menus = buildMenus();

  const mondayNextWeek = dateUtc(2026, 1, 12);
  const selectedMonday = _internals.selectMenu(menus, [], mondayNextWeek, false);
  assert.equal(selectedMonday.text, 'Jedilnik 12.1.–16.1. 2026');

  const nextFriday = dateUtc(2026, 1, 16);
  const selectedFriday = _internals.selectMenu(menus, [], nextFriday, true);
  assert.equal(selectedFriday.text, 'Jedilnik 12.1.–16.1. 2026');

  const publishedEarlyFriday = dateUtc(2026, 1, 9);
  const selectedEarly = _internals.selectMenu(menus, [], publishedEarlyFriday, true);
  assert.equal(selectedEarly.text, 'Jedilnik 5.1.–9.1. 2026');

  const afterLastMenu = dateUtc(2026, 2, 2);
  const selectedAfterLast = _internals.selectMenu(menus, [], afterLastMenu, false);
  assert.equal(selectedAfterLast, null);
}

function runLinkParsingTests() {
  const html = `
    <a href="/prehrana/jedilnik/current">Jedilnik 12.1.-16.1. 2026</a>
    <a href="https://ostrbovlje.si/prehrana/jedilnik/next">Jedilnik 19.1.–23.1. 2026</a>
    <a href="/novice">Novice</a>
  `;
  const { menus, fallbackLinks } = _internals.parseMenuLinks(html);

  assert.equal(menus.length, 2);
  assert.equal(fallbackLinks.length, 0);
  assert.equal(menus[0].url, 'https://ostrbovlje.si/prehrana/jedilnik/current');
  assert.equal(menus[0].startDate.toISOString(), '2026-01-12T00:00:00.000Z');
  assert.equal(menus[1].url, 'https://ostrbovlje.si/prehrana/jedilnik/next');
}

function runFoodParsingTests() {
  assert.deepEqual(_internals.parseFoodItem('kruh – G, J'), {
    name: 'kruh',
    allergens: ['G', 'J'],
    raw: 'kruh – G, J',
  });
  assert.deepEqual(_internals.parseFoodItem('sadje'), {
    name: 'sadje',
    allergens: [],
    raw: 'sadje',
  });
}

function runDateParsingTests() {
  const parsed = _internals.parseIsoDate('2026-06-03');
  assert.equal(parsed.toISOString(), '2026-06-03T12:00:00.000Z');
  assert.equal(_internals.parseIsoDate('2026/06/03'), null);
  assert.equal(_internals.parseIsoDate(undefined), null);
}

function runMenuPageParsingTests() {
  const html = `
    <table>
      <tr>
        <th>PON</th>
        <td>monday snack</td>
        <td>monday lunch</td>
        <td>monday pop</td>
      </tr>
      <tr>
        <th>PET</th>
        <td>pet snack – G
banana</td>
        <td>pet lunch – L, GS</td>
        <td>pet pop</td>
      </tr>
    </table>
  `;

  const friday = new Date(Date.UTC(2026, 0, 16, 10, 0, 0));
  const menuData = _internals.parseMenuPage(
    html,
    'Jedilnik 12.1.–16.1. 2026',
    'https://ostrbovlje.si/prehrana/jedilnik/jedilnik-431',
    friday
  );

  assert.equal(menuData.success, true);
  assert.equal(menuData.date, '2026-01-16');
  assert.equal(menuData.day.short, 'PET');
  assert.equal(menuData.date_range, '12.1.–16.1. 2026');
  assert.deepEqual(menuData.meals.malica, [
    { name: 'pet snack', allergens: ['G'], raw: 'pet snack – G' },
    { name: 'banana', allergens: [], raw: 'banana' },
  ]);
  assert.deepEqual(menuData.meals.kosilo, [
    { name: 'pet lunch', allergens: ['L', 'GS'], raw: 'pet lunch – L, GS' },
  ]);
  assert.ok(menuData.menu.includes('PET, 16.01'));
  assert.ok(menuData.menu.includes('pet snack–G'));
  assert.ok(menuData.menu.includes('pet lunch–L, GS'));
}

runSelectionTests();
runLinkParsingTests();
runFoodParsingTests();
runDateParsingTests();
runMenuPageParsingTests();

console.log('All menu parser tests passed.');
setImmediate(() => process.exit(0));
