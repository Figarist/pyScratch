(function (global) {
  'use strict';

  const SUPPORTED_LANGS = ['uk', 'en', 'ru'];
  const STORAGE_KEY = 'pyscratch_lang';
  // Owner's privacy policy per UI language (plain links, no runtime requests). Read by applyDomTranslations.
  const PRIVACY_URLS = {
    uk: 'https://sivochka.com/uk/privacy/',
    en: 'https://sivochka.com/privacy/',
    ru: 'https://sivochka.com/ru/privacy/'
  };
  const PRIVACY_URL_DEFAULT = 'https://sivochka.com/privacy/';

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
      privacy_policy: 'Політика конфіденційності',
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
      insp_compress_none: 'Великих растрових зображень (>960px або >500 KB) не знайдено.',
      backdrop_label: 'Тло: {name}',
      vars_local_title: 'Локальна змінна спрайта',
      lists_local_title: 'Локальний список спрайта',
      cursor_pos: 'Ряд {ln}, Стовп {col}',
      stage_tab: 'Сцена ({name})',
      err_image_type: 'Підтримуються лише зображення .svg, .png або .jpg.',
      added_backdrop: 'Тло "{name}" (.{fmt}) додано до Сцени.',
      added_costume: 'Костюм "{name}" (.{fmt}) додано до {target}.',
      fallback_sprite: 'спрайта',
      fallback_object: 'об’єкта',
      err_image_add: 'Помилка додавання зображення: {msg}',
      err_audio_type: 'Підтримуються лише аудіофайли .wav або .mp3.',
      added_sound: 'Звук "{name}" (.{fmt}) додано до {target}.',
      err_sound_add: 'Помилка додавання звуку: {msg}',
      sp_active: 'Активний спрайт: {name}',
      sp_delete_title: 'Видалити цей спрайт',
      sp_delete: 'Видалити спрайт',
      sp_name_aria: 'Назва спрайта',
      sp_rename: 'Перейменувати',
      sp_size: 'Розмір %',
      sp_dir: 'Напрям °',
      sp_rot: 'Обертання',
      rot_all: 'Навколо',
      rot_lr: 'Зліва-направо',
      rot_none: 'Не обертати',
      sp_visible: 'Показаний',
      sp_draggable: 'Перетягується мишкою',
      sp_costumes_hint: 'Костюми (клік для switch_costume):',
      sp_upload_costume: '+ Костюм (.svg/.png)',
      sp_sounds_hint: 'Звуки (клік для play_sound):',
      sp_upload_sound: '+ Звук (.wav/.mp3)',
      none: 'Немає',
      backdrops_title: 'Тло сцени (Backdrops) — клікніть для вставки',
      sp_upload_backdrop: '+ Тло (.svg/.png)',
      stage_sounds_hint: 'Звуки Сцени (клік для play_sound):',
      stage_hint: 'Підказка: виберіть вкладку спрайта, щоб змінювати його координати, назву чи костюми.',
      sp_label: 'Спрайт: {name} (x:{x}, y:{y})',
      sp_select: 'Обрати',
      assets_tip: 'Порада: можна перетягнути будь-який файл <code>.sb3</code> прямо на вікно браузера.',
      rename_ok: 'Спрайт перейменовано на "{name}".',
      rename_fail: 'Не вдалося перейменувати спрайт.',
      delete_ok: 'Спрайт "{name}" видалено.',
      delete_fail: 'Не вдалося видалити спрайт.',
      props_ok: 'Оновлено параметри спрайта "{name}".',
      props_fail: 'Помилка оновлення параметрів.',
      blocks_empty: 'У цій вкладці ще немає блоків. Додайте @when_flag_clicked у редакторі.',
      line_badge: 'ряд {line} · {opcode}',
      else_lbl: 'Інакше',
      compiled: 'Скомпільовано ({name}): {count} блоків{pen}.',
      compiled_pen: ' + розширення Pen',
      syntax_ok: 'Синтаксис коректний.',
      compile_err: 'Помилка компіляції',
      atob_missing: 'atob недоступний у цьому середовищі',
      code_decode_fail: 'Не вдалося розшифрувати код із URL (?code=). Завантажено стандартний шаблон.',
      code_loaded: 'Код завантажено за посиланням.',
      sim_started: 'Симуляцію запущено на сцені Canvas 2D.',
      sim_stopped: 'Виконання зупинено.',
      only_sb3: 'Підтримуються лише файли Scratch 3.0 (.sb3).',
      loaded_file: 'Завантажено "{name}" ({count} об\'єктів).',
      err_open: 'Помилка відкриття .sb3: {msg}',
      template_reset: 'Створено чистий шаблон проєкту.',
      saved_sb3: 'Файл pyscratch_project.sb3 збережено (усі спрайти та асети упаковано).',
      err_save: 'Помилка збереження .sb3: {msg}',
      share_copied: 'Посилання на код скопійовано! Можете надіслати його учню або другу.',
      share_updated: 'Посилання оновлено в адресному рядку (доступ до буфера обмежено).',
      err_share: 'Помилка створення посилання: {msg}',
      starter_sprite_code: `# === СКРИПТ ГРАВЦЯ ({name}) ===\n\n@when_flag_clicked\ndef main():\n    goto({x}, 0)\n    say("Привіт від {name}!", 2)\n`,
      lang_switch_unsaved: 'Зміни в проєкті не збережено. Перемкнути мову? Збережіть .sb3 або натисніть «Поділитися», щоб не втратити код.',
      share_too_long: 'Код надто великий для посилання (ліміт {max} символів у посиланні). Збережіть проєкт як .sb3.',
      cat_events: 'Події',
      doc_01: 'Старт при натисканні зеленого прапорця',
      doc_02: 'Реакція на клавішу (space, up arrow, a..z)',
      doc_03: 'Клік мишкою по спрайту',
      doc_04: 'Коли змінюється фон сцени',
      doc_05: 'Отримання повідомлення broadcast("msg")',
      doc_06: 'Коли таймер або гучність перевищує поріг',
      doc_07: 'Скрипт для новоствореного клону',
      cat_functions: 'Функції',
      doc_08: 'Створює рожевий «Мій блок» у Scratch',
      doc_09: 'Декоратор перед def для миттєвого виконання без оновлення екрана',
      cat_motion: 'Рух',
      doc_10: 'Кроки вперед та повороти у градусах',
      doc_11: 'Миттєвий перехід або плавне ковзання',
      doc_12: 'Плавне ковзання до курсора, випадкового місця або спрайта',
      doc_13: 'Перехід у випадкове місце або до курсора',
      doc_14: 'Напрямок руху або поворот до цілі',
      doc_15: 'Зміна координат X та Y',
      doc_16: 'Відбивання від краю сцени',
      cat_looks: 'Вигляд',
      doc_17: 'Мовна або думкова бульбашка',
      doc_18: 'Зміна костюма спрайта',
      doc_19: 'Зміна фону сцени',
      doc_20: 'Змінити тло сцени та чекати завершення скриптів',
      doc_21: 'Перемістити спрайт на передній/задній шар або на N шарів',
      doc_22: 'Масштаб та видимість',
      doc_23: 'Графічні ефекти',
      cat_pen: 'Олівець',
      doc_24: 'Малювання ліній та штампування',
      doc_25: 'Колір (#hex) і товщина олівця',
      cat_sound: 'Звук',
      doc_26: 'Відтворення звуків зі списку асетів',
      doc_27: 'Звукові ефекти висоти (pitch) та панорами (pan)',
      doc_28: 'Скинути всі звукові ефекти',
      cat_control: 'Керування',
      doc_29: 'Цикли repeat, forever, repeat until',
      doc_30: 'Умовні розгалуження (підтримує ==, !=, <=, >=)',
      doc_31: 'Затримки та зупинка',
      doc_32: 'Клонування спрайтів',
      cat_sensing: 'Датчики',
      doc_33: 'Інтерактивне опитування гравця',
      doc_34: 'Перевірка клавіш та зіткнень',
      doc_35: 'Перевірка торкання кольору або кольору до іншого кольору',
      doc_36: 'Атрибут або локальна змінна іншого спрайта чи Сцени',
      doc_37: 'Режим перетягування спрайта мишкою (draggable / not draggable)',
      doc_38: 'Координати миші та таймер',
      doc_39: 'Поточний час (year..second) та дні від 2000 року',
      doc_40: 'Ім’я користувача та рівень гучності мікрофона',
      cat_operators: 'Оператори',
      doc_41: 'Тригонометричні функції (у градусах)',
      doc_42: 'Логарифми та показникова функція e^x, 10^x',
      doc_43: 'Довжина рядка або списку',
      cat_variables: 'Змінні',
      doc_44: 'Локальна змінна ("Тільки для цього спрайта")',
      doc_45: 'Показати або сховати змінну на сцені',
      cat_lists: 'Списки',
      doc_46: 'Оголосити локальний список для цього спрайта',
      doc_47: 'Робота зі списками Scratch',
      doc_48: 'Індекс (1..N) елемента у списку або 0',
      doc_49: 'Показати або сховати список на сцені',
      cat_music: 'Музика',
      cat_text2speech: 'Озвучення тексту',
      cat_translate: 'Переклад',
      doc_50: 'Подія: спрайт торкнувся об\'єкта ("edge", "mouse" або ім\'я спрайта)',
      doc_51: 'Логічний аргумент власного блока (ім\'я: bool)',
      doc_52: 'Барабан (1–18), пауза та нота (0–130) на задану кількість тактів',
      doc_53: 'Інструмент (1–21) і темп (20–500 ударів за хвилину)',
      doc_54: 'Озвучити текст (голоси alto, tenor, squeak, giant, kitten); у тестовому запуску — через speechSynthesis браузера',
      doc_55: 'Переклад тексту (у симуляторі повертає текст без змін) і мова інтерфейсу',
      autosave_restored: 'Відновлено чернетку з браузера.',
      autosave_quota: 'Пам\'ять браузера переповнена — збережіть проєкт у файл .sb3.',
      confirm_reset_template: 'Скинути проєкт до шаблону? Незбережені зміни зникнуть.',
      confirm_delete_sprite: 'Видалити спрайт «{name}» та весь його код? Цю дію не можна скасувати.',
      monitor_empty_list: '(порожньо)',
      monitor_length: 'довжина: {n}'
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
      privacy_policy: 'Privacy policy',
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
      insp_compress_none: 'No oversized raster images (>960px or >500 KB) found.',
      backdrop_label: 'Backdrop: {name}',
      vars_local_title: 'Sprite-local variable',
      lists_local_title: 'Sprite-local list',
      cursor_pos: 'Line {ln}, Col {col}',
      stage_tab: 'Stage ({name})',
      err_image_type: 'Only .svg, .png or .jpg images are supported.',
      added_backdrop: 'Backdrop "{name}" (.{fmt}) added to the Stage.',
      added_costume: 'Costume "{name}" (.{fmt}) added to {target}.',
      fallback_sprite: 'the sprite',
      fallback_object: 'the object',
      err_image_add: 'Failed to add image: {msg}',
      err_audio_type: 'Only .wav or .mp3 audio files are supported.',
      added_sound: 'Sound "{name}" (.{fmt}) added to {target}.',
      err_sound_add: 'Failed to add sound: {msg}',
      sp_active: 'Active sprite: {name}',
      sp_delete_title: 'Delete this sprite',
      sp_delete: 'Delete sprite',
      sp_name_aria: 'Sprite name',
      sp_rename: 'Rename',
      sp_size: 'Size %',
      sp_dir: 'Direction °',
      sp_rot: 'Rotation',
      rot_all: 'All around',
      rot_lr: 'Left-right',
      rot_none: 'Don\'t rotate',
      sp_visible: 'Visible',
      sp_draggable: 'Draggable with mouse',
      sp_costumes_hint: 'Costumes (click for switch_costume):',
      sp_upload_costume: '+ Costume (.svg/.png)',
      sp_sounds_hint: 'Sounds (click for play_sound):',
      sp_upload_sound: '+ Sound (.wav/.mp3)',
      none: 'None',
      backdrops_title: 'Stage backdrops — click to insert',
      sp_upload_backdrop: '+ Backdrop (.svg/.png)',
      stage_sounds_hint: 'Stage sounds (click for play_sound):',
      stage_hint: 'Tip: select a sprite tab to change its coordinates, name or costumes.',
      sp_label: 'Sprite: {name} (x:{x}, y:{y})',
      sp_select: 'Select',
      assets_tip: 'Tip: you can drag any <code>.sb3</code> file straight onto the browser window.',
      rename_ok: 'Sprite renamed to "{name}".',
      rename_fail: 'Could not rename the sprite.',
      delete_ok: 'Sprite "{name}" deleted.',
      delete_fail: 'Could not delete the sprite.',
      props_ok: 'Sprite "{name}" properties updated.',
      props_fail: 'Failed to update properties.',
      blocks_empty: 'No blocks in this tab yet. Add @when_flag_clicked in the editor.',
      line_badge: 'line {line} · {opcode}',
      else_lbl: 'else',
      compiled: 'Compiled ({name}): {count} blocks{pen}.',
      compiled_pen: ' + Pen extension',
      syntax_ok: 'Syntax is valid.',
      compile_err: 'Compilation error',
      atob_missing: 'atob is not available in this environment',
      code_decode_fail: 'Could not decode the code from the URL (?code=). The default template was loaded.',
      code_loaded: 'Code loaded from the link.',
      sim_started: 'Simulation started on the Canvas 2D stage.',
      sim_stopped: 'Execution stopped.',
      only_sb3: 'Only Scratch 3.0 (.sb3) files are supported.',
      loaded_file: 'Loaded "{name}" ({count} targets).',
      err_open: 'Failed to open .sb3: {msg}',
      template_reset: 'A clean project template was created.',
      saved_sb3: 'pyscratch_project.sb3 saved (all sprites and assets packed).',
      err_save: 'Failed to save .sb3: {msg}',
      share_copied: 'Link copied! You can send it to a student or a friend.',
      share_updated: 'Link updated in the address bar (clipboard access is restricted).',
      err_share: 'Failed to create the link: {msg}',
      starter_sprite_code: `# === PLAYER SCRIPT ({name}) ===\n\n@when_flag_clicked\ndef main():\n    goto({x}, 0)\n    say("Hello from {name}!", 2)\n`,
      lang_switch_unsaved: 'Your project has unsaved changes. Switch language anyway? Save as .sb3 or use Share to keep your code.',
      share_too_long: 'The code is too long to share as a link (limit {max} characters). Save the project as .sb3 instead.',
      cat_events: 'Events',
      doc_01: 'Start when the green flag is clicked',
      doc_02: 'React to a key (space, up arrow, a..z)',
      doc_03: 'Mouse click on the sprite',
      doc_04: 'When the backdrop changes',
      doc_05: 'Receive a message sent by broadcast("msg")',
      doc_06: 'When the timer or loudness exceeds a threshold',
      doc_07: 'Script for a newly created clone',
      cat_functions: 'Functions',
      doc_08: 'Creates a pink "My Block" in Scratch',
      doc_09: 'Decorator before def: run instantly without screen refresh',
      cat_motion: 'Motion',
      doc_10: 'Steps forward and turns in degrees',
      doc_11: 'Instant jump or smooth glide',
      doc_12: 'Glide smoothly to the pointer, a random place or a sprite',
      doc_13: 'Jump to a random place or to the pointer',
      doc_14: 'Direction of movement or turn towards a target',
      doc_15: 'Change X and Y coordinates',
      doc_16: 'Bounce off the stage edge',
      cat_looks: 'Looks',
      doc_17: 'Speech or thought bubble',
      doc_18: 'Change the sprite costume',
      doc_19: 'Change the stage backdrop',
      doc_20: 'Switch the backdrop and wait for scripts to finish',
      doc_21: 'Move the sprite to the front/back layer or by N layers',
      doc_22: 'Scale and visibility',
      doc_23: 'Graphic effects',
      cat_pen: 'Pen',
      doc_24: 'Drawing lines and stamping',
      doc_25: 'Pen colour (#hex) and thickness',
      cat_sound: 'Sound',
      doc_26: 'Play sounds from the asset list',
      doc_27: 'Pitch and pan sound effects',
      doc_28: 'Reset all sound effects',
      cat_control: 'Control',
      doc_29: 'Repeat, forever and repeat until loops',
      doc_30: 'Conditional branches (supports ==, !=, <=, >=)',
      doc_31: 'Delays and stopping',
      doc_32: 'Cloning sprites',
      cat_sensing: 'Sensing',
      doc_33: 'Interactive question for the player',
      doc_34: 'Check keys and collisions',
      doc_35: 'Check touching a colour or one colour touching another',
      doc_36: 'Attribute or local variable of another sprite or the Stage',
      doc_37: 'Sprite drag mode with the mouse (draggable / not draggable)',
      doc_38: 'Mouse coordinates and timer',
      doc_39: 'Current time (year..second) and days since 2000',
      doc_40: 'User name and microphone loudness',
      cat_operators: 'Operators',
      doc_41: 'Trigonometric functions (in degrees)',
      doc_42: 'Logarithms and exponential functions e^x, 10^x',
      doc_43: 'Length of a string or list',
      cat_variables: 'Variables',
      doc_44: 'Local variable ("For this sprite only")',
      doc_45: 'Show or hide a variable on the stage',
      cat_lists: 'Lists',
      doc_46: 'Declare a local list for this sprite',
      doc_47: 'Work with Scratch lists',
      doc_48: 'Index (1..N) of an item in a list, or 0',
      doc_49: 'Show or hide a list on the stage',
      cat_music: 'Music',
      cat_text2speech: 'Text to Speech',
      cat_translate: 'Translate',
      doc_50: 'Event: the sprite touches an object ("edge", "mouse" or a sprite name)',
      doc_51: 'Boolean argument of a custom block (name: bool)',
      doc_52: 'Drum (1-18), rest and note (0-130) for a number of beats',
      doc_53: 'Instrument (1-21) and tempo (20-500 beats per minute)',
      doc_54: 'Speak text (voices alto, tenor, squeak, giant, kitten); the preview uses the browser speechSynthesis',
      doc_55: 'Translate text (the preview returns the text unchanged) and the viewer language',
      autosave_restored: 'Restored draft from browser storage.',
      autosave_quota: 'Browser storage is full — save your project as .sb3.',
      confirm_reset_template: 'Reset project to the default template? Unsaved changes will be lost.',
      confirm_delete_sprite: 'Delete sprite "{name}" and all its code? This cannot be undone.',
      monitor_empty_list: '(empty)',
      monitor_length: 'length: {n}'
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
      privacy_policy: 'Политика конфиденциальности',
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
      insp_compress_none: 'Больших растровых изображений (>960px или >500 KB) не найдено.',
      backdrop_label: 'Фон: {name}',
      vars_local_title: 'Локальная переменная спрайта',
      lists_local_title: 'Локальный список спрайта',
      cursor_pos: 'Строка {ln}, Столбец {col}',
      stage_tab: 'Сцена ({name})',
      err_image_type: 'Поддерживаются только изображения .svg, .png или .jpg.',
      added_backdrop: 'Фон "{name}" (.{fmt}) добавлен на Сцену.',
      added_costume: 'Костюм "{name}" (.{fmt}) добавлен в {target}.',
      fallback_sprite: 'спрайта',
      fallback_object: 'объекта',
      err_image_add: 'Ошибка добавления изображения: {msg}',
      err_audio_type: 'Поддерживаются только аудиофайлы .wav или .mp3.',
      added_sound: 'Звук "{name}" (.{fmt}) добавлен в {target}.',
      err_sound_add: 'Ошибка добавления звука: {msg}',
      sp_active: 'Активный спрайт: {name}',
      sp_delete_title: 'Удалить этот спрайт',
      sp_delete: 'Удалить спрайт',
      sp_name_aria: 'Название спрайта',
      sp_rename: 'Переименовать',
      sp_size: 'Размер %',
      sp_dir: 'Направление °',
      sp_rot: 'Вращение',
      rot_all: 'Вокруг',
      rot_lr: 'Слева-направо',
      rot_none: 'Не вращать',
      sp_visible: 'Показан',
      sp_draggable: 'Перетаскивается мышью',
      sp_costumes_hint: 'Костюмы (клик для switch_costume):',
      sp_upload_costume: '+ Костюм (.svg/.png)',
      sp_sounds_hint: 'Звуки (клик для play_sound):',
      sp_upload_sound: '+ Звук (.wav/.mp3)',
      none: 'Нет',
      backdrops_title: 'Фоны сцены (Backdrops) — кликните для вставки',
      sp_upload_backdrop: '+ Фон (.svg/.png)',
      stage_sounds_hint: 'Звуки Сцены (клик для play_sound):',
      stage_hint: 'Подсказка: выберите вкладку спрайта, чтобы менять его координаты, название или костюмы.',
      sp_label: 'Спрайт: {name} (x:{x}, y:{y})',
      sp_select: 'Выбрать',
      assets_tip: 'Совет: можно перетащить любой файл <code>.sb3</code> прямо в окно браузера.',
      rename_ok: 'Спрайт переименован в "{name}".',
      rename_fail: 'Не удалось переименовать спрайт.',
      delete_ok: 'Спрайт "{name}" удалён.',
      delete_fail: 'Не удалось удалить спрайт.',
      props_ok: 'Параметры спрайта "{name}" обновлены.',
      props_fail: 'Ошибка обновления параметров.',
      blocks_empty: 'В этой вкладке ещё нет блоков. Добавьте @when_flag_clicked в редакторе.',
      line_badge: 'строка {line} · {opcode}',
      else_lbl: 'Иначе',
      compiled: 'Скомпилировано ({name}): {count} блоков{pen}.',
      compiled_pen: ' + расширение Pen',
      syntax_ok: 'Синтаксис корректен.',
      compile_err: 'Ошибка компиляции',
      atob_missing: 'atob недоступен в этой среде',
      code_decode_fail: 'Не удалось расшифровать код из URL (?code=). Загружен стандартный шаблон.',
      code_loaded: 'Код загружен по ссылке.',
      sim_started: 'Симуляция запущена на сцене Canvas 2D.',
      sim_stopped: 'Выполнение остановлено.',
      only_sb3: 'Поддерживаются только файлы Scratch 3.0 (.sb3).',
      loaded_file: 'Загружено "{name}" ({count} объектов).',
      err_open: 'Ошибка открытия .sb3: {msg}',
      template_reset: 'Создан чистый шаблон проекта.',
      saved_sb3: 'Файл pyscratch_project.sb3 сохранён (все спрайты и ассеты упакованы).',
      err_save: 'Ошибка сохранения .sb3: {msg}',
      share_copied: 'Ссылка на код скопирована! Можете отправить её ученику или другу.',
      share_updated: 'Ссылка обновлена в адресной строке (доступ к буферу ограничен).',
      err_share: 'Ошибка создания ссылки: {msg}',
      starter_sprite_code: `# === СКРИПТ ИГРОКА ({name}) ===\n\n@when_flag_clicked\ndef main():\n    goto({x}, 0)\n    say("Привет от {name}!", 2)\n`,
      lang_switch_unsaved: 'Изменения в проекте не сохранены. Переключить язык? Сохраните .sb3 или нажмите «Поделиться», чтобы не потерять код.',
      share_too_long: 'Код слишком большой для ссылки (лимит {max} символов). Сохраните проект как .sb3.',
      cat_events: 'События',
      doc_01: 'Старт при нажатии на зелёный флажок',
      doc_02: 'Реакция на клавишу (space, up arrow, a..z)',
      doc_03: 'Клик мышью по спрайту',
      doc_04: 'Когда меняется фон сцены',
      doc_05: 'Получение сообщения, отправленного через broadcast("msg")',
      doc_06: 'Когда таймер или громкость превышает порог',
      doc_07: 'Скрипт для только что созданного клона',
      cat_functions: 'Функции',
      doc_08: 'Создаёт розовый «Мой блок» в Scratch',
      doc_09: 'Декоратор перед def: мгновенное выполнение без обновления экрана',
      cat_motion: 'Движение',
      doc_10: 'Шаги вперёд и повороты в градусах',
      doc_11: 'Мгновенный переход или плавное скольжение',
      doc_12: 'Плавное скольжение к курсору, случайному месту или спрайту',
      doc_13: 'Переход в случайное место или к курсору',
      doc_14: 'Направление движения или поворот к цели',
      doc_15: 'Изменение координат X и Y',
      doc_16: 'Отражение от края сцены',
      cat_looks: 'Внешность',
      doc_17: 'Речевое или мысленное облачко',
      doc_18: 'Смена костюма спрайта',
      doc_19: 'Смена фона сцены',
      doc_20: 'Сменить фон сцены и дождаться завершения скриптов',
      doc_21: 'Переместить спрайт на передний/задний слой или на N слоёв',
      doc_22: 'Масштаб и видимость',
      doc_23: 'Графические эффекты',
      cat_pen: 'Перо',
      doc_24: 'Рисование линий и штампование',
      doc_25: 'Цвет (#hex) и толщина пера',
      cat_sound: 'Звук',
      doc_26: 'Воспроизведение звуков из списка ассетов',
      doc_27: 'Звуковые эффекты высоты (pitch) и панорамы (pan)',
      doc_28: 'Сбросить все звуковые эффекты',
      cat_control: 'Управление',
      doc_29: 'Циклы repeat, forever, repeat until',
      doc_30: 'Условные ветвления (поддерживает ==, !=, <=, >=)',
      doc_31: 'Задержки и остановка',
      doc_32: 'Клонирование спрайтов',
      cat_sensing: 'Сенсоры',
      doc_33: 'Интерактивный вопрос игроку',
      doc_34: 'Проверка клавиш и столкновений',
      doc_35: 'Проверка касания цвета или цвета другого цвета',
      doc_36: 'Атрибут или локальная переменная другого спрайта или Сцены',
      doc_37: 'Режим перетаскивания спрайта мышью (draggable / not draggable)',
      doc_38: 'Координаты мыши и таймер',
      doc_39: 'Текущее время (year..second) и дни с 2000 года',
      doc_40: 'Имя пользователя и громкость микрофона',
      cat_operators: 'Операторы',
      doc_41: 'Тригонометрические функции (в градусах)',
      doc_42: 'Логарифмы и показательная функция e^x, 10^x',
      doc_43: 'Длина строки или списка',
      cat_variables: 'Переменные',
      doc_44: 'Локальная переменная («Только для этого спрайта»)',
      doc_45: 'Показать или скрыть переменную на сцене',
      cat_lists: 'Списки',
      doc_46: 'Объявить локальный список для этого спрайта',
      doc_47: 'Работа со списками Scratch',
      doc_48: 'Индекс (1..N) элемента в списке или 0',
      doc_49: 'Показать или скрыть список на сцене',
      cat_music: 'Музыка',
      cat_text2speech: 'Озвучивание текста',
      cat_translate: 'Перевод',
      doc_50: 'Событие: спрайт коснулся объекта ("edge", "mouse" или имя спрайта)',
      doc_51: 'Логический аргумент пользовательского блока (имя: bool)',
      doc_52: 'Барабан (1–18), пауза и нота (0–130) на заданное число тактов',
      doc_53: 'Инструмент (1–21) и темп (20–500 ударов в минуту)',
      doc_54: 'Озвучить текст (голоса alto, tenor, squeak, giant, kitten); в предпросмотре используется speechSynthesis браузера',
      doc_55: 'Перевод текста (в симуляторе возвращает текст без изменений) и язык интерфейса',
      autosave_restored: 'Черновик восстановлен из браузера.',
      autosave_quota: 'Память браузера переполнена — сохраните проект в файл .sb3.',
      confirm_reset_template: 'Сбросить проект к шаблону? Несохранённые изменения пропадут.',
      confirm_delete_sprite: 'Удалить спрайт «{name}» и весь его код? Это действие нельзя отменить.',
      monitor_empty_list: '(пусто)',
      monitor_length: 'длина: {n}'
    }
  };

  const PALETTE_TIPS = {
    move: ['Перемістити спрайт вперед на задану кількість кроків', 'Move sprite forward by steps', 'Переместить спрайт вперёд на заданное число шагов'],
    turn_right: ['Повернути спрайт за годинниковою стрілкою (градуси)', 'Turn sprite clockwise by degrees', 'Повернуть спрайт по часовой стрелке (градусы)'],
    turn_left: ['Повернути спрайт проти годинникової стрілки (градуси)', 'Turn sprite counter-clockwise by degrees', 'Повернуть спрайт против часовой стрелки (градусы)'],
    goto: ['Миттєво перенести спрайт у точку (x, y)', 'Jump sprite instantly to (x, y)', 'Мгновенно перенести спрайт в точку (x, y)'],
    goto_random: ['Перенести спрайт у випадкове місце на сцені', 'Go to a random position on stage', 'Перейти в случайное место на сцене'],
    goto_mouse: ['Перенести спрайт до вказівника миші', 'Go to the mouse pointer', 'Перейти к указателю мыши'],
    glide: ['Плавно ковзати до точки (x, y) за вказані секунди', 'Glide smoothly to (x, y) over seconds', 'Плавно плыть к точке (x, y) за указанное время'],
    glide_to: ['Плавно ковзати до миші, випадкового місця або спрайта', 'Glide smoothly to mouse, random position or sprite', 'Плавно плыть к мыши, случайному месту или спрайту'],
    point_in_direction: ['Повернути у заданому напрямку (0° вгору, 90° праворуч)', 'Point in direction (0° up, 90° right)', 'Повернуть в направлении (0° вверх, 90° вправо)'],
    point_towards: ['Повернути спрайт обличчям до миші або іншого спрайта', 'Point toward mouse pointer or another sprite', 'Повернуть спрайт к мыши или другому спрайту'],
    change_x: ['Змінити координату X на задане число', 'Change X position by amount', 'Изменить координату X на заданное число'],
    set_x: ['Встановити точну координату X', 'Set X position to value', 'Установить точную координату X'],
    change_y: ['Змінити координату Y на задане число', 'Change Y position by amount', 'Изменить координату Y на заданное число'],
    set_y: ['Встановити точну координату Y', 'Set Y position to value', 'Установить точную координату Y'],
    if_on_edge_bounce: ['Відбитися, якщо спрайт торкнувся краю сцени', 'Bounce back if touching the stage edge', 'Оттолкнуться, если спрайт коснулся края сцены'],
    set_rotation_style: ['Стиль обертання: зліва-направо, не обертати або навколо', 'Rotation style: left-right, don\'t rotate, or all around', 'Стиль вращения: влево-вправо, не вращать или кругом'],
    x_position: ['Поточна координата X спрайта', 'Current X position of sprite', 'Текущая координата X спрайта'],
    y_position: ['Поточна координата Y спрайта', 'Current Y position of sprite', 'Текущая координата Y спрайта'],
    direction: ['Поточний напрям спрайта у градусах', 'Current direction angle of sprite', 'Текущее направление спрайта в градусах'],
    say: ['Показати бульбашку з текстом на кілька секунд', 'Show speech bubble for given seconds', 'Показать облачко с текстом на несколько секунд'],
    think: ['Показати бульбашку «думає» на кілька секунд', 'Show thought bubble for given seconds', 'Показать облачко «думает» на несколько секунд'],
    switch_costume: ['Перемкнути образ (костюм) спрайта', 'Switch sprite to chosen costume', 'Переключить костюм спрайта'],
    next_costume: ['Перемкнути на наступний образ для анімації', 'Switch to next costume for animation', 'Переключить на следующий костюм для анимации'],
    switch_backdrop: ['Змінити тло сцени на обране', 'Switch stage backdrop to chosen one', 'Сменить фон сцены на выбранный'],
    next_backdrop: ['Перемкнути на наступне тло сцени', 'Switch to next stage backdrop', 'Переключить на следующий фон сцены'],
    set_size: ['Встановити розмір спрайта у відсотках (100% — звичайний)', 'Set sprite size in percent (100% is normal)', 'Установить размер спрайта в процентах (100% — обычный)'],
    change_size: ['Збільшити або зменшити розмір спрайта', 'Increase or decrease sprite size', 'Увеличить или уменьшить размер спрайта'],
    show: ['Зробити спрайт видимим на сцені', 'Make sprite visible on stage', 'Сделать спрайт видимым на сцене'],
    hide: ['Сховати спрайт зі сцени', 'Hide sprite from stage', 'Спрятать спрайт со сцены'],
    set_effect: ['Встановити графічний ефект (колір, привид, яскравість)', 'Set graphic effect (color, ghost, brightness)', 'Установить графический эффект (цвет, призрак, яркость)'],
    change_effect: ['Змінити графічний ефект на задане значення', 'Change graphic effect by amount', 'Изменить графический эффект на заданное значение'],
    clear_effects: ['Прибрати всі графічні ефекти зі спрайта', 'Clear all graphic effects on sprite', 'Сбросить все графические эффекты спрайта'],
    go_to_layer: ['Перемістити спрайт на передній або задній шар', 'Move sprite to front or back layer', 'Переместить спрайт на передний или задний слой'],
    change_layer: ['Перемістити спрайт на кілька шарів вперед або назад', 'Move sprite forward or backward by layers', 'Переместить спрайт на несколько слоёв вперёд или назад'],
    costume_number: ['Номер поточного образу спрайта', 'Current costume number of sprite', 'Номер текущего костюма спрайта'],
    costume_name: ['Назва поточного образу спрайта', 'Current costume name of sprite', 'Название текущего костюма спрайта'],
    size: ['Поточний розмір спрайта у відсотках', 'Current sprite size in percent', 'Текущий размер спрайта в процентах'],
    play_sound: ['Запустити звук без зупинки скрипта', 'Start playing sound without waiting', 'Запустить звук без остановки скрипта'],
    play_sound_until_done: ['Відтворити звук і дочекатися його завершення', 'Play sound and wait until done', 'Проиграть звук и дождаться его окончания'],
    stop_all_sounds: ['Миттєво зупинити всі звуки у проєкті', 'Stop all playing sounds immediately', 'Мгновенно остановить все звуки в проекте'],
    set_volume: ['Встановити гучність спрайта (0–100%)', 'Set sprite sound volume (0–100%)', 'Установить громкость спрайта (0–100%)'],
    change_volume: ['Змінити гучність спрайта на задану величину', 'Change sprite sound volume by amount', 'Изменить громкость спрайта на заданное значение'],
    set_sound_effect: ['Встановити звуковий ефект висоти (pitch) або панорами (pan)', 'Set sound effect pitch or pan', 'Установить звуковой эффект высоты (pitch) или панорамы (pan)'],
    change_sound_effect: ['Змінити звуковий ефект висоти (pitch) або панорами (pan)', 'Change sound effect pitch or pan', 'Изменить звуковой эффект высоты (pitch) или панорамы (pan)'],
    clear_sound_effects: ['Скинути всі звукові ефекти', 'Clear all sound effects', 'Сбросить все звуковые эффекты'],
    volume: ['Поточна гучність спрайта', 'Current sprite volume level', 'Текущая громкость спрайта'],
    '@when_flag_clicked': ['Запустити скрипт, коли натиснуто зелений прапорець', 'Run script when the green flag is clicked', 'Запустить скрипт при нажатии зелёного флажка'],
    '@when_key_pressed': ['Запустити скрипт, коли натиснуто обрану клавішу', 'Run script when chosen key is pressed', 'Запустить скрипт при нажатии выбранной клавиши'],
    '@when_this_sprite_clicked': ['Запустити скрипт, коли натиснули на цей спрайт', 'Run script when this sprite is clicked', 'Запустить скрипт при клике на этот спрайт'],
    '@when_backdrop_switches': ['Запустити скрипт, коли сцена змінить тло', 'Run script when backdrop switches', 'Запустить скрипт при смене фона сцены'],
    '@when_message_received': ['Запустити скрипт, коли надійде повідомлення', 'Run script when a broadcast message arrives', 'Запустить скрипт при получении сообщения'],
    '@when_greater_than': ['Запустити скрипт, коли таймер або гучність більші за число', 'Run script when timer or loudness exceeds value', 'Запустить скрипт, когда таймер или громкость больше числа'],
    '@when_cloned': ['Що робити клону одразу після створення', 'Run script when a new clone starts', 'Что делать клону сразу после создания'],
    '@when_touching': ['Запустити скрипт, коли спрайт торкнеться об\'єкта', 'Run script when sprite touches an object', 'Запустить скрипт, когда спрайт коснётся объекта'],
    broadcast: ['Надіслати повідомлення всім спрайтам і йти далі', 'Broadcast message to all sprites and continue', 'Отправить сообщение всем спрайтам и идти дальше'],
    broadcast_and_wait: ['Надіслати повідомлення і почекати завершення реакцій', 'Broadcast message and wait for receivers to finish', 'Отправить сообщение и дождаться завершения реакций'],
    wait: ['Поставити скрипт на паузу на вказану кількість секунд', 'Pause script for given seconds', 'Поставить скрипт на паузу на указанные секунды'],
    'for ': ['Повторити команди всередині задану кількість разів', 'Repeat inner commands a set number of times', 'Повторить команды внутри заданное число раз'],
    'while True': ['Повторювати команди всередині нескінченно («завжди»)', 'Repeat inner commands forever', 'Повторять команды внутри бесконечно («всегда»)'],
    'if_else': ['Виконати першу гілку, якщо умова істинна, інакше — другу', 'Run first branch if true, otherwise second branch', 'Выполнить первую ветку, если верно, иначе — вторую'],
    'if ': ['Виконати команди, тільки якщо умова істинна', 'Run commands only if condition is true', 'Выполнить команды, только если условие истинно'],
    wait_until: ['Чекати, поки умова не стане істинною', 'Wait until condition becomes true', 'Ждать, пока условие не станет истинным'],
    'while not': ['Повторювати команди, поки умова не стане істинною', 'Repeat commands until condition becomes true', 'Повторять команды, пока условие не станет истинным'],
    stop: ['Зупинити цей скрипт, інші скрипти або весь проєкт', 'Stop this script, other scripts, or whole project', 'Остановить этот скрипт, другие скрипты или весь проект'],
    create_clone: ['Створити копію (клон) цього або іншого спрайта', 'Create a clone of this or another sprite', 'Создать копию (клон) этого или другого спрайта'],
    delete_this_clone: ['Видалити поточний клон зі сцени', 'Delete this clone from the stage', 'Удалить текущий клон со сцены'],
    ask: ['Запитати гравця і дочекатися відповіді', 'Ask the player a question and wait for input', 'Спросить игрока и дождаться ответа'],
    answer: ['Текст, який гравець ввів у відповідь на ask()', 'Text the player typed in response to ask()', 'Текст, который игрок ввёл в ответ на ask()'],
    key_pressed: ['Перевірити, чи затиснута клавіша прямо зараз', 'Check if a keyboard key is held down', 'Проверить, зажата ли клавиша прямо сейчас'],
    touching: ['Перевірити, чи торкається спрайт краю, миші або іншого спрайта', 'Check if touching edge, mouse, or another sprite', 'Проверить касание края, мыши или другого спрайта'],
    touching_color: ['Перевірити, чи торкається спрайт вказаного кольору', 'Check if touching a specific color', 'Проверить, касается ли спрайт указанного цвета'],
    color_is_touching_color: ['Перевірити, чи один колір спрайта торкається іншого кольору', 'Check if one color on sprite touches another color', 'Проверить, касается ли один цвет спрайта другого цвета'],
    distance_to: ['Відстань у кроках до миші або іншого спрайта', 'Distance in steps to mouse or another sprite', 'Расстояние в шагах до мыши или другого спрайта'],
    mouse_x: ['Поточна координата X вказівника миші', 'Current X position of mouse pointer', 'Текущая координата X указателя мыши'],
    mouse_y: ['Поточна координата Y вказівника миші', 'Current Y position of mouse pointer', 'Текущая координата Y указателя мыши'],
    mouse_down: ['Перевірити, чи натиснута кнопка миші', 'Check if the mouse button is pressed', 'Проверить, нажата ли кнопка мыши'],
    timer: ['Скільки секунд минуло від старту або скидання таймера', 'Seconds elapsed since start or timer reset', 'Сколько секунд прошло с запуска или сброса таймера'],
    reset_timer: ['Обнулити таймер до 0', 'Reset the timer back to 0', 'Сбросить таймер на 0'],
    set_drag_mode: ['Дозволити або заборонити перетягування спрайта мишкою', 'Make sprite draggable or not draggable with mouse', 'Разрешить или запретить перетаскивание спрайта мышью'],
    attribute_of: ['Дізнатися координату, розмір або змінну іншого спрайта чи Сцени', 'Read a property or variable of another sprite or Stage', 'Узнать координату, размер или переменную другого спрайта или Сцены'],
    current_time: ['Поточний рік, місяць, день, година, хвилина чи секунда', 'Current year, month, date, hour, minute, or second', 'Текущий год, месяц, день, час, минута или секунда'],
    days_since_2000: ['Кількість днів, що минули від 2000 року', 'Number of days elapsed since year 2000', 'Количество дней, прошедших с 2000 года'],
    username: ['Ім\'я користувача Scratch', 'Scratch username', 'Имя пользователя Scratch'],
    loudness: ['Рівень гучності мікрофона (0–100)', 'Microphone loudness level (0–100)', 'Уровень громкости микрофона (0–100)'],
    random: ['Обрати випадкове число у діапазоні (ціле або дробове)', 'Pick a random number in range (integer or decimal)', 'Выбрать случайное число в диапазоне (целое или дробное)'],
    join: ['Зклеїти два тексти або значення в один рядок', 'Join two texts or values together', 'Склеить два текста или значения в одну строку'],
    letter_of: ['Взяти одну літеру з тексту за її номером (від 1)', 'Get one letter from text by 1-based position', 'Взять одну букву из текста по номеру (с 1)'],
    len: ['Порахувати довжину тексту (кількість символів)', 'Count the length of a text string', 'Посчитать длину текста (число символов)'],
    contains: ['Перевірити, чи містить текст вказаний фрагмент', 'Check if text contains a substring', 'Проверить, содержит ли текст указанный фрагмент'],
    round: ['Округлити число до найближчого цілого', 'Round a number to the nearest integer', 'Округлить число до ближайшего целого'],
    abs: ['Модуль числа (завжди невід\'ємне)', 'Absolute value of a number', 'Модуль числа (всегда неотрицательное)'],
    sqrt: ['Квадратний корінь із числа', 'Square root of a number', 'Квадратный корень из числа'],
    floor: ['Округлити число вниз до цілого', 'Round a number down to integer', 'Округлить число вниз до целого'],
    ceil: ['Округлити число вгору до цілого', 'Round a number up to integer', 'Округлить число вверх до целого'],
    sin: ['Синус кута в градусах', 'Sine of angle in degrees', 'Синус угла в градусах'],
    ln: ['Натуральний логарифм числа', 'Natural logarithm of a number', 'Натуральный логарифм числа'],
    var_set: ['Записати нове значення у глобальну змінну (для всіх спрайтів)', 'Set a global variable (for all sprites)', 'Записать новое значение в глобальную переменную (для всех спрайтов)'],
    var_change: ['Збільшити глобальну змінну на задане число', 'Change a global variable by amount', 'Увеличить глобальную переменную на заданное число'],
    var_local: ['Створити локальну змінну («Тільки для цього спрайта»)', 'Set a local variable ("For this sprite only")', 'Задать локальную переменную («Только для этого спрайта»)'],
    show_variable: ['Показати монітор змінної на сцені', 'Show variable monitor on stage', 'Показать монитор переменной на сцене'],
    hide_variable: ['Сховати монітор змінної зі сцени', 'Hide variable monitor from stage', 'Спрятать монитор переменной со сцены'],
    list_add: ['Додати елемент у кінець списку', 'Add item to the end of a list', 'Добавить элемент в конец списка'],
    list_item: ['Взяти елемент списку за номером (від 1)', 'Get item from list by 1-based index', 'Взять элемент списка по номеру (с 1)'],
    list_insert: ['Вставити елемент у список на вказану позицію', 'Insert item into list at position', 'Вставить элемент в список на указанную позицию'],
    list_replace: ['Замінити елемент списку на вказаній позиції', 'Replace item in list at position', 'Заменить элемент списка на указанной позиции'],
    list_delete: ['Видалити елемент зі списку за номером', 'Delete item from list at position', 'Удалить элемент из списка по номеру'],
    list_clear: ['Видалити всі елементи зі списку', 'Delete all items from a list', 'Удалить все элементы из списка'],
    list_length: ['Кількість елементів у списку', 'Number of items in a list', 'Количество элементов в списке'],
    list_contains: ['Перевірити, чи є елемент у списку', 'Check if list contains an item', 'Проверить, есть ли элемент в списке'],
    list_index_of: ['Знайти номер (1..N) елемента у списку або 0', 'Find 1-based index of item in list, or 0', 'Найти номер (1..N) элемента в списке или 0'],
    show_list: ['Показати список на сцені', 'Show list monitor on stage', 'Показать список на сцене'],
    hide_list: ['Сховати список зі сцени', 'Hide list monitor from stage', 'Спрятать список со сцены'],
    local_list: ['Створити локальний список («Тільки для цього спрайта»)', 'Declare a local list ("For this sprite only")', 'Объявить локальный список («Только для этого спрайта»)'],
    '@warp': ['Власний блок, який виконується миттєво без оновлення екрана', 'Custom block that runs without screen refresh', 'Свой блок, выполняемый мгновенно без обновления экрана'],
    def_bool: ['Створити власний блок із логічним (Так/Ні) аргументом', 'Define a custom block with a boolean argument', 'Создать свой блок с логическим аргументом'],
    'def ': ['Створити власний блок (функцію) для повторного використання', 'Define your own reusable custom block', 'Создать свой блок (функцию) для повторного использования'],
    my_block: ['Викликати створений власний блок із аргументами', 'Call your custom block with arguments', 'Вызвать созданный свой блок с аргументами'],
    pen_down: ['Опустити олівець — спрайт малюватиме під час руху', 'Put pen down so sprite draws while moving', 'Опустить перо — спрайт будет рисовать при движении'],
    pen_up: ['Підняти олівець — припинити малювання', 'Lift pen up to stop drawing', 'Поднять перо — перестать рисовать'],
    pen_clear: ['Стерти всі лінії та штампи олівця зі сцени', 'Erase all pen lines and stamps from stage', 'Стереть все линии и штампы пера со сцены'],
    pen_stamp: ['Залишити відбиток (штамп) спрайта на сцені', 'Stamp a copy of sprite onto stage', 'Оставить отпечаток (штамп) спрайта на сцене'],
    set_pen_color: ['Задати колір лінії олівця (#hex)', 'Set pen drawing color (#hex)', 'Задать цвет линии пера (#hex)'],
    set_pen_size: ['Задати товщину лінії олівця', 'Set pen line thickness', 'Задать толщину линии пера'],
    play_drum: ['Зіграти на барабані (1–18) задану кількість тактів', 'Play drum (1–18) for given beats', 'Сыграть на барабане (1–18) заданное число тактов'],
    rest: ['Зробити музичну паузу на вказану кількість тактів', 'Rest (pause) for given beats', 'Сделать музыкальную паузу на указанное число тактов'],
    play_note: ['Зіграти ноту (MIDI 0–130, 60 = До) на кількість тактів', 'Play note (MIDI 0–130, 60 = Middle C) for beats', 'Сыграть ноту (MIDI 0–130, 60 = До) на число тактов'],
    set_instrument: ['Обрати музичний інструмент (1–21)', 'Choose musical instrument (1–21)', 'Выбрать музыкальный инструмент (1–21)'],
    set_tempo: ['Встановити темп музики (20–500 ударів/хв)', 'Set music tempo (20–500 bpm)', 'Установить темп музыки (20–500 ударов/мин)'],
    change_tempo: ['Прискорити або сповільнити темп музики', 'Change music tempo by amount', 'Ускорить или замедлить темп музыки'],
    tempo: ['Поточний темп музики (ударів/хв)', 'Current music tempo (bpm)', 'Текущий темп музыки (ударов/мин)'],
    speak: ['Озвучити текст голосом (Text to Speech)', 'Speak text aloud (Text to Speech)', 'Озвучить текст голосом (Text to Speech)'],
    set_voice: ['Обрати голос озвучення (alto, tenor, squeak, giant, kitten)', 'Choose speech voice (alto, tenor, squeak, giant, kitten)', 'Выбрать голос озвучивания (alto, tenor, squeak, giant, kitten)'],
    set_language: ['Обрати мову для озвучення тексту', 'Choose language for Text to Speech', 'Выбрать язык для озвучивания текста'],
    translate: ['Перекласти текст іншою мовою (працює у Scratch Online)', 'Translate text to another language (works in Scratch Online)', 'Перевести текст на другой язык (работает в Scratch Online)'],
    language: ['Мова інтерфейсу користувача', 'Viewer interface language', 'Язык интерфейса пользователя']
  };

  function getPaletteTipKey(insertStr) {
    const raw = String(insertStr || '').trim();
    if (!raw) return null;
    if (raw.startsWith('@warp')) return '@warp';
    const decMatch = raw.match(/^(@[a-zA-Z0-9_]+)/);
    if (decMatch) return decMatch[1];
    if (raw.startsWith('for ')) return 'for ';
    if (raw.startsWith('while True')) return 'while True';
    if (raw.startsWith('while not')) return 'while not';
    if (raw.startsWith('if ') && raw.includes('else:')) return 'if_else';
    if (raw.startsWith('if ')) return 'if ';
    if (raw.startsWith('def ') && raw.includes(': bool')) return 'def_bool';
    if (raw.startsWith('def ')) return 'def ';
    if (raw.startsWith('self.')) return 'var_local';
    if (/^[a-zA-Z_][a-zA-Z0-9_]*\s*\+=/.test(raw)) return 'var_change';
    if (/^[a-zA-Z_][a-zA-Z0-9_]*\s*=/.test(raw)) return 'var_set';
    const fnMatch = raw.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/);
    if (fnMatch) return fnMatch[1];
    return null;
  }

  function getPaletteTip(insertStr, lang) {
    const key = getPaletteTipKey(insertStr);
    if (!key || !PALETTE_TIPS[key]) return '';
    const idx = (lang || currentLang) === 'en' ? 1 : (lang || currentLang) === 'ru' ? 2 : 0;
    return PALETTE_TIPS[key][idx] || PALETTE_TIPS[key][0] || '';
  }

  function applyPaletteTooltips() {
    if (typeof document === 'undefined' || !document.querySelectorAll) return;
    document.querySelectorAll('.palette-chip[data-insert]').forEach((btn) => {
      const tip = getPaletteTip(btn.getAttribute('data-insert'));
      if (tip) btn.setAttribute('title', tip);
    });
  }

  function getBrowserStorage() {
    try {
      if (typeof window !== 'undefined' && window.location && window.localStorage) {
        return window.localStorage;
      }
    } catch (_) {}
    return null;
  }

  // The language of the served page always wins: explicit ?lang= (dev override),
  // then the language the page declares (window.__PYSCRATCH_DEFAULT_LANG / <html lang>).
  // The saved preference is NOT used here; see getSavedLang() for redirect suggestions.
  function detectInitialLang() {
    if (typeof window !== 'undefined' && window.location && typeof URLSearchParams !== 'undefined') {
      const params = new URLSearchParams(window.location.search || '');
      const q = (params.get('lang') || '').toLowerCase();
      if (SUPPORTED_LANGS.includes(q)) return q;
    }
    if (typeof window !== 'undefined' && SUPPORTED_LANGS.includes(window.__PYSCRATCH_DEFAULT_LANG)) {
      return window.__PYSCRATCH_DEFAULT_LANG;
    }
    if (typeof document !== 'undefined' && document.documentElement) {
      const htmlLang = (document.documentElement.lang || '').toLowerCase().slice(0, 2);
      if (SUPPORTED_LANGS.includes(htmlLang)) return htmlLang;
    }
    return 'uk';
  }

  // Saved user choice, only meant to power a one-time "switch language?" suggestion.
  function getSavedLang() {
    try {
      const storage = getBrowserStorage();
      if (storage) {
        const saved = storage.getItem(STORAGE_KEY);
        if (SUPPORTED_LANGS.includes(saved)) return saved;
      }
    } catch (_) {}
    return null;
  }

  // Build the URL of the same page in another language, keeping ?code= and other params.
  function getLangUrl(lang, loc) {
    const normalized = String(lang || '').toLowerCase();
    if (!SUPPORTED_LANGS.includes(normalized)) return null;
    const l = loc || (typeof window !== 'undefined' ? window.location : null);
    if (!l) return null;
    let path = String(l.pathname || '/').replace(/index\.html$/, '');
    path = path.replace(/(^|\/)(en|ru)\/$/, '$1');
    if (!path.endsWith('/')) path += '/';
    const target = path + (normalized === 'uk' ? '' : normalized + '/');
    const params = new URLSearchParams(l.search || '');
    params.delete('lang');
    const qs = params.toString();
    return target + (qs ? '?' + qs : '') + (l.hash || '');
  }

  // Navigates to the page of the chosen language. Returns true when a navigation was started.
  function navigateToLang(lang) {
    const normalized = String(lang || '').toLowerCase();
    if (!SUPPORTED_LANGS.includes(normalized)) return false;
    try {
      const storage = getBrowserStorage();
      if (storage) storage.setItem(STORAGE_KEY, normalized);
    } catch (_) {}
    if (normalized === currentLang) return true;
    if (typeof window === 'undefined' || !window.location) return false;
    const url = getLangUrl(normalized);
    if (!url) return false;
    try {
      window.location.assign(url);
      return true;
    } catch (_) {
      return false;
    }
  }

  let currentLang = detectInitialLang();

  (function maybeRedirectFromDefaultRoot() {
    try {
      if (typeof window === 'undefined' || !window.location) return;
      if (!/^https?:$/.test(window.location.protocol)) return;
      var host = window.location.hostname;
      if (host === 'localhost' || host === '127.0.0.1') return;
      if (currentLang !== 'uk') return;
      var params = new URLSearchParams(window.location.search || '');
      if (params.has('lang') || params.has('embed') || params.has('code') || params.has('snippet')) return;
      if (typeof navigator !== 'undefined' && (navigator.webdriver || /bot|crawl|spider|slurp|facebookexternalhit|lighthouse|headless|bingpreview|yandex|baidu|duckduckbot|applebot|semrush|ahrefs/i.test(navigator.userAgent || ''))) return;

      var target = getSavedLang();
      if (!target && typeof navigator !== 'undefined') {
        var langs = (navigator.languages && navigator.languages.length)
          ? navigator.languages
          : [navigator.language || navigator.userLanguage || ''];
        for (var i = 0; i < langs.length; i++) {
          var base = String(langs[i] || '').toLowerCase().split('-')[0];
          if (SUPPORTED_LANGS.includes(base)) {
            target = base;
            break;
          }
        }
      }
      if (target && target !== 'uk') {
        var url = getLangUrl(target);
        if (url) window.location.replace(url);
      }
    } catch (_) {}
  })();

  function t(key, params) {
    const table = DICT[currentLang] || DICT.uk;
    let str = table[key] != null ? table[key] : (DICT.uk[key] != null ? DICT.uk[key] : key);
    if (params) {
      // Single pass, so a value that itself contains "{x}" is never expanded again.
      str = str.replace(/\{(\w+)\}/g, (m, k) => (Object.prototype.hasOwnProperty.call(params, k) ? String(params[k]) : m));
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
    document.querySelectorAll('[data-i18n-privacy-href]').forEach((el) => {
      el.setAttribute('href', PRIVACY_URLS[currentLang] || PRIVACY_URL_DEFAULT);
    });
    applyPaletteTooltips();
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
    PALETTE_TIPS,
    t,
    getLang,
    setLang,
    getSavedLang,
    getLangUrl,
    navigateToLang,
    applyDomTranslations,
    getPaletteTip,
    applyPaletteTooltips
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    global.PyScratchI18n = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
