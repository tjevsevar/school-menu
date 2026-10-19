const assert = require('node:assert/strict');

const { _internals, handler } = require('../functions/menu');

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

function runNextWeekDateTests() {
  const cases = [
    ['2026-01-09', '2026-01-12'], // Friday
    ['2026-01-10', '2026-01-12'], // Saturday
    ['2026-01-11', '2026-01-12'], // Sunday
    ['2026-01-12', '2026-01-19'], // Monday always means the following week
    ['2026-12-31', '2027-01-04'],
    ['2026-03-27', '2026-03-30'], // Daylight saving begins
    ['2026-10-23', '2026-10-26'], // Daylight saving ends
  ];
  for (const [date, expected] of cases) {
    const days = _internals.getNextWeekDates(new Date(`${date}T12:00:00`));
    assert.equal(_internals.formatDateParts(days[0]).isoDate, expected);
    assert.equal(days[4].getDay(), 5);
  }
  const days = _internals.getNextWeekDates(new Date(2026, 0, 9, 12));
  assert.equal(_internals.selectWeekMenu([buildMenus()[0], buildMenus()[2]], days), null);
  assert.equal(_internals.selectWeekMenu(buildMenus(), days).text, 'Jedilnik 12.1.–16.1. 2026');
}

function weeklyHtml() {
  return `<table>${['PON', 'TOR', 'SRE', 'ČET', 'PET'].map((day) =>
    `<tr><th>${day}</th><td>kruh – G</td><td>kosilo ${day}</td><td>sadje</td></tr>`
  ).join('')}</table>`;
}

async function runWeeklyHandlerTests() {
  const originalFetch = global.fetch;
  const list = `
    <a href="/current">Jedilnik 5.1.–9.1. 2026</a>
    <a href="/next">Jedilnik 12.1.–16.1. 2026</a>
    <a href="/later">Jedilnik 19.1.–23.1. 2026</a>`;
  const calls = [];
  try {
    global.fetch = async (url) => {
      calls.push(url);
      return { ok: true, text: async () => url.endsWith('/prehrana/') ? list : weeklyHtml() };
    };
    for (const date of ['2026-01-09', '2026-01-10', '2026-01-11']) {
      calls.length = 0;
      const response = await handler({ queryStringParameters: { week: 'next', test_date: date } });
      const body = JSON.parse(response.body);
      assert.equal(body.success, true);
      assert.equal(body.week_start, '2026-01-12');
      assert.equal(body.week_end, '2026-01-16');
      assert.equal(body.days.length, 5);
      assert.ok(body.days.every((day) => day.success));
      assert.equal(body.days[4].meals.kosilo[0].name, 'kosilo PET');
      assert.deepEqual(body.days[0].meals.malica[0].allergens, ['G']);
      assert.deepEqual(calls, ['https://ostrbovlje.si/prehrana/', 'https://ostrbovlje.si/next']);
    }
    const daily = JSON.parse((await handler({ queryStringParameters: { date: '2026-01-09' } })).body);
    assert.equal(daily.source_url, 'https://ostrbovlje.si/current');

    global.fetch = async () => ({ ok: true, text: async () => `
      <a href="/old">Jedilnik 5.1.–9.1. 2026</a>
      <a href="/undated">Jedilnik</a>
      <a href="/later">Jedilnik 19.1.–23.1. 2026</a>` });
    const unavailable = JSON.parse((await handler({ queryStringParameters: {
      week: 'next', test_date: '2026-01-09',
    } })).body);
    assert.equal(unavailable.success, false);
    assert.equal(unavailable.reason, 'not-published');
    assert.equal(unavailable.week_start, '2026-01-12');

    const days = _internals.getNextWeekDates(new Date(2026, 0, 9, 12));
    const partial = _internals.parseWeekMenuPage(
      '<table><tr><th>TOR</th><td>kruh</td><td>juha</td><td>sadje</td></tr></table>',
      'Jedilnik 13.1.–16.1. 2026', 'https://ostrbovlje.si/next', days
    );
    assert.equal(partial.days[0].success, false);
    assert.equal(partial.days[1].success, true);

    global.fetch = async () => { throw new Error('Network offline'); };
    const error = JSON.parse((await handler({ queryStringParameters: {
      week: 'next', test_date: '2026-01-09',
    } })).body);
    assert.equal(error.success, false);
    assert.notEqual(error.reason, 'not-published');
  } finally {
    global.fetch = originalFetch;
  }
}

async function run() {
  runSelectionTests();
  runLinkParsingTests();
  runFoodParsingTests();
  runDateParsingTests();
  runMenuPageParsingTests();
  runNextWeekDateTests();
  await runWeeklyHandlerTests();
  console.log('All menu parser and API tests passed.');
}

run().then(() => setImmediate(() => process.exit(0))).catch((error) => {
  console.error(error);
  process.exit(1);
});
