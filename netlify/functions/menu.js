const cheerio = require('cheerio');

const BASE_URL = 'https://ostrbovlje.si';
const MENU_URL = 'https://ostrbovlje.si/prehrana/';
const TIMEZONE = 'Europe/Ljubljana';
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';

const ALLERGENS = {
  G: 'gluten',
  J: 'jajce',
  S: 'soja',
  L: 'laktoza',
  GS: 'gorčično seme',
  R: 'ribe',
  O: 'oreščki',
  SE: 'sezam',
  Z: 'zelena',
  ŽD: 'žveplov dioksid',
  RA: 'raki',
  M: 'mehkužci',
  V: 'volčji bob',
};

const MEAL_LABELS = {
  malica: 'MALICA',
  kosilo: 'KOSILO',
  popMalica: 'POP. MALICA',
};

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

function getSloveniaDates(now = new Date()) {
  const sloveniaNow = new Date(
    now.toLocaleString('en-US', { timeZone: TIMEZONE })
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
    isWeekend: sloveniaNow.getDay() === 0 || sloveniaNow.getDay() === 6,
  };
}

function parseIsoDate(dateString) {
  if (!dateString || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return null;
  }

  const [year, month, day] = dateString.split('-').map((part) => parseInt(part, 10));
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

function parseMenuLinks(html) {
  const $ = cheerio.load(html);
  const menus = [];
  const fallbackLinks = [];
  const dateRegex =
    /(\d{1,2})\.(\d{1,2})\.[–-](\d{1,2})\.(\d{1,2})\.\s*(\d{4})/;

  $('a[href]').each((_, element) => {
    const text = $(element).text().trim();
    const href = $(element).attr('href');
    if (!text || !href || !text.toLowerCase().includes('jedilnik')) {
      return;
    }

    const url = buildAbsoluteUrl(href);
    if (!url) {
      return;
    }

    const match = text.match(dateRegex);
    if (!match) {
      fallbackLinks.push({ url, text });
      return;
    }

    const [, startDay, startMonth, endDay, endMonth, year] = match;
    menus.push({
      url,
      text,
      startDate: new Date(
        Date.UTC(
          parseInt(year, 10),
          parseInt(startMonth, 10) - 1,
          parseInt(startDay, 10)
        )
      ),
      endDate: new Date(
        Date.UTC(
          parseInt(year, 10),
          parseInt(endMonth, 10) - 1,
          parseInt(endDay, 10)
        )
      ),
    });
  });

  return { menus, fallbackLinks };
}

function selectMenu(menus, fallbackLinks, todayUtc, isFriday) {
  const todayMs = todayUtc.getTime();

  const exactMatch = menus.find(
    (menu) =>
      menu.startDate.getTime() <= todayMs && menu.endDate.getTime() >= todayMs
  );
  if (exactMatch) {
    return exactMatch;
  }

  if (isFriday) {
    const fridayMatch = menus.find((menu) => menu.endDate.getTime() === todayMs);
    if (fridayMatch) {
      return fridayMatch;
    }
  }

  if (menus.length > 0) {
    const latestEnd = menus.reduce(
      (latest, menu) => (menu.endDate > latest ? menu.endDate : latest),
      menus[0].endDate
    );
    if (todayMs > latestEnd.getTime()) {
      return null;
    }
  }

  const validMenus = menus
    .filter((menu) => menu.endDate.getTime() >= todayMs)
    .sort((a, b) => b.startDate - a.startDate);
  if (validMenus.length > 0) {
    return validMenus[0];
  }

  if (menus.length > 0) {
    return [...menus].sort((a, b) => b.startDate - a.startDate)[0];
  }

  return fallbackLinks[0] || null;
}

function splitItems(text) {
  return text
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter((item) => item.length > 1);
}

function parseFoodItem(rawItem) {
  const raw = rawItem.trim();
  const allergenMatch = raw.match(/^(.+?)\s*[–-]\s*(.+)$/);

  if (!allergenMatch) {
    return { name: raw, allergens: [], raw };
  }

  const parsedAllergens = allergenMatch[2]
    .split(/[,\s]+/)
    .map((code) => code.trim())
    .filter((code) => Object.prototype.hasOwnProperty.call(ALLERGENS, code));

  return {
    name: allergenMatch[1].trim(),
    allergens: parsedAllergens,
    raw,
  };
}

function parseMealItems(text) {
  return splitItems(text)
    .map(parseFoodItem)
    .filter((item) => item.name.length > 1);
}

function formatDateParts(sloveniaNow) {
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
  const day = String(sloveniaNow.getDate()).padStart(2, '0');
  const month = String(sloveniaNow.getMonth() + 1).padStart(2, '0');
  const year = sloveniaNow.getFullYear();

  return {
    isoDate: `${year}-${month}-${day}`,
    dayName: dayNames[sloveniaNow.getDay()],
    dayShort: dayShort[sloveniaNow.getDay()],
    formattedDate: `${day}.${month}.${year}`,
    shortDate: `${day}.${month}`,
  };
}

function formatLegacyMeal(items) {
  return items
    .map((item) => {
      if (item.allergens.length === 0) {
        return item.name;
      }
      return `${item.name}–${item.allergens.join(', ')}`;
    })
    .join(' | ');
}

function formatLegacyMenu(menuTitle, dateParts, meals) {
  let menu = `🍽️ Kosilo za ${dateParts.dayName}, ${dateParts.formattedDate}\n`;
  menu += `📋 Jedilnik: ${menuTitle}\n\n`;
  menu += `${dateParts.dayShort}, ${dateParts.shortDate}\n`;
  menu += `🥗 MALICA: ${formatLegacyMeal(meals.malica)}\n`;
  menu += `🍝 KOSILO: ${formatLegacyMeal(meals.kosilo)}\n`;
  menu += `🍎 POP. MALICA: ${formatLegacyMeal(meals.popMalica)}\n`;
  menu += `\n📋 ALERGENI:\n`;
  menu += `G = gluten, J = jajce, S = soja\n`;
  menu += `L = laktoza, GS = gorčično seme, R = ribe\n`;
  menu += `O = oreščki, SE = sezam, ŽD = žveplov dioksid\n`;
  menu += `RA = raki, M = mehkužci, V = volčji bob`;
  return menu;
}

function extractDateRange(menuTitle) {
  const dateMatch = menuTitle.match(
    /(\d{1,2}\.\s*\d{1,2}\.\s*[–-]\s*\d{1,2}\.\s*\d{1,2}\.\s*\d{4})/
  );
  return dateMatch ? dateMatch[1] : null;
}

function parseMenuPage(html, menuTitle, menuUrl, sloveniaNow) {
  const $ = cheerio.load(html);
  const dateParts = formatDateParts(sloveniaNow);
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
    if (firstCellText === dateParts.dayShort) {
      todayRow = row;
    }
  });

  if (!todayRow) {
    return {
      success: false,
      error: `Ne morem najti jedilnika za ${dateParts.dayShort}`,
    };
  }

  const cells = $(todayRow).find('td, th');
  if (cells.length < 4) {
    return { success: false, error: 'Nepopolna struktura tabele' };
  }

  const meals = {
    malica: parseMealItems($(cells[1]).text()),
    kosilo: parseMealItems($(cells[2]).text()),
    popMalica: parseMealItems($(cells[3]).text()),
  };

  return {
    success: true,
    date: dateParts.isoDate,
    day: {
      name: dateParts.dayName,
      short: dateParts.dayShort,
      formatted: dateParts.formattedDate,
      shortDate: dateParts.shortDate,
    },
    menu: formatLegacyMenu(menuTitle, dateParts, meals),
    menu_title: menuTitle,
    source_url: menuUrl,
    date_range: extractDateRange(menuTitle),
    meal_labels: MEAL_LABELS,
    meals,
    allergens: ALLERGENS,
  };
}

function jsonResponse(body, statusCode = 200, extraHeaders = {}) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  };
}

exports.handler = async function handler(event = {}) {
  try {
    const query = event.queryStringParameters || {};
    const requestedDate = parseIsoDate(query.test_date || query.date);
    const { sloveniaNow, todayUtc, isFriday, isWeekend } = getSloveniaDates(
      requestedDate || new Date()
    );

    if (isWeekend) {
      return jsonResponse({
        success: false,
        error: 'Jedilnik ni na voljo',
        reason: 'weekend',
      });
    }

    const listResponse = await fetch(MENU_URL, {
      headers: { 'User-Agent': USER_AGENT },
    });
    if (!listResponse.ok) {
      throw new Error(`Menu list request failed: ${listResponse.status}`);
    }

    const { menus, fallbackLinks } = parseMenuLinks(await listResponse.text());
    const selectedMenu = selectMenu(menus, fallbackLinks, todayUtc, isFriday);

    if (!selectedMenu || !selectedMenu.url) {
      return jsonResponse({
        success: false,
        error: 'Jedilnik ni na voljo',
        reason: 'no-data',
      });
    }

    const menuResponse = await fetch(selectedMenu.url, {
      headers: { 'User-Agent': USER_AGENT },
    });
    if (!menuResponse.ok) {
      throw new Error(`Menu page request failed: ${menuResponse.status}`);
    }

    return jsonResponse(
      parseMenuPage(
        await menuResponse.text(),
        selectedMenu.text || 'Jedilnik',
        selectedMenu.url,
        sloveniaNow
      ),
      200,
      { 'Cache-Control': 'max-age=300' }
    );
  } catch (error) {
    return jsonResponse({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Napaka pri nalaganju jedilnika.',
    });
  }
};

exports._internals = {
  ALLERGENS,
  buildAbsoluteUrl,
  extractDateRange,
  formatDateParts,
  getSloveniaDates,
  parseIsoDate,
  parseFoodItem,
  parseMealItems,
  parseMenuLinks,
  parseMenuPage,
  selectMenu,
};
