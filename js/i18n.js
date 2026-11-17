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
      doc_49: 'Показати або сховати список на сцені'
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
      doc_49: 'Show or hide a list on the stage'
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
      doc_49: 'Показать или скрыть список на сцене'
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
    getSavedLang,
    getLangUrl,
    navigateToLang,
    applyDomTranslations
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    global.PyScratchI18n = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
