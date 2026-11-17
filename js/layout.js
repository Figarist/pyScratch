/* pyScratch — Scratch 3.0 style editor layout controller.
 *
 * Owns purely presentational wiring: menu-bar dropdowns, Code / Costumes / Sounds tabs,
 * block category column + palette flyout, stage size toggle, sprite list cards and the
 * sprite info pane. All business logic (compile, run, assets, i18n) stays in app.js.
 */
(function (global) {
  'use strict';

  if (typeof document === 'undefined') return;

  // ---------------------------------------------------------------------------
  // Layout-only strings (existing UI strings keep using js/i18n.js via data-i18n)
  // ---------------------------------------------------------------------------
  const L = {
    uk: {
      tab_code: 'Код',
      tab_costumes: 'Образи',
      tab_sounds: 'Звуки',
      menu_file: 'Файл',
      menu_lang: 'Мова',
      menu_templates: 'Навчальні шаблони',
      cat_motion: 'Рух',
      cat_looks: 'Вигляд',
      cat_sound: 'Звук',
      cat_events: 'Події',
      cat_control: 'Керування',
      cat_sensing: 'Датчики',
      cat_operators: 'Оператори',
      cat_variables: 'Змінні',
      cat_myblocks: 'Мої блоки',
      cat_pen: 'Олівець',
      categories: 'Категорії блоків',
      stage: 'Сцена',
      sprite: 'Спрайт',
      show: 'Показати',
      size: 'Розмір',
      direction: 'Напрям',
      run: 'Запустити (Ctrl+Enter)',
      stop: 'Стоп',
      stage_small: 'Мала сцена',
      stage_large: 'Велика сцена',
      add_sprite: 'Додати спрайт',
      sprite_show: 'Показати спрайт',
      sprite_hide: 'Сховати спрайт',
      sprite_name: 'Назва спрайта',
      sprites_list: 'Спрайти'
    },
    en: {
      tab_code: 'Code',
      tab_costumes: 'Costumes',
      tab_sounds: 'Sounds',
      menu_file: 'File',
      menu_lang: 'Language',
      menu_templates: 'Templates',
      cat_motion: 'Motion',
      cat_looks: 'Looks',
      cat_sound: 'Sound',
      cat_events: 'Events',
      cat_control: 'Control',
      cat_sensing: 'Sensing',
      cat_operators: 'Operators',
      cat_variables: 'Variables',
      cat_myblocks: 'My Blocks',
      cat_pen: 'Pen',
      categories: 'Block categories',
      stage: 'Stage',
      sprite: 'Sprite',
      show: 'Show',
      size: 'Size',
      direction: 'Direction',
      run: 'Run (Ctrl+Enter)',
      stop: 'Stop',
      stage_small: 'Small stage',
      stage_large: 'Large stage',
      add_sprite: 'Add sprite',
      sprite_show: 'Show sprite',
      sprite_hide: 'Hide sprite',
      sprite_name: 'Sprite name',
      sprites_list: 'Sprites'
    },
    ru: {
      tab_code: 'Код',
      tab_costumes: 'Костюмы',
      tab_sounds: 'Звуки',
      menu_file: 'Файл',
      menu_lang: 'Язык',
      menu_templates: 'Учебные шаблоны',
      cat_motion: 'Движение',
      cat_looks: 'Внешность',
      cat_sound: 'Звук',
      cat_events: 'События',
      cat_control: 'Управление',
      cat_sensing: 'Сенсоры',
      cat_operators: 'Операторы',
      cat_variables: 'Переменные',
      cat_myblocks: 'Мои блоки',
      cat_pen: 'Перо',
      categories: 'Категории блоков',
      stage: 'Сцена',
      sprite: 'Спрайт',
      show: 'Показать',
      size: 'Размер',
      direction: 'Направление',
      run: 'Запустить (Ctrl+Enter)',
      stop: 'Стоп',
      stage_small: 'Маленькая сцена',
      stage_large: 'Большая сцена',
      add_sprite: 'Добавить спрайт',
      sprite_show: 'Показать спрайт',
      sprite_hide: 'Скрыть спрайт',
      sprite_name: 'Имя спрайта',
      sprites_list: 'Спрайты'
    }
  };

  function currentLang() {
    const l = String(document.documentElement.lang || 'uk').toLowerCase().slice(0, 2);
    return L[l] ? l : 'uk';
  }

  function t(key) {
    const table = L[currentLang()];
    if (table[key] != null) return table[key];
    return L.uk[key] != null ? L.uk[key] : key;
  }

  function $(id) {
    return document.getElementById(id);
  }

  function applyL10n() {
    document.querySelectorAll('[data-l10n]').forEach((el) => {
      el.textContent = t(el.getAttribute('data-l10n'));
    });
    document.querySelectorAll('[data-l10n-aria]').forEach((el) => {
      el.setAttribute('aria-label', t(el.getAttribute('data-l10n-aria')));
    });
    document.querySelectorAll('[data-l10n-title]').forEach((el) => {
      el.setAttribute('title', t(el.getAttribute('data-l10n-title')));
    });
    const nameInput = $('sprite-info-name');
    if (nameInput && nameInput.dataset.isStage === '1') nameInput.value = t('stage');
    document.querySelectorAll('.stage-card .sprite-name').forEach((el) => {
      el.textContent = t('stage');
    });
  }

  // ---------------------------------------------------------------------------
  // Menu bar dropdowns
  // ---------------------------------------------------------------------------
  const menus = Array.from(document.querySelectorAll('.menu'));

  function setMenuOpen(menu, open) {
    const trigger = menu.querySelector('.menu-trigger');
    menu.classList.toggle('open', open);
    if (trigger) trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  function closeMenus(except) {
    menus.forEach((m) => {
      if (m !== except) setMenuOpen(m, false);
    });
  }

  function menuItems(menu) {
    return Array.from(menu.querySelectorAll('.menu-list button, .menu-list a'));
  }

  menus.forEach((menu) => {
    const trigger = menu.querySelector('.menu-trigger');
    if (!trigger) return;
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const willOpen = !menu.classList.contains('open');
      closeMenus(menu);
      setMenuOpen(menu, willOpen);
    });
    trigger.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        closeMenus(menu);
        setMenuOpen(menu, true);
        const items = menuItems(menu);
        if (items[0]) items[0].focus();
      }
    });
    menu.addEventListener('keydown', (e) => {
      if (!menu.classList.contains('open')) return;
      const items = menuItems(menu);
      const i = items.indexOf(document.activeElement);
      if (e.key === 'Escape') {
        e.preventDefault();
        setMenuOpen(menu, false);
        trigger.focus();
      } else if (e.key === 'ArrowDown' && i >= 0) {
        e.preventDefault();
        items[(i + 1) % items.length].focus();
      } else if (e.key === 'ArrowUp' && i >= 0) {
        e.preventDefault();
        items[(i - 1 + items.length) % items.length].focus();
      }
    });
    // Close after an item handler (bound elsewhere) has run.
    const list = menu.querySelector('.menu-list');
    if (list) {
      list.addEventListener('click', () => {
        setTimeout(() => setMenuOpen(menu, false), 0);
      });
    }
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest || !e.target.closest('.menu')) closeMenus(null);
  });

  // ---------------------------------------------------------------------------
  // Left area tabs: Code / Costumes / Sounds / Blocks / Inspector / API docs
  // ---------------------------------------------------------------------------
  const tabButtons = Array.from(document.querySelectorAll('.editor-tab[data-tab]'));
  const PANES = {
    code: 'pane-code',
    costumes: 'pane-assets',
    sounds: 'pane-assets',
    blocks: 'pane-blocks',
    inspector: 'pane-inspector',
    docs: 'pane-docs'
  };
  let activeTab = 'code';

  function showTab(name) {
    if (!PANES[name]) name = 'code';
    activeTab = name;
    const activePane = PANES[name];
    Object.keys(PANES).forEach((k) => {
      const pane = $(PANES[k]);
      if (pane) pane.classList.toggle('hidden', PANES[k] !== activePane);
    });
    const assetsPane = $('pane-assets');
    if (assetsPane && (name === 'costumes' || name === 'sounds')) assetsPane.setAttribute('data-mode', name);
    tabButtons.forEach((b) => {
      const on = b.getAttribute('data-tab') === name;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
      b.tabIndex = on ? 0 : -1;
    });
    document.dispatchEvent(new CustomEvent('pyscratch:tab', { detail: { tab: name } }));
  }

  tabButtons.forEach((btn, i) => {
    btn.addEventListener('click', () => showTab(btn.getAttribute('data-tab')));
    btn.addEventListener('keydown', (e) => {
      let next = -1;
      if (e.key === 'ArrowRight') next = (i + 1) % tabButtons.length;
      else if (e.key === 'ArrowLeft') next = (i - 1 + tabButtons.length) % tabButtons.length;
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = tabButtons.length - 1;
      if (next >= 0) {
        e.preventDefault();
        tabButtons[next].focus();
        showTab(tabButtons[next].getAttribute('data-tab'));
      }
    });
  });

  // Anything that inserts code / jumps to a line lives outside the Code tab: reveal the editor first
  // (capture phase, so the editor is visible and focusable when the real handler runs).
  document.addEventListener(
    'click',
    (e) => {
      const el = e.target.closest ? e.target.closest('[data-insert-code], [data-doc-insert], #view-blocks .scratch-block, #view-blocks .scratch-hat') : null;
      if (el && activeTab !== 'code') showTab('code');
    },
    true
  );

  // Tag asset sections so CSS can split them between the Costumes and Sounds tabs.
  const viewAssets = $('view-assets');
  function tagAssets() {
    if (!viewAssets) return;
    viewAssets.querySelectorAll('.assets-subblock').forEach((el) => {
      if (el.querySelector('#btn-upload-sound')) el.setAttribute('data-kind', 'sounds');
      else if (el.querySelector('#btn-upload-costume')) el.setAttribute('data-kind', 'costumes');
    });
    viewAssets.querySelectorAll('.assets-section').forEach((el) => {
      if (el.querySelector('#btn-upload-backdrop')) el.setAttribute('data-kind', 'backdrops');
      else if (el.querySelector('[data-select-target]')) el.setAttribute('data-kind', 'other');
      else if (el.classList.contains('active-sprite-section')) el.setAttribute('data-kind', 'active');
    });
    viewAssets.querySelectorAll('.sprite-rename-row, .sprite-props-grid, .sprite-toggles-row').forEach((el) => {
      el.setAttribute('data-kind', 'props');
    });
  }
  if (viewAssets && typeof MutationObserver !== 'undefined') {
    new MutationObserver(tagAssets).observe(viewAssets, { childList: true });
    tagAssets();
  }

  // ---------------------------------------------------------------------------
  // Block category column + palette flyout
  // ---------------------------------------------------------------------------
  const categoryButtons = Array.from(document.querySelectorAll('.category-item[data-category]'));
  const flyoutGroups = Array.from(document.querySelectorAll('.flyout-group[data-group]'));

  function showCategory(name) {
    categoryButtons.forEach((b) => {
      const on = b.getAttribute('data-category') === name;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    flyoutGroups.forEach((g) => {
      g.classList.toggle('hidden', g.getAttribute('data-group') !== name);
    });
    const flyout = $('quick-palette');
    if (flyout) flyout.scrollTop = 0;
  }

  categoryButtons.forEach((b) => {
    b.addEventListener('click', () => showCategory(b.getAttribute('data-category')));
  });
  if (categoryButtons.length) showCategory(categoryButtons[0].getAttribute('data-category'));

  // ---------------------------------------------------------------------------
  // Stage size toggle (small / large)
  // ---------------------------------------------------------------------------
  const sizeButtons = Array.from(document.querySelectorAll('[data-stage-size]'));
  function setStageSize(size, persist) {
    const small = size === 'small';
    document.body.classList.toggle('stage-small', small);
    sizeButtons.forEach((b) => {
      const on = b.getAttribute('data-stage-size') === (small ? 'small' : 'large');
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    if (persist) {
      try {
        global.localStorage.setItem('pyscratch.stageSize', small ? 'small' : 'large');
      } catch (_) {}
    }
  }
  sizeButtons.forEach((b) => {
    b.addEventListener('click', () => setStageSize(b.getAttribute('data-stage-size'), true));
  });
  let savedSize = 'large';
  try {
    savedSize = global.localStorage.getItem('pyscratch.stageSize') === 'small' ? 'small' : 'large';
  } catch (_) {}
  setStageSize(savedSize, false);

  // ---------------------------------------------------------------------------
  // Sprite list cards + sprite info pane
  // ---------------------------------------------------------------------------
  const thumbCache = new Map();

  function costumeThumbUrl(target, assetsMap) {
    if (!target || !assetsMap) return null;
    const costumes = target.costumes || [];
    const costume = costumes[Number(target.currentCostume) || 0] || costumes[0];
    if (!costume || !costume.md5ext) return null;
    const key = costume.md5ext;
    if (thumbCache.has(key)) return thumbCache.get(key);
    const raw = assetsMap.get(key);
    if (raw == null) return null;
    let url = null;
    try {
      const fmt = String(costume.dataFormat || key.split('.').pop() || '').toLowerCase();
      if (fmt === 'svg') {
        const text = typeof raw === 'string' ? raw : new TextDecoder().decode(raw);
        url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(text);
      } else if (typeof raw !== 'string') {
        url = URL.createObjectURL(new Blob([raw], { type: fmt === 'png' ? 'image/png' : 'image/jpeg' }));
      }
    } catch (_) {
      url = null;
    }
    if (url) thumbCache.set(key, url);
    return url;
  }

  function buildCard(target, idx, active, assetsMap, onSelect) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'sprite-card' + (target.isStage ? ' stage-card' : '') + (active ? ' active' : '');
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    const label = target.isStage ? t('stage') : target.name;
    btn.title = label;
    const thumb = document.createElement('span');
    thumb.className = 'sprite-thumb';
    const url = costumeThumbUrl(target, assetsMap);
    if (url) {
      const img = document.createElement('img');
      img.alt = '';
      img.decoding = 'async';
      img.src = url;
      thumb.appendChild(img);
    }
    const name = document.createElement('span');
    name.className = 'sprite-name';
    name.textContent = label;
    btn.appendChild(thumb);
    btn.appendChild(name);
    btn.addEventListener('click', () => onSelect(idx));
    return btn;
  }

  function updateInfoPane(target) {
    const nameInput = $('sprite-info-name');
    const showBtn = $('sprite-info-show');
    const hideBtn = $('sprite-info-hide');
    const isStage = !target || !!target.isStage;
    if (nameInput) {
      nameInput.dataset.isStage = isStage ? '1' : '0';
      nameInput.value = isStage ? t('stage') : target.name;
      nameInput.disabled = isStage;
    }
    const visible = !isStage && target.visible !== undefined ? !!target.visible : !isStage;
    if (showBtn) {
      showBtn.disabled = isStage;
      showBtn.setAttribute('aria-pressed', visible ? 'true' : 'false');
      showBtn.classList.toggle('active', visible);
    }
    if (hideBtn) {
      hideBtn.disabled = isStage;
      hideBtn.setAttribute('aria-pressed', !isStage && !visible ? 'true' : 'false');
      hideBtn.classList.toggle('active', !isStage && !visible);
    }
    const pane = $('sprite-info');
    if (pane) pane.classList.toggle('is-stage', isStage);
  }

  function renderTargets(projectJson, assetsMap, activeIdx, onSelect) {
    const list = $('target-tabs');
    const stageHost = $('stage-selector');
    if (!list || !projectJson) return;
    list.textContent = '';
    if (stageHost) stageHost.textContent = '';
    let activeCard = null;
    projectJson.targets.forEach((tg, idx) => {
      const card = buildCard(tg, idx, idx === activeIdx, assetsMap, onSelect);
      if (idx === activeIdx) activeCard = card;
      if (tg.isStage && stageHost) stageHost.appendChild(card);
      else list.appendChild(card);
    });
    updateInfoPane(projectJson.targets[activeIdx]);
    if (activeCard && !activeCard.classList.contains('stage-card') && activeCard.scrollIntoView) {
      try {
        activeCard.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      } catch (_) {}
    }
  }

  const infoName = $('sprite-info-name');
  if (infoName) {
    const commit = () => {
      const src = $('sprite-prop-name');
      const btn = $('btn-rename-sprite');
      if (src && btn) {
        src.value = infoName.value;
        btn.click();
      }
    };
    infoName.addEventListener('change', commit);
    infoName.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        infoName.blur();
      }
    });
  }

  function setVisible(want) {
    const cb = $('sprite-prop-visible');
    if (!cb) return;
    cb.checked = want;
    cb.dispatchEvent(new Event('change', { bubbles: true }));
    const showBtn = $('sprite-info-show');
    const hideBtn = $('sprite-info-hide');
    if (showBtn) {
      showBtn.setAttribute('aria-pressed', want ? 'true' : 'false');
      showBtn.classList.toggle('active', want);
    }
    if (hideBtn) {
      hideBtn.setAttribute('aria-pressed', want ? 'false' : 'true');
      hideBtn.classList.toggle('active', !want);
    }
  }
  const showBtnEl = $('sprite-info-show');
  const hideBtnEl = $('sprite-info-hide');
  if (showBtnEl) showBtnEl.addEventListener('click', () => setVisible(true));
  if (hideBtnEl) hideBtnEl.addEventListener('click', () => setVisible(false));

  // ---------------------------------------------------------------------------
  // Init + language changes
  // ---------------------------------------------------------------------------
  applyL10n();
  if (typeof MutationObserver !== 'undefined') {
    new MutationObserver(applyL10n).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['lang']
    });
  }
  showTab('code');

  global.PyScratchLayout = { t, renderTargets, showTab, showCategory, setStageSize };
})(typeof window !== 'undefined' ? window : globalThis);
