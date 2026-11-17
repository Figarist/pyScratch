(function (global) {
  'use strict';

  const SUPPORTED_LANGS = ['uk', 'en', 'ru'];
  const STORAGE_KEY = 'pyscratch_lang';

  const DICT = {
    uk: {
      brand_sub: 'Python DSL ↔ Scratch 3.0 (.sb3)',
      btn_add_sprite: '+ Спрайт',
      btn_add_sprite_title: 'Додати новий спрайт у проєкт',
      btn_open: 'Відкрити .sb3',
      btn_open_title: 'Відкрити файл .sb3 або перетягніть .sb3 у вікно',
      btn_template: 'Скинути шаблон',
      btn_save: 'Зберегти .sb3',
      btn_share: 'Поділитися',
      btn_share_title: 'Скопіювати посилання на ваш Python-код',
      snippets_label: 'Навчальні шаблони:',
      snip_hexagon: 'Геометрія (Олівець)',
      snip_functions: 'Власні функції (def)',
      snip_arrows: 'Керування стрілками',
      snip_clones: 'Клони та Салют',
      snip_quiz: 'Діалог і Списки',
      snip_levels: 'Рівні та Події',
      snip_pong: 'Пінг-Понг (Гра)',
      snip_maze: 'Лабіринт (Гра)',
      snip_clicker: 'Клікер (Гра)',
      palette_title: 'Натисніть, щоб вставити команду в курсор',
      status_ready: 'Готово. Натисніть «Запустити» або «Зберегти .sb3».',
      tab_preview: 'Сцена (Canvas 2D)',
      tab_blocks: 'Блоки Scratch',
      tab_assets: 'Асети (.sb3)',
      tab_inspector: 'Інспектор (.sb3)',
      tab_docs: 'Довідник API',
      btn_run: 'Запустити (Ctrl+Enter)',
      btn_stop: 'Стоп',
      btn_mute_title: 'Увімкнути/вимкнути звук',
      sound_on: 'Звук: Увімк',
      sound_off: 'Звук: Вимк',
      tele_dir: 'Кут',
      tele_size: 'Розмір',
      tele_mouse: 'Миша',
      tele_timer: 'Таймер',
      ask_placeholder: 'Введіть відповідь...',
      vars_empty: "Змінні та списки з'являться тут під час виконання.",
      drop_title: 'Відпустіть файл .sb3 сюди',
      drop_sub: 'Проєкт Scratch 3.0 відкриється та перетвориться на Python-код',
      docs_title: 'Довідник команд Python ↔ Scratch 3.0 (клікніть на код для вставки)',
      docs_col_cat: 'Категорія',
      docs_col_cmd: 'Команда Python',
      docs_col_block: 'Блок у Scratch 3.0',
      insp_summary_title: 'Аналізатор проєкту (.sb3)',
      insp_sprites: 'Спрайти',
      insp_backdrops: 'Тла',
      insp_costumes: 'Костюми',
      insp_sounds: 'Звуки',
      insp_vars: 'Змінні (глоб / лок)',
      insp_lists: 'Списки (глоб / лок)',
      insp_blocks: 'Усього блоків',
      insp_orphans: 'Сирітські скрипти (без шапки)',
      insp_limits_title: 'Ліміти Scratch Online',
      insp_json_size: 'Розмір project.json (ліміт 5 МБ)',
      insp_assets_total: 'Сумарний розмір асетів',
      insp_unused_count: 'Невикористані асети в архіві',
      insp_opt_title: 'Оптимізація розміру .sb3 (в один клік)',
      insp_btn_clean_unused: 'Видалити невикористані асети',
      insp_btn_compress_imgs: 'Стиснути великі PNG/JPG (>960px або >500 KB)',
      insp_assets_list_title: 'Асети проєкту (ліміт 10 МБ на файл)',
      insp_col_name: 'Назва',
      insp_col_target: 'Ціль',
      insp_col_type: 'Тип',
      insp_col_size: 'Розмір',
      insp_col_status: 'Статус',
      insp_status_ok: 'OK',
      insp_status_large: 'Великий (>500 KB)',
      insp_status_over: 'Перевищує 10 МБ!',
      insp_clean_done: 'Видалено невикористаних асетів: {count} (звільнено {size}).',
      insp_clean_none: 'Невикористаних асетів не знайдено.',
      insp_compress_done: 'Оптимізовано зображень: {count} (зекономлено {size}).',
      insp_compress_none: 'Великих растрових зображень (>960px або >500 KB) не знайдено.'
    },
    en: {
      brand_sub: 'Python DSL ↔ Scratch 3.0 (.sb3)',
      btn_add_sprite: '+ Sprite',
      btn_add_sprite_title: 'Add a new sprite to the project',
      btn_open: 'Open .sb3',
      btn_open_title: 'Open an .sb3 file or drag & drop .sb3 here',
      btn_template: 'Reset Template',
      btn_save: 'Save .sb3',
      btn_share: 'Share',
      btn_share_title: 'Copy shareable link to your Python code',
      snippets_label: 'Templates:',
      snip_hexagon: 'Geometry (Pen)',
      snip_functions: 'Functions (def)',
      snip_arrows: 'Arrow Keys',
      snip_clones: 'Clones & Fireworks',
      snip_quiz: 'Dialog & Lists',
      snip_levels: 'Levels & Events',
      snip_pong: 'Pong (Game)',
      snip_maze: 'Maze (Game)',
      snip_clicker: 'Clicker (Game)',
      palette_title: 'Click to insert command at cursor',
      status_ready: 'Ready. Press Run or Save .sb3.',
      tab_preview: 'Stage (Canvas 2D)',
      tab_blocks: 'Scratch Blocks',
      tab_assets: 'Assets (.sb3)',
      tab_inspector: 'Inspector (.sb3)',
      tab_docs: 'API Reference',
      btn_run: 'Run (Ctrl+Enter)',
      btn_stop: 'Stop',
      btn_mute_title: 'Toggle sound',
      sound_on: 'Sound: On',
      sound_off: 'Sound: Off',
      tele_dir: 'Dir',
      tele_size: 'Size',
      tele_mouse: 'Mouse',
      tele_timer: 'Timer',
      ask_placeholder: 'Type your answer...',
      vars_empty: 'Variables and lists will appear here during execution.',
      drop_title: 'Drop .sb3 file here',
      drop_sub: 'Scratch 3.0 project will open and decompile to Python code',
      docs_title: 'Python ↔ Scratch 3.0 Command Reference (click code to insert)',
      docs_col_cat: 'Category',
      docs_col_cmd: 'Python Command',
      docs_col_block: 'Scratch 3.0 Block',
      insp_summary_title: 'Project Analyzer (.sb3)',
      insp_sprites: 'Sprites',
      insp_backdrops: 'Backdrops',
      insp_costumes: 'Costumes',
      insp_sounds: 'Sounds',
      insp_vars: 'Variables (global / local)',
      insp_lists: 'Lists (global / local)',
      insp_blocks: 'Total Blocks',
      insp_orphans: 'Orphan Scripts (no hat)',
      insp_limits_title: 'Scratch Online Limits',
      insp_json_size: 'project.json size (5 MB limit)',
      insp_assets_total: 'Total assets size',
      insp_unused_count: 'Unused assets in archive',
      insp_opt_title: 'One-Click .sb3 Size Optimizer',
      insp_btn_clean_unused: 'Remove Unused Assets',
      insp_btn_compress_imgs: 'Compress Large PNG/JPG (>960px or >500 KB)',
      insp_assets_list_title: 'Project Assets (10 MB per-asset limit)',
      insp_col_name: 'Name',
      insp_col_target: 'Target',
      insp_col_type: 'Type',
      insp_col_size: 'Size',
      insp_col_status: 'Status',
      insp_status_ok: 'OK',
      insp_status_large: 'Large (>500 KB)',
      insp_status_over: 'Over 10 MB!',
      insp_clean_done: 'Removed {count} unused asset(s) (freed {size}).',
      insp_clean_none: 'No unused assets found.',
      insp_compress_done: 'Compressed {count} image(s) (saved {size}).',
      insp_compress_none: 'No oversized raster images (>960px or >500 KB) found.'
    },
    ru: {
      brand_sub: 'Python DSL ↔ Scratch 3.0 (.sb3)',
      btn_add_sprite: '+ Спрайт',
      btn_add_sprite_title: 'Добавить новый спрайт в проект',
      btn_open: 'Открыть .sb3',
      btn_open_title: 'Открыть файл .sb3 или перетащите .sb3 в окно',
      btn_template: 'Сбросить шаблон',
      btn_save: 'Сохранить .sb3',
      btn_share: 'Поделиться',
      btn_share_title: 'Скопировать ссылку на ваш Python-код',
      snippets_label: 'Учебные шаблоны:',
      snip_hexagon: 'Геометрия (Перо)',
      snip_functions: 'Свои функции (def)',
      snip_arrows: 'Управление стрелками',
      snip_clones: 'Клоны и Салют',
      snip_quiz: 'Диалог и Списки',
      snip_levels: 'Уровни и События',
      snip_pong: 'Пинг-Понг (Игра)',
      snip_maze: 'Лабиринт (Игра)',
      snip_clicker: 'Кликер (Игра)',
      palette_title: 'Нажмите, чтобы вставить команду в курсор',
      status_ready: 'Готово. Нажмите «Запустить» или «Сохранить .sb3».',
      tab_preview: 'Сцена (Canvas 2D)',
      tab_blocks: 'Блоки Scratch',
      tab_assets: 'Ассеты (.sb3)',
      tab_inspector: 'Инспектор (.sb3)',
      tab_docs: 'Справочник API',
      btn_run: 'Запустить (Ctrl+Enter)',
      btn_stop: 'Стоп',
      btn_mute_title: 'Включить/выключить звук',
      sound_on: 'Звук: Вкл',
      sound_off: 'Звук: Выкл',
      tele_dir: 'Угол',
      tele_size: 'Размер',
      tele_mouse: 'Мышь',
      tele_timer: 'Таймер',
      ask_placeholder: 'Введите ответ...',
      vars_empty: 'Переменные и списки появятся здесь во время выполнения.',
      drop_title: 'Отпустите файл .sb3 сюда',
      drop_sub: 'Проект Scratch 3.0 откроется и преобразуется в Python-код',
      docs_title: 'Справочник команд Python ↔ Scratch 3.0 (нажмите на код для вставки)',
      docs_col_cat: 'Категория',
      docs_col_cmd: 'Команда Python',
      docs_col_block: 'Блок в Scratch 3.0',
      insp_summary_title: 'Анализатор проекта (.sb3)',
      insp_sprites: 'Спрайты',
      insp_backdrops: 'Фоны',
      insp_costumes: 'Костюмы',
      insp_sounds: 'Звуки',
      insp_vars: 'Переменные (глоб / лок)',
      insp_lists: 'Списки (глоб / лок)',
      insp_blocks: 'Всего блоков',
      insp_orphans: 'Сиротские скрипты (без шапки)',
      insp_limits_title: 'Лимиты Scratch Online',
      insp_json_size: 'Размер project.json (лимит 5 МБ)',
      insp_assets_total: 'Суммарный размер ассетов',
      insp_unused_count: 'Неиспользуемые ассеты в архиве',
      insp_opt_title: 'Оптимизация размера .sb3 (в один клик)',
      insp_btn_clean_unused: 'Удалить неиспользуемые ассеты',
      insp_btn_compress_imgs: 'Сжать большие PNG/JPG (>960px или >500 KB)',
      insp_assets_list_title: 'Ассеты проекта (лимит 10 МБ на файл)',
      insp_col_name: 'Название',
      insp_col_target: 'Цель',
      insp_col_type: 'Тип',
      insp_col_size: 'Размер',
      insp_col_status: 'Статус',
      insp_status_ok: 'OK',
      insp_status_large: 'Большой (>500 KB)',
      insp_status_over: 'Превышает 10 МБ!',
      insp_clean_done: 'Удалено неиспользуемых ассетов: {count} (освобождено {size}).',
      insp_clean_none: 'Неиспользуемых ассетов не найдено.',
      insp_compress_done: 'Оптимизировано изображений: {count} (сэкономлено {size}).',
      insp_compress_none: 'Больших растровых изображений (>960px или >500 KB) не найдено.'
    }
  };

  function getBrowserStorage() {
    try {
      if (typeof window !== 'undefined' && window.location && window.localStorage) {
        return window.localStorage;
      }
    } catch (_) {}
    return null;
  }

  function detectInitialLang() {
    if (typeof window !== 'undefined' && window.location && typeof URLSearchParams !== 'undefined') {
      const params = new URLSearchParams(window.location.search || '');
      const q = (params.get('lang') || '').toLowerCase();
      if (SUPPORTED_LANGS.includes(q)) return q;
    }
    if (typeof window !== 'undefined' && SUPPORTED_LANGS.includes(window.__PYSCRATCH_DEFAULT_LANG)) {
      return window.__PYSCRATCH_DEFAULT_LANG;
    }
    try {
      const storage = getBrowserStorage();
      if (storage) {
        const saved = storage.getItem(STORAGE_KEY);
        if (SUPPORTED_LANGS.includes(saved)) return saved;
      }
    } catch (_) {}
    if (typeof document !== 'undefined' && document.documentElement) {
      const htmlLang = (document.documentElement.lang || '').toLowerCase().slice(0, 2);
      if (SUPPORTED_LANGS.includes(htmlLang)) return htmlLang;
    }
    return 'uk';
  }

  let currentLang = detectInitialLang();

  function t(key, params) {
    const table = DICT[currentLang] || DICT.uk;
    let str = table[key] != null ? table[key] : (DICT.uk[key] != null ? DICT.uk[key] : key);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        str = str.split(`{${k}}`).join(String(v));
      }
    }
    return str;
  }

  function applyDomTranslations() {
    if (typeof document === 'undefined' || !document.documentElement) return;
    document.documentElement.lang = currentLang;

    const statusBanner = typeof document.getElementById === 'function' ? document.getElementById('status-banner') : null;
    const preserveStatus = statusBanner && (statusBanner.classList.contains('error') || (statusBanner.dataset && statusBanner.dataset.customStatus === '1'));

    document.querySelectorAll('[data-i18n]').forEach((el) => {
      if (preserveStatus && el.id === 'status-text') return;
      const key = el.getAttribute('data-i18n');
      if (key) el.textContent = t(key);
    });
    document.querySelectorAll('[data-i18n-title]').forEach((el) => {
      const key = el.getAttribute('data-i18n-title');
      if (key) el.setAttribute('title', t(key));
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (key) el.setAttribute('placeholder', t(key));
    });
    document.querySelectorAll('.lang-btn[data-lang]').forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-lang') === currentLang);
    });
  }

  function setLang(lang, persist = true) {
    const normalized = String(lang || '').toLowerCase();
    if (!SUPPORTED_LANGS.includes(normalized)) return currentLang;
    currentLang = normalized;
    if (persist) {
      try {
        const storage = getBrowserStorage();
        if (storage) storage.setItem(STORAGE_KEY, currentLang);
      } catch (_) {}
    }
    applyDomTranslations();
    return currentLang;
  }

  function getLang() {
    return currentLang;
  }

  const api = {
    SUPPORTED_LANGS,
    DICT,
    t,
    getLang,
    setLang,
    applyDomTranslations
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    global.PyScratchI18n = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
