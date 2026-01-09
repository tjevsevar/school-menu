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
}

function runParsingTests() {
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
        <td>pet snack</td>
        <td>pet lunch</td>
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
  assert.ok(menuData.menu.includes('PET, 16.01'));
  assert.ok(menuData.menu.includes('pet snack'));
  assert.ok(menuData.menu.includes('pet lunch'));
  assert.ok(menuData.menu.includes('pet pop'));
}

runSelectionTests();
runParsingTests();

console.log('All menu edge-case tests passed.');
