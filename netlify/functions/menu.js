const cheerio = require('cheerio');

const BASE_URL = 'https://ostrbovlje.si';
const MENU_URL = 'https://ostrbovlje.si/prehrana/';
const TIMEZONE = 'Europe/Ljubljana';
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';

function buildAbsoluteUrl(href) {
  if (!href) return null;
  if (href.startsWith('/')) {
    return `${BASE_URL}${href}`;
  }
  if (href.startsWith('http://') || href.startsWith('https://')) {
    return href;
  }
  return `${BASE_URL}/${href}`;
}

function getSloveniaDates() {
  const sloveniaNow = new Date(
    new Date().toLocaleString('en-US', { timeZone: TIMEZONE })
  );
  const todayUtc = new Date(
    Date.UTC(
      sloveniaNow.getFullYear(),
      sloveniaNow.getMonth(),
      sloveniaNow.getDate()
    )
  );

  return {
    sloveniaNow,
    todayUtc,
    isFriday: sloveniaNow.getDay() === 5,
  };
}

function parseMenuLinks(html) {
  const $ = cheerio.load(html);
  const menus = [];
  const fallbackLinks = [];
  const dateRegex =
    /(\d{1,2})\.(\d{1,2})\.–(\d{1,2})\.(\d{1,2})\.\s*(\d{4})/;

  $('a[href]').each((_, element) => {
    const text = $(element).text().trim();
    const href = $(element).attr('href');
    if (!text || !href) {
      return;
    }
    if (text.includes('Jedilnik') || text.toLowerCase().includes('jedilnik')) {
      const url = buildAbsoluteUrl(href);
      if (!url) {
        return;
      }
      const match = text.match(dateRegex);
      if (match) {
        const [, startDay, startMonth, endDay, endMonth, year] = match;
        const startDate = new Date(
          Date.UTC(
            parseInt(year, 10),
            parseInt(startMonth, 10) - 1,
            parseInt(startDay, 10)
          )
        );
        const endDate = new Date(
          Date.UTC(
            parseInt(year, 10),
            parseInt(endMonth, 10) - 1,
            parseInt(endDay, 10)
          )
        );
        menus.push({
          url,
          text,
          startDate,
          endDate,
        });
      } else {
        fallbackLinks.push({ url, text });
      }
    }
  });

  return { menus, fallbackLinks };
}

function selectMenu(menus, fallbackLinks, todayUtc, isFriday) {
  const todayMs = todayUtc.getTime();

  for (const menu of menus) {
    if (menu.startDate.getTime() <= todayMs && menu.endDate.getTime() >= todayMs) {
      return menu;
    }
  }

  if (isFriday) {
    for (const menu of menus) {
      if (menu.endDate.getTime() === todayMs) {
        return menu;
      }
    }
  }

  const validMenus = menus
    .filter((menu) => menu.endDate.getTime() >= todayMs)
    .sort((a, b) => b.startDate - a.startDate);
  if (validMenus.length > 0) {
    return validMenus[0];
  }

  if (menus.length > 0) {
    menus.sort((a, b) => b.startDate - a.startDate);
    return menus[0];
  }

  if (fallbackLinks.length > 0) {
    return fallbackLinks[0];
  }

  return null;
}

function splitItems(text) {
  return text
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter((item) => item.length > 1);
}

function parseMenuPage(html, menuTitle, menuUrl, sloveniaNow) {
  const $ = cheerio.load(html);
  const dayShort = {
    0: 'NED',
    1: 'PON',
    2: 'TOR',
    3: 'SRE',
    4: 'ČET',
    5: 'PET',
    6: 'SOB',
  };
  const dayNames = [
    'nedelja',
    'ponedeljek',
    'torek',
    'sreda',
    'četrtek',
    'petek',
    'sobota',
  ];
  const todayShort = dayShort[sloveniaNow.getDay()];
  const dayName = dayNames[sloveniaNow.getDay()];
  const day = String(sloveniaNow.getDate()).padStart(2, '0');
  const month = String(sloveniaNow.getMonth() + 1).padStart(2, '0');
  const formattedDate = `${day}.${month}.${sloveniaNow.getFullYear()}`;
  const shortDate = `${day}.${month}`;

  const table = $('table').first();
  if (!table.length) {
    return { success: false, error: 'Ne morem najti tabele jedilnika' };
  }

  let todayRow = null;
  table.find('tr').each((_, row) => {
    if (todayRow) {
      return;
    }
    const cells = $(row).find('td, th');
    if (!cells.length) {
      return;
    }
    const firstCellText = $(cells[0]).text().trim().toUpperCase();
    if (firstCellText === todayShort) {
      todayRow = row;
    }
  });

  if (!todayRow) {
    return { success: false, error: `Ne morem najti jedilnika za ${todayShort}` };
  }

  const cells = $(todayRow).find('td, th');
  if (cells.length < 4) {
    return { success: false, error: 'Nepopolna struktura tabele' };
  }

  const malicaItems = splitItems($(cells[1]).text());
  const kosiloItems = splitItems($(cells[2]).text());
  const popMalicaItems = splitItems($(cells[3]).text());

  let menu = `🍽️ Kosilo za ${dayName}, ${formattedDate}\n`;
  menu += `📋 Jedilnik: ${menuTitle}\n\n`;
  menu += `${todayShort}, ${shortDate}\n`;
  menu += `🥗 MALICA: ${malicaItems.join(' | ')}\n`;
  menu += `🍝 KOSILO: ${kosiloItems.join(' | ')}\n`;
  menu += `🍎 POP. MALICA: ${popMalicaItems.join(' | ')}\n`;

  menu += `\n📋 ALERGENI:\n`;
  menu += `G = gluten, J = jajce, S = soja\n`;
  menu += `L = laktoza, GS = gorčično seme, R = ribe\n`;
  menu += `O = oreščki, SE = sezam, ŽD = žveplov dioksid\n`;
  menu += `RA = raki, M = mehkužci, V = volčji bob`;

  const dateMatch = menuTitle.match(
    /(\d{1,2}\.\s*\d{1,2}\.\s*–\s*\d{1,2}\.\s*\d{1,2}\.\s*\d{4})/
  );

  return {
    success: true,
    menu,
    menu_title: menuTitle,
    source_url: menuUrl,
    date_range: dateMatch ? dateMatch[1] : null,
  };
}

exports.handler = async function handler() {
  try {
    const { sloveniaNow, todayUtc, isFriday } = getSloveniaDates();

    const listResponse = await fetch(MENU_URL, {
      headers: { 'User-Agent': USER_AGENT },
    });
    if (!listResponse.ok) {
      throw new Error(`Menu list request failed: ${listResponse.status}`);
    }
    const listHtml = await listResponse.text();

    const { menus, fallbackLinks } = parseMenuLinks(listHtml);
    const selectedMenu = selectMenu(menus, fallbackLinks, todayUtc, isFriday);

    if (!selectedMenu || !selectedMenu.url) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: false,
          error: 'Ne morem najti jedilnika za ta teden',
        }),
      };
    }

    const menuResponse = await fetch(selectedMenu.url, {
      headers: { 'User-Agent': USER_AGENT },
    });
    if (!menuResponse.ok) {
      throw new Error(`Menu page request failed: ${menuResponse.status}`);
    }
    const menuHtml = await menuResponse.text();

    const menuData = parseMenuPage(
      menuHtml,
      selectedMenu.text || 'Jedilnik',
      selectedMenu.url,
      sloveniaNow
    );

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'max-age=300',
      },
      body: JSON.stringify(menuData),
    };
  } catch (error) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Napaka pri nalaganju jedilnika.',
      }),
    };
  }
};
