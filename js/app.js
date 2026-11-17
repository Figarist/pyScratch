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
`
  };

  const API_DOCS = [
    ['Події', '@when_flag_clicked', 'Старт при натисканні зеленого прапорця'],
    ['Події', '@when_key_pressed("space")', 'Реакція на клавішу (space, up arrow, a..z)'],
    ['Події', '@when_this_sprite_clicked', 'Клік мишкою по спрайту'],
    ['Події', '@when_backdrop_switches("level_2")', 'Коли змінюється фон сцени'],
    ['Події', '@when_message_received("msg")', 'Отримання повідомлення broadcast("msg")'],
    ['Події', '@when_cloned', 'Скрипт для новоствореного клону'],
    ['Функції', 'def my_block(x, y):', 'Створює рожевий «Мій блок» у Scratch'],
    ['Рух', 'move(80) / turn_right(90) / turn_left(90)', 'Кроки вперед та повороти у градусах'],
    ['Рух', 'goto(x, y) / glide(sec, x, y)', 'Миттєвий перехід або плавне ковзання'],
    ['Рух', 'goto_random() / goto_mouse()', 'Перехід у випадкове місце або до курсора'],
    ['Рух', 'point_in_direction(90) / point_towards("mouse")', 'Напрямок руху або поворот до цілі'],
    ['Рух', 'set_x(0), change_x(10), set_y(0), change_y(10)', 'Зміна координат X та Y'],
    ['Рух', 'if_on_edge_bounce()', 'Відбивання від краю сцени'],
    ['Вигляд', 'say("Текст", 2) / think("Думка", 2)', 'Мовна або думкова бульбашка'],
    ['Вигляд', 'switch_costume("costume1") / next_costume()', 'Зміна костюма спрайта'],
    ['Вигляд', 'switch_backdrop("space_bg") / next_backdrop()', 'Зміна фону сцени'],
    ['Вигляд', 'set_size(100) / change_size(10) / show() / hide()', 'Масштаб та видимість'],
    ['Вигляд', 'set_effect("color", 25) / clear_effects()', 'Графічні ефекти'],
    ['Олівець', 'pen_down() / pen_up() / pen_clear() / pen_stamp()', 'Малювання ліній та штампування'],
    ['Олівець', 'set_pen_color("#00ffcc") / set_pen_size(3)', 'Колір (#hex) і товщина олівця'],
    ['Звук', 'play_sound("pop") / play_sound_until_done("laser")', 'Відтворення звуків зі списку асетів'],
    ['Керування', 'for i in range(6): / while True: / while not cond:', 'Цикли repeat, forever, repeat until'],
    ['Керування', 'if cond: / elif cond2: / else:', 'Умовні розгалуження (підтримує ==, !=, <=, >=)'],
    ['Керування', 'wait(0.5) / wait_until(cond) / stop("all")', 'Затримки та зупинка'],
    ['Керування', 'create_clone("myself") / delete_this_clone()', 'Клонування спрайтів'],
    ['Датчики', 'ask("Питання") / answer()', 'Інтерактивне опитування гравця'],
    ['Датчики', 'key_pressed("space") / touching("edge")', 'Перевірка клавіш та зіткнень'],
    ['Датчики', 'mouse_x(), mouse_y(), mouse_down(), timer()', 'Координати миші та таймер'],
    ['Списки', 'list_add("bag", "ключ"), list_item("bag", 1)', 'Робота зі списками Scratch']
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
  const viewDocs = document.getElementById('view-docs');
  const viewPreview = document.getElementById('view-preview');
  const backdropIndicator = document.getElementById('backdrop-indicator');
  const varsWatch = document.getElementById('vars-watch');
  const askOverlay = document.getElementById('ask-overlay');
  const askInput = document.getElementById('ask-input');
  const askSubmit = document.getElementById('ask-submit');

  const teleX = document.getElementById('tele-x');
  const teleY = document.getElementById('tele-y');
  const teleDir = document.getElementById('tele-dir');
  const teleSize = document.getElementById('tele-size');
  const teleMouse = document.getElementById('tele-mouse');
  const teleTimer = document.getElementById('tele-timer');

  let currentAskCallback = null;

  const preview = new StagePreview(document.getElementById('stage-canvas'), {
    onBackdropChange: (bg) => {
      backdropIndicator.textContent = `Тло: ${bg}`;
    },
    onTelemetry: (t) => {
      if (teleX) teleX.textContent = t.x;
      if (teleY) teleY.textContent = t.y;
      if (teleDir) teleDir.textContent = `${t.direction}°`;
      if (teleSize) teleSize.textContent = `${t.size}%`;
      if (teleMouse) teleMouse.textContent = `${t.mouseX}, ${t.mouseY}`;
      if (teleTimer) teleTimer.textContent = `${t.timer}s`;
      renderVarsWatch(t.vars, t.lists);
    },
    onAsk: (question, submitFn) => {
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
  });

  function submitAskAnswer() {
    if (!currentAskCallback) return;
    const val = askInput.value;
    const cb = currentAskCallback;
    currentAskCallback = null;
    askOverlay.classList.add('hidden');
    cb(val);
  }

  askSubmit.onclick = submitAskAnswer;
  askInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitAskAnswer();
    }
  });

  function renderVarsWatch(vars, lists) {
    if (!varsWatch) return;
    const varEntries = Object.entries(vars || {});
    const listEntries = Object.entries(lists || {});
    if (varEntries.length === 0 && listEntries.length === 0) {
      varsWatch.innerHTML =
        '<span style="color: var(--wp-dim); font-size: 11px;">Змінні та списки з\'являться тут під час виконання.</span>';
      return;
    }
    const pills = [];
    for (const [k, v] of varEntries) {
      pills.push(`<span class="var-pill">${escapeHtml(k)} = <b>${escapeHtml(String(v))}</b></span>`);
    }
    for (const [k, arr] of listEntries) {
      pills.push(
        `<span class="var-pill" style="border-color:#eab308;">${escapeHtml(k)} [${arr.length}]: ${escapeHtml(
          arr.slice(0, 5).join(', ')
        )}</span>`
      );
    }
    varsWatch.innerHTML = pills.join('');
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function highlightPython(code) {
    const lines = String(code).split('\n');
    const kwRe = /\b(def|for|in|while|if|elif|else|pass|and|or|not|True|False|range)\b/g;
    const penRe = /\b(pen_clear|pen_stamp|pen_down|pen_up|set_pen_color|set_pen_param|change_pen_param|set_pen_size|change_pen_size)\b/g;
    const apiRe = /\b(move|turn_right|turn_left|goto|goto_random|goto_mouse|glide|set_x|set_y|change_x|change_y|point_in_direction|point_towards|if_on_edge_bounce|set_rotation_style|switch_backdrop|next_backdrop|switch_costume|next_costume|say|think|show|hide|set_size|change_size|set_effect|change_effect|clear_effects|play_sound|play_sound_until_done|stop_all_sounds|set_volume|change_volume|wait|wait_until|stop|create_clone|delete_this_clone|ask|answer|reset_timer|timer|broadcast|broadcast_and_wait|x_position|y_position|direction|size|key_pressed|touching|distance_to|mouse_x|mouse_y|mouse_down|random|join|letter_of|length_of|contains|round_num|math_op|abs|sqrt|sin|cos|floor|ceil|list_add|list_delete|list_clear|list_insert|list_replace|list_item|list_length|list_contains)\b/g;

    return lines
      .map((line) => {
        const commentIdx = (() => {
          let inQ = null;
          for (let i = 0; i < line.length; i++) {
            const c = line[i];
            if ((c === '"' || c === "'") && line[i - 1] !== '\\') {
              if (!inQ) inQ = c;
              else if (inQ === c) inQ = null;
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
          html = html.replace(`___STR${i}___`, rep);
        });

        if (commentPart) {
          html += `<span class="tok-com">${escapeHtml(commentPart)}</span>`;
        }
        return html;
      })
      .join('\n') + '\n';
  }

  function setStatus(msg, isError = false, errLine = null) {
    statusText.textContent = msg;
    statusBanner.className = 'status-banner ' + (isError ? 'error' : 'ok');
    state.errorLine = isError ? errLine : null;
    updateEditorDecorations();
  }

  function updateEditorDecorations() {
    const code = editor.value;
    if (codeHighlight) {
      codeHighlight.innerHTML = highlightPython(code);
    }
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

  function updateCursorTelemetry() {
    if (!cursorPos) return;
    const pos = editor.selectionStart || 0;
    const upToCursor = editor.value.slice(0, pos).split('\n');
    const ln = upToCursor.length;
    const col = upToCursor[upToCursor.length - 1].length + 1;
    cursorPos.textContent = `Ряд ${ln}, Стовп ${col}`;
  }

  function insertAtCursor(snippetText) {
    const text = snippetText.replace(/\\n/g, '\n');
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    editor.value = editor.value.substring(0, start) + text + editor.value.substring(end);
    editor.selectionStart = editor.selectionEnd = start + text.length;
    editor.focus();
    updateEditorDecorations();
    compileCurrent(true);
  }

  function renderTargetTabs() {
    targetTabs.innerHTML = '';
    state.projectJson.targets.forEach((t, idx) => {
      const btn = document.createElement('button');
      btn.className = 'tab-btn' + (idx === state.activeTargetIdx ? ' active' : '');
      btn.textContent = t.isStage ? `Сцена (${t.name})` : t.name;
      btn.onclick = () => {
        state.codeByTarget.set(state.activeTargetIdx, editor.value);
        state.activeTargetIdx = idx;
        editor.value = state.codeByTarget.get(idx) || '';
        state.highlightedLine = null;
        updateEditorDecorations();
        renderTargetTabs();
        compileCurrent(false);
      };
      targetTabs.appendChild(btn);
    });
  }

  function renderAssetsView() {
    const assets = Sb3Bridge.getTargetAssets(state.projectJson, state.assetsMap);
    let html = `<div class="assets-section"><h4>Тло сцени (Backdrops) — клікніть для вставки</h4>`;
    html +=
      assets.backdrops
        .map(
          (b) =>
            `<span class="badge" data-insert-code='switch_backdrop("${b.name}")'>${escapeHtml(b.name)}</span>`
        )
        .join('') || 'Немає';
    html += `</div>`;

    for (const s of assets.sprites) {
      html += `<div class="assets-section"><h4>Спрайт: ${escapeHtml(s.name)} (x:${s.x}, y:${s.y})</h4>`;
      html += `<div style="margin-bottom:6px; color:var(--wp-muted);">Костюми (клік для switch_costume):</div>`;
      html +=
        s.costumes
          .map(
            (c) =>
              `<span class="badge" data-insert-code='switch_costume("${c.name}")'>${escapeHtml(c.name)}</span>`
          )
          .join('') || 'Немає';
      if (s.sounds && s.sounds.length > 0) {
        html += `<div style="margin:8px 0 6px; color:var(--wp-muted);">Звуки (клік для play_sound):</div>`;
        html += s.sounds
          .map((snd) => `<span class="badge" data-insert-code='play_sound("${snd}")'>${escapeHtml(snd)}</span>`)
          .join('');
      }
      html += `</div>`;
    }
    viewAssets.innerHTML = html;

    viewAssets.querySelectorAll('[data-insert-code]').forEach((el) => {
      el.onclick = () => insertAtCursor(el.getAttribute('data-insert-code'));
    });
  }

  function renderDocsView() {
    if (!viewDocs) return;
    let html = `<div class="assets-section"><h4>Довідник команд Python ↔ Scratch 3.0 (клікніть на код для вставки)</h4>`;
    html += `<table class="docs-table"><thead><tr><th>Категорія</th><th>Команда Python</th><th>Блок у Scratch 3.0</th></tr></thead><tbody>`;
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
    if (!lineNum) return;
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

    function renderChain(startId, container) {
      let curr = startId;
      while (curr && blocks[curr]) {
        const b = blocks[curr];
        const el = createBlockRow(curr, false);
        container.appendChild(el);

        if (b.inputs && b.inputs.SUBSTACK && b.inputs.SUBSTACK[1]) {
          const nest = document.createElement('div');
          nest.className = 'scratch-nested';
          renderChain(b.inputs.SUBSTACK[1], nest);
          container.appendChild(nest);
        }
        if (b.inputs && b.inputs.SUBSTACK2 && b.inputs.SUBSTACK2[1]) {
          const elseLbl = document.createElement('div');
          elseLbl.className = 'scratch-block control';
          elseLbl.innerHTML = '<span>Інакше</span>';
          container.appendChild(elseLbl);

          const nest2 = document.createElement('div');
          nest2.className = 'scratch-nested';
          renderChain(b.inputs.SUBSTACK2[1], nest2);
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
    try {
      const target = state.projectJson.targets[state.activeTargetIdx];
      const stage = state.projectJson.targets.find((t) => t.isStage);
      const res = PyScratchCompiler.compileToScratch(editor.value, target, stage, state.projectJson);
      state.codeByTarget.set(state.activeTargetIdx, editor.value);
      renderBlocksTree(res.blocks);
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
    state.codeByTarget.set(state.activeTargetIdx, editor.value);
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
        editor.value = src;
        renderTargetTabs();
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

    projectJson.targets.forEach((t, idx) => {
      if (initialCode && !t.isStage && idx === 1) {
        state.codeByTarget.set(idx, initialCode);
      } else {
        state.codeByTarget.set(idx, PyScratchDecompiler.decompileTarget(t));
      }
    });

    const firstSpriteIdx = projectJson.targets.findIndex((t) => !t.isStage);
    state.activeTargetIdx = firstSpriteIdx >= 0 ? firstSpriteIdx : 0;
    editor.value = state.codeByTarget.get(state.activeTargetIdx) || '';
    updateEditorDecorations();
    updateCursorTelemetry();
    renderTargetTabs();
    renderAssetsView();
    renderDocsView();

    preview.syncProjectAssets(projectJson, assetsMap);
    preview.reset();
    compileCurrent(true);
  }

  // Initialize default project
  const def = Sb3Bridge.createDefaultProject();
  loadProject(def.projectJson, def.assetsMap, SNIPPETS.hexagon);

  // Editor events
  editor.addEventListener('input', () => {
    state.highlightedLine = null;
    updateEditorDecorations();
    updateCursorTelemetry();
    compileCurrent(false);
  });

  editor.addEventListener('click', updateCursorTelemetry);
  editor.addEventListener('keyup', updateCursorTelemetry);

  editor.addEventListener('scroll', () => {
    lineNumbers.scrollTop = editor.scrollTop;
    if (codeHighlight) {
      codeHighlight.scrollTop = editor.scrollTop;
      codeHighlight.scrollLeft = editor.scrollLeft;
    }
  });

  editor.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      document.getElementById('btn-run').click();
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

  // Quick command chips
  document.querySelectorAll('.palette-chip').forEach((chip) => {
    chip.onclick = () => insertAtCursor(chip.getAttribute('data-insert'));
  });

  // Snippet buttons
  document.querySelectorAll('.snippet-btn').forEach((btn) => {
    btn.onclick = () => {
      const key = btn.getAttribute('data-snippet');
      if (SNIPPETS[key]) {
        editor.value = SNIPPETS[key];
        state.highlightedLine = null;
        updateEditorDecorations();
        compileCurrent(true);
        document.getElementById('btn-run').click();
      }
    };
  });

  // Right panel tabs
  document.querySelectorAll('[data-view]').forEach((btn) => {
    btn.onclick = () => {
      document.querySelectorAll('[data-view]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const v = btn.getAttribute('data-view');
      viewPreview.classList.toggle('hidden', v !== 'preview');
      viewBlocks.classList.toggle('hidden', v !== 'blocks');
      viewAssets.classList.toggle('hidden', v !== 'assets');
      if (viewDocs) viewDocs.classList.toggle('hidden', v !== 'docs');
    };
  });

  // Add new Sprite
  document.getElementById('btn-add-sprite').onclick = () => {
    state.codeByTarget.set(state.activeTargetIdx, editor.value);
    const newSprite = Sb3Bridge.addSpriteToProject(state.projectJson, state.assetsMap);
    const newIdx = state.projectJson.targets.length - 1;
    const starterCode = `# === СКРИПТ ГРАВЦЯ (${newSprite.name}) ===\n\n@when_flag_clicked\ndef main():\n    goto(${newSprite.x}, 0)\n    say("Привіт від ${newSprite.name}!", 2)\n`;
    state.codeByTarget.set(newIdx, starterCode);
    state.activeTargetIdx = newIdx;
    editor.value = starterCode;
    updateEditorDecorations();
    renderTargetTabs();
    renderAssetsView();
    preview.syncProjectAssets(state.projectJson, state.assetsMap);
    compileCurrent(true);
  };

  // Run, Stop, Mute
  document.getElementById('btn-run').onclick = () => {
    const astByTargetIdx = compileAllTargets();
    if (!astByTargetIdx) return;
    preview.runProject(astByTargetIdx, state.projectJson, state.assetsMap);
    setStatus('Симуляцію запущено на сцені Canvas 2D.');
  };

  document.getElementById('btn-stop').onclick = () => {
    preview.reset();
    setStatus('Виконання зупинено.');
  };

  const btnMute = document.getElementById('btn-mute');
  if (btnMute) {
    btnMute.onclick = () => {
      preview.muted = !preview.muted;
      btnMute.textContent = preview.muted ? 'Звук: Вимк' : 'Звук: Увімк';
    };
  }

  window.addEventListener('keydown', (e) => {
    if (document.activeElement === editor || document.activeElement === askInput) return;
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

  // File Open / Template / Save .sb3
  const fileInput = document.getElementById('file-input');
  document.getElementById('btn-open').onclick = () => fileInput.click();
  fileInput.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const buf = await file.arrayBuffer();
      const { projectJson, assetsMap } = await Sb3Bridge.loadSb3(buf);
      loadProject(projectJson, assetsMap);
      setStatus(`Завантажено "${file.name}" (${projectJson.targets.length} об'єктів).`);
    } catch (err) {
      setStatus('Помилка відкриття .sb3: ' + err.message, true);
    }
    fileInput.value = '';
  };

  document.getElementById('btn-template').onclick = () => {
    const d = Sb3Bridge.createDefaultProject();
    loadProject(d.projectJson, d.assetsMap, SNIPPETS.hexagon);
    setStatus('Створено чистий шаблон проєкту.');
  };

  document.getElementById('btn-save').onclick = async () => {
    const astByTargetIdx = compileAllTargets();
    if (!astByTargetIdx) return;
    try {
      const blob = await Sb3Bridge.saveSb3(state.projectJson, state.assetsMap, 'blob');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'pyscratch_project.sb3';
      a.click();
      URL.revokeObjectURL(url);
      setStatus('Файл pyscratch_project.sb3 збережено (усі спрайти та асети упаковано).');
    } catch (err) {
      setStatus('Помилка збереження .sb3: ' + err.message, true);
    }
  };
})();
