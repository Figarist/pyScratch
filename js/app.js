(function () {
  'use strict';

  const SNIPPETS = {
    hexagon: `# === СКРИПТ ГРАВЦЯ (Sprite1) ===

@when_flag_clicked
def main():
    # Налаштування сцени та позиції
    switch_backdrop("space_bg")
    goto(0, 0)

    # Робота з Олівцем (Pen Extension)
    pen_clear()
    set_pen_color("#00ffcc")
    set_pen_size(3)
    pen_down()

    # Малюємо геометричну фігуру в циклі
    sides = 6
    for i in range(sides):
        move(80)
        turn_right(360 / sides)
        wait(0.2)

    pen_up()
    say("Готово! Переходимо на новий рівень", 2)
    switch_backdrop("level_2")

@when_key_pressed("space")
def jump():
    change_y(50)
    wait(0.3)
    change_y(-50)

@when_backdrop_switches("level_2")
def start_level_2():
    goto(-150, 0)
    say("Рівень 2 почався!", 2)
`,
    functions: `# === ВЛАСНІ ФУНКЦІЇ (Мій Блок у Scratch) ===

def polygon(sides, step):
    for i in range(sides):
        move(step)
        turn_right(360 / sides)

@when_flag_clicked
def main():
    switch_backdrop("space_bg")
    pen_clear()
    set_pen_size(2)
    pen_down()

    goto(-110, 20)
    set_pen_color("#38bdf8")
    polygon(3, 70)

    goto(0, 20)
    set_pen_color("#22c55e")
    polygon(4, 65)

    goto(110, 20)
    set_pen_color("#eab308")
    polygon(5, 55)

    pen_up()
    say("Трикутник, квадрат і п'ятикутник!", 2)
`,
    arrows: `# === КЕРУВАННЯ СТРІЛКАМИ + ВІДБИВАННЯ ===

@when_flag_clicked
def main():
    switch_backdrop("grid_bg")
    goto(0, 0)
    pen_clear()
    set_pen_color("#38bdf8")
    set_pen_size(4)
    pen_down()
    say("Керуй стрілками або пробілом!", 2)

@when_key_pressed("up arrow")
def go_up():
    point_in_direction(0)
    move(20)
    if_on_edge_bounce()

@when_key_pressed("down arrow")
def go_down():
    point_in_direction(180)
    move(20)
    if_on_edge_bounce()

@when_key_pressed("left arrow")
def go_left():
    point_in_direction(-90)
    move(20)
    if_on_edge_bounce()

@when_key_pressed("right arrow")
def go_right():
    point_in_direction(90)
    move(20)
    if_on_edge_bounce()

@when_key_pressed("space")
def stamp_here():
    next_costume()
    pen_stamp()
    play_sound("pop")
`,
    clones: `# === КЛОНИ ТА ЗІРКОВИЙ САЛЮТ ===

@when_flag_clicked
def main():
    switch_backdrop("space_bg")
    pen_clear()
    goto(0, 0)
    for i in range(8):
        create_clone("myself")
        turn_right(45)
        wait(0.1)

@when_cloned
def clone_fly():
    set_pen_color("#eab308")
    set_pen_size(2)
    pen_down()
    for i in range(12):
        move(10)
        change_effect("color", 15)
        wait(0.05)
    delete_this_clone()
`,
    quiz: `# === ДІАЛОГ, УМОВИ ELIF ТА СПИСКИ ===

@when_flag_clicked
def main():
    switch_backdrop("space_bg")
    goto(0, 0)
    list_clear("inventory")
    score = 0

    ask("Скільки буде 7 * 8?")
    if answer() == 56:
        score += 10
        list_add("inventory", "Мега-Кристал")
        play_sound("pop")
        say(join("Правильно! Бали: ", score), 2)
    elif answer() == 54:
        say("Майже! Це 6 * 9, а не 7 * 8", 3)
    else:
        say("Спробуй ще раз!", 2)
`,
    levels: `# === ЗМІНА РІВНІВ ТА ПОВІДОМЛЕННЯ ===

@when_flag_clicked
def start():
    switch_backdrop("space_bg")
    goto(-120, 0)
    say("Натисни Пробіл для старту місії!", 3)

@when_key_pressed("space")
def next_lvl():
    broadcast("boss_wave")
    switch_backdrop("level_2")

@when_message_received("boss_wave")
def on_boss():
    play_sound("laser")
    glide(0.8, 0, 40)
    say("Рівень 2: Хвиля почалась!", 2)
`,
    pong: `# === ПІНГ-ПОНГ (КЛАСИЧНА ГРА) ===

@when_flag_clicked
def start_pong():
    score = 0
    show_variable("score")
    goto(0, 120)
    point_in_direction(135)
    while True:
        move(7)
        if_on_edge_bounce()
        if y_position() < -130:
            if abs(x_position() - mouse_x()) < 55:
                score += 1
                play_sound("pop")
                point_in_direction(random(-45, 45))
                set_y(-120)
            else:
                say(join("Гру завершено! Рахунок: ", score), 2)
                goto(0, 120)
                score = 0
`,
    maze: `# === ЛАБІРИНТ (СТРІЛКИ + ТОРКАННЯ КОЛЬОРУ) ===

@when_flag_clicked
def start_maze():
    switch_backdrop("grid_bg")
    pen_clear()
    pen_up()
    goto(-180, -120)
    set_pen_color("#1e293b")
    set_pen_size(14)
    pen_down()
    goto(-180, 120)
    goto(80, 120)
    pen_up()
    goto(-120, 40)
    set_pen_color("#22c55e")
    set_pen_size(24)
    pen_down()
    goto(160, 110)
    pen_up()
    goto(-140, -100)
    say("Дійди до зеленої цілі стрілками!", 2)

@when_key_pressed("up arrow")
def go_up():
    point_in_direction(0)
    move(12)
    if touching_color("#1e293b"):
        move(-12)
    if touching_color("#22c55e"):
        say("Перемога!", 2)

@when_key_pressed("down arrow")
def go_down():
    point_in_direction(180)
    move(12)
    if touching_color("#1e293b"):
        move(-12)

@when_key_pressed("left arrow")
def go_left():
    point_in_direction(-90)
    move(12)
    if touching_color("#1e293b"):
        move(-12)

@when_key_pressed("right arrow")
def go_right():
    point_in_direction(90)
    move(12)
    if touching_color("#1e293b"):
        move(-12)
    if touching_color("#22c55e"):
        say("Перемога!", 2)
`,
    clicker: `# === ШВИДКИЙ КЛІКЕР (КЛОНИ + ТАЙМЕР) ===

@when_flag_clicked
def start_clicker():
    score = 0
    show_variable("score")
    reset_timer()
    goto(0, 0)
    while timer() < 15:
        create_clone("myself")
        wait(0.8)
    say(join("Час вийшов! Бали: ", score), 3)
    stop("all")

@when_cloned
def clone_target():
    goto(random(-180, 180), random(-120, 120))
    wait(1.6)
    delete_this_clone()

@when_this_sprite_clicked
def catch_target():
    score += 1
    play_sound("pop")
    delete_this_clone()
`
  };

  const API_DOCS = [
    ['Події', '@when_flag_clicked', 'Старт при натисканні зеленого прапорця'],
    ['Події', '@when_key_pressed("space")', 'Реакція на клавішу (space, up arrow, a..z)'],
    ['Події', '@when_this_sprite_clicked', 'Клік мишкою по спрайту'],
    ['Події', '@when_backdrop_switches("level_2")', 'Коли змінюється фон сцени'],
    ['Події', '@when_message_received("msg")', 'Отримання повідомлення broadcast("msg")'],
    ['Події', '@when_greater_than("timer", 5)', 'Коли таймер або гучність перевищує поріг'],
    ['Події', '@when_cloned', 'Скрипт для новоствореного клону'],
    ['Функції', 'def my_block(x, y):', 'Створює рожевий «Мій блок» у Scratch'],
    ['Функції', '@warp', 'Декоратор перед def для миттєвого виконання без оновлення екрана'],
    ['Рух', 'move(80) / turn_right(90) / turn_left(90)', 'Кроки вперед та повороти у градусах'],
    ['Рух', 'goto(x, y) / glide(sec, x, y)', 'Миттєвий перехід або плавне ковзання'],
    ['Рух', 'glide_to(1, "mouse")', 'Плавне ковзання до курсора, випадкового місця або спрайта'],
    ['Рух', 'goto_random() / goto_mouse()', 'Перехід у випадкове місце або до курсора'],
    ['Рух', 'point_in_direction(90) / point_towards("mouse")', 'Напрямок руху або поворот до цілі'],
    ['Рух', 'set_x(0), change_x(10), set_y(0), change_y(10)', 'Зміна координат X та Y'],
    ['Рух', 'if_on_edge_bounce()', 'Відбивання від краю сцени'],
    ['Вигляд', 'say("Текст", 2) / think("Думка", 2)', 'Мовна або думкова бульбашка'],
    ['Вигляд', 'switch_costume("costume1") / next_costume()', 'Зміна костюма спрайта'],
    ['Вигляд', 'switch_backdrop("space_bg") / next_backdrop()', 'Зміна фону сцени'],
    ['Вигляд', 'switch_backdrop_and_wait("level_2")', 'Змінити тло сцени та чекати завершення скриптів'],
    ['Вигляд', 'go_to_layer("front") / change_layer("forward", 1)', 'Перемістити спрайт на передній/задній шар або на N шарів'],
    ['Вигляд', 'set_size(100) / change_size(10) / show() / hide()', 'Масштаб та видимість'],
    ['Вигляд', 'set_effect("color", 25) / clear_effects()', 'Графічні ефекти'],
    ['Олівець', 'pen_down() / pen_up() / pen_clear() / pen_stamp()', 'Малювання ліній та штампування'],
    ['Олівець', 'set_pen_color("#00ffcc") / set_pen_size(3)', 'Колір (#hex) і товщина олівця'],
    ['Звук', 'play_sound("pop") / play_sound_until_done("laser")', 'Відтворення звуків зі списку асетів'],
    ['Звук', 'set_sound_effect("pitch", 50) / change_sound_effect("pan", 25)', 'Звукові ефекти висоти (pitch) та панорами (pan)'],
    ['Звук', 'clear_sound_effects()', 'Скинути всі звукові ефекти'],
    ['Керування', 'for i in range(6): / while True: / while not cond:', 'Цикли repeat, forever, repeat until'],
    ['Керування', 'if cond: / elif cond2: / else:', 'Умовні розгалуження (підтримує ==, !=, <=, >=)'],
    ['Керування', 'wait(0.5) / wait_until(cond) / stop("all")', 'Затримки та зупинка'],
    ['Керування', 'create_clone("myself") / delete_this_clone()', 'Клонування спрайтів'],
    ['Датчики', 'ask("Питання") / answer()', 'Інтерактивне опитування гравця'],
    ['Датчики', 'key_pressed("space") / touching("edge")', 'Перевірка клавіш та зіткнень'],
    ['Датчики', 'touching_color("#00ffcc") / color_is_touching_color("#f00", "#0f0")', 'Перевірка торкання кольору або кольору до іншого кольору'],
    ['Датчики', 'attribute_of("x position", "Sprite1")', 'Атрибут або локальна змінна іншого спрайта чи Сцени'],
    ['Датчики', 'set_drag_mode("draggable")', 'Режим перетягування спрайта мишкою (draggable / not draggable)'],
    ['Датчики', 'mouse_x(), mouse_y(), mouse_down(), timer()', 'Координати миші та таймер'],
    ['Датчики', 'current_time("hour") / days_since_2000()', 'Поточний час (year..second) та дні від 2000 року'],
    ['Датчики', 'username() / loudness()', 'Ім’я користувача та рівень гучності мікрофона'],
    ['Оператори', 'asin(0.5) / acos(0.5) / atan(1)', 'Тригонометричні функції (у градусах)'],
    ['Оператори', 'ln(10) / log(100) / exp(1) / pow10(2)', 'Логарифми та показникова функція e^x, 10^x'],
    ['Оператори', 'len("hello") / len("bag")', 'Довжина рядка або списку'],
    ['Змінні', 'self.hp = 100', 'Локальна змінна ("Тільки для цього спрайта")'],
    ['Змінні', 'show_variable("score") / hide_variable("score")', 'Показати або сховати змінну на сцені'],
    ['Списки', 'local_list("items")', 'Оголосити локальний список для цього спрайта'],
    ['Списки', 'list_add("bag", "ключ"), list_item("bag", 1)', 'Робота зі списками Scratch'],
    ['Списки', 'list_index_of("bag", "ключ")', 'Індекс (1..N) елемента у списку або 0'],
    ['Списки', 'show_list("bag") / hide_list("bag")', 'Показати або сховати список на сцені']
  ];

  const state = {
    projectJson: null,
    assetsMap: null,
    activeTargetIdx: 1,
    codeByTarget: new Map(),
    errorLine: null,
    highlightedLine: null
  };

  const editor = document.getElementById('code-editor');
  const codeHighlight = document.getElementById('code-highlight');
  const lineNumbers = document.getElementById('line-numbers');
  const statusBanner = document.getElementById('status-banner');
  const statusText = document.getElementById('status-text');
  const cursorPos = document.getElementById('cursor-pos');
  const targetTabs = document.getElementById('target-tabs');
  const viewBlocks = document.getElementById('view-blocks');
  const viewAssets = document.getElementById('view-assets');
  const viewInspector = document.getElementById('view-inspector');
  const viewDocs = document.getElementById('view-docs');
  const viewPreview = document.getElementById('view-preview');

  function i18nT(key, params) {
    if (typeof PyScratchI18n !== 'undefined' && typeof PyScratchI18n.t === 'function') {
      return PyScratchI18n.t(key, params);
    }
    return key;
  }
  const backdropIndicator = document.getElementById('backdrop-indicator');
  const varsWatch = document.getElementById('vars-watch');
  const askOverlay = document.getElementById('ask-overlay');
  const askInput = document.getElementById('ask-input');
  const askSubmit = document.getElementById('ask-submit');
  const dropOverlay = document.getElementById('drop-overlay');

  const teleX = document.getElementById('tele-x');
  const teleY = document.getElementById('tele-y');
  const teleDir = document.getElementById('tele-dir');
  const teleSize = document.getElementById('tele-size');
  const teleMouse = document.getElementById('tele-mouse');
  const teleTimer = document.getElementById('tele-timer');

  let currentAskCallback = null;

  const stageCanvas = document.getElementById('stage-canvas');
  const preview =
    typeof StagePreview !== 'undefined' && stageCanvas
      ? new StagePreview(stageCanvas, {
          onBackdropChange: (bg) => {
            if (backdropIndicator) backdropIndicator.textContent = `Тло: ${bg}`;
          },
          onTelemetry: (t) => {
            if (teleX) teleX.textContent = t.x;
            if (teleY) teleY.textContent = t.y;
            if (teleDir) teleDir.textContent = `${t.direction}°`;
            if (teleSize) teleSize.textContent = `${t.size}%`;
            if (teleMouse) teleMouse.textContent = `${t.mouseX}, ${t.mouseY}`;
            if (teleTimer) teleTimer.textContent = `${t.timer}s`;
            const activeTarget = state.projectJson && state.projectJson.targets[state.activeTargetIdx];
            const sprites = state.projectJson ? state.projectJson.targets.filter((tgt) => !tgt.isStage) : [];
            const fallbackActor =
              activeTarget && !activeTarget.isStage
                ? activeTarget.name
                : sprites.length === 1
                ? sprites[0].name
                : null;
            renderVarsWatch(t.vars, t.lists, t.localVars, t.localLists, t.actorName || t.spriteName || fallbackActor);
          },
          onAsk: (question, submitFn) => {
            if (!askOverlay || !askInput) return;
            if (!question) {
              askOverlay.classList.add('hidden');
              currentAskCallback = null;
              return;
            }
            currentAskCallback = submitFn;
            askInput.value = '';
            askInput.placeholder = question;
            askOverlay.classList.remove('hidden');
            askInput.focus();
          }
        })
      : null;

  function submitAskAnswer() {
    if (!currentAskCallback || !askInput) return;
    const val = askInput.value;
    const cb = currentAskCallback;
    currentAskCallback = null;
    if (askOverlay) askOverlay.classList.add('hidden');
    cb(val);
  }

  if (askSubmit) askSubmit.onclick = submitAskAnswer;
  if (askInput) {
    askInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        submitAskAnswer();
      }
    });
  }

  function formatScopedEntries(mapObj, fallbackPrefix) {
    const out = [];
    if (!mapObj || typeof mapObj !== 'object') return out;
    for (const [k, v] of Object.entries(mapObj)) {
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        for (const [subKey, subVal] of Object.entries(v)) {
          out.push([`${k}.${subKey}`, subVal]);
        }
      } else if (k.includes('.')) {
        out.push([k, v]);
      } else {
        const prefix = fallbackPrefix || 'self';
        out.push([`${prefix}.${k}`, v]);
      }
    }
    return out;
  }

  function renderVarsWatch(vars, lists, localVars, localLists, actorName) {
    if (!varsWatch) return;
    const varEntries = Object.entries(vars || {});
    const listEntries = Object.entries(lists || {});
    const localVarEntries = formatScopedEntries(localVars, actorName);
    const localListEntries = formatScopedEntries(localLists, actorName);

    if (
      varEntries.length === 0 &&
      listEntries.length === 0 &&
      localVarEntries.length === 0 &&
      localListEntries.length === 0
    ) {
      varsWatch.innerHTML =
        '<span style="color: var(--wp-dim); font-size: 11px;">Змінні та списки з\'являться тут під час виконання.</span>';
      return;
    }

    const pills = [];
    for (const [k, v] of varEntries) {
      pills.push(`<span class="var-pill">${escapeHtml(k)} = <b>${escapeHtml(String(v))}</b></span>`);
    }
    for (const [label, v] of localVarEntries) {
      pills.push(
        `<span class="var-pill var-pill-local" title="Локальна змінна спрайта">${escapeHtml(label)} = <b>${escapeHtml(
          String(v)
        )}</b></span>`
      );
    }
    for (const [k, arr] of listEntries) {
      const safeArr = Array.isArray(arr) ? arr : [];
      pills.push(
        `<span class="var-pill var-pill-list">${escapeHtml(k)} [${safeArr.length}]: ${escapeHtml(
          safeArr.slice(0, 5).join(', ')
        )}</span>`
      );
    }
    for (const [label, arr] of localListEntries) {
      const safeArr = Array.isArray(arr) ? arr : [];
      pills.push(
        `<span class="var-pill var-pill-local-list" title="Локальний список спрайта">${escapeHtml(label)} [${safeArr.length}]: ${escapeHtml(
          safeArr.slice(0, 5).join(', ')
        )}</span>`
      );
    }
    varsWatch.innerHTML = pills.join('');
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function highlightPython(code) {
    const lines = String(code).split('\n');
    const kwRe = /\b(def|for|in|while|if|elif|else|pass|and|or|not|True|False|range|self)\b/g;
    const penRe = /\b(pen_clear|pen_stamp|pen_down|pen_up|set_pen_color|set_pen_param|change_pen_param|set_pen_size|change_pen_size)\b/g;
    const apiRe = /\b(move|turn_right|turn_left|goto|goto_random|goto_mouse|glide|glide_to|set_x|set_y|change_x|change_y|point_in_direction|point_towards|if_on_edge_bounce|set_rotation_style|switch_backdrop|switch_backdrop_and_wait|next_backdrop|switch_costume|next_costume|say|think|show|hide|set_size|change_size|go_to_layer|change_layer|set_effect|change_effect|clear_effects|costume_number|costume_name|backdrop_number|backdrop_name|play_sound|play_sound_until_done|stop_all_sounds|set_volume|change_volume|volume|set_sound_effect|change_sound_effect|clear_sound_effects|wait|wait_until|stop|create_clone|delete_this_clone|ask|answer|reset_timer|timer|broadcast|broadcast_and_wait|x_position|y_position|direction|size|key_pressed|touching|touching_color|color_is_touching_color|distance_to|attribute_of|set_drag_mode|current_time|days_since_2000|username|loudness|mouse_x|mouse_y|mouse_down|random|join|letter_of|length_of|len|contains|round_num|round|math_op|abs|sqrt|sin|cos|tan|asin|acos|atan|ln|log|exp|pow10|floor|ceil|ceiling|list_add|list_delete|list_clear|list_insert|list_replace|list_item|list_length|list_contains|list_index_of|show_variable|hide_variable|show_list|hide_list|local_list|local_list_add|local_list_delete|local_list_clear|local_list_insert|local_list_replace|local_list_item|local_list_length|local_list_contains|local_list_index_of)\b/g;

    return lines
      .map((line) => {
        const commentIdx = (() => {
          let inQ = null;
          for (let i = 0; i < line.length; i++) {
            const c = line[i];
            if (c === '"' || c === "'") {
              let bs = 0;
              for (let j = i - 1; j >= 0 && line[j] === '\\'; j--) bs++;
              if (bs % 2 === 0) {
                if (!inQ) inQ = c;
                else if (inQ === c) inQ = null;
              }
            } else if (c === '#' && !inQ) {
              return i;
            }
          }
          return -1;
        })();

        const codePart = commentIdx >= 0 ? line.slice(0, commentIdx) : line;
        const commentPart = commentIdx >= 0 ? line.slice(commentIdx) : '';

        // Tokenize strings out first so we don't highlight inside strings
        const placeholders = [];
        const safeCode = codePart.replace(/(["'])(?:\\.|(?!\1).)*\1/g, (m) => {
          const id = `___STR${placeholders.length}___`;
          placeholders.push(`<span class="tok-str">${escapeHtml(m)}</span>`);
          return id;
        });

        let html = escapeHtml(safeCode)
          .replace(/^(\s*@[a-zA-Z0-9_]+)/g, '<span class="tok-dec">$1</span>')
          .replace(kwRe, '<span class="tok-kw">$1</span>')
          .replace(penRe, '<span class="tok-pen">$1</span>')
          .replace(apiRe, '<span class="tok-api">$1</span>')
          .replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="tok-num">$1</span>');

        placeholders.forEach((rep, i) => {
          html = html.replace(`___STR${i}___`, () => rep);
        });

        if (commentPart) {
          html += `<span class="tok-com">${escapeHtml(commentPart)}</span>`;
        }
        return html;
      })
      .join('\n') + '\n';
  }

  function setStatus(msg, isError = false, errLine = null) {
    if (statusText) statusText.textContent = msg;
    if (statusBanner) {
      statusBanner.className = 'status-banner ' + (isError ? 'error' : 'ok');
      if (statusBanner.dataset) statusBanner.dataset.customStatus = '1';
    }
    state.errorLine = isError ? errLine : null;
    updateEditorDecorations();
  }

  function updateEditorDecorations() {
    if (!editor) return;
    const code = editor.value;
    if (codeHighlight) {
      codeHighlight.innerHTML = highlightPython(code);
    }
    if (lineNumbers) {
      const count = code.split('\n').length;
      const nums = [];
      for (let i = 1; i <= count; i++) {
        if (state.errorLine === i) {
          nums.push(`<span class="err-line">${i}</span>`);
        } else if (state.highlightedLine === i) {
          nums.push(`<span class="active-line">${i}</span>`);
        } else {
          nums.push(String(i));
        }
      }
      lineNumbers.innerHTML = nums.join('<br>');
    }
  }

  function updateCursorTelemetry() {
    if (!cursorPos || !editor) return;
    const pos = editor.selectionStart || 0;
    const upToCursor = editor.value.slice(0, pos).split('\n');
    const ln = upToCursor.length;
    const col = upToCursor[upToCursor.length - 1].length + 1;
    cursorPos.textContent = `Ряд ${ln}, Стовп ${col}`;
  }

  function insertAtCursor(snippetText) {
    if (!editor) return;
    const text = String(snippetText || '').replace(/\\n/g, '\n');
    const start = editor.selectionStart || 0;
    const end = editor.selectionEnd || 0;
    editor.value = editor.value.substring(0, start) + text + editor.value.substring(end);
    editor.selectionStart = editor.selectionEnd = start + text.length;
    editor.focus();
    updateEditorDecorations();
    updateCursorTelemetry();
    compileCurrent(true);
  }

  function selectTarget(idx) {
    if (!state.projectJson || !state.projectJson.targets[idx]) return;
    if (editor) state.codeByTarget.set(state.activeTargetIdx, editor.value);
    state.activeTargetIdx = idx;
    if (editor) editor.value = state.codeByTarget.get(idx) || '';
    state.highlightedLine = null;
    updateEditorDecorations();
    updateCursorTelemetry();
    renderTargetTabs();
    renderAssetsView();
    compileCurrent(false);
  }

  function renderTargetTabs() {
    if (!targetTabs || !state.projectJson) return;
    targetTabs.innerHTML = '';
    state.projectJson.targets.forEach((t, idx) => {
      const btn = document.createElement('button');
      btn.className = 'tab-btn' + (idx === state.activeTargetIdx ? ' active' : '');
      btn.textContent = t.isStage ? `Сцена (${t.name})` : t.name;
      btn.onclick = () => selectTarget(idx);
      targetTabs.appendChild(btn);
    });
  }

  function syncActorPropsInPreview(target) {
    if (!preview || !target) return;
    if (Array.isArray(preview.actors)) {
      const actor = preview.actors.find((a) => !a.isStage && !a.isClone && a.name === target.name);
      if (actor) {
        actor.x = Number(target.x) || 0;
        actor.y = Number(target.y) || 0;
        actor.size = target.size !== undefined ? Number(target.size) : 100;
        actor.direction = target.direction !== undefined ? Number(target.direction) : 90;
        actor.visible = target.visible !== undefined ? !!target.visible : true;
        actor.rotationStyle = target.rotationStyle || 'all around';
        actor.draggable = !!target.draggable;
        actor.costumes = Array.isArray(target.costumes) ? target.costumes : [];
      }
    }
    preview.syncProjectAssets(state.projectJson, state.assetsMap);
    preview.render();
    if (typeof preview._emitTelemetry === 'function') {
      preview._emitTelemetry();
    }
  }

  function getOrCreateFileInput(id, accept) {
    let el = document.getElementById(id);
    if (!el && typeof document !== 'undefined' && document.body) {
      el = document.createElement('input');
      el.type = 'file';
      el.id = id;
      el.accept = accept;
      el.className = 'hidden';
      document.body.appendChild(el);
    }
    return el;
  }

  function detectAssetFormat(file, allowed) {
    const name = String((file && file.name) || '').toLowerCase();
    const mime = String((file && file.type) || '').toLowerCase();
    let ext = name.includes('.') ? name.split('.').pop() : '';
    if (ext === 'jpeg') ext = 'jpg';
    if (!ext || !allowed.includes(ext)) {
      if (mime === 'image/svg+xml') ext = 'svg';
      else if (mime === 'image/png') ext = 'png';
      else if (mime === 'image/jpeg') ext = 'jpg';
      else if (mime === 'audio/wav' || mime === 'audio/x-wav') ext = 'wav';
      else if (mime === 'audio/mpeg' || mime === 'audio/mp3') ext = 'mp3';
    }
    return allowed.includes(ext) ? ext : null;
  }

  const uploadBackdropInput = getOrCreateFileInput(
    'upload-backdrop-input',
    '.svg,.png,.jpg,.jpeg,image/svg+xml,image/png,image/jpeg'
  );
  const uploadCostumeInput = getOrCreateFileInput(
    'upload-costume-input',
    '.svg,.png,.jpg,.jpeg,image/svg+xml,image/png,image/jpeg'
  );
  const uploadSoundInput = getOrCreateFileInput(
    'upload-sound-input',
    '.wav,.mp3,audio/wav,audio/mpeg'
  );

  let pendingUploadTargetIdx = null;

  async function handleCostumeUpload(file, targetIdx, isBackdrop) {
    if (!file || !state.projectJson) return;
    const fmt = detectAssetFormat(file, ['svg', 'png', 'jpg']);
    if (!fmt) {
      setStatus('Підтримуються лише зображення .svg, .png або .jpg.', true);
      return;
    }
    try {
      const baseName = file.name.replace(/\.[^/.]+$/, '') || (isBackdrop ? 'backdrop' : 'costume');
      const content = fmt === 'svg' ? await file.text() : new Uint8Array(await file.arrayBuffer());
      const added = Sb3Bridge.addCostumeAsset(
        state.projectJson,
        state.assetsMap,
        targetIdx,
        baseName,
        fmt,
        content
      );
      const target = state.projectJson.targets[targetIdx];
      if (preview) {
        if (target && !target.isStage && Array.isArray(preview.actors)) {
          const actor = preview.actors.find((a) => !a.isClone && a.name === target.name);
          if (actor) actor.costumes = target.costumes;
        }
        preview.syncProjectAssets(state.projectJson, state.assetsMap);
        preview.render();
      }
      renderAssetsView();
      renderTargetTabs();
      setStatus(
        isBackdrop
          ? `Тло "${added.name}" (.${added.dataFormat}) додано до Сцени.`
          : `Костюм "${added.name}" (.${added.dataFormat}) додано до ${target ? target.name : 'спрайта'}.`
      );
    } catch (err) {
      setStatus('Помилка додавання зображення: ' + (err && err.message ? err.message : String(err)), true);
    }
  }

  async function handleSoundUpload(file, targetIdx) {
    if (!file || !state.projectJson) return;
    const fmt = detectAssetFormat(file, ['wav', 'mp3']);
    if (!fmt) {
      setStatus('Підтримуються лише аудіофайли .wav або .mp3.', true);
      return;
    }
    try {
      const baseName = file.name.replace(/\.[^/.]+$/, '') || 'sound';
      const bytes = new Uint8Array(await file.arrayBuffer());
      const added = Sb3Bridge.addSoundAsset(state.projectJson, state.assetsMap, targetIdx, baseName, fmt, bytes);
      const target = state.projectJson.targets[targetIdx];
      if (preview) {
        preview.syncProjectAssets(state.projectJson, state.assetsMap);
      }
      renderAssetsView();
      renderTargetTabs();
      setStatus(`Звук "${added.name}" (.${added.dataFormat}) додано до ${target ? target.name : 'об’єкта'}.`);
    } catch (err) {
      setStatus('Помилка додавання звуку: ' + (err && err.message ? err.message : String(err)), true);
    }
  }

  if (uploadBackdropInput) {
    uploadBackdropInput.onchange = async (e) => {
      const file = e.target.files && e.target.files[0];
      if (file && state.projectJson) {
        const stageIdx = state.projectJson.targets.findIndex((t) => t.isStage);
        await handleCostumeUpload(file, stageIdx >= 0 ? stageIdx : 0, true);
      }
      uploadBackdropInput.value = '';
    };
  }

  if (uploadCostumeInput) {
    uploadCostumeInput.onchange = async (e) => {
      const file = e.target.files && e.target.files[0];
      const idx = pendingUploadTargetIdx !== null ? pendingUploadTargetIdx : state.activeTargetIdx;
      pendingUploadTargetIdx = null;
      if (file) {
        await handleCostumeUpload(file, idx, false);
      }
      uploadCostumeInput.value = '';
    };
  }

  if (uploadSoundInput) {
    uploadSoundInput.onchange = async (e) => {
      const file = e.target.files && e.target.files[0];
      const idx = pendingUploadTargetIdx !== null ? pendingUploadTargetIdx : state.activeTargetIdx;
      pendingUploadTargetIdx = null;
      if (file) {
        await handleSoundUpload(file, idx);
      }
      uploadSoundInput.value = '';
    };
  }

  function renderAssetsView() {
    if (!viewAssets || !state.projectJson) return;
    const assets = Sb3Bridge.getTargetAssets(state.projectJson, state.assetsMap);
    const activeTarget = state.projectJson.targets[state.activeTargetIdx];
    const spritesCount = state.projectJson.targets.filter((t) => !t.isStage).length;

    const chunks = [];

    if (activeTarget && !activeTarget.isStage) {
      const rotStyle = activeTarget.rotationStyle || 'all around';
      const isVisible = activeTarget.visible !== undefined ? !!activeTarget.visible : true;
      const isDraggable = !!activeTarget.draggable;
      const activeCostumes = activeTarget.costumes || [];
      const activeSounds = activeTarget.sounds || [];

      chunks.push(`<div class="assets-section active-sprite-section">
        <div class="assets-header">
          <h4>Активний спрайт: ${escapeHtml(activeTarget.name)}</h4>
          ${
            spritesCount > 1
              ? `<button id="btn-delete-sprite" class="danger asset-upload-btn" title="Видалити цей спрайт">Видалити спрайт</button>`
              : ''
          }
        </div>
        <div class="sprite-rename-row">
          <input type="text" id="sprite-prop-name" value="${escapeHtml(activeTarget.name)}" aria-label="Назва спрайта" />
          <button id="btn-rename-sprite" class="asset-upload-btn">Перейменувати</button>
        </div>
        <div class="sprite-props-grid">
          <div class="prop-field">
            <label for="sprite-prop-x">X</label>
            <input type="number" id="sprite-prop-x" value="${Number(activeTarget.x) || 0}" step="1" />
          </div>
          <div class="prop-field">
            <label for="sprite-prop-y">Y</label>
            <input type="number" id="sprite-prop-y" value="${Number(activeTarget.y) || 0}" step="1" />
          </div>
          <div class="prop-field">
            <label for="sprite-prop-size">Розмір %</label>
            <input type="number" id="sprite-prop-size" value="${activeTarget.size !== undefined ? Number(activeTarget.size) : 100}" min="5" max="500" step="1" />
          </div>
          <div class="prop-field">
            <label for="sprite-prop-dir">Напрям °</label>
            <input type="number" id="sprite-prop-dir" value="${activeTarget.direction !== undefined ? Number(activeTarget.direction) : 90}" step="1" />
          </div>
          <div class="prop-field">
            <label for="sprite-prop-rot">Обертання</label>
            <select id="sprite-prop-rot">
              <option value="all around"${rotStyle === 'all around' ? ' selected' : ''}>Навколо</option>
              <option value="left-right"${rotStyle === 'left-right' ? ' selected' : ''}>Зліва-направо</option>
              <option value="don't rotate"${rotStyle === "don't rotate" ? ' selected' : ''}>Не обертати</option>
            </select>
          </div>
        </div>
        <div class="sprite-toggles-row">
          <label class="prop-check"><input type="checkbox" id="sprite-prop-visible"${isVisible ? ' checked' : ''} /> Показаний</label>
          <label class="prop-check"><input type="checkbox" id="sprite-prop-draggable"${isDraggable ? ' checked' : ''} /> Перетягується мишкою</label>
        </div>
        <div class="assets-subblock">
          <div class="assets-subhead">
            <span>Костюми (клік для switch_costume):</span>
            <button id="btn-upload-costume" class="asset-upload-btn">+ Костюм (.svg/.png)</button>
          </div>
          ${
            activeCostumes
              .map(
                (c) =>
                  `<span class="badge" data-insert-code="${escapeHtml(
                    `switch_costume(${JSON.stringify(c.name)})`
                  )}">${escapeHtml(c.name)}</span>`
              )
              .join('') || '<span class="assets-hint">Немає</span>'
          }
        </div>
        <div class="assets-subblock">
          <div class="assets-subhead">
            <span>Звуки (клік для play_sound):</span>
            <button id="btn-upload-sound" class="asset-upload-btn">+ Звук (.wav/.mp3)</button>
          </div>
          ${
            activeSounds
              .map(
                (snd) =>
                  `<span class="badge" data-insert-code="${escapeHtml(
                    `play_sound(${JSON.stringify(snd.name)})`
                  )}">${escapeHtml(snd.name)}</span>`
              )
              .join('') || '<span class="assets-hint">Немає</span>'
          }
        </div>
      </div>`);
    }

    chunks.push(`<div class="assets-section">
      <div class="assets-header">
        <h4>Тло сцени (Backdrops) — клікніть для вставки</h4>
        <button id="btn-upload-backdrop" class="asset-upload-btn">+ Тло (.svg/.png)</button>
      </div>
      ${
        assets.backdrops
          .map(
            (b) =>
              `<span class="badge" data-insert-code="${escapeHtml(
                `switch_backdrop(${JSON.stringify(b.name)})`
              )}">${escapeHtml(b.name)}</span>`
          )
          .join('') || '<span class="assets-hint">Немає</span>'
      }
      ${
        activeTarget && activeTarget.isStage
          ? `<div class="assets-subblock">
              <div class="assets-subhead">
                <span>Звуки Сцени (клік для play_sound):</span>
                <button id="btn-upload-sound" class="asset-upload-btn">+ Звук (.wav/.mp3)</button>
              </div>
              ${
                (assets.stageSounds || [])
                  .map(
                    (snd) =>
                      `<span class="badge" data-insert-code="${escapeHtml(
                        `play_sound(${JSON.stringify(snd)})`
                      )}">${escapeHtml(snd)}</span>`
                  )
                  .join('') || '<span class="assets-hint">Немає</span>'
              }
            </div>
            <p class="assets-hint" style="margin-top:8px;">Підказка: виберіть вкладку спрайта, щоб змінювати його координати, назву чи костюми.</p>`
          : ''
      }
    </div>`);

    for (const s of assets.sprites) {
      if (s.targetIdx === state.activeTargetIdx) continue;
      chunks.push(`<div class="assets-section">
        <div class="assets-header">
          <h4>Спрайт: ${escapeHtml(s.name)} (x:${s.x}, y:${s.y})</h4>
          <button class="asset-upload-btn" data-select-target="${s.targetIdx}">Обрати</button>
        </div>
        <div style="margin-bottom:6px; color:var(--wp-muted);">Костюми (клік для switch_costume):</div>
        ${
          s.costumes
            .map(
              (c) =>
                `<span class="badge" data-insert-code="${escapeHtml(
                  `switch_costume(${JSON.stringify(c.name)})`
                )}">${escapeHtml(c.name)}</span>`
            )
            .join('') || '<span class="assets-hint">Немає</span>'
        }
        ${
          s.sounds && s.sounds.length > 0
            ? `<div style="margin:8px 0 6px; color:var(--wp-muted);">Звуки (клік для play_sound):</div>` +
              s.sounds
                .map(
                  (snd) =>
                    `<span class="badge" data-insert-code="${escapeHtml(
                      `play_sound(${JSON.stringify(snd)})`
                    )}">${escapeHtml(snd)}</span>`
                )
                .join('')
            : ''
        }
      </div>`);
    }

    chunks.push(
      `<p class="assets-hint">Порада: можна перетягнути будь-який файл <code>.sb3</code> прямо на вікно браузера.</p>`
    );

    viewAssets.innerHTML = chunks.join('');

    viewAssets.querySelectorAll('[data-insert-code]').forEach((el) => {
      el.onclick = () => insertAtCursor(el.getAttribute('data-insert-code'));
    });

    viewAssets.querySelectorAll('[data-select-target]').forEach((el) => {
      el.onclick = () => {
        const idx = parseInt(el.getAttribute('data-select-target'), 10);
        if (Number.isInteger(idx)) selectTarget(idx);
      };
    });

    const btnUploadBackdrop = document.getElementById('btn-upload-backdrop');
    if (btnUploadBackdrop && uploadBackdropInput) {
      btnUploadBackdrop.onclick = () => uploadBackdropInput.click();
    }

    const btnUploadCostume = document.getElementById('btn-upload-costume');
    if (btnUploadCostume && uploadCostumeInput) {
      btnUploadCostume.onclick = () => {
        pendingUploadTargetIdx = state.activeTargetIdx;
        uploadCostumeInput.click();
      };
    }

    const btnUploadSound = document.getElementById('btn-upload-sound');
    if (btnUploadSound && uploadSoundInput) {
      btnUploadSound.onclick = () => {
        pendingUploadTargetIdx = state.activeTargetIdx;
        uploadSoundInput.click();
      };
    }

    const nameInput = document.getElementById('sprite-prop-name');
    const btnRename = document.getElementById('btn-rename-sprite');
    const commitRename = () => {
      if (!nameInput || !activeTarget || activeTarget.isStage) return;
      const oldName = activeTarget.name;
      try {
        const updated = Sb3Bridge.renameSprite(state.projectJson, state.activeTargetIdx, nameInput.value);
        if (preview && Array.isArray(preview.actors)) {
          const actor = preview.actors.find((a) => !a.isStage && !a.isClone && a.name === oldName);
          if (actor) actor.name = updated.name;
        }
        renderTargetTabs();
        renderAssetsView();
        if (preview) {
          preview.syncProjectAssets(state.projectJson, state.assetsMap);
          preview.render();
        }
        setStatus(`Спрайт перейменовано на "${updated.name}".`);
      } catch (err) {
        setStatus(err && err.message ? err.message : 'Не вдалося перейменувати спрайт.', true);
        nameInput.value = oldName;
      }
    };
    if (btnRename) btnRename.onclick = commitRename;
    if (nameInput) {
      nameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          commitRename();
        }
      });
    }

    const btnDelete = document.getElementById('btn-delete-sprite');
    if (btnDelete) {
      btnDelete.onclick = () => {
        try {
          const delIdx = state.activeTargetIdx;
          const removed = Sb3Bridge.deleteSprite(state.projectJson, delIdx);
          const nextCodeMap = new Map();
          for (const [k, v] of state.codeByTarget.entries()) {
            if (k < delIdx) nextCodeMap.set(k, v);
            else if (k > delIdx) nextCodeMap.set(k - 1, v);
          }
          state.codeByTarget = nextCodeMap;

          let nextIdx = Math.min(delIdx, state.projectJson.targets.length - 1);
          if (!state.projectJson.targets[nextIdx] || state.projectJson.targets[nextIdx].isStage) {
            const firstSprite = state.projectJson.targets.findIndex((t) => !t.isStage);
            nextIdx = firstSprite >= 0 ? firstSprite : 0;
          }
          state.activeTargetIdx = nextIdx;
          if (editor) editor.value = state.codeByTarget.get(nextIdx) || '';
          state.highlightedLine = null;
          updateEditorDecorations();
          updateCursorTelemetry();
          renderTargetTabs();
          renderAssetsView();
          if (preview) {
            preview.syncProjectAssets(state.projectJson, state.assetsMap);
            preview.reset();
          }
          compileCurrent(false);
          setStatus(`Спрайт "${removed.name}" видалено.`);
        } catch (err) {
          setStatus(err && err.message ? err.message : 'Не вдалося видалити спрайт.', true);
        }
      };
    }

    const propX = document.getElementById('sprite-prop-x');
    const propY = document.getElementById('sprite-prop-y');
    const propSize = document.getElementById('sprite-prop-size');
    const propDir = document.getElementById('sprite-prop-dir');
    const propRot = document.getElementById('sprite-prop-rot');
    const propVis = document.getElementById('sprite-prop-visible');
    const propDrag = document.getElementById('sprite-prop-draggable');

    const commitProps = () => {
      if (!activeTarget || activeTarget.isStage) return;
      try {
        const updated = Sb3Bridge.updateSpriteProps(state.projectJson, state.activeTargetIdx, {
          x: propX ? propX.value : undefined,
          y: propY ? propY.value : undefined,
          size: propSize ? propSize.value : undefined,
          direction: propDir ? propDir.value : undefined,
          rotationStyle: propRot ? propRot.value : undefined,
          visible: propVis ? propVis.checked : undefined,
          draggable: propDrag ? propDrag.checked : undefined
        });
        if (propSize) propSize.value = updated.size;
        syncActorPropsInPreview(updated);
        setStatus(`Оновлено параметри спрайта "${updated.name}".`);
      } catch (err) {
        setStatus(err && err.message ? err.message : 'Помилка оновлення параметрів.', true);
      }
    };

    [propX, propY, propSize, propDir, propRot, propVis, propDrag].forEach((el) => {
      if (el) el.addEventListener('change', commitProps);
    });
  }

  async function compressOversizedRasterCostumes() {
    if (typeof PyScratchInspector === 'undefined' || !state.projectJson || !state.assetsMap) return { count: 0, savedBytes: 0 };
    const report = PyScratchInspector.analyzeProject(state.projectJson, state.assetsMap);
    const rasterTargets = report.assets.filter(
      (a) => (a.dataFormat === 'png' || a.dataFormat === 'jpg' || a.dataFormat === 'jpeg') && a.bytes > 0
    );
    let count = 0;
    let savedBytes = 0;
    const processed = new Set();

    for (const item of rasterTargets) {
      if (processed.has(item.md5ext)) continue;
      processed.add(item.md5ext);
      const raw = state.assetsMap.get(item.md5ext);
      if (!raw || typeof Image === 'undefined' || typeof document === 'undefined') continue;

      const mime = item.dataFormat === 'png' ? 'image/png' : 'image/jpeg';
      const blob = new Blob([raw], { type: mime });
      const url = URL.createObjectURL(blob);
      try {
        const img = await new Promise((resolve, reject) => {
          const el = new Image();
          el.onload = () => resolve(el);
          el.onerror = reject;
          el.src = url;
        });
        const needsResize = img.width > 960 || img.height > 960;
        const needsShrink = item.bytes > PyScratchInspector.LARGE_ASSET_BYTES;
        if (!needsResize && !needsShrink) continue;

        const scale = needsResize ? Math.min(960 / img.width, 960 / img.height) : 1;
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);

        let hasAlpha = false;
        if (item.dataFormat === 'png' && typeof ctx.getImageData === 'function') {
          try {
            const px = ctx.getImageData(0, 0, w, h).data;
            for (let i = 3; i < px.length; i += 4) {
              if (px[i] < 255) {
                hasAlpha = true;
                break;
              }
            }
          } catch (_) {}
        }

        const outFmt = item.dataFormat === 'png' && (!needsShrink || hasAlpha) ? 'png' : 'jpg';
        const outMime = outFmt === 'png' ? 'image/png' : 'image/jpeg';
        const outBlob = await new Promise((resolve) => canvas.toBlob(resolve, outMime, 0.82));
        if (!outBlob) continue;
        const outBytes = new Uint8Array(await outBlob.arrayBuffer());
        if (outBytes.byteLength >= item.bytes && !needsResize) continue;

        const replaced = PyScratchInspector.replaceAssetData(
          state.projectJson,
          state.assetsMap,
          item.md5ext,
          outBytes,
          outFmt
        );
        savedBytes += Math.max(0, replaced.oldBytes - replaced.newBytes);
        count += 1;
      } finally {
        URL.revokeObjectURL(url);
      }
    }

    if (count > 0) {
      if (preview) {
        preview.syncProjectAssets(state.projectJson, state.assetsMap);
        preview.render();
      }
      renderAssetsView();
      renderInspectorView();
    }
    return { count, savedBytes };
  }

  function renderInspectorView() {
    if (!viewInspector || !state.projectJson || typeof PyScratchInspector === 'undefined') return;
    const report = PyScratchInspector.analyzeProject(state.projectJson, state.assetsMap);
    const fmt = PyScratchInspector.formatBytes;
    const jsonPct = Math.min(100, Math.round(report.projectJsonRatio * 100));
    const jsonBarCls = report.isProjectJsonOversized ? 'danger' : (report.projectJsonRatio > 0.75 ? 'warn' : '');

    let html = `
      <div class="assets-section">
        <h4>${escapeHtml(i18nT('insp_summary_title'))}</h4>
        <div class="inspector-grid">
          <div class="inspector-stat"><span class="inspector-stat-label">${escapeHtml(i18nT('insp_sprites'))}</span><span class="inspector-stat-val">${report.spritesCount}</span></div>
          <div class="inspector-stat"><span class="inspector-stat-label">${escapeHtml(i18nT('insp_backdrops'))}</span><span class="inspector-stat-val">${report.backdropsCount}</span></div>
          <div class="inspector-stat"><span class="inspector-stat-label">${escapeHtml(i18nT('insp_costumes'))}</span><span class="inspector-stat-val">${report.costumesCount}</span></div>
          <div class="inspector-stat"><span class="inspector-stat-label">${escapeHtml(i18nT('insp_sounds'))}</span><span class="inspector-stat-val">${report.soundsCount}</span></div>
          <div class="inspector-stat"><span class="inspector-stat-label">${escapeHtml(i18nT('insp_vars'))}</span><span class="inspector-stat-val">${report.globalVarsCount} / ${report.localVarsCount}</span></div>
          <div class="inspector-stat"><span class="inspector-stat-label">${escapeHtml(i18nT('insp_lists'))}</span><span class="inspector-stat-val">${report.globalListsCount} / ${report.localListsCount}</span></div>
          <div class="inspector-stat"><span class="inspector-stat-label">${escapeHtml(i18nT('insp_blocks'))}</span><span class="inspector-stat-val">${report.totalBlocks}</span></div>
          <div class="inspector-stat"><span class="inspector-stat-label">${escapeHtml(i18nT('insp_orphans'))}</span><span class="inspector-stat-val">${report.orphanScripts}</span></div>
        </div>
      </div>

      <div class="assets-section">
        <h4>${escapeHtml(i18nT('insp_limits_title'))}</h4>
        <div class="inspector-limit-row">
          <div class="inspector-limit-head">
            <span>${escapeHtml(i18nT('insp_json_size'))}</span>
            <span>${escapeHtml(fmt(report.projectJsonBytes))} / 5.00 MB (${jsonPct}%)</span>
          </div>
          <div class="inspector-bar-track"><div class="inspector-bar-fill ${jsonBarCls}" style="width:${Math.max(2, jsonPct)}%"></div></div>
        </div>
        <div class="assets-hint">${escapeHtml(i18nT('insp_assets_total'))}: <strong>${escapeHtml(fmt(report.totalAssetsBytes))}</strong> · ${escapeHtml(i18nT('insp_unused_count'))}: <strong>${report.unusedAssets.length}</strong></div>
      </div>

      <div class="assets-section">
        <h4>${escapeHtml(i18nT('insp_opt_title'))}</h4>
        <div class="inspector-actions">
          <button type="button" id="btn-insp-clean-unused">${escapeHtml(i18nT('insp_btn_clean_unused'))} (${report.unusedAssets.length})</button>
          <button type="button" id="btn-insp-compress-imgs" class="primary">${escapeHtml(i18nT('insp_btn_compress_imgs'))}</button>
        </div>
      </div>

      <div class="assets-section">
        <h4>${escapeHtml(i18nT('insp_assets_list_title'))}</h4>
        <table class="docs-table">
          <thead>
            <tr>
              <th>${escapeHtml(i18nT('insp_col_name'))}</th>
              <th>${escapeHtml(i18nT('insp_col_target'))}</th>
              <th>${escapeHtml(i18nT('insp_col_type'))}</th>
              <th>${escapeHtml(i18nT('insp_col_size'))}</th>
              <th>${escapeHtml(i18nT('insp_col_status'))}</th>
            </tr>
          </thead>
          <tbody>
            ${report.assets
              .map((a) => {
                const pillCls = a.isOversized ? 'danger' : (a.isLarge ? 'warn' : 'ok');
                const pillTxt = a.isOversized
                  ? i18nT('insp_status_over')
                  : (a.isLarge ? i18nT('insp_status_large') : i18nT('insp_status_ok'));
                return `<tr>
                  <td>${escapeHtml(a.name)}</td>
                  <td>${escapeHtml(a.targetName)}</td>
                  <td>${escapeHtml(a.dataFormat || a.kind)}</td>
                  <td><code>${escapeHtml(fmt(a.bytes))}</code></td>
                  <td><span class="insp-pill ${pillCls}">${escapeHtml(pillTxt)}</span></td>
                </tr>`;
              })
              .join('')}
          </tbody>
        </table>
      </div>
    `;

    viewInspector.innerHTML = html;

    const btnClean = document.getElementById('btn-insp-clean-unused');
    if (btnClean) {
      btnClean.onclick = () => {
        const res = PyScratchInspector.removeUnusedAssets(state.projectJson, state.assetsMap);
        renderInspectorView();
        renderAssetsView();
        if (res.removedCount > 0) {
          setStatus(i18nT('insp_clean_done', { count: res.removedCount, size: fmt(res.freedBytes) }));
        } else {
          setStatus(i18nT('insp_clean_none'));
        }
      };
    }

    const btnCompress = document.getElementById('btn-insp-compress-imgs');
    if (btnCompress) {
      btnCompress.onclick = async () => {
        const res = await compressOversizedRasterCostumes();
        if (res.count > 0) {
          setStatus(i18nT('insp_compress_done', { count: res.count, size: fmt(res.savedBytes) }));
        } else {
          setStatus(i18nT('insp_compress_none'));
        }
      };
    }
  }

  function renderDocsView() {
    if (!viewDocs) return;
    let html = `<div class="assets-section"><h4>${escapeHtml(i18nT('docs_title'))}</h4>`;
    html += `<table class="docs-table"><thead><tr><th>${escapeHtml(i18nT('docs_col_cat'))}</th><th>${escapeHtml(
      i18nT('docs_col_cmd')
    )}</th><th>${escapeHtml(i18nT('docs_col_block'))}</th></tr></thead><tbody>`;
    for (const [cat, cmd, desc] of API_DOCS) {
      html += `<tr><td>${escapeHtml(cat)}</td><td><code data-doc-insert='${escapeHtml(cmd)}'>${escapeHtml(
        cmd
      )}</code></td><td>${escapeHtml(desc)}</td></tr>`;
    }
    html += `</tbody></table></div>`;
    viewDocs.innerHTML = html;
    viewDocs.querySelectorAll('[data-doc-insert]').forEach((el) => {
      el.onclick = () => {
        const raw = el.getAttribute('data-doc-insert').split(' / ')[0];
        insertAtCursor(raw);
      };
    });
  }

  function focusEditorLine(lineNum) {
    if (!lineNum || !editor) return;
    state.highlightedLine = lineNum;
    updateEditorDecorations();
    const lines = editor.value.split('\n');
    let charIdx = 0;
    for (let i = 0; i < Math.min(lineNum - 1, lines.length); i++) {
      charIdx += lines[i].length + 1;
    }
    editor.focus();
    editor.setSelectionRange(charIdx, charIdx + (lines[lineNum - 1] ? lines[lineNum - 1].length : 0));
  }

  function renderBlocksTree(blocks) {
    if (!viewBlocks) return;
    viewBlocks.innerHTML = '';
    const tops = Object.entries(blocks)
      .filter(([, b]) => b.topLevel && !b.shadow)
      .sort((a, b) => (a[1].y || 0) - (b[1].y || 0));

    if (tops.length === 0) {
      viewBlocks.innerHTML =
        '<p style="color: var(--wp-muted); font-size: 12px;">У цій вкладці ще немає блоків. Додайте @when_flag_clicked у редакторі.</p>';
      return;
    }

    function createBlockRow(id, isHat = false) {
      const info = PyScratchDecompiler.formatBlockUk(id, blocks);
      const el = document.createElement('div');
      el.className = isHat ? 'scratch-hat' : `scratch-block ${info.category}`;
      const lineBadge = info.line ? `ряд ${info.line} · ${info.opcode}` : info.opcode;
      el.innerHTML = `<span>${escapeHtml(info.label)}</span><span class="block-meta">${escapeHtml(lineBadge)}</span>`;
      if (info.line) {
        el.onclick = (e) => {
          e.stopPropagation();
          focusEditorLine(info.line);
        };
      }
      return el;
    }

    function renderChain(startId, container, visited = new Set()) {
      let curr = startId;
      while (curr && blocks[curr] && !visited.has(curr)) {
        visited.add(curr);
        const b = blocks[curr];
        const el = createBlockRow(curr, false);
        container.appendChild(el);

        if (b.inputs && b.inputs.SUBSTACK && b.inputs.SUBSTACK[1]) {
          const nest = document.createElement('div');
          nest.className = 'scratch-nested';
          renderChain(b.inputs.SUBSTACK[1], nest, visited);
          container.appendChild(nest);
        }
        if (b.inputs && b.inputs.SUBSTACK2 && b.inputs.SUBSTACK2[1]) {
          const elseLbl = document.createElement('div');
          elseLbl.className = 'scratch-block control';
          elseLbl.innerHTML = '<span>Інакше</span>';
          container.appendChild(elseLbl);

          const nest2 = document.createElement('div');
          nest2.className = 'scratch-nested';
          renderChain(b.inputs.SUBSTACK2[1], nest2, visited);
          container.appendChild(nest2);
        }
        curr = b.next;
      }
    }

    for (const [hatId, hat] of tops) {
      const group = document.createElement('div');
      group.className = 'script-stack';
      const hatEl = createBlockRow(hatId, true);
      group.appendChild(hatEl);
      if (hat.next) renderChain(hat.next, group);
      viewBlocks.appendChild(group);
    }
  }

  function compileCurrent(showSuccess = true) {
    if (!editor || !state.projectJson) return null;
    try {
      const target = state.projectJson.targets[state.activeTargetIdx];
      const stage = state.projectJson.targets.find((t) => t.isStage);
      const res = PyScratchCompiler.compileToScratch(editor.value, target, stage, state.projectJson);
      state.codeByTarget.set(state.activeTargetIdx, editor.value);
      renderBlocksTree(res.blocks);
      if (viewInspector && !viewInspector.classList.contains('hidden')) {
        renderInspectorView();
      }
      if (showSuccess) {
        const count = Object.keys(res.blocks).length;
        setStatus(
          `Скомпільовано (${target.name}): ${count} блоків${res.usesPen ? ' + розширення Pen' : ''}.`,
          false
        );
      } else if (state.errorLine !== null) {
        setStatus('Синтаксис коректний.', false);
      }
      return res;
    } catch (err) {
      setStatus(err.message || 'Помилка компіляції', true, err.line || null);
      return null;
    }
  }

  function compileAllTargets() {
    if (!state.projectJson) return null;
    if (editor) state.codeByTarget.set(state.activeTargetIdx, editor.value);
    const stage = state.projectJson.targets.find((t) => t.isStage);
    const astByTargetIdx = new Map();

    for (let idx = 0; idx < state.projectJson.targets.length; idx++) {
      const target = state.projectJson.targets[idx];
      const src = state.codeByTarget.get(idx) || '';
      try {
        const res = PyScratchCompiler.compileToScratch(src, target, stage, state.projectJson);
        astByTargetIdx.set(idx, res.ast);
        if (idx === state.activeTargetIdx) {
          renderBlocksTree(res.blocks);
        }
      } catch (err) {
        state.activeTargetIdx = idx;
        if (editor) editor.value = src;
        renderTargetTabs();
        renderAssetsView();
        setStatus(`[${target.name}] ${err.message}`, true, err.line || null);
        return null;
      }
    }
    return astByTargetIdx;
  }

  function loadProject(projectJson, assetsMap, initialCode) {
    state.projectJson = projectJson;
    state.assetsMap = assetsMap;
    state.codeByTarget.clear();
    state.errorLine = null;
    state.highlightedLine = null;

    const stage = projectJson.targets.find((t) => t.isStage);
    const firstSpriteIdx = projectJson.targets.findIndex((t) => !t.isStage);
    projectJson.targets.forEach((t, idx) => {
      if (initialCode !== undefined && initialCode !== null && !t.isStage && idx === firstSpriteIdx) {
        state.codeByTarget.set(idx, initialCode);
      } else {
        state.codeByTarget.set(idx, PyScratchDecompiler.decompileTarget(t, stage));
      }
    });

    state.activeTargetIdx = firstSpriteIdx >= 0 ? firstSpriteIdx : 0;
    if (editor) editor.value = state.codeByTarget.get(state.activeTargetIdx) || '';
    updateEditorDecorations();
    updateCursorTelemetry();
    renderTargetTabs();
    renderAssetsView();
    renderDocsView();

    if (preview) {
      preview.syncProjectAssets(projectJson, assetsMap);
      preview.reset();
    }
    compileCurrent(true);
  }

  function encodeBase64Url(str) {
    let bytes;
    if (typeof TextEncoder !== 'undefined') {
      bytes = new TextEncoder().encode(String(str));
    } else {
      const utf8 = unescape(encodeURIComponent(String(str)));
      bytes = new Uint8Array(utf8.length);
      for (let i = 0; i < utf8.length; i++) bytes[i] = utf8.charCodeAt(i);
    }
    let bin = '';
    for (let i = 0; i < bytes.length; i++) {
      bin += String.fromCharCode(bytes[i]);
    }
    if (typeof btoa === 'function') {
      return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }
    return '';
  }

  function decodeBase64Url(b64url) {
    if (typeof atob !== 'function') {
      throw new Error('atob недоступний у цьому середовищі');
    }
    let b64 = String(b64url).replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) {
      bytes[i] = bin.charCodeAt(i);
    }
    if (typeof TextDecoder !== 'undefined') {
      return new TextDecoder().decode(bytes);
    }
    return decodeURIComponent(escape(bin));
  }

  async function copyTextToClipboard(text) {
    if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (_) {}
    }
    if (typeof document !== 'undefined' && document.body) {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        const ok = typeof document.execCommand === 'function' ? document.execCommand('copy') : false;
        document.body.removeChild(ta);
        return !!ok;
      } catch (_) {
        return false;
      }
    }
    return false;
  }

  // Parse URL query parameters (?embed=1, ?snippet=<name>, ?code=<base64url>, ?autorun=1)
  const urlParams =
    typeof window !== 'undefined' && window.location && typeof URLSearchParams !== 'undefined'
      ? new URLSearchParams(window.location.search || '')
      : null;

  if (urlParams && (urlParams.get('embed') === '1' || urlParams.get('embed') === 'true')) {
    if (document.body) document.body.classList.add('embed-mode');
  }

  let startupCode = SNIPPETS.hexagon;
  let codeDecodeError = null;
  let loadedFromCodeParam = false;

  if (urlParams) {
    const snippetParam = urlParams.get('snippet');
    if (snippetParam && Object.prototype.hasOwnProperty.call(SNIPPETS, snippetParam)) {
      startupCode = SNIPPETS[snippetParam];
    }
    const codeParam = urlParams.get('code');
    if (codeParam !== null && codeParam !== '') {
      try {
        startupCode = decodeBase64Url(codeParam);
        loadedFromCodeParam = true;
      } catch (_) {
        codeDecodeError = 'Не вдалося розшифрувати код із URL (?code=). Завантажено стандартний шаблон.';
      }
    }
  }

  // Apply initial DOM translations before loading project so startup errors/statuses are preserved
  if (typeof PyScratchI18n !== 'undefined') {
    PyScratchI18n.applyDomTranslations();
  }

  // Initialize default project
  const def = Sb3Bridge.createDefaultProject();
  loadProject(def.projectJson, def.assetsMap, startupCode);
  if (codeDecodeError) {
    setStatus(codeDecodeError, true);
  } else if (loadedFromCodeParam && state.errorLine === null) {
    setStatus('Код завантажено за посиланням.');
  }

  // Editor events
  if (editor) {
    editor.addEventListener('input', () => {
      state.highlightedLine = null;
      updateEditorDecorations();
      updateCursorTelemetry();
      compileCurrent(false);
    });

    editor.addEventListener('click', updateCursorTelemetry);
    editor.addEventListener('keyup', updateCursorTelemetry);

    editor.addEventListener('scroll', () => {
      if (lineNumbers) lineNumbers.scrollTop = editor.scrollTop;
      if (codeHighlight) {
        codeHighlight.scrollTop = editor.scrollTop;
        codeHighlight.scrollLeft = editor.scrollLeft;
      }
    });

    editor.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        const runBtn = document.getElementById('btn-run');
        if (runBtn) runBtn.click();
        return;
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        insertAtCursor('    ');
      } else if (e.key === 'Enter') {
        const pos = editor.selectionStart;
        const before = editor.value.slice(0, pos);
        const currentLine = before.split('\n').pop();
        const indentMatch = currentLine.match(/^(\s*)/);
        let indent = indentMatch ? indentMatch[1] : '';
        if (currentLine.trim().endsWith(':')) {
          indent += '    ';
        }
        if (indent.length > 0) {
          e.preventDefault();
          insertAtCursor('\n' + indent);
        }
      }
    });
  }

  // Quick command chips
  document.querySelectorAll('.palette-chip').forEach((chip) => {
    chip.onclick = () => insertAtCursor(chip.getAttribute('data-insert'));
  });

  // Snippet buttons
  document.querySelectorAll('.snippet-btn').forEach((btn) => {
    btn.onclick = () => {
      const key = btn.getAttribute('data-snippet');
      if (SNIPPETS[key] && editor) {
        const activeTarget = state.projectJson && state.projectJson.targets[state.activeTargetIdx];
        if (activeTarget && activeTarget.isStage) {
          const firstSpriteIdx = state.projectJson.targets.findIndex((t) => !t.isStage);
          if (firstSpriteIdx >= 0) selectTarget(firstSpriteIdx);
        }
        editor.value = SNIPPETS[key];
        state.highlightedLine = null;
        updateEditorDecorations();
        compileCurrent(true);
        const runBtn = document.getElementById('btn-run');
        if (runBtn) runBtn.click();
      }
    };
  });

  // Right panel tabs
  document.querySelectorAll('[data-view]').forEach((btn) => {
    btn.onclick = () => {
      document.querySelectorAll('[data-view]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const v = btn.getAttribute('data-view');
      if (viewPreview) viewPreview.classList.toggle('hidden', v !== 'preview');
      if (viewBlocks) viewBlocks.classList.toggle('hidden', v !== 'blocks');
      if (viewAssets) viewAssets.classList.toggle('hidden', v !== 'assets');
      if (viewInspector) {
        viewInspector.classList.toggle('hidden', v !== 'inspector');
        if (v === 'inspector') renderInspectorView();
      }
      if (viewDocs) viewDocs.classList.toggle('hidden', v !== 'docs');
    };
  });

  // Language switcher (UA | EN | RU)
  document.querySelectorAll('.lang-btn[data-lang]').forEach((btn) => {
    btn.onclick = () => {
      if (typeof PyScratchI18n === 'undefined') return;
      PyScratchI18n.setLang(btn.getAttribute('data-lang'));
      renderDocsView();
      renderInspectorView();
      if (btnMute && preview) {
        btnMute.textContent = preview.muted ? i18nT('sound_off') : i18nT('sound_on');
      }
    };
  });

  // Initial DOM translations already applied before loadProject()

  // Add new Sprite
  const btnAddSprite = document.getElementById('btn-add-sprite');
  if (btnAddSprite) {
    btnAddSprite.onclick = () => {
      if (editor) state.codeByTarget.set(state.activeTargetIdx, editor.value);
      const newSprite = Sb3Bridge.addSpriteToProject(state.projectJson, state.assetsMap);
      const newIdx = state.projectJson.targets.length - 1;
      const starterCode = `# === СКРИПТ ГРАВЦЯ (${newSprite.name}) ===\n\n@when_flag_clicked\ndef main():\n    goto(${newSprite.x}, 0)\n    say("Привіт від ${newSprite.name}!", 2)\n`;
      state.codeByTarget.set(newIdx, starterCode);
      state.activeTargetIdx = newIdx;
      if (editor) editor.value = starterCode;
      updateEditorDecorations();
      renderTargetTabs();
      renderAssetsView();
      if (preview) {
        preview.syncProjectAssets(state.projectJson, state.assetsMap);
        preview.reset();
      }
      compileCurrent(true);
    };
  }

  // Run, Stop, Mute
  const btnRun = document.getElementById('btn-run');
  if (btnRun) {
    btnRun.onclick = () => {
      const astByTargetIdx = compileAllTargets();
      if (!astByTargetIdx) return;
      if (preview) preview.runProject(astByTargetIdx, state.projectJson, state.assetsMap);
      setStatus('Симуляцію запущено на сцені Canvas 2D.');
    };
  }

  const btnStop = document.getElementById('btn-stop');
  if (btnStop) {
    btnStop.onclick = () => {
      if (preview) preview.reset();
      setStatus('Виконання зупинено.');
    };
  }

  const btnMute = document.getElementById('btn-mute');
  if (btnMute && preview) {
    btnMute.textContent = preview.muted ? i18nT('sound_off') : i18nT('sound_on');
    btnMute.onclick = () => {
      preview.muted = !preview.muted;
      btnMute.textContent = preview.muted ? i18nT('sound_off') : i18nT('sound_on');
    };
  }

  if (typeof window !== 'undefined' && preview) {
    window.addEventListener('keydown', (e) => {
      if (document.activeElement === editor || document.activeElement === askInput) return;
      const tag = document.activeElement && document.activeElement.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      const keyMap = {
        ' ': 'space',
        ArrowUp: 'up arrow',
        ArrowDown: 'down arrow',
        ArrowLeft: 'left arrow',
        ArrowRight: 'right arrow',
        Enter: 'enter'
      };
      const k = keyMap[e.key] || e.key.toLowerCase();
      if (['space', 'up arrow', 'down arrow', 'left arrow', 'right arrow'].includes(k)) {
        e.preventDefault();
      }
      preview.pressedKeys.add(k);
      preview.triggerKey(k);
    });

    window.addEventListener('keyup', (e) => {
      const keyMap = {
        ' ': 'space',
        ArrowUp: 'up arrow',
        ArrowDown: 'down arrow',
        ArrowLeft: 'left arrow',
        ArrowRight: 'right arrow',
        Enter: 'enter'
      };
      const k = keyMap[e.key] || e.key.toLowerCase();
      preview.pressedKeys.delete(k);
    });
  }

  // Shared .sb3 Loader (File Picker + Drag-and-Drop)
  async function openSb3File(file) {
    if (!file) return;
    if (!String(file.name || '').toLowerCase().endsWith('.sb3')) {
      setStatus('Підтримуються лише файли Scratch 3.0 (.sb3).', true);
      return;
    }
    try {
      const buf = await file.arrayBuffer();
      const { projectJson, assetsMap } = await Sb3Bridge.loadSb3(buf);
      loadProject(projectJson, assetsMap);
      setStatus(`Завантажено "${file.name}" (${projectJson.targets.length} об'єктів).`);
    } catch (err) {
      setStatus('Помилка відкриття .sb3: ' + (err && err.message ? err.message : String(err)), true);
    }
  }

  const fileInput = document.getElementById('file-input');
  const btnOpen = document.getElementById('btn-open');
  if (btnOpen && fileInput) {
    btnOpen.onclick = () => fileInput.click();
  }
  if (fileInput) {
    fileInput.onchange = async (e) => {
      const file = e.target.files && e.target.files[0];
      await openSb3File(file);
      fileInput.value = '';
    };
  }

  // Drag-and-Drop .sb3 onto browser window
  if (typeof window !== 'undefined') {
    let dragDepth = 0;
    const hasDraggedFiles = (e) => {
      const types = e.dataTransfer && e.dataTransfer.types;
      return types && Array.from(types).includes('Files');
    };
    const showDropOverlay = (visible) => {
      if (dropOverlay) dropOverlay.classList.toggle('hidden', !visible);
    };

    window.addEventListener('dragenter', (e) => {
      if (!hasDraggedFiles(e)) return;
      e.preventDefault();
      dragDepth++;
      showDropOverlay(true);
    });

    window.addEventListener('dragover', (e) => {
      if (!hasDraggedFiles(e)) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
      showDropOverlay(true);
    });

    window.addEventListener('dragleave', (e) => {
      if (!hasDraggedFiles(e)) return;
      dragDepth = Math.max(0, dragDepth - 1);
      if (dragDepth === 0) showDropOverlay(false);
    });

    window.addEventListener('drop', async (e) => {
      if (!hasDraggedFiles(e)) return;
      e.preventDefault();
      dragDepth = 0;
      showDropOverlay(false);
      const files = e.dataTransfer && e.dataTransfer.files;
      if (files && files.length > 0) {
        const sb3File = Array.from(files).find((f) => f.name.toLowerCase().endsWith('.sb3')) || files[0];
        await openSb3File(sb3File);
      }
    });
  }

  const btnTemplate = document.getElementById('btn-template');
  if (btnTemplate) {
    btnTemplate.onclick = () => {
      const d = Sb3Bridge.createDefaultProject();
      loadProject(d.projectJson, d.assetsMap, SNIPPETS.hexagon);
      setStatus('Створено чистий шаблон проєкту.');
    };
  }

  const btnSave = document.getElementById('btn-save');
  if (btnSave) {
    btnSave.onclick = async () => {
      const astByTargetIdx = compileAllTargets();
      if (!astByTargetIdx) return;
      try {
        const blob = await Sb3Bridge.saveSb3(state.projectJson, state.assetsMap, 'blob');
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'pyscratch_project.sb3';
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        setStatus('Файл pyscratch_project.sb3 збережено (усі спрайти та асети упаковано).');
      } catch (err) {
        setStatus('Помилка збереження .sb3: ' + (err && err.message ? err.message : String(err)), true);
      }
    };
  }

  const btnShare = document.getElementById('btn-share');
  if (btnShare) {
    btnShare.onclick = async () => {
      try {
        const code = editor ? editor.value : '';
        const encoded = encodeBase64Url(code);
        let shareUrl;
        try {
          const u = new URL(window.location.href);
          u.searchParams.delete('snippet');
          u.searchParams.set('code', encoded);
          shareUrl = u.toString();
        } catch (_) {
          const base = (window.location && window.location.pathname) || '';
          shareUrl = `${base}?code=${encoded}`;
        }

        if (typeof window !== 'undefined' && window.history && typeof window.history.replaceState === 'function') {
          try {
            window.history.replaceState(null, '', shareUrl);
          } catch (_) {}
        }

        const copied = await copyTextToClipboard(shareUrl);
        if (copied) {
          setStatus('Посилання на код скопійовано! Можете надіслати його учню або другу.');
        } else {
          setStatus('Посилання оновлено в адресному рядку (доступ до буфера обмежено).');
        }
      } catch (err) {
        setStatus('Помилка створення посилання: ' + (err && err.message ? err.message : String(err)), true);
      }
    };
  }

  if (urlParams && (urlParams.get('autorun') === '1' || urlParams.get('autorun') === 'true') && !codeDecodeError) {
    if (btnRun) btnRun.click();
  }
})();
