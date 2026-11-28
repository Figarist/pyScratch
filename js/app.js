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
                point_in_direction(135)
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
    hide()
    while timer() < 15:
        create_clone("myself")
        wait(0.8)
    say(join("Час вийшов! Бали: ", score), 3)
    stop("all")

@when_cloned
def clone_target():
    goto(random(-180, 180), random(-120, 120))
    show()
    wait(1.6)
    delete_this_clone()

@when_this_sprite_clicked
def catch_target():
    score += 1
    play_sound("pop")
    delete_this_clone()
`
  };

  // Per-language text for the lesson templates: comments and the phrases sprites say. The code itself is shared,
  // so every locale runs exactly the same program. Each pair is [Ukrainian source fragment, translation].
  const SNIPPET_L10N = {
    en: [
      ['# === СКРИПТ ГРАВЦЯ (Sprite1) ===', '# === PLAYER SCRIPT (Sprite1) ==='],
      ['# Налаштування сцени та позиції', '# Set up the stage and position'],
      ['# Робота з Олівцем (Pen Extension)', '# Drawing with the Pen extension'],
      ['# Малюємо геометричну фігуру в циклі', '# Draw a geometric shape in a loop'],
      ['"Готово! Переходимо на новий рівень"', '"Done! Moving on to the next level"'],
      ['"Рівень 2 почався!"', '"Level 2 has started!"'],
      ['# === ВЛАСНІ ФУНКЦІЇ (Мій Блок у Scratch) ===', '# === CUSTOM FUNCTIONS (My Block in Scratch) ==='],
      ['"Трикутник, квадрат і п\'ятикутник!"', '"Triangle, square and pentagon!"'],
      ['# === КЕРУВАННЯ СТРІЛКАМИ + ВІДБИВАННЯ ===', '# === ARROW KEYS + BOUNCING ==='],
      ['"Керуй стрілками або пробілом!"', '"Use the arrow keys or space!"'],
      ['# === КЛОНИ ТА ЗІРКОВИЙ САЛЮТ ===', '# === CLONES AND STAR FIREWORKS ==='],
      ['# === ДІАЛОГ, УМОВИ ELIF ТА СПИСКИ ===', '# === DIALOGUE, ELIF CONDITIONS AND LISTS ==='],
      ['"Скільки буде 7 * 8?"', '"What is 7 * 8?"'],
      ['"Мега-Кристал"', '"Mega Crystal"'],
      ['"Правильно! Бали: "', '"Correct! Points: "'],
      ['"Майже! Це 6 * 9, а не 7 * 8"', '"Almost! That is 6 * 9, not 7 * 8"'],
      ['"Спробуй ще раз!"', '"Try again!"'],
      ['# === ЗМІНА РІВНІВ ТА ПОВІДОМЛЕННЯ ===', '# === LEVELS AND MESSAGES ==='],
      ['"Натисни Пробіл для старту місії!"', '"Press Space to start the mission!"'],
      ['"Рівень 2: Хвиля почалась!"', '"Level 2: the wave has begun!"'],
      ['# === ПІНГ-ПОНГ (КЛАСИЧНА ГРА) ===', '# === PING-PONG (CLASSIC GAME) ==='],
      ['"Гру завершено! Рахунок: "', '"Game over! Score: "'],
      ['# === ЛАБІРИНТ (СТРІЛКИ + ТОРКАННЯ КОЛЬОРУ) ===', '# === MAZE (ARROW KEYS + TOUCHING A COLOR) ==='],
      ['"Дійди до зеленої цілі стрілками!"', '"Reach the green goal with the arrow keys!"'],
      ['"Перемога!"', '"You win!"'],
      ['# === ШВИДКИЙ КЛІКЕР (КЛОНИ + ТАЙМЕР) ===', '# === QUICK CLICKER (CLONES + TIMER) ==='],
      ['"Час вийшов! Бали: "', '"Time is up! Points: "'],
      // API reference examples (Docs tab)
      ['"Текст"', '"Text"'],
      ['"Думка"', '"Thought"'],
      ['"Питання"', '"Question"'],
      ['"ключ"', '"key"']
    ],
    ru: [
      ['# === СКРИПТ ГРАВЦЯ (Sprite1) ===', '# === СКРИПТ ИГРОКА (Sprite1) ==='],
      ['# Налаштування сцени та позиції', '# Настройка сцены и позиции'],
      ['# Робота з Олівцем (Pen Extension)', '# Рисуем Пером (Pen Extension)'],
      ['# Малюємо геометричну фігуру в циклі', '# Рисуем геометрическую фигуру в цикле'],
      ['"Готово! Переходимо на новий рівень"', '"Готово! Переходим на новый уровень"'],
      ['"Рівень 2 почався!"', '"Уровень 2 начался!"'],
      ['# === ВЛАСНІ ФУНКЦІЇ (Мій Блок у Scratch) ===', '# === СВОИ ФУНКЦИИ (Мой блок в Scratch) ==='],
      ['"Трикутник, квадрат і п\'ятикутник!"', '"Треугольник, квадрат и пятиугольник!"'],
      ['# === КЕРУВАННЯ СТРІЛКАМИ + ВІДБИВАННЯ ===', '# === УПРАВЛЕНИЕ СТРЕЛКАМИ + ОТСКОК ==='],
      ['"Керуй стрілками або пробілом!"', '"Управляй стрелками или пробелом!"'],
      ['# === КЛОНИ ТА ЗІРКОВИЙ САЛЮТ ===', '# === КЛОНЫ И ЗВЁЗДНЫЙ САЛЮТ ==='],
      ['# === ДІАЛОГ, УМОВИ ELIF ТА СПИСКИ ===', '# === ДИАЛОГ, УСЛОВИЯ ELIF И СПИСКИ ==='],
      ['"Скільки буде 7 * 8?"', '"Сколько будет 7 * 8?"'],
      ['"Мега-Кристал"', '"Мега-Кристалл"'],
      ['"Правильно! Бали: "', '"Правильно! Очки: "'],
      ['"Майже! Це 6 * 9, а не 7 * 8"', '"Почти! Это 6 * 9, а не 7 * 8"'],
      ['"Спробуй ще раз!"', '"Попробуй ещё раз!"'],
      ['# === ЗМІНА РІВНІВ ТА ПОВІДОМЛЕННЯ ===', '# === СМЕНА УРОВНЕЙ И СООБЩЕНИЯ ==='],
      ['"Натисни Пробіл для старту місії!"', '"Нажми Пробел, чтобы начать миссию!"'],
      ['"Рівень 2: Хвиля почалась!"', '"Уровень 2: волна началась!"'],
      ['# === ПІНГ-ПОНГ (КЛАСИЧНА ГРА) ===', '# === ПИНГ-ПОНГ (КЛАССИЧЕСКАЯ ИГРА) ==='],
      ['"Гру завершено! Рахунок: "', '"Игра окончена! Счёт: "'],
      ['# === ЛАБІРИНТ (СТРІЛКИ + ТОРКАННЯ КОЛЬОРУ) ===', '# === ЛАБИРИНТ (СТРЕЛКИ + КАСАНИЕ ЦВЕТА) ==='],
      ['"Дійди до зеленої цілі стрілками!"', '"Доберись до зелёной цели стрелками!"'],
      ['"Перемога!"', '"Победа!"'],
      ['# === ШВИДКИЙ КЛІКЕР (КЛОНИ + ТАЙМЕР) ===', '# === БЫСТРЫЙ КЛИКЕР (КЛОНЫ + ТАЙМЕР) ==='],
      ['"Час вийшов! Бали: "', '"Время вышло! Очки: "'],
      // API reference examples (Docs tab)
      ['"Думка"', '"Мысль"'],
      ['"Питання"', '"Вопрос"']
    ],
    pl: [
      ['# === СКРИПТ ГРАВЦЯ (Sprite1) ===', '# === SKRYPT GRACZA (Sprite1) ==='],
      ['# Налаштування сцени та позиції', '# Ustawienie sceny i pozycji'],
      ['# Робота з Олівцем (Pen Extension)', '# Rysowanie Piórem (Pen Extension)'],
      ['# Малюємо геометричну фігуру в циклі', '# Rysujemy figurę geometryczną w pętli'],
      ['"Готово! Переходимо на новий рівень"', '"Gotowe! Przechodzimy na kolejny poziom"'],
      ['"Рівень 2 почався!"', '"Poziom 2 rozpoczęty!"'],
      ['# === ВЛАСНІ ФУНКЦІЇ (Мій Блок у Scratch) ===', '# === WŁASNE FUNKCJE (Moje bloki w Scratch) ==='],
      ['"Трикутник, квадрат і п\'ятикутник!"', '"Trójkąt, kwadrat i pięciokąt!"'],
      ['# === КЕРУВАННЯ СТРІЛКАМИ + ВІДБИВАННЯ ===', '# === STEROWANIE STRZAŁKAMI + ODBIJANIE ==='],
      ['"Керуй стрілками або пробілом!"', '"Steruj strzałkami lub spacją!"'],
      ['# === КЛОНИ ТА ЗІРКОВИЙ САЛЮТ ===', '# === KLONY I GWIEZDNE FAJERWERKI ==='],
      ['# === ДІАЛОГ, УМОВИ ELIF ТА СПИСКИ ===', '# === DIALOG, WARUNKI ELIF I LISTY ==='],
      ['"Скільки буде 7 * 8?"', '"Ile to jest 7 * 8?"'],
      ['"Мега-Кристал"', '"Mega Kryształ"'],
      ['"Правильно! Бали: "', '"Dobrze! Punkty: "'],
      ['"Майже! Це 6 * 9, а не 7 * 8"', '"Prawie! To 6 * 9, a nie 7 * 8"'],
      ['"Спробуй ще раз!"', '"Spróbuj jeszcze raz!"'],
      ['# === ЗМІНА РІВНІВ ТА ПОВІДОМЛЕННЯ ===', '# === ZMIANA POZIOMÓW I KOMUNIKATY ==='],
      ['"Натисни Пробіл для старту місії!"', '"Naciśnij Spację, aby rozpocząć misję!"'],
      ['"Рівень 2: Хвиля почалась!"', '"Poziom 2: fala się zaczęła!"'],
      ['# === ПІНГ-ПОНГ (КЛАСИЧНА ГРА) ===', '# === PING-PONG (KLASYCZNA GRA) ==='],
      ['"Гру завершено! Рахунок: "', '"Koniec gry! Wynik: "'],
      ['# === ЛАБІРИНТ (СТРІЛКИ + ТОРКАННЯ КОЛЬОРУ) ===', '# === LABIRYNT (STRZAŁKI + DOTKNIĘCIE KOLORU) ==='],
      ['"Дійди до зеленої цілі стрілками!"', '"Dotrzyj do zielonego celu strzałkami!"'],
      ['"Перемога!"', '"Wygrana!"'],
      ['# === ШВИДКИЙ КЛІКЕР (КЛОНИ + ТАЙМЕР) ===', '# === SZYBKI KLIKER (KLONY + STOPER) ==='],
      ['"Час вийшов! Бали: "', '"Czas minął! Punkty: "'],
      // API reference examples (Docs tab)
      ['"Текст"', '"Tekst"'],
      ['"Думка"', '"Myśl"'],
      ['"Питання"', '"Pytanie"'],
      ['"ключ"', '"klucz"']
    ]
  };

  function localizeSnippetText(code, lang) {
    const pairs = SNIPPET_L10N[lang];
    if (!pairs) return code;
    let out = code;
    for (const [from, to] of pairs) out = out.split(from).join(to);
    return out;
  }

  // Lesson template in the language of the page (falls back to the Ukrainian source).
  function getSnippet(key) {
    if (!Object.prototype.hasOwnProperty.call(SNIPPETS, key)) return null;
    const lang = typeof PyScratchI18n !== 'undefined' && PyScratchI18n.getLang ? PyScratchI18n.getLang() : 'uk';
    return localizeSnippetText(SNIPPETS[key], lang);
  }

  const API_DOCS = [
    ['cat_events', '@when_flag_clicked', 'doc_01'],
    ['cat_events', '@when_key_pressed("space")', 'doc_02'],
    ['cat_events', '@when_this_sprite_clicked', 'doc_03'],
    ['cat_events', '@when_backdrop_switches("level_2")', 'doc_04'],
    ['cat_events', '@when_message_received("msg")', 'doc_05'],
    ['cat_events', '@when_greater_than("timer", 5)', 'doc_06'],
    ['cat_events', '@when_cloned', 'doc_07'],
    ['cat_events', '@when_touching("Sprite2")', 'doc_50'],
    ['cat_functions', 'def my_block(x, y):', 'doc_08'],
    ['cat_functions', '@warp', 'doc_09'],
    ['cat_motion', 'move(80) / turn_right(90) / turn_left(90)', 'doc_10'],
    ['cat_motion', 'goto(x, y) / glide(sec, x, y)', 'doc_11'],
    ['cat_motion', 'glide_to(1, "mouse")', 'doc_12'],
    ['cat_motion', 'goto_random() / goto_mouse()', 'doc_13'],
    ['cat_motion', 'point_in_direction(90) / point_towards("mouse")', 'doc_14'],
    ['cat_motion', 'set_x(0), change_x(10), set_y(0), change_y(10)', 'doc_15'],
    ['cat_motion', 'if_on_edge_bounce()', 'doc_16'],
    ['cat_looks', 'say("Текст", 2) / think("Думка", 2)', 'doc_17'],
    ['cat_looks', 'switch_costume("costume1") / next_costume()', 'doc_18'],
    ['cat_looks', 'switch_backdrop("space_bg") / next_backdrop()', 'doc_19'],
    ['cat_looks', 'switch_backdrop_and_wait("level_2")', 'doc_20'],
    ['cat_looks', 'go_to_layer("front") / change_layer("forward", 1)', 'doc_21'],
    ['cat_looks', 'set_size(100) / change_size(10) / show() / hide()', 'doc_22'],
    ['cat_looks', 'set_effect("color", 25) / clear_effects()', 'doc_23'],
    ['cat_pen', 'pen_down() / pen_up() / pen_clear() / pen_stamp()', 'doc_24'],
    ['cat_pen', 'set_pen_color("#00ffcc") / set_pen_size(3)', 'doc_25'],
    ['cat_sound', 'play_sound("pop") / play_sound_until_done("laser")', 'doc_26'],
    ['cat_sound', 'set_sound_effect("pitch", 50) / change_sound_effect("pan", 25)', 'doc_27'],
    ['cat_sound', 'clear_sound_effects()', 'doc_28'],
    ['cat_control', 'for i in range(6): / while True: / while not cond:', 'doc_29'],
    ['cat_control', 'if cond: / elif cond2: / else:', 'doc_30'],
    ['cat_control', 'wait(0.5) / wait_until(cond) / stop("all")', 'doc_31'],
    ['cat_control', 'create_clone("myself") / delete_this_clone()', 'doc_32'],
    ['cat_sensing', 'ask("Питання") / answer()', 'doc_33'],
    ['cat_sensing', 'key_pressed("space") / touching("edge")', 'doc_34'],
    ['cat_sensing', 'touching_color("#00ffcc") / color_is_touching_color("#f00", "#0f0")', 'doc_35'],
    ['cat_sensing', 'attribute_of("x position", "Sprite1")', 'doc_36'],
    ['cat_sensing', 'set_drag_mode("draggable")', 'doc_37'],
    ['cat_sensing', 'mouse_x(), mouse_y(), mouse_down(), timer()', 'doc_38'],
    ['cat_sensing', 'current_time("hour") / days_since_2000()', 'doc_39'],
    ['cat_sensing', 'username() / loudness()', 'doc_40'],
    ['cat_operators', 'asin(0.5) / acos(0.5) / atan(1)', 'doc_41'],
    ['cat_operators', 'ln(10) / log(100) / exp(1) / pow10(2)', 'doc_42'],
    ['cat_operators', 'len("hello") / len("bag")', 'doc_43'],
    ['cat_variables', 'self.hp = 100', 'doc_44'],
    ['cat_variables', 'show_variable("score") / hide_variable("score")', 'doc_45'],
    ['cat_lists', 'local_list("items")', 'doc_46'],
    ['cat_lists', 'list_add("bag", "ключ"), list_item("bag", 1)', 'doc_47'],
    ['cat_lists', 'list_index_of("bag", "ключ")', 'doc_48'],
    ['cat_lists', 'show_list("bag") / hide_list("bag")', 'doc_49'],
    ['cat_functions', 'def jump(height, flag: bool):', 'doc_51'],
    ['cat_music', 'play_drum(1, 0.25) / rest(0.25) / play_note(60, 0.5)', 'doc_52'],
    ['cat_music', 'set_instrument(1) / set_tempo(120) / change_tempo(20) / tempo()', 'doc_53'],
    ['cat_text2speech', 'speak("Hello") / set_voice("alto") / set_language("en")', 'doc_54'],
    ['cat_translate', 'translate("hello", "es") / language()', 'doc_55']
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
  let projectDirty = false;
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
  const stageMonitorsLayer = document.getElementById('stage-monitors-layer');
  const stageMonitorDomCache = new Map();

  function updateTelemetryInput(el, value) {
    if (!el || el.disabled) return;
    if (typeof document !== 'undefined' && document.activeElement === el) return;
    const next = String(Math.round(Number(value) || 0));
    if ('value' in el) {
      if (el.value !== next) el.value = next;
    } else {
      el.textContent = next;
    }
  }

  let currentAskCallback = null;

  const stageCanvas = document.getElementById('stage-canvas');
  const preview =
    typeof StagePreview !== 'undefined' && stageCanvas
      ? new StagePreview(stageCanvas, {
          onBackdropChange: (bg) => {
            if (backdropIndicator) backdropIndicator.textContent = i18nT('backdrop_label', { name: bg });
          },
          onTelemetry: (t) => {
            updateTelemetryInput(teleX, t.x);
            updateTelemetryInput(teleY, t.y);
            updateTelemetryInput(teleDir, t.direction);
            updateTelemetryInput(teleSize, t.size);
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
            const actorName = t.actorName || t.spriteName || fallbackActor;
            renderVarsWatch(t.vars, t.lists, t.localVars, t.localLists, actorName, t.hiddenMonitors);
            renderStageMonitors(t.vars, t.lists, t.localVars, t.localLists, actorName, t.visibleMonitors, t.hiddenMonitors, t.localsByActor);
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

  function renderVarsWatch(vars, lists, localVars, localLists, actorName, hiddenMonitors) {
    if (!varsWatch) return;
    // Monitors hidden by hide_variable / hide_list (or saved as invisible in project.json) are not listed
    const hidden = new Set(Array.isArray(hiddenMonitors) ? hiddenMonitors : []);
    const varEntries = Object.entries(vars || {}).filter(([k]) => !hidden.has(k));
    const listEntries = Object.entries(lists || {}).filter(([k]) => !hidden.has(k));
    const baseName = (label) => String(label).split('.').pop();
    const localVarEntries = formatScopedEntries(localVars, actorName).filter(([label]) => !hidden.has(baseName(label)));
    const localListEntries = formatScopedEntries(localLists, actorName).filter(([label]) => !hidden.has(baseName(label)));

    if (
      varEntries.length === 0 &&
      listEntries.length === 0 &&
      localVarEntries.length === 0 &&
      localListEntries.length === 0
    ) {
      varsWatch.innerHTML =
        `<span style="color: var(--wp-dim); font-size: 11px;">${escapeHtml(i18nT('vars_empty'))}</span>`;
      return;
    }

    const pills = [];
    for (const [k, v] of varEntries) {
      pills.push(`<span class="var-pill">${escapeHtml(k)} = <b>${escapeHtml(String(v))}</b></span>`);
    }
    for (const [label, v] of localVarEntries) {
      pills.push(
        `<span class="var-pill var-pill-local" title="${escapeHtml(i18nT('vars_local_title'))}">${escapeHtml(label)} = <b>${escapeHtml(
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
        `<span class="var-pill var-pill-local-list" title="${escapeHtml(i18nT('lists_local_title'))}">${escapeHtml(label)} [${safeArr.length}]: ${escapeHtml(
          safeArr.slice(0, 5).join(', ')
        )}</span>`
      );
    }
    varsWatch.innerHTML = pills.join('');
  }

  function renderStageMonitors(vars, lists, localVars, localLists, actorName, visibleMonitors, hiddenMonitors, localsByActor) {
    if (!stageMonitorsLayer || typeof StagePreview === 'undefined' || typeof StagePreview.layoutMonitors !== 'function') return;
    const hidden = new Set(Array.isArray(hiddenMonitors) ? hiddenMonitors : []);
    const shownRuntime = new Set(Array.isArray(visibleMonitors) ? visibleMonitors : []);
    const specs = [];
    const seenKeys = new Set();

    const has = (obj, key) => Boolean(obj) && Object.prototype.hasOwnProperty.call(obj, key);
    const readVal = (isList, varName, spriteName) => {
      // A sprite-local monitor reads that sprite's own locals, not the currently selected sprite's.
      const own = spriteName
        ? (localsByActor && localsByActor[spriteName]) ||
          (spriteName === actorName ? { vars: localVars, lists: localLists } : null)
        : null;
      if (isList) {
        if (own && own.lists && Array.isArray(own.lists[varName])) return own.lists[varName];
        if (spriteName) return [];
        return lists && Array.isArray(lists[varName]) ? lists[varName] : [];
      }
      if (own && has(own.vars, varName)) return own.vars[varName];
      if (spriteName) return 0;
      return has(vars, varName) ? vars[varName] : 0;
    };

    const projMonitors = state.projectJson && Array.isArray(state.projectJson.monitors) ? state.projectJson.monitors : [];
    for (const m of projMonitors) {
      if (!m || (m.opcode !== 'data_variable' && m.opcode !== 'data_listcontents')) continue;
      const isList = m.opcode === 'data_listcontents';
      const varName = m.params && (isList ? m.params.LIST : m.params.VARIABLE);
      if (!varName) continue;
      const isVisible = (m.visible !== false || shownRuntime.has(varName)) && !hidden.has(varName);
      const key = `${m.spriteName || '__global__'}::${m.opcode}::${varName}`;
      seenKeys.add(key);
      if (!isVisible) continue;
      specs.push({
        id: m.id || key,
        opcode: m.opcode,
        mode: isList ? 'list' : (m.mode || 'default'),
        spriteName: m.spriteName || null,
        varName,
        visible: true,
        x: m.x,
        y: m.y,
        width: m.width,
        height: m.height,
        sliderMin: m.sliderMin !== undefined ? Number(m.sliderMin) : 0,
        sliderMax: m.sliderMax !== undefined ? Number(m.sliderMax) : 100,
        isDiscrete: m.isDiscrete !== false,
        value: readVal(isList, varName, m.spriteName || null)
      });
    }

    for (const name of shownRuntime) {
      if (hidden.has(name)) continue;
      const isList = Boolean(
        (lists && Object.prototype.hasOwnProperty.call(lists, name)) ||
        (localLists && Object.prototype.hasOwnProperty.call(localLists, name))
      );
      const isLocal = isList
        ? Boolean(localLists && Object.prototype.hasOwnProperty.call(localLists, name))
        : Boolean(localVars && Object.prototype.hasOwnProperty.call(localVars, name));
      const spriteName = isLocal ? actorName : null;
      const opcode = isList ? 'data_listcontents' : 'data_variable';
      const key = `${spriteName || '__global__'}::${opcode}::${name}`;
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);
      specs.push({
        id: key,
        opcode,
        mode: isList ? 'list' : 'default',
        spriteName,
        varName: name,
        visible: true,
        x: null,
        y: null,
        sliderMin: 0,
        sliderMax: 100,
        isDiscrete: true,
        value: readVal(isList, name, spriteName)
      });
    }

    const laid = StagePreview.layoutMonitors(specs);
    const activeIds = new Set(laid.map((m) => m.id));
    for (const [id, entry] of Array.from(stageMonitorDomCache.entries())) {
      if (!activeIds.has(id)) {
        if (entry.root && entry.root.parentNode) entry.root.parentNode.removeChild(entry.root);
        stageMonitorDomCache.delete(id);
      }
    }

    for (const m of laid) {
      let entry = stageMonitorDomCache.get(m.id);
      const label = m.spriteName ? `${m.spriteName}: ${m.varName}` : m.varName;
      if (!entry || entry.mode !== m.mode) {
        if (entry && entry.root && entry.root.parentNode) entry.root.parentNode.removeChild(entry.root);
        const root = document.createElement('div');
        root.className = 'stage-monitor';
        if (m.mode === 'list') {
          root.classList.add('stage-monitor-list');
          const head = document.createElement('div');
          head.className = 'stage-monitor-list-head';
          const body = document.createElement('div');
          body.className = 'stage-monitor-list-body';
          const foot = document.createElement('div');
          foot.className = 'stage-monitor-list-foot';
          root.appendChild(head);
          root.appendChild(body);
          root.appendChild(foot);
          entry = { root, mode: m.mode, head, body, foot, lastSig: '' };
        } else if (m.mode === 'large') {
          root.classList.add('stage-monitor-large');
          entry = { root, mode: m.mode, valEl: root, lastSig: '' };
        } else {
          root.classList.add('stage-monitor-var');
          const row = document.createElement('div');
          row.className = 'stage-monitor-row';
          const lblEl = document.createElement('span');
          lblEl.className = 'stage-monitor-label';
          const valEl = document.createElement('span');
          valEl.className = 'stage-monitor-val';
          row.appendChild(lblEl);
          row.appendChild(valEl);
          root.appendChild(row);
          let sliderEl = null;
          if (m.mode === 'slider') {
            sliderEl = document.createElement('input');
            sliderEl.type = 'range';
            sliderEl.className = 'stage-monitor-slider';
            sliderEl.min = String(m.sliderMin);
            sliderEl.max = String(m.sliderMax);
            sliderEl.step = m.isDiscrete ? '1' : '0.01';
            sliderEl.addEventListener('input', (e) => {
              const num = Number(e.target.value);
              if (preview && typeof preview.setMonitorValue === 'function') {
                preview.setMonitorValue(m.varName, m.spriteName, num);
              }
            });
            root.appendChild(sliderEl);
          }
          entry = { root, mode: m.mode, lblEl, valEl, sliderEl, lastSig: '' };
        }
        stageMonitorsLayer.appendChild(root);
        stageMonitorDomCache.set(m.id, entry);
      }

      entry.root.style.left = `${Math.round(m.resolvedX)}px`;
      entry.root.style.top = `${Math.round(m.resolvedY)}px`;
      if (m.mode === 'list') {
        entry.root.style.width = `${Math.round(m.resolvedW)}px`;
        entry.root.style.height = `${Math.round(m.resolvedH)}px`;
        const arr = Array.isArray(m.value) ? m.value : [];
        const sig = `${label}|${arr.length}|${arr.slice(0, 500).join('\x01')}`;
        if (entry.lastSig !== sig) {
          entry.lastSig = sig;
          entry.head.textContent = label;
          entry.foot.textContent = arr.length === 0 ? i18nT('monitor_empty_list') : i18nT('monitor_length', { n: arr.length });
          entry.body.textContent = '';
          const limit = Math.min(arr.length, 500);
          for (let i = 0; i < limit; i++) {
            const r = document.createElement('div');
            r.className = 'stage-monitor-list-row';
            const idxEl = document.createElement('span');
            idxEl.className = 'stage-monitor-list-idx';
            idxEl.textContent = String(i + 1);
            const itemEl = document.createElement('span');
            itemEl.className = 'stage-monitor-list-item';
            itemEl.textContent = String(arr[i]);
            r.appendChild(idxEl);
            r.appendChild(itemEl);
            entry.body.appendChild(r);
          }
          if (arr.length > 500) {
            const more = document.createElement('div');
            more.className = 'stage-monitor-list-foot';
            more.textContent = `… (+${arr.length - 500})`;
            entry.body.appendChild(more);
          }
        }
      } else {
        const strVal = String(m.value !== undefined ? m.value : 0);
        const sig = `${label}|${strVal}`;
        if (entry.lastSig !== sig) {
          entry.lastSig = sig;
          if (entry.lblEl) entry.lblEl.textContent = label;
          if (entry.valEl) entry.valEl.textContent = strVal;
        }
        if (entry.sliderEl && document.activeElement !== entry.sliderEl) {
          const num = Number(m.value);
          if (Number.isFinite(num)) entry.sliderEl.value = String(Math.max(m.sliderMin, Math.min(m.sliderMax, num)));
        }
      }
    }
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
    const apiRe = /\b(move|turn_right|turn_left|goto|goto_random|goto_mouse|glide|glide_to|set_x|set_y|change_x|change_y|point_in_direction|point_towards|if_on_edge_bounce|set_rotation_style|switch_backdrop|switch_backdrop_and_wait|next_backdrop|switch_costume|next_costume|say|think|show|hide|set_size|change_size|go_to_layer|change_layer|set_effect|change_effect|clear_effects|costume_number|costume_name|backdrop_number|backdrop_name|play_sound|play_sound_until_done|stop_all_sounds|set_volume|change_volume|volume|set_sound_effect|change_sound_effect|clear_sound_effects|wait|wait_until|stop|create_clone|delete_this_clone|ask|answer|reset_timer|timer|broadcast|broadcast_and_wait|x_position|y_position|direction|size|key_pressed|touching|touching_color|color_is_touching_color|distance_to|attribute_of|set_drag_mode|current_time|days_since_2000|username|loudness|mouse_x|mouse_y|mouse_down|random|join|letter_of|length_of|len|contains|round_num|round|math_op|abs|sqrt|sin|cos|tan|asin|acos|atan|ln|log|exp|pow10|floor|ceil|ceiling|list_add|list_delete|list_clear|list_insert|list_replace|list_item|list_length|list_contains|list_index_of|show_variable|hide_variable|show_list|hide_list|local_list|local_list_add|local_list_delete|local_list_clear|local_list_insert|local_list_replace|local_list_item|local_list_length|local_list_contains|local_list_index_of|play_drum|rest|play_note|set_instrument|set_tempo|change_tempo|tempo|speak|set_voice|set_language|translate|language)\b/g;

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
    cursorPos.textContent = i18nT('cursor_pos', { ln, col });
  }

  let lastEditorSel = { start: 0, end: 0 };

  function captureEditorSelection() {
    if (!editor) return;
    lastEditorSel = { start: editor.selectionStart || 0, end: editor.selectionEnd || 0 };
  }

  function replaceEditorRange(text, start, end, showCompiledStatus = false) {
    if (!editor) return;
    const scrollTop = editor.scrollTop;
    const scrollLeft = editor.scrollLeft;
    const s = Math.max(0, Math.min(editor.value.length, start));
    const e = Math.max(s, Math.min(editor.value.length, end));
    if (typeof document !== 'undefined' && document.activeElement !== editor) {
      try { editor.focus({ preventScroll: true }); } catch (_) { editor.focus(); }
    }
    editor.setSelectionRange(s, e);
    const prevVal = editor.value;
    const prevSel = prevVal.slice(s, e);
    let usedExec = false;
    if (typeof document !== 'undefined' && typeof document.execCommand === 'function') {
      try {
        const ok = document.execCommand('insertText', false, text);
        usedExec = Boolean(ok) && (editor.value !== prevVal || text === prevSel);
      } catch (_) {
        usedExec = false;
      }
    }
    if (!usedExec) {
      if (typeof editor.setRangeText === 'function') {
        editor.setRangeText(text, s, e, 'end');
      } else {
        editor.value = editor.value.substring(0, s) + text + editor.value.substring(e);
        editor.selectionStart = editor.selectionEnd = s + text.length;
      }
    }
    const caret = s + text.length;
    editor.setSelectionRange(caret, caret);
    editor.scrollTop = scrollTop;
    editor.scrollLeft = scrollLeft;
    captureEditorSelection();
    if (!usedExec) {
      projectDirty = true;
      scheduleAutosave();
      updateEditorDecorations();
      updateCursorTelemetry();
      compileCurrent(showCompiledStatus);
    } else if (showCompiledStatus) {
      compileCurrent(true);
    }
  }

  // opts.smart: place a palette/doc command like a dropped block (own line, script indentation).
  // opts.kind: 'reporter' (may go inside an expression), 'command' (never inline) or undefined (guess from context).
  // Tab / Enter auto-indent call this without opts and get a plain insertion at the caret.
  function insertAtCursor(snippetText, opts) {
    if (!editor) return;
    const text = String(snippetText || '').replace(/\\n/g, '\n');
    const hasFocus = typeof document !== 'undefined' && document.activeElement === editor;
    const start = hasFocus ? (editor.selectionStart || 0) : lastEditorSel.start;
    const end = hasFocus ? (editor.selectionEnd || 0) : lastEditorSel.end;
    const plan = opts && opts.smart
      ? planChipInsert(text, start, end, opts.kind)
      : { text, start, end, caret: null };
    replaceEditorRange(plan.text, plan.start, plan.end, true);
    if (plan.caret !== null) {
      editor.setSelectionRange(plan.caret, plan.caret);
      captureEditorSelection();
      updateCursorTelemetry();
    }
  }

  // Palette chips land on their own line with the right indentation (like dropping a block into a script),
  // unless the caret is inside an expression such as goto(|) or a selection is being replaced.
  function planChipInsert(rawText, selStart, selEnd, kind) {
    const v = editor.value;
    const text = rawText.replace(/\n+$/, '');
    if (selStart !== selEnd) return { text, start: selStart, end: selEnd, caret: null };
    const multi = text.includes('\n');
    const topLevel = /^(@|def\s)/.test(text);
    const lineStart = v.lastIndexOf('\n', selStart - 1) + 1;
    let lineEnd = v.indexOf('\n', selStart);
    if (lineEnd < 0) lineEnd = v.length;
    const line = v.slice(lineStart, lineEnd);
    const before = v.slice(lineStart, selStart);
    const after = v.slice(selStart, lineEnd);
    const indentOf = (l) => (l.match(/^[ \t]*/) || [''])[0];
    const opensBlock = (l) => !l.trim().startsWith('#') && /:\s*(#.*)?$/.test(l);
    const lineIndent = indentOf(line);
    const lineIsBlank = line.trim() === '';
    const beforeBlank = before.trim() === '';

    if (kind !== 'command' && !multi && !topLevel && !beforeBlank && !before.trimStart().startsWith('#') &&
        (/[([,=+\-*/%<>]\s*$/.test(before) || /\b(and|or|not|if|elif|while|in|return)\s+$/.test(before))) {
      // Inside an expression: drop the reporter in place, replacing a plain literal argument under the caret.
      const lit = /^\s*(-?\d+(?:\.\d+)?|"[^"\n]*"|'[^'\n]*')(?=\s*[,)\]])/.exec(after);
      const litEnd = lit ? selStart + lit[0].length : selStart;
      return { text, start: selStart, end: litEnd, caret: null };
    }

    const indentBody = (indent) => text.split('\n').map((l) => (l ? indent + l : l)).join('\n');

    if (topLevel) {
      // A new script (@hat / def) goes to column 0 and must never split the current script.
      const restLines = lineEnd < v.length ? v.slice(lineEnd + 1).split('\n') : [];
      const nextCode = restLines.find((l) => l.trim() !== '');
      if (lineIsBlank && (nextCode === undefined || !/^\s/.test(nextCode))) {
        const prevLine = v.slice(0, lineStart).replace(/\n$/, '').split('\n').pop();
        const prefix = lineStart > 0 && prevLine !== undefined && prevLine.trim() !== '' ? '\n' : '';
        return { text: prefix + text, start: lineStart, end: lineEnd, caret: lineStart + prefix.length + text.length };
      }
      if (!lineIsBlank && beforeBlank && lineIndent === '' && /^@/.test(line)) {
        return { text: text + '\n\n', start: lineStart, end: lineStart, caret: lineStart + text.length };
      }
      // Otherwise add it after the end of the current script (its decorators, def line and indented body).
      let seenBody = lineIndent !== '' || lineIsBlank;
      let pos = lineEnd + 1;
      for (const l of restLines) {
        if (l.trim() !== '') {
          if (/^\s/.test(l)) seenBody = true;
          else if (seenBody) return { text: text + '\n\n', start: pos, end: pos, caret: pos + text.length };
        }
        pos += l.length + 1;
      }
      const prefix = v.length === 0 ? '' : v.endsWith('\n\n') ? '' : v.endsWith('\n') ? '\n' : '\n\n';
      return { text: prefix + text + '\n', start: v.length, end: v.length, caret: v.length + prefix.length + text.length };
    }

    if (lineIsBlank) {
      // Empty line: fill it, keeping the indentation the pupil already typed, or inheriting it from the line above.
      let indent = before;
      if (indent === '') {
        const prev = v.slice(0, lineStart).split('\n').reverse().find((l) => l.trim() !== '');
        if (prev !== undefined) indent = indentOf(prev) + (opensBlock(prev) ? '    ' : '');
      }
      const body = indentBody(indent);
      return { text: body, start: lineStart, end: lineEnd, caret: lineStart + body.length };
    }
    if (beforeBlank) {
      // Caret at the start of a non-empty line: put the chip on its own line above it.
      const body = indentBody(lineIndent);
      return { text: body + '\n', start: lineStart, end: lineStart, caret: lineStart + body.length };
    }
    // Caret after (or inside) existing code: add the chip on a new line below the current one.
    const body = indentBody(lineIndent + (opensBlock(line) ? '    ' : ''));
    return { text: '\n' + body, start: lineEnd, end: lineEnd, caret: lineEnd + 1 + body.length };
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
    if (typeof PyScratchLayout !== 'undefined' && PyScratchLayout.renderTargets) {
      PyScratchLayout.renderTargets(state.projectJson, state.assetsMap, state.activeTargetIdx, selectTarget);
      return;
    }
    targetTabs.innerHTML = '';
    state.projectJson.targets.forEach((t, idx) => {
      const btn = document.createElement('button');
      btn.className = 'tab-btn' + (idx === state.activeTargetIdx ? ' active' : '');
      btn.textContent = t.isStage ? i18nT('stage_tab', { name: t.name }) : t.name;
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
      setStatus(i18nT('err_image_type'), true);
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
      projectDirty = true;
      scheduleAutosave();
      setStatus(
        isBackdrop
          ? i18nT('added_backdrop', { name: added.name, fmt: added.dataFormat })
          : i18nT('added_costume', { name: added.name, fmt: added.dataFormat, target: target ? target.name : i18nT('fallback_sprite') })
      );
    } catch (err) {
      setStatus(i18nT('err_image_add', { msg: err && err.message ? err.message : String(err) }), true);
    }
  }

  async function handleSoundUpload(file, targetIdx) {
    if (!file || !state.projectJson) return;
    const fmt = detectAssetFormat(file, ['wav', 'mp3']);
    if (!fmt) {
      setStatus(i18nT('err_audio_type'), true);
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
      projectDirty = true;
      scheduleAutosave();
      setStatus(i18nT('added_sound', { name: added.name, fmt: added.dataFormat, target: target ? target.name : i18nT('fallback_object') }));
    } catch (err) {
      setStatus(i18nT('err_sound_add', { msg: err && err.message ? err.message : String(err) }), true);
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
          <h4>${escapeHtml(i18nT('sp_active', { name: activeTarget.name }))}</h4>
          ${
            spritesCount > 1
              ? `<button id="btn-delete-sprite" class="danger asset-upload-btn" title="${escapeHtml(i18nT('sp_delete_title'))}">${escapeHtml(i18nT('sp_delete'))}</button>`
              : ''
          }
        </div>
        <div class="sprite-rename-row">
          <input type="text" id="sprite-prop-name" value="${escapeHtml(activeTarget.name)}" aria-label="${escapeHtml(i18nT('sp_name_aria'))}" />
          <button id="btn-rename-sprite" class="asset-upload-btn">${escapeHtml(i18nT('sp_rename'))}</button>
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
            <label for="sprite-prop-size">${escapeHtml(i18nT('sp_size'))}</label>
            <input type="number" id="sprite-prop-size" value="${activeTarget.size !== undefined ? Number(activeTarget.size) : 100}" min="5" max="500" step="1" />
          </div>
          <div class="prop-field">
            <label for="sprite-prop-dir">${escapeHtml(i18nT('sp_dir'))}</label>
            <input type="number" id="sprite-prop-dir" value="${activeTarget.direction !== undefined ? Number(activeTarget.direction) : 90}" step="1" />
          </div>
          <div class="prop-field">
            <label for="sprite-prop-rot">${escapeHtml(i18nT('sp_rot'))}</label>
            <select id="sprite-prop-rot">
              <option value="all around"${rotStyle === 'all around' ? ' selected' : ''}>${escapeHtml(i18nT('rot_all'))}</option>
              <option value="left-right"${rotStyle === 'left-right' ? ' selected' : ''}>${escapeHtml(i18nT('rot_lr'))}</option>
              <option value="don't rotate"${rotStyle === "don't rotate" ? ' selected' : ''}>${escapeHtml(i18nT('rot_none'))}</option>
            </select>
          </div>
        </div>
        <div class="sprite-toggles-row">
          <label class="prop-check"><input type="checkbox" id="sprite-prop-visible"${isVisible ? ' checked' : ''} /> ${escapeHtml(i18nT('sp_visible'))}</label>
          <label class="prop-check"><input type="checkbox" id="sprite-prop-draggable"${isDraggable ? ' checked' : ''} /> ${escapeHtml(i18nT('sp_draggable'))}</label>
        </div>
        <div class="assets-subblock">
          <div class="assets-subhead">
            <span>${escapeHtml(i18nT('sp_costumes_hint'))}</span>
            <button id="btn-upload-costume" class="asset-upload-btn">${escapeHtml(i18nT('sp_upload_costume'))}</button>
          </div>
          ${
            activeCostumes
              .map(
                (c) =>
                  `<span class="badge" data-insert-code="${escapeHtml(
                    `switch_costume(${JSON.stringify(c.name)})`
                  )}">${escapeHtml(c.name)}</span>`
              )
              .join('') || `<span class="assets-hint">${escapeHtml(i18nT('none'))}</span>`
          }
        </div>
        <div class="assets-subblock">
          <div class="assets-subhead">
            <span>${escapeHtml(i18nT('sp_sounds_hint'))}</span>
            <button id="btn-upload-sound" class="asset-upload-btn">${escapeHtml(i18nT('sp_upload_sound'))}</button>
          </div>
          ${
            activeSounds
              .map(
                (snd) =>
                  `<span class="badge" data-insert-code="${escapeHtml(
                    `play_sound(${JSON.stringify(snd.name)})`
                  )}">${escapeHtml(snd.name)}</span>`
              )
              .join('') || `<span class="assets-hint">${escapeHtml(i18nT('none'))}</span>`
          }
        </div>
      </div>`);
    }

    chunks.push(`<div class="assets-section">
      <div class="assets-header">
        <h4>${escapeHtml(i18nT('backdrops_title'))}</h4>
        <button id="btn-upload-backdrop" class="asset-upload-btn">${escapeHtml(i18nT('sp_upload_backdrop'))}</button>
      </div>
      ${
        assets.backdrops
          .map(
            (b) =>
              `<span class="badge" data-insert-code="${escapeHtml(
                `switch_backdrop(${JSON.stringify(b.name)})`
              )}">${escapeHtml(b.name)}</span>`
          )
          .join('') || `<span class="assets-hint">${escapeHtml(i18nT('none'))}</span>`
      }
      ${
        activeTarget && activeTarget.isStage
          ? `<div class="assets-subblock">
              <div class="assets-subhead">
                <span>${escapeHtml(i18nT('stage_sounds_hint'))}</span>
                <button id="btn-upload-sound" class="asset-upload-btn">${escapeHtml(i18nT('sp_upload_sound'))}</button>
              </div>
              ${
                (assets.stageSounds || [])
                  .map(
                    (snd) =>
                      `<span class="badge" data-insert-code="${escapeHtml(
                        `play_sound(${JSON.stringify(snd)})`
                      )}">${escapeHtml(snd)}</span>`
                  )
                  .join('') || `<span class="assets-hint">${escapeHtml(i18nT('none'))}</span>`
              }
            </div>
            <p class="assets-hint" style="margin-top:8px;">${escapeHtml(i18nT('stage_hint'))}</p>`
          : ''
      }
    </div>`);

    for (const s of assets.sprites) {
      if (s.targetIdx === state.activeTargetIdx) continue;
      chunks.push(`<div class="assets-section">
        <div class="assets-header">
          <h4>${escapeHtml(i18nT('sp_label', { name: s.name, x: s.x, y: s.y }))}</h4>
          <button class="asset-upload-btn" data-select-target="${s.targetIdx}">${escapeHtml(i18nT('sp_select'))}</button>
        </div>
        <div style="margin-bottom:6px; color:var(--wp-muted);">${escapeHtml(i18nT('sp_costumes_hint'))}</div>
        ${
          s.costumes
            .map(
              (c) =>
                `<span class="badge" data-insert-code="${escapeHtml(
                  `switch_costume(${JSON.stringify(c.name)})`
                )}">${escapeHtml(c.name)}</span>`
            )
            .join('') || `<span class="assets-hint">${escapeHtml(i18nT('none'))}</span>`
        }
        ${
          s.sounds && s.sounds.length > 0
            ? `<div style="margin:8px 0 6px; color:var(--wp-muted);">${escapeHtml(i18nT('sp_sounds_hint'))}</div>` +
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
      `<p class="assets-hint">${i18nT('assets_tip')}</p>`
    );

    viewAssets.innerHTML = chunks.join('');

    viewAssets.querySelectorAll('[data-insert-code]').forEach((el) => {
      el.onclick = () => insertAtCursor(el.getAttribute('data-insert-code'), { smart: true });
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
        projectDirty = true;
        scheduleAutosave();
        setStatus(i18nT('rename_ok', { name: updated.name }));
      } catch (err) {
        setStatus(err && err.message ? err.message : i18nT('rename_fail'), true);
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
        if (typeof confirm === 'function' && !confirm(i18nT('confirm_delete_sprite', { name: activeTarget.name }))) {
          return;
        }
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
          projectDirty = true;
          scheduleAutosave();
          setStatus(i18nT('delete_ok', { name: removed.name }));
        } catch (err) {
          setStatus(err && err.message ? err.message : i18nT('delete_fail'), true);
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
        projectDirty = true;
        scheduleAutosave();
        setStatus(i18nT('props_ok', { name: updated.name }));
      } catch (err) {
        setStatus(err && err.message ? err.message : i18nT('props_fail'), true);
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
        if (scale !== 1) {
          // Keep rotation centers and apparent size consistent with the downscaled bitmap.
          for (const tgt of state.projectJson.targets || []) {
            for (const c of tgt.costumes || []) {
              if (c.md5ext !== replaced.newMd5ext) continue;
              c.rotationCenterX = (Number(c.rotationCenterX) || 0) * (w / img.width);
              c.rotationCenterY = (Number(c.rotationCenterY) || 0) * (h / img.height);
              c.bitmapResolution = Math.max(1, (Number(c.bitmapResolution) || 1) * scale);
            }
          }
        }
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
    const docLang = typeof PyScratchI18n !== 'undefined' && PyScratchI18n.getLang ? PyScratchI18n.getLang() : 'uk';
    for (const [cat, rawCmd, desc] of API_DOCS) {
      const cmd = localizeSnippetText(rawCmd, docLang);
      html += `<tr><td>${escapeHtml(i18nT(cat))}</td><td><code data-doc-insert='${escapeHtml(cmd)}'>${escapeHtml(
        cmd
      )}</code></td><td>${escapeHtml(i18nT(desc))}</td></tr>`;
    }
    html += `</tbody></table></div>`;
    viewDocs.innerHTML = html;
    viewDocs.querySelectorAll('[data-doc-insert]').forEach((el) => {
      el.onclick = () => {
        const raw = el.getAttribute('data-doc-insert').split(' / ')[0];
        insertAtCursor(raw, { smart: true });
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
        `<p style="color: var(--wp-muted); font-size: 12px;">${escapeHtml(i18nT('blocks_empty'))}</p>`;
      return;
    }

    function createBlockRow(id, isHat = false) {
      const info = PyScratchDecompiler.formatBlock(id, blocks);
      const el = document.createElement('div');
      el.className = isHat ? 'scratch-hat' : `scratch-block ${info.category}`;
      const lineBadge = info.line ? i18nT('line_badge', { line: info.line, opcode: info.opcode }) : info.opcode;
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
          elseLbl.innerHTML = `<span>${escapeHtml(i18nT('else_lbl'))}</span>`;
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
          i18nT('compiled', { name: target.name, count, pen: res.usesPen ? i18nT('compiled_pen') : '' }),
          false
        );
      } else if (state.errorLine !== null) {
        setStatus(i18nT('syntax_ok'), false);
      }
      return res;
    } catch (err) {
      setStatus(err.message || i18nT('compile_err'), true, err.line || null);
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

  // Max length of the base64url payload in ?code= (keeps share links within URL limits).
  const MAX_SHARE_CODE_LEN = 6000;

  function decodeBase64Url(b64url) {
    if (typeof atob !== 'function') {
      throw new Error(i18nT('atob_missing'));
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

  const embedParam = urlParams ? urlParams.get('embed') : null;
  // ?embed=stage: only the stage and its run/stop buttons (blog cards on sivochka.com show the code next to it).
  const isStageEmbed = embedParam === 'stage';
  const isEmbedMode = embedParam === '1' || embedParam === 'true' || isStageEmbed;
  if (isEmbedMode && document.body) {
    document.body.classList.add('embed-mode');
    if (isStageEmbed) document.body.classList.add('embed-stage');
  }
  // The parent page sizes the iframe to the stage: report the height of the visible layout when it changes.
  if (isStageEmbed && window.parent !== window && typeof ResizeObserver !== 'undefined') {
    const guiEl = document.querySelector('.gui');
    if (guiEl) {
      const reportHeight = () => {
        try {
          window.parent.postMessage({ type: 'pyscratch:height', height: Math.ceil(guiEl.getBoundingClientRect().height) }, '*');
        } catch (_) { /* parent gone */ }
      };
      new ResizeObserver(reportHeight).observe(guiEl);
    }
  }

  const AUTOSAVE_KEY = 'pyscratch_autosave_v1';
  const AUTOSAVE_DEBOUNCE_MS = 500;
  let autosaveTimer = null;
  let autosaveQuotaWarned = false;
  // Promise of the latest IndexedDB snapshot write (resolves true/false), so a page change can wait for it.
  let autosaveIdbPending = Promise.resolve(true);

  function saveAutosaveNow() {
    if (isEmbedMode || !state.projectJson) return false;
    if (editor) state.codeByTarget.set(state.activeTargetIdx, editor.value);
    let payload;
    try {
      payload = {
        v: 1,
        savedAt: Date.now(),
        activeTargetIdx: state.activeTargetIdx,
        targets: state.projectJson.targets.map((t, idx) => ({
          name: t.name,
          isStage: !!t.isStage,
          code: state.codeByTarget.get(idx) || ''
        }))
      };
    } catch (_) {
      return false;
    }
    // IndexedDB first and independently: it must still work where localStorage is blocked or full.
    autosaveIdbPending = idbSaveProjectSnapshot(payload);
    try {
      if (typeof localStorage === 'undefined') return false;
      localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(payload));
      return true;
    } catch (_) {
      if (!autosaveQuotaWarned) {
        autosaveQuotaWarned = true;
        setStatus(i18nT('autosave_quota'), true);
      }
      return false;
    }
  }

  function scheduleAutosave() {
    if (isEmbedMode) return;
    if (autosaveTimer !== null) clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(() => {
      autosaveTimer = null;
      saveAutosaveNow();
    }, AUTOSAVE_DEBOUNCE_MS);
  }

  function flushAutosave() {
    if (autosaveTimer !== null) {
      clearTimeout(autosaveTimer);
      autosaveTimer = null;
      saveAutosaveNow();
    } else if (projectDirty) {
      saveAutosaveNow();
    }
  }

  function clearAutosave() {
    if (autosaveTimer !== null) {
      clearTimeout(autosaveTimer);
      autosaveTimer = null;
    }
    idbClearProjectSnapshot();
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.removeItem(AUTOSAVE_KEY);
    } catch (_) {}
  }

  // Full project snapshot (project.json + costumes/sounds) in IndexedDB, so a reload keeps sprite positions,
  // uploaded assets and opened .sb3 files, not only the code. localStorage above stays the synchronous fallback.
  const AUTOSAVE_DB_NAME = 'pyscratch_autosave';
  const AUTOSAVE_DB_STORE = 'kv';
  let autosaveDbPromise = null;
  let autosaveAssetsSig = null;
  let autosaveGen = 0;

  function openAutosaveDb() {
    if (autosaveDbPromise) return autosaveDbPromise;
    autosaveDbPromise = new Promise((resolve) => {
      try {
        if (typeof indexedDB === 'undefined' || !indexedDB) return resolve(null);
        const req = indexedDB.open(AUTOSAVE_DB_NAME, 1);
        req.onupgradeneeded = () => {
          try { req.result.createObjectStore(AUTOSAVE_DB_STORE); } catch (_) {}
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
        req.onblocked = () => resolve(null);
      } catch (_) {
        resolve(null);
      }
    });
    return autosaveDbPromise;
  }

  function idbRun(mode, fn) {
    return openAutosaveDb().then(
      (db) =>
        new Promise((resolve) => {
          if (!db) return resolve(null);
          try {
            const tx = db.transaction(AUTOSAVE_DB_STORE, mode);
            const store = tx.objectStore(AUTOSAVE_DB_STORE);
            const out = fn(store);
            tx.oncomplete = () => resolve(out && 'result' in out ? out.result : true);
            tx.onerror = () => resolve(null);
            tx.onabort = () => resolve(null);
          } catch (_) {
            resolve(null);
          }
        })
    );
  }

  function idbSaveProjectSnapshot(payload) {
    if (isEmbedMode || !state.projectJson || !state.assetsMap) return Promise.resolve(false);
    let projectStr;
    try {
      projectStr = JSON.stringify(state.projectJson);
    } catch (_) {
      return Promise.resolve(false);
    }
    const assetsMap = state.assetsMap;
    const sig = Array.from(assetsMap.keys()).sort().join('|');
    const writeAssets = sig !== autosaveAssetsSig;
    const gen = autosaveGen;
    return idbRun('readwrite', (store) => {
      store.put({ v: 1, savedAt: payload.savedAt, project: projectStr, draft: payload }, 'project');
      if (writeAssets) store.put(new Map(assetsMap), 'assets');
    }).then((ok) => {
      if (ok && writeAssets && gen === autosaveGen) autosaveAssetsSig = sig;
      return !!ok;
    });
  }

  function idbClearProjectSnapshot() {
    autosaveGen++;
    autosaveAssetsSig = null;
    idbRun('readwrite', (store) => {
      store.delete('project');
      store.delete('assets');
    });
  }

  function idbLoadProjectSnapshot() {
    if (isEmbedMode) return Promise.resolve(null);
    let projectReq = null;
    let assetsReq = null;
    return idbRun('readonly', (store) => {
      projectReq = store.get('project');
      assetsReq = store.get('assets');
    }).then((ok) => {
      if (!ok || !projectReq || !assetsReq) return null;
      const rec = projectReq.result;
      const assets = assetsReq.result;
      if (!rec || rec.v !== 1 || typeof rec.project !== 'string' || !(assets instanceof Map)) return null;
      try {
        const projectJson = JSON.parse(rec.project);
        if (!projectJson || !Array.isArray(projectJson.targets) || projectJson.targets.length === 0) return null;
        return { savedAt: rec.savedAt, projectJson, assetsMap: assets, draft: rec.draft || null };
      } catch (_) {
        return null;
      }
    });
  }

  function loadAutosaveDraft() {
    if (isEmbedMode || typeof localStorage === 'undefined') return null;
    try {
      const raw = localStorage.getItem(AUTOSAVE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.v !== 1 || !Array.isArray(parsed.targets) || parsed.targets.length === 0) return null;
      return parsed;
    } catch (_) {
      return null;
    }
  }

  let startupCode = getSnippet('hexagon');
  let codeDecodeError = null;
  let loadedFromCodeParam = false;
  let hasExplicitUrlProject = false;

  if (urlParams) {
    const snippetParam = urlParams.get('snippet');
    if (snippetParam && Object.prototype.hasOwnProperty.call(SNIPPETS, snippetParam)) {
      startupCode = getSnippet(snippetParam);
      hasExplicitUrlProject = true;
    }
    const codeParam = urlParams.get('code');
    if (codeParam !== null && codeParam !== '') {
      hasExplicitUrlProject = true;
      try {
        if (codeParam.length > MAX_SHARE_CODE_LEN) throw new Error('code param too long');
        startupCode = decodeBase64Url(codeParam);
        loadedFromCodeParam = true;
      } catch (_) {
        codeDecodeError = i18nT('code_decode_fail');
      }
    }
  }

  // Apply initial DOM translations before loading project so startup errors/statuses are preserved
  if (typeof PyScratchI18n !== 'undefined') {
    PyScratchI18n.applyDomTranslations();
  }

  // Initialize default project
  const def = Sb3Bridge.createDefaultProject();
  let restoredFromAutosave = false;
  const savedDraft = !isEmbedMode && !hasExplicitUrlProject ? loadAutosaveDraft() : null;
  if (savedDraft) {
    const draftSprites = savedDraft.targets.filter((t) => t && !t.isStage && typeof t.code === 'string');
    const firstDraftSprite = draftSprites[0];
    if (firstDraftSprite && firstDraftSprite.name && def.projectJson.targets[1]) {
      def.projectJson.targets[1].name = String(firstDraftSprite.name);
    }
    for (let i = 1; i < draftSprites.length; i++) {
      Sb3Bridge.addSpriteToProject(def.projectJson, def.assetsMap, draftSprites[i].name || undefined);
    }
    loadProject(def.projectJson, def.assetsMap, firstDraftSprite ? firstDraftSprite.code : startupCode);
    const stageEntry = savedDraft.targets.find((t) => t && t.isStage && typeof t.code === 'string');
    if (stageEntry) state.codeByTarget.set(0, stageEntry.code);
    for (let i = 1; i < draftSprites.length; i++) {
      const targetIdx = i + 1;
      if (state.projectJson.targets[targetIdx]) {
        state.codeByTarget.set(targetIdx, draftSprites[i].code);
      }
    }
    if (Number.isInteger(savedDraft.activeTargetIdx) && state.projectJson.targets[savedDraft.activeTargetIdx]) {
      selectTarget(savedDraft.activeTargetIdx);
    }
    restoredFromAutosave = true;
  } else {
    loadProject(def.projectJson, def.assetsMap, startupCode);
  }

  if (codeDecodeError) {
    setStatus(codeDecodeError, true);
  } else if (loadedFromCodeParam && state.errorLine === null) {
    setStatus(i18nT('code_loaded'));
  } else if (restoredFromAutosave && state.errorLine === null) {
    setStatus(i18nT('autosave_restored'));
  }

  // Upgrade the code-only restore above to the full project snapshot (assets, positions, opened .sb3) once IndexedDB answers.
  if (!isEmbedMode && !hasExplicitUrlProject) {
    const editorAtStartup = editor ? editor.value : '';
    idbLoadProjectSnapshot().then((snap) => {
      if (!snap) return;
      // The pupil already started typing or loaded something else: never overwrite live work.
      if (projectDirty || (editor && editor.value !== editorAtStartup)) return;
      const names = snap.projectJson.targets.map((t) => t.name).join('\u0001');
      const matches = (d) =>
        d && Array.isArray(d.targets) && d.targets.map((t) => t && t.name).join('\u0001') === names;
      // A newer localStorage draft for a different sprite set means the snapshot is stale (e.g. the tab closed before
      // IndexedDB finished): keep the code-only restore rather than bring back an older project.
      if (savedDraft && !matches(savedDraft) && (savedDraft.savedAt || 0) > (snap.savedAt || 0)) return;
      const drafts = [savedDraft, snap.draft].filter(matches).sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
      const draft = drafts[0] || null;
      try {
        loadProject(snap.projectJson, snap.assetsMap);
        if (draft) {
          draft.targets.forEach((t, idx) => {
            if (typeof t.code === 'string' && state.projectJson.targets[idx]) state.codeByTarget.set(idx, t.code);
          });
          if (editor) editor.value = state.codeByTarget.get(state.activeTargetIdx) || '';
          const wanted = Number.isInteger(draft.activeTargetIdx) && state.projectJson.targets[draft.activeTargetIdx]
            ? draft.activeTargetIdx
            : state.activeTargetIdx;
          selectTarget(wanted);
          compileCurrent(true);
        }
        projectDirty = false;
        if (state.errorLine === null) setStatus(i18nT('autosave_restored'));
      } catch (_) {
        // Keep the code-only restore if the snapshot is unusable.
      }
    });
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', flushAutosave);
    window.addEventListener('beforeunload', (e) => {
      flushAutosave();
      if (projectDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    });
  }

  // Editable sprite telemetry inputs (X, Y, Size, Direction) under Stage
  function normalizeTeleProp(prop, rawVal) {
    const num = Number(rawVal);
    if (!Number.isFinite(num)) return null;
    if (prop === 'size') return Math.max(5, Math.min(500, Math.round(num)));
    return Math.round(num);
  }

  function getTargetPropValue(target, prop) {
    if (!target) return 0;
    if (prop === 'size') return target.size !== undefined ? Number(target.size) : 100;
    if (prop === 'direction') return target.direction !== undefined ? Number(target.direction) : 90;
    return Number(target[prop]) || 0;
  }

  function commitTeleProp(el) {
    if (!el || el.disabled || !state.projectJson) return;
    const prop = el.getAttribute('data-prop');
    const activeTarget = state.projectJson.targets[state.activeTargetIdx];
    if (!prop || !activeTarget || activeTarget.isStage) return;
    // Only a real edit commits: focusing and leaving the field must not freeze the live runtime position into the project.
    if (el.dataset.focusValue !== undefined && el.value === el.dataset.focusValue) return;
    const val = normalizeTeleProp(prop, el.value);
    if (val === null) {
      el.value = String(Math.round(getTargetPropValue(activeTarget, prop)));
      return;
    }
    try {
      const updated = Sb3Bridge.updateSpriteProps(state.projectJson, state.activeTargetIdx, { [prop]: val });
      el.value = String(Math.round(getTargetPropValue(updated, prop)));
      const assetPropId = prop === 'direction' ? 'sprite-prop-dir' : `sprite-prop-${prop}`;
      const assetInput = document.getElementById(assetPropId);
      if (assetInput) assetInput.value = el.value;
      syncActorPropsInPreview(updated);
      el.dataset.focusValue = el.value;
      projectDirty = true;
      scheduleAutosave();
    } catch (_) {
      el.value = String(Math.round(getTargetPropValue(activeTarget, prop)));
    }
  }

  [teleX, teleY, teleSize, teleDir].forEach((el) => {
    if (!el || el.tagName !== 'INPUT') return;
    el.addEventListener('focus', () => {
      el.dataset.focusValue = el.value;
      try { el.select(); } catch (_) {}
    });
    el.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        e.preventDefault();
        commitTeleProp(el);
        el.blur();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        const activeTarget = state.projectJson && state.projectJson.targets[state.activeTargetIdx];
        const prop = el.getAttribute('data-prop');
        if (activeTarget && prop) el.value = String(Math.round(getTargetPropValue(activeTarget, prop)));
        el.blur();
      }
    });
    el.addEventListener('change', () => commitTeleProp(el));
    el.addEventListener('blur', () => {
      commitTeleProp(el);
      delete el.dataset.focusValue;
    });
  });

  // Editor events
  if (editor) {
    editor.addEventListener('input', () => {
      projectDirty = true;
      scheduleAutosave();
      captureEditorSelection();
      state.highlightedLine = null;
      updateEditorDecorations();
      updateCursorTelemetry();
      compileCurrent(false);
    });

    const onCursorMove = () => {
      captureEditorSelection();
      updateCursorTelemetry();
    };
    editor.addEventListener('click', onCursorMove);
    editor.addEventListener('keyup', onCursorMove);
    editor.addEventListener('mouseup', onCursorMove);
    editor.addEventListener('blur', captureEditorSelection);

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
    const kind = chip.classList.contains('reporter') || chip.classList.contains('boolean') ? 'reporter' : 'command';
    chip.onclick = () => insertAtCursor(chip.getAttribute('data-insert'), { smart: true, kind });
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
        editor.value = getSnippet(key);
        projectDirty = true;
        scheduleAutosave();
        state.highlightedLine = null;
        updateEditorDecorations();
        compileCurrent(true);
        const runBtn = document.getElementById('btn-run');
        if (runBtn) runBtn.click();
      }
    };
  });

  // Editor tabs (Код / Образи / Звуки / Блоки / Інспектор / Довідник) are switched by js/layout.js;
  // it announces the active tab so lazily rendered views can refresh.
  document.addEventListener('pyscratch:tab', (e) => {
    const tab = e && e.detail ? e.detail.tab : '';
    if (tab === 'inspector') renderInspectorView();
  });

  // Language switcher (UA | EN | RU)
  document.querySelectorAll('.lang-btn[data-lang]').forEach((btn) => {
    btn.onclick = () => {
      if (typeof PyScratchI18n === 'undefined') return;
      const targetLang = btn.getAttribute('data-lang');
      const canNavigate = typeof PyScratchI18n.navigateToLang === 'function';
      const go = (draftSaved) => {
        if (draftSaved) {
          // The draft is saved in this browser, so the page in the other language reopens the same project.
          // Drop ?code= / ?snippet= from the URL, otherwise they would win over the draft there.
          projectDirty = false;
          try {
            const url = new URL(window.location.href);
            url.searchParams.delete('code');
            url.searchParams.delete('snippet');
            window.history.replaceState(null, '', url.pathname + url.search + url.hash);
          } catch (_) {}
        }
        if (canNavigate && PyScratchI18n.navigateToLang(targetLang)) return true;
        // Same-page switch: nothing was left behind, the project stays as unsaved as it was.
        if (draftSaved) projectDirty = true;
        return false;
      };
      if (projectDirty) {
        if (saveAutosaveNow()) {
          // Wait (briefly) for the IndexedDB snapshot with costumes and sounds before leaving the page,
          // otherwise the navigation can abort the write and only the code would come back.
          const timeout = new Promise((resolve) => setTimeout(() => resolve(null), 1500));
          Promise.race([autosaveIdbPending, timeout]).then(() => {
            if (!go(true)) finishSameLang();
          });
          return;
        }
        if (typeof confirm === 'function' && !confirm(i18nT('lang_switch_unsaved'))) return;
      }
      if (!go(false)) finishSameLang();
    };
    const finishSameLang = () => {
      const targetLang = btn.getAttribute('data-lang');
      PyScratchI18n.setLang(targetLang);
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
      const starterCode = i18nT('starter_sprite_code', { name: newSprite.name, x: newSprite.x });
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
      projectDirty = true;
      scheduleAutosave();
    };
  }

  // Run, Stop, Mute
  const btnRun = document.getElementById('btn-run');
  if (btnRun) {
    btnRun.onclick = () => {
      const astByTargetIdx = compileAllTargets();
      if (!astByTargetIdx) return;
      if (preview) preview.runProject(astByTargetIdx, state.projectJson, state.assetsMap);
      setStatus(i18nT('sim_started'));
    };
  }

  const btnStop = document.getElementById('btn-stop');
  if (btnStop) {
    btnStop.onclick = () => {
      if (preview) preview.reset();
      setStatus(i18nT('sim_stopped'));
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
      setStatus(i18nT('only_sb3'), true);
      return;
    }
    try {
      const buf = await file.arrayBuffer();
      const { projectJson, assetsMap } = await Sb3Bridge.loadSb3(buf);
      loadProject(projectJson, assetsMap);
      clearAutosave();
      projectDirty = false;
      // Snapshot the freshly opened file right away so a reload brings it back instead of the default template.
      saveAutosaveNow();
      setStatus(i18nT('loaded_file', { name: file.name, count: projectJson.targets.length }));
    } catch (err) {
      setStatus(i18nT('err_open', { msg: err && err.message ? err.message : String(err) }), true);
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
      if (projectDirty && typeof confirm === 'function' && !confirm(i18nT('confirm_reset_template'))) {
        return;
      }
      clearAutosave();
      projectDirty = false;
      const d = Sb3Bridge.createDefaultProject();
      loadProject(d.projectJson, d.assetsMap, getSnippet('hexagon'));
      setStatus(i18nT('template_reset'));
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
        projectDirty = false;
        flushAutosave();
        setStatus(i18nT('saved_sb3'));
      } catch (err) {
        setStatus(i18nT('err_save', { msg: err && err.message ? err.message : String(err) }), true);
      }
    };
  }

  const btnShare = document.getElementById('btn-share');
  if (btnShare) {
    btnShare.onclick = async () => {
      try {
        const code = editor ? editor.value : '';
        const encoded = encodeBase64Url(code);
        if (encoded.length > MAX_SHARE_CODE_LEN) {
          setStatus(i18nT('share_too_long', { max: MAX_SHARE_CODE_LEN }), true);
          return;
        }
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
          setStatus(i18nT('share_copied'));
        } else {
          setStatus(i18nT('share_updated'));
        }
      } catch (err) {
        setStatus(i18nT('err_share', { msg: err && err.message ? err.message : String(err) }), true);
      }
    };
  }

  if (urlParams && (urlParams.get('autorun') === '1' || urlParams.get('autorun') === 'true') && !codeDecodeError) {
    if (btnRun) btnRun.click();
  }
})();
