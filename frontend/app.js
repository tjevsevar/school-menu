(function appFactory(globalScope) {
  const allergenTranslations = {
    G: 'Gluten',
    J: 'Jajce',
    S: 'Soja',
    L: 'Laktoza',
    GS: 'Gorčično seme',
    R: 'Ribe',
    O: 'Oreščki',
    SE: 'Sezam',
    Z: 'Zelena',
    ŽD: 'Žveplov dioksid',
    RA: 'Raki',
    M: 'Mehkužci',
    V: 'Volčji bob',
  };

  const knownAllergens = Object.keys(allergenTranslations);

  const mealConfig = {
    malica: {
      icon: '🥗',
      title: 'Malica',
      subtitle: 'Dopoldanska energija',
      sectionClass: 'meal-section meal-section--malica',
    },
    kosilo: {
      icon: '🍝',
      title: 'Kosilo',
      subtitle: 'Glavni obrok',
      sectionClass: 'meal-section meal-section--kosilo',
    },
    popMalica: {
      icon: '🍎',
      title: 'Pop. malica',
      subtitle: 'Za konec pouka',
      sectionClass: 'meal-section meal-section--popMalica',
    },
  };

  const feedbackUrl =
    'mailto:andraz.jevsevar@ostrbovlje.si?subject=Povratne informacije - Šolski jedilnik&body=Pozdravljen,%0A%0APišem vam glede aplikacije za šolski jedilnik...%0A%0ALep pozdrav';

  let activeDate = new Date();
  let latestRequestId = 0;
  let latestAvailabilityId = 0;
  let activeSchool = null;
  let activeWeeklyView = false;
  const schoolStorageKey = 'school-menu-school';

  function schoolMenuUrl() {
    return activeSchool?.menu_url || 'https://ostrbovlje.si/prehrana/';
  }

  function withSchool(url, school = activeSchool) {
    return school ? `${url}${url.includes('?') ? '&' : '?'}school=${encodeURIComponent(school.id)}` : url;
  }

  function getInitialSchool(schools, windowRef = globalScope) {
    const linkedSchool = new URLSearchParams(windowRef.location?.search || '').get('school');
    let savedSchool;
    try { savedSchool = windowRef.localStorage?.getItem(schoolStorageKey); } catch {}
    return schools.find((school) => school.id === linkedSchool) ||
      schools.find((school) => school.id === savedSchool) || schools[0];
  }

  function selectSchool(school, documentRef, windowRef = globalScope) {
    activeSchool = school;
    documentRef.getElementById('schoolSelect').value = school.id;
    documentRef.getElementById('schoolName').textContent = school.name;
    documentRef.getElementById('schoolNote').textContent = school.note;
    documentRef.getElementById('schoolWebsite').href = school.website_url;
    documentRef.getElementById('menuLink').href = school.menu_url;
    documentRef.title = `Jedilnik - ${school.name}`;
    try { windowRef.localStorage?.setItem(schoolStorageKey, school.id); } catch {}
    if (windowRef.location?.href && windowRef.history?.replaceState) {
      const url = new URL(windowRef.location.href);
      url.searchParams.set('school', school.id);
      windowRef.history.replaceState(null, '', url);
    }
  }

  function setupSchoolSelector(schools, documentRef = document, fetchImpl = fetch, windowRef = globalScope) {
    const select = documentRef.getElementById('schoolSelect');
    replaceChildren(select, schools.map((school) => {
      const option = createElement(documentRef, 'option', null, school.name);
      option.value = school.id;
      return option;
    }));
    selectSchool(getInitialSchool(schools, windowRef), documentRef, windowRef);
    select.disabled = false;
    select.addEventListener('change', () => {
      const school = schools.find((candidate) => candidate.id === select.value);
      if (!school) return;
      selectSchool(school, documentRef, windowRef);
      return Promise.all([
        fetchMenuInfo(documentRef, fetchImpl, activeDate, activeWeeklyView),
        checkNextWeekAvailability(documentRef, fetchImpl),
      ]);
    });
  }

  function createElement(documentRef, tagName, className, text) {
    const element = documentRef.createElement(tagName);
    if (className) {
      element.className = className;
    }
    if (text !== undefined) {
      element.textContent = text;
    }
    return element;
  }

  function replaceChildren(element, children) {
    element.textContent = '';
    children.forEach((child) => element.appendChild(child));
  }

  function formatCurrentDay(date = new Date()) {
    const slovenianDays = [
      'Nedelja',
      'Ponedeljek',
      'Torek',
      'Sreda',
      'Četrtek',
      'Petek',
      'Sobota',
    ];
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${slovenianDays[date.getDay()]}, ${day}.${month}.${date.getFullYear()}`;
  }

  function highlightWeekday(documentRef, date = new Date()) {
    const weekdayIndex = date.getDay() - 1;
    const weekdayItems = documentRef.querySelectorAll('.weekday-strip button');
    weekdayItems.forEach((item) => item.classList.remove('is-today'));
    if (weekdayIndex >= 0 && weekdayIndex < weekdayItems.length) {
      weekdayItems[weekdayIndex].classList.add('is-today');
    }
  }

  function selectWeekday(documentRef, date = new Date()) {
    const weekdayIndex = date.getDay() - 1;
    const weekdayItems = documentRef.querySelectorAll('.weekday-strip button');
    weekdayItems.forEach((item) => item.classList.remove('is-selected'));
    if (weekdayIndex >= 0 && weekdayIndex < weekdayItems.length) {
      weekdayItems[weekdayIndex].classList.add('is-selected');
    }
  }

  function isSameDate(firstDate, secondDate) {
    return (
      firstDate.getFullYear() === secondDate.getFullYear() &&
      firstDate.getMonth() === secondDate.getMonth() &&
      firstDate.getDate() === secondDate.getDate()
    );
  }

  function toIsoDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function getWeekdayDate(baseDate, weekday) {
    const date = new Date(baseDate);
    const currentWeekday = date.getDay() === 0 ? 7 : date.getDay();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() - currentWeekday + weekday);
    return date;
  }

  function updateDisplayedDate(documentRef, date = new Date()) {
    activeDate = new Date(date);
    documentRef.getElementById('currentDay').textContent = formatCurrentDay(activeDate);
    const dayContext = documentRef.getElementById('dayContext');
    if (dayContext) {
      dayContext.textContent = isSameDate(activeDate, new Date()) ? 'Danes' : 'Izbran dan';
    }
    selectWeekday(documentRef, activeDate);
  }

  function isWeekend(date = new Date()) {
    const day = date.getDay();
    return day === 0 || day === 6;
  }

  function parseFoodItem(rawItem) {
    const raw = rawItem.trim();
    const allergenMatch = raw.match(/^(.+?)\s*[–-]\s*(.+)$/);

    if (!allergenMatch) {
      return { name: raw, allergens: [], raw };
    }

    const allergens = allergenMatch[2]
      .split(/[,\s]+/)
      .map((code) => code.trim())
      .filter((code) => knownAllergens.includes(code));

    return {
      name: allergenMatch[1].trim(),
      allergens,
      raw,
    };
  }

  function parseLegacyMealLine(menuText, label) {
    const line = menuText
      .split('\n')
      .find((candidate) => candidate.includes(label));
    if (!line) {
      return [];
    }

    const [, itemsText = ''] = line.split(label);
    return itemsText
      .trim()
      .split('|')
      .map((item) => item.trim())
      .filter((item) => item.length > 0)
      .map(parseFoodItem)
      .filter((item) => item.name.length > 1);
  }

  function normalizeMenuData(menuData) {
    if (menuData.meals) {
      return {
        ...menuData,
        meals: {
          malica: menuData.meals.malica || [],
          kosilo: menuData.meals.kosilo || [],
          popMalica: menuData.meals.popMalica || [],
        },
      };
    }

    const menuText = menuData.menu || '';
    return {
      ...menuData,
      meals: {
        malica: parseLegacyMealLine(menuText, '🥗 MALICA:'),
        kosilo: parseLegacyMealLine(menuText, '🍝 KOSILO:'),
        popMalica: parseLegacyMealLine(menuText, '🍎 POP. MALICA:'),
      },
    };
  }

  function createNoAllergenBadge(documentRef) {
    const badge = createElement(
      documentRef,
      'div',
      'allergen-badge allergen-badge--clear',
      '✓'
    );
    badge.dataset.tip = 'Brez alergenov';
    badge.tabIndex = 0;
    badge.setAttribute?.('role', 'button');
    badge.setAttribute?.('aria-label', 'Brez alergenov');
    return badge;
  }

  function createAllergenBadges(documentRef, allergens) {
    const wrapper = createElement(documentRef, 'div', 'badge-row');
    allergens.forEach((allergen) => {
      const badge = createElement(
        documentRef,
        'div',
        'allergen-badge',
        allergen
      );
      badge.dataset.tip = allergenTranslations[allergen] || allergen;
      badge.tabIndex = 0;
      badge.setAttribute?.('role', 'button');
      badge.setAttribute?.(
        'aria-label',
        allergenTranslations[allergen] || allergen
      );
      wrapper.appendChild(badge);
    });
    return wrapper;
  }

  function createMealSection(documentRef, key, items, headingTag = 'h2') {
    const config = mealConfig[key];
    const section = createElement(documentRef, 'section', config.sectionClass);
    const head = createElement(documentRef, 'div', 'meal-head');
    const titleGroup = createElement(documentRef, 'div', 'meal-title-group');
    const icon = createElement(documentRef, 'div', 'meal-icon', config.icon);
    const copy = createElement(documentRef, 'div');
    const title = createElement(documentRef, headingTag, 'card-title meal-title', config.title);
    const subtitle = createElement(documentRef, 'p', 'meal-subtitle', config.subtitle);
    const count = createElement(documentRef, 'span', 'meal-count', String(items.length));
    const list = createElement(documentRef, 'div', 'meal-list');

    copy.appendChild(title);
    copy.appendChild(subtitle);
    titleGroup.appendChild(icon);
    titleGroup.appendChild(copy);
    head.appendChild(titleGroup);
    head.appendChild(count);

    items.forEach((item) => {
      const row = createElement(documentRef, 'div', 'meal-row');
      const foodName = createElement(
        documentRef,
        'span',
        'meal-name font-semibold',
        item.name
      );
      row.appendChild(foodName);
      row.appendChild(
        item.allergens && item.allergens.length > 0
          ? createAllergenBadges(documentRef, item.allergens)
          : createNoAllergenBadge(documentRef)
      );
      list.appendChild(row);
    });

    section.appendChild(head);
    section.appendChild(list);
    return section;
  }

  function createErrorMessage(documentRef, message) {
    const alert = createElement(documentRef, 'section', 'error-panel');
    const title = createElement(documentRef, 'h2', null, 'Jedilnik ni na voljo');
    const detail = createElement(documentRef, 'p', null, message);

    alert.appendChild(title);
    alert.appendChild(detail);
    return alert;
  }

  function displayMenu(menuData, documentRef = document) {
    const menuContent = documentRef.getElementById('menuContent');
    const allergenInfo = documentRef.getElementById('allergenInfo');
    const menuText = menuData.menu || menuData.error || '';

    if (allergenInfo) {
      allergenInfo.classList.remove('hidden');
    }

    if (
      menuText.startsWith('❌') ||
      menuText.includes('Ne morem najti') ||
      menuText.includes('Napaka')
    ) {
      replaceChildren(menuContent, [createErrorMessage(documentRef, menuText)]);
      return;
    }

    const normalized = normalizeMenuData(menuData);
    replaceChildren(menuContent, [
      createMealSection(documentRef, 'malica', normalized.meals.malica),
      createMealSection(documentRef, 'kosilo', normalized.meals.kosilo),
      createMealSection(documentRef, 'popMalica', normalized.meals.popMalica),
    ]);
  }

  function displayWeekendMessage(documentRef = document, date = new Date()) {
    const menuContent = documentRef.getElementById('menuContent');
    const allergenInfo = documentRef.getElementById('allergenInfo');
    const isSaturday = date.getDay() === 6;
    const dayName = isSaturday ? 'sobota' : 'nedelja';
    const emoji = isSaturday ? '🌳' : '☀️';
    const messages = [
      { icon: '🚴', text: 'Danes ni šole! Pojdi se igrat!' },
      { icon: '⚽', text: 'Čas za igro s prijatelji!' },
      { icon: '🌲', text: 'Pojdi v naravo in raziskuj!' },
      { icon: '🎨', text: 'Čas za ustvarjanje!' },
      { icon: '📚', text: 'Morda preberi kakšno knjigo?' },
      { icon: '👨‍👩‍👧‍👦', text: 'Preživi čas z družino!' },
      { icon: '🏃', text: 'Gibaj se in uživaj!' },
      { icon: '🌈', text: 'Raziskuj svet okoli sebe!' },
      { icon: '🧺', text: 'Vikend je idealen za družinski čas in počitek.' },
      { icon: '🌤️', text: 'Pojdi ven in uživaj v igri.' },
      { icon: '🚶', text: 'Skupaj pojdite na kratek sprehod.' },
    ];
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];

    const card = createElement(documentRef, 'section', 'weekend-panel');
    const messageBox = createElement(documentRef, 'div', 'weekend-idea');

    card.appendChild(createElement(documentRef, 'div', 'weekend-emoji', emoji));
    card.appendChild(createElement(documentRef, 'h2', null, `Danes je ${dayName}!`));
    card.appendChild(
      createElement(documentRef, 'p', null, 'Jedilnik ni na voljo. Uživaj v vikendu!')
    );
    messageBox.appendChild(createElement(documentRef, 'strong', null, randomMessage.icon));
    messageBox.appendChild(createElement(documentRef, 'span', null, randomMessage.text));
    card.appendChild(messageBox);

    replaceChildren(menuContent, [card]);
    documentRef.getElementById('menuDateRange').textContent =
      'Vikend - jedilnik ni na voljo';
    documentRef.getElementById('menuLink').href = schoolMenuUrl();
    if (allergenInfo) {
      allergenInfo.classList.add('hidden');
    }
  }

  function displayWeekMenu(menuData, documentRef = document) {
    const sections = menuData.days.map((day) => {
      const section = createElement(documentRef, 'section', 'week-day');
      const heading = createElement(
        documentRef, 'h2', 'week-day-title',
        formatCurrentDay(new Date(`${day.date}T12:00:00`))
      );
      heading.id = `week-day-${day.date}`;
      section.setAttribute('aria-labelledby', heading.id);
      section.appendChild(heading);
      if (!day.success) {
        section.appendChild(createElement(
          documentRef, 'p', 'day-menu-message', 'Jedilnik za ta dan ni objavljen.'
        ));
      } else {
        const meals = createElement(documentRef, 'div', 'day-meals');
        const normalized = normalizeMenuData(day);
        Object.keys(mealConfig).forEach((key) => {
          meals.appendChild(createMealSection(documentRef, key, normalized.meals[key], 'h3'));
        });
        section.appendChild(meals);
      }
      return section;
    });
    replaceChildren(documentRef.getElementById('menuContent'), sections);
    documentRef.getElementById('allergenInfo').classList.remove('hidden');
  }

  function updateWeekNavigation(documentRef) {
    documentRef.getElementById('weekNavigation').hidden =
      documentRef.getElementById('nextWeekBtn').hidden &&
      documentRef.getElementById('todayMenuBtn').hidden;
  }

  function setNextWeekAvailable(documentRef, available) {
    documentRef.getElementById('nextWeekBtn').hidden = !available;
    updateWeekNavigation(documentRef);
  }

  function hasWeekMenu(menuData) {
    return Boolean(menuData.success && menuData.days?.some((day) => day.success));
  }

  async function checkNextWeekAvailability(documentRef = document, fetchImpl = fetch) {
    const requestId = ++latestAvailabilityId;
    const school = activeSchool;
    setNextWeekAvailable(documentRef, false);
    try {
      const response = await fetchImpl(withSchool('/api/menu?week=next', school), { cache: 'no-store' });
      if (!response.ok) return false;
      const available = hasWeekMenu(await response.json());
      if (requestId !== latestAvailabilityId || school !== activeSchool) return false;
      setNextWeekAvailable(documentRef, available);
      return available;
    } catch {
      return false;
    }
  }

  function setWeekView(documentRef, weekly, menuData = null) {
    activeWeeklyView = weekly;
    documentRef.getElementById('weekdayStrip').hidden = weekly;
    documentRef.getElementById('todayMenuBtn').hidden = !weekly;
    updateWeekNavigation(documentRef);
    const button = documentRef.getElementById('nextWeekBtn');
    button.setAttribute('aria-pressed', String(weekly));
    if (weekly) {
      button.classList.add('is-active');
      documentRef.getElementById('dayContext').textContent = 'Naslednji teden';
      documentRef.getElementById('currentDay').textContent =
        menuData?.date_range || 'Ponedeljek–petek';
    } else {
      button.classList.remove('is-active');
    }
  }

  function updateTimestamp(documentRef = document) {
    documentRef.getElementById('lastUpdate').textContent = new Date().toLocaleTimeString('sl-SI', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function updateMenuMetadata(documentRef, menuData) {
    if (menuData.date_range) {
      documentRef.getElementById('menuDateRange').textContent = `Jedilnik ${menuData.date_range}`;
    } else if (menuData.menu_title) {
      const dateRangeMatch = menuData.menu_title.match(
        /(\d{1,2}\.\s*\d{1,2}\.\s*[–-]\s*\d{1,2}\.\s*\d{1,2}\.\s*\d{4})/
      );
      documentRef.getElementById('menuDateRange').textContent = dateRangeMatch
        ? `Jedilnik ${dateRangeMatch[1]}`
        : menuData.menu_title;
    }

    documentRef.getElementById('menuLink').href =
      menuData.source_url || schoolMenuUrl();
  }

  function getMenuUrl(date = activeDate) {
    if (!date || isSameDate(date, new Date())) {
      return withSchool('/api/menu');
    }
    return withSchool(`/api/menu?test_date=${encodeURIComponent(toIsoDate(date))}`);
  }

  async function fetchMenuInfo(
    documentRef = document, fetchImpl = fetch, date = activeDate, weekly = false
  ) {
    const requestId = ++latestRequestId;
    const loading = documentRef.getElementById('loading');
    const menuContent = documentRef.getElementById('menuContent');
    setWeekView(documentRef, weekly);
    if (!weekly) updateDisplayedDate(documentRef, date);
    loading.classList.remove('hidden');
    menuContent.setAttribute('aria-busy', 'true');
    replaceChildren(menuContent, []);
    documentRef.getElementById('allergenInfo').classList.add('hidden');
    documentRef.getElementById('menuDateRange').textContent = 'Nalagam jedilnik...';
    documentRef.getElementById('menuLink').href = schoolMenuUrl();
    try {
      if (!weekly && isWeekend(date)) {
        displayWeekendMessage(documentRef, date);
        return { success: false, reason: 'weekend' };
      }
      const response = await fetchImpl(
        weekly ? withSchool('/api/menu?week=next') : getMenuUrl(date), { cache: 'no-store' }
      );
      if (!response.ok) {
        throw new Error(`API status ${response.status}`);
      }

      const menuData = await response.json();
      if (requestId !== latestRequestId) return menuData;
      if (weekly) {
        setNextWeekAvailable(documentRef, hasWeekMenu(menuData));
        setWeekView(documentRef, true, menuData);
      }
      const hasMenu = weekly ? hasWeekMenu(menuData) : (menuData.meals || menuData.menu);
      if (menuData.success && hasMenu) {
        updateMenuMetadata(documentRef, menuData);
        if (weekly) displayWeekMenu(menuData, documentRef);
        else displayMenu(menuData, documentRef);
        return menuData;
      }

      documentRef.getElementById('menuDateRange').textContent = 'Jedilnik ni na voljo';
      documentRef.getElementById('menuLink').href = schoolMenuUrl();
      replaceChildren(documentRef.getElementById('menuContent'), [
        createErrorMessage(documentRef,
          weekly && menuData.reason === 'not-published'
            ? 'Jedilnik za naslednji teden še ni objavljen. Poskusi znova pozneje.'
            : 'Jedilnik trenutno ni na voljo.'
        ),
      ]);
      return menuData;
    } catch (error) {
      if (requestId !== latestRequestId) return { success: false, error: error.message };
      if (weekly) setNextWeekAvailable(documentRef, false);
      documentRef.getElementById('menuDateRange').textContent = 'Jedilnik (kliknite za ogled)';
      documentRef.getElementById('menuLink').href = schoolMenuUrl();
      replaceChildren(documentRef.getElementById('menuContent'), [
        createErrorMessage(documentRef, 'Napaka pri nalaganju jedilnika.'),
      ]);
      return { success: false, error: error.message };
    } finally {
      if (requestId === latestRequestId) {
        loading.classList.add('hidden');
        menuContent.setAttribute('aria-busy', 'false');
        updateTimestamp(documentRef);
      }
    }
  }

  function calculateTooltipPosition(anchorRect, tooltipRect, viewportWidth, viewportHeight) {
    const margin = 10;
    const gap = 8;
    const maxLeft = Math.max(margin, viewportWidth - tooltipRect.width - margin);
    const centeredLeft =
      anchorRect.left + (anchorRect.width - tooltipRect.width) / 2;
    const left = Math.min(Math.max(centeredLeft, margin), maxLeft);
    let top = anchorRect.top - tooltipRect.height - gap;
    let placement = 'top';

    if (top < margin) {
      top = anchorRect.bottom + gap;
      placement = 'bottom';
    }

    const maxTop = Math.max(margin, viewportHeight - tooltipRect.height - margin);
    top = Math.min(Math.max(top, margin), maxTop);

    return { left, top, placement };
  }

  function setupAllergenTooltips(documentRef = document, windowRef = globalScope) {
    if (!documentRef.body) {
      return;
    }

    const tooltip = createElement(documentRef, 'div', 'allergen-tooltip');
    tooltip.hidden = true;
    tooltip.setAttribute('role', 'tooltip');
    documentRef.body.appendChild(tooltip);

    let activeBadge = null;
    let closeTimer = null;

    const hideTooltip = () => {
      if (closeTimer) {
        windowRef.clearTimeout(closeTimer);
        closeTimer = null;
      }
      if (activeBadge) {
        activeBadge.classList.remove('tooltip-open');
      }
      activeBadge = null;
      tooltip.classList.remove('is-visible');
      tooltip.hidden = true;
    };

    const showTooltip = (badge) => {
      const tip = badge?.dataset?.tip;
      if (!tip || !badge.getBoundingClientRect) {
        hideTooltip();
        return;
      }

      if (closeTimer) {
        windowRef.clearTimeout(closeTimer);
      }

      if (activeBadge && activeBadge !== badge) {
        activeBadge.classList.remove('tooltip-open');
      }

      activeBadge = badge;
      activeBadge.classList.add('tooltip-open');
      tooltip.textContent = tip;
      tooltip.hidden = false;
      tooltip.classList.add('is-visible');
      tooltip.style.left = '0px';
      tooltip.style.top = '0px';

      const position = calculateTooltipPosition(
        badge.getBoundingClientRect(),
        tooltip.getBoundingClientRect(),
        windowRef.innerWidth || documentRef.documentElement.clientWidth,
        windowRef.innerHeight || documentRef.documentElement.clientHeight
      );
      tooltip.dataset.placement = position.placement;
      tooltip.style.left = `${Math.round(position.left)}px`;
      tooltip.style.top = `${Math.round(position.top)}px`;
    };

    const badgeFromEvent = (event) =>
      event.target.closest ? event.target.closest('.allergen-badge') : null;

    documentRef.addEventListener('pointerover', (event) => {
      const badge = badgeFromEvent(event);
      if (badge) {
        showTooltip(badge);
      }
    });

    documentRef.addEventListener('pointerout', (event) => {
      const badge = badgeFromEvent(event);
      if (!badge || badge !== activeBadge) {
        return;
      }
      if (event.relatedTarget && badge.contains?.(event.relatedTarget)) {
        return;
      }
      hideTooltip();
    });

    documentRef.addEventListener('focusin', (event) => {
      const badge = badgeFromEvent(event);
      if (badge) {
        showTooltip(badge);
      }
    });

    documentRef.addEventListener('focusout', (event) => {
      const badge = badgeFromEvent(event);
      if (badge && badge === activeBadge) {
        hideTooltip();
      }
    });

    documentRef.addEventListener('click', (event) => {
      const badge = badgeFromEvent(event);
      if (!badge) {
        hideTooltip();
        return;
      }
      event.preventDefault();
      event.stopPropagation();

      showTooltip(badge);
      closeTimer = windowRef.setTimeout(hideTooltip, 3000);
    });

    documentRef.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        hideTooltip();
      }
    });

    windowRef.addEventListener?.('resize', () => {
      if (activeBadge && !tooltip.hidden) {
        showTooltip(activeBadge);
      }
    });
  }

  function registerServiceWorker(navigatorRef = globalScope.navigator) {
    if (!navigatorRef || !('serviceWorker' in navigatorRef)) {
      return Promise.resolve(null);
    }
    return navigatorRef.serviceWorker.register('sw.js').catch(() => null);
  }

  function setupFeedbackButton(documentRef = document) {
    const button = documentRef.getElementById('feedbackBtn');
    if (button) {
      button.addEventListener('click', () => {
        globalScope.location.href = feedbackUrl;
      });
    }
  }

  function setupWeekdayButtons(documentRef = document, fetchImpl = fetch) {
    const buttons = documentRef.querySelectorAll('.weekday-strip button');
    buttons.forEach((button) => {
      button.addEventListener('click', async () => {
        const weekday = Number(button.dataset.weekday);
        if (!weekday) {
          return;
        }
        const targetDate = getWeekdayDate(new Date(), weekday);
        await fetchMenuInfo(documentRef, fetchImpl, targetDate);
      });
    });
  }

  function setupWeekButtons(documentRef = document, fetchImpl = fetch) {
    documentRef.getElementById('nextWeekBtn').addEventListener('click', () =>
      fetchMenuInfo(documentRef, fetchImpl, new Date(), true)
    );
    documentRef.getElementById('todayMenuBtn').addEventListener('click', () =>
      fetchMenuInfo(documentRef, fetchImpl, new Date())
    );
  }

  async function init(documentRef = document, fetchImpl = fetch, windowRef = globalScope) {
    const now = new Date();
    registerServiceWorker();
    highlightWeekday(documentRef, now);
    updateDisplayedDate(documentRef, now);
    setupFeedbackButton(documentRef);
    setupWeekdayButtons(documentRef, fetchImpl);
    setupWeekButtons(documentRef, fetchImpl);
    setupAllergenTooltips(documentRef);

    try {
      const response = await fetchImpl('/schools.json', { cache: 'no-store' });
      if (!response.ok) throw new Error('School list unavailable');
      const schools = await response.json();
      if (!Array.isArray(schools) || !schools.length) throw new Error('Empty school list');
      setupSchoolSelector(schools, documentRef, fetchImpl, windowRef);
      await Promise.all([
        fetchMenuInfo(documentRef, fetchImpl, now),
        checkNextWeekAvailability(documentRef, fetchImpl),
      ]);
    } catch {
      documentRef.getElementById('schoolSelect').textContent = '';
      documentRef.getElementById('schoolNote').textContent = 'Šol ni mogoče naložiti. Preveri povezavo in osveži stran.';
      documentRef.getElementById('schoolWebsite').hidden = true;
      documentRef.getElementById('menuDateRange').textContent = 'Jedilnik ni na voljo';
      documentRef.getElementById('allergenInfo').classList.add('hidden');
    }
  }

  const publicApi = {
    displayMenu,
    displayWeekendMessage,
    displayWeekMenu,
    fetchMenuInfo,
    formatCurrentDay,
    calculateTooltipPosition,
    init,
    isWeekend,
    normalizeMenuData,
    parseFoodItem,
    toIsoDate,
    getWeekdayDate,
    setupWeekButtons,
    checkNextWeekAvailability,
    getInitialSchool,
    setupSchoolSelector,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = publicApi;
  }

  globalScope.SchoolLunchApp = publicApi;

  if (typeof document !== 'undefined' && !(typeof module !== 'undefined' && module.exports)) {
    document.addEventListener('DOMContentLoaded', () => init(document));
  }
})(typeof window !== 'undefined' ? window : globalThis);
