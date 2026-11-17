/**
 * compiler.js
 * Compiles the Scratch-Python DSL into Scratch 3.0 project.json blocks, variables, lists,
 * broadcasts, custom procedures (My Blocks), and extensions.
 */

(function (global) {
  'use strict';

  class CompileError extends Error {
    constructor(message, line, col) {
      super(message);
      this.name = 'CompileError';
      this.line = line;
      this.col = col === undefined ? null : col;
    }
  }

  const KEYWORDS = new Set([
    'def', 'for', 'in', 'while', 'if', 'elif', 'else', 'pass',
    'and', 'or', 'not', 'True', 'False'
  ]);

  const MATH_OP_ALIASES = {
    abs: 'abs',
    floor: 'floor',
    ceil: 'ceiling',
    ceiling: 'ceiling',
    sqrt: 'sqrt',
    sin: 'sin',
    cos: 'cos',
    tan: 'tan',
    asin: 'asin',
    acos: 'acos',
    atan: 'atan',
    ln: 'ln',
    log: 'log',
    exp: 'e ^',
    pow10: '10 ^'
  };

  // --- Whitelists of Scratch field values (checked at compile time) ---
  const KEY_OPTIONS = new Set([
    'space', 'up arrow', 'down arrow', 'left arrow', 'right arrow', 'enter', 'any',
    ...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')
  ]);
  const FIELD_WHITELISTS = {
    looksEffect: { label: 'графічного ефекту', values: ['COLOR', 'FISHEYE', 'WHIRL', 'PIXELATE', 'MOSAIC', 'BRIGHTNESS', 'GHOST'] },
    soundEffect: { label: 'ефекту звуку', values: ['PITCH', 'PAN'] },
    rotationStyle: { label: 'стилю обертання', values: ['left-right', "don't rotate", 'all around'] },
    dragMode: { label: 'режиму перетягування', values: ['draggable', 'not draggable'] },
    stopOption: { label: 'параметра stop()', values: ['all', 'this script', 'other scripts in sprite'] },
    mathOp: {
      label: 'математичної операції',
      values: ['abs', 'floor', 'ceiling', 'sqrt', 'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'ln', 'log', 'e ^', '10 ^']
    },
    currentMenu: { label: 'одиниці часу', values: ['YEAR', 'MONTH', 'DATE', 'DAYOFWEEK', 'HOUR', 'MINUTE', 'SECOND'] },
    greaterThan: { label: 'датчика', values: ['LOUDNESS', 'TIMER'] },
    ttsVoice: { label: 'голосу', values: ['ALTO', 'TENOR', 'SQUEAK', 'GIANT', 'KITTEN'] }
  };
  const SENSING_OF_PROPERTIES = [
    'x position', 'y position', 'direction', 'costume #', 'costume name', 'size', 'volume',
    'backdrop #', 'backdrop name'
  ];

  // Blocks that exist only for sprites / only for the Stage
  const SPRITE_ONLY_CALLS = new Set([
    'move', 'turn_right', 'turn_left', 'set_x', 'set_y', 'change_x', 'change_y', 'point_in_direction',
    'goto', 'goto_random', 'goto_mouse', 'glide', 'glide_to', 'point_towards', 'if_on_edge_bounce',
    'set_rotation_style', 'say', 'think', 'show', 'hide', 'set_size', 'change_size', 'switch_costume',
    'next_costume', 'go_to_layer', 'change_layer', 'delete_this_clone', 'set_drag_mode',
    'x_position', 'y_position', 'direction', 'size', 'costume_number', 'costume_name',
    'touching', 'touching_color', 'color_is_touching_color', 'distance_to'
  ]);
  // Note: switch_backdrop_and_wait is hidden from the sprite palette in Scratch but the VM runs it on sprites,
  // and the editor snippets use it, so it is intentionally not listed here.
  const STAGE_ONLY_CALLS = new Set([]);

  // Scratch extensions that the compiler adds to / removes from project.json "extensions" by opcode prefix
  const EXTENSION_PREFIXES = {
    pen: 'pen_',
    music: 'music_',
    text2speech: 'text2speech_',
    translate: 'translate_'
  };

  // --- 1. TOKENIZER ---
  const IDENT_START_RE = /[\p{L}_]/u;
  const IDENT_RE = /[\p{L}_][\p{L}\p{N}\p{M}_]*/uy;
  const OPEN_BRACKETS = { '(': ')', '[': ']' };
  const CLOSE_BRACKETS = { ')': '(', ']': '[' };

  function tokenize(source) {
    const lines = String(source || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    const tokens = [];
    const indentStack = [0];
    const bracketStack = []; // open brackets: { ch, line, col }
    let backslashContinued = false;

    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const rawLine = lines[lineIdx];
      const lineNum = lineIdx + 1;
      const continuing = bracketStack.length > 0 || backslashContinued;
      backslashContinued = false;

      const trimmed = rawLine.trim();
      if (!continuing && (trimmed === '' || trimmed.startsWith('#'))) {
        continue;
      }

      let indent = 0;
      let pos = 0;
      while (pos < rawLine.length) {
        if (rawLine[pos] === ' ') {
          indent++;
          pos++;
        } else if (rawLine[pos] === '\t') {
          indent += 4;
          pos++;
        } else {
          break;
        }
      }

      // Indentation is only meaningful at the start of a logical line (not inside () / [] or after a trailing "\").
      if (!continuing) {
        const currentIndent = indentStack[indentStack.length - 1];
        if (indent > currentIndent) {
          indentStack.push(indent);
          tokens.push({ type: 'INDENT', value: indent, line: lineNum, col: 1 });
        } else if (indent < currentIndent) {
          while (indentStack.length > 1 && indentStack[indentStack.length - 1] > indent) {
            indentStack.pop();
            tokens.push({ type: 'DEDENT', value: indent, line: lineNum, col: 1 });
          }
          if (indentStack[indentStack.length - 1] !== indent) {
            throw new CompileError(
              `Неправильний відступ у рядку ${lineNum}: він не збігається з жодним попереднім рівнем відступу. Використовуйте однакову кількість пробілів (рекомендовано 4) для рядків одного блоку.`,
              lineNum,
              1
            );
          }
        }
      }

      while (pos < rawLine.length) {
        const ch = rawLine[pos];
        const col = pos + 1;
        if (ch === ' ' || ch === '\t') {
          pos++;
          continue;
        }
        if (ch === '#') {
          break;
        }

        // Explicit line continuation: a backslash as the last character of the line
        if (ch === '\\') {
          if (rawLine.slice(pos + 1).trim() === '') {
            backslashContinued = true;
            pos = rawLine.length;
            break;
          }
          throw new CompileError(
            `Символ "\\" у рядку ${lineNum} дозволений лише в кінці рядка (для продовження коду на наступному рядку).`,
            lineNum,
            col
          );
        }

        // Strings
        if (ch === '"' || ch === "'") {
          const quote = ch;
          pos++;
          let str = '';
          let closed = false;
          while (pos < rawLine.length) {
            if (rawLine[pos] === '\\') {
              if (pos + 1 >= rawLine.length) {
                throw new CompileError(`Незакритий лапками рядок (${quote}) у рядку ${lineNum}.`, lineNum, col);
              }
              const esc = rawLine[pos + 1];
              const simple = { n: '\n', t: '\t', r: '\r', b: '\b', f: '\f', v: '\v', '0': '\0', '\\': '\\', "'": "'", '"': '"' };
              if (Object.prototype.hasOwnProperty.call(simple, esc)) {
                str += simple[esc];
                pos += 2;
              } else if (esc === 'x' || esc === 'u') {
                const len = esc === 'x' ? 2 : 4;
                const hex = rawLine.slice(pos + 2, pos + 2 + len);
                if (hex.length !== len || !/^[0-9a-fA-F]+$/.test(hex)) {
                  throw new CompileError(
                    `Некоректна escape-послідовність "\\${esc}" у рядку ${lineNum}: після неї потрібно рівно ${len} шістнадцяткових цифр.`,
                    lineNum,
                    pos + 1
                  );
                }
                str += String.fromCharCode(parseInt(hex, 16));
                pos += 2 + len;
              } else {
                throw new CompileError(
                  `Невідома escape-послідовність "\\${esc}" у рядку ${lineNum}. Підтримуються: \\n \\t \\r \\\\ \\' \\" \\xNN \\uNNNN. Щоб написати зворотну скісну риску, подвойте її: \\\\.`,
                  lineNum,
                  pos + 1
                );
              }
            } else if (rawLine[pos] === quote) {
              closed = true;
              pos++;
              break;
            } else {
              str += rawLine[pos++];
            }
          }
          if (!closed) {
            throw new CompileError(`Незакритий лапками рядок (${quote}) у рядку ${lineNum}.`, lineNum, col);
          }
          tokens.push({ type: 'STRING', value: str, line: lineNum, col });
          continue;
        }

        // Numbers
        if (/[0-9]/.test(ch)) {
          let numStr = '';
          let dotCount = 0;
          while (pos < rawLine.length && /[0-9.]/.test(rawLine[pos])) {
            if (rawLine[pos] === '.') dotCount++;
            if (dotCount > 1) {
              throw new CompileError(`Некоректне число з кількома крапками у рядку ${lineNum}.`, lineNum, col);
            }
            numStr += rawLine[pos++];
          }
          tokens.push({ type: 'NUMBER', value: parseFloat(numStr), raw: numStr, line: lineNum, col });
          continue;
        }

        // Identifiers & Keywords (any Unicode letters, so kids can name variables in their own language)
        const cp = String.fromCodePoint(rawLine.codePointAt(pos));
        if (IDENT_START_RE.test(cp)) {
          IDENT_RE.lastIndex = pos;
          const m = IDENT_RE.exec(rawLine);
          const id = m[0];
          pos += id.length;
          if (/^(f|r|b|u|fr|rf|br|rb)$/i.test(id) && (rawLine[pos] === '"' || rawLine[pos] === "'")) {
            throw new CompileError(
              /^f/i.test(id) || /f$/i.test(id)
                ? `f-рядки не підтримуються (рядок ${lineNum}). Склейте текст через join("а", змінна).`
                : `Префікс рядка "${id}" не підтримується (рядок ${lineNum}). Пишіть звичайні рядки в лапках.`,
              lineNum,
              col
            );
          }
          if (KEYWORDS.has(id)) {
            tokens.push({ type: 'KW', value: id, line: lineNum, col });
          } else {
            tokens.push({ type: 'IDENT', value: id, line: lineNum, col });
          }
          continue;
        }

        // Two-character operators
        const two = rawLine.slice(pos, pos + 2);
        if (two === '**') {
          throw new CompileError(
            `Оператор ** (степінь) не підтримується (рядок ${lineNum}). Використайте math_op("10 ^", x) або exp(x), чи помножте число саме на себе.`,
            lineNum,
            col
          );
        }
        if (['+=', '-=', '*=', '/=', '==', '!=', '<=', '>=', '//'].includes(two)) {
          tokens.push({ type: 'OP', value: two, line: lineNum, col });
          pos += 2;
          continue;
        }

        // Single-character operators
        if ('+-*/%<>='.includes(ch)) {
          tokens.push({ type: 'OP', value: ch, line: lineNum, col });
          pos++;
          continue;
        }

        if ('():,@[].'.includes(ch)) {
          if (OPEN_BRACKETS[ch]) {
            bracketStack.push({ ch, line: lineNum, col });
          } else if (CLOSE_BRACKETS[ch]) {
            const top = bracketStack[bracketStack.length - 1];
            if (!top) {
              throw new CompileError(`Зайва закриваюча дужка "${ch}" у рядку ${lineNum}.`, lineNum, col);
            }
            if (top.ch !== CLOSE_BRACKETS[ch]) {
              throw new CompileError(
                `Дужка "${ch}" у рядку ${lineNum} не відповідає відкритій "${top.ch}" з рядка ${top.line}.`,
                lineNum,
                col
              );
            }
            bracketStack.pop();
          }
          tokens.push({ type: 'PUNCT', value: ch, line: lineNum, col });
          pos++;
          continue;
        }

        throw new CompileError(`Невідомий символ "${ch}" у рядку ${lineNum}.`, lineNum, col);
      }

      if (bracketStack.length === 0 && !backslashContinued) {
        tokens.push({ type: 'NEWLINE', value: '\n', line: lineNum, col: rawLine.length + 1 });
      }
    }

    if (bracketStack.length > 0) {
      const open = bracketStack[bracketStack.length - 1];
      throw new CompileError(
        `Забули закрити дужку "${open.ch}", відкриту в рядку ${open.line}.`,
        open.line,
        open.col
      );
    }
    if (backslashContinued) {
      tokens.push({ type: 'NEWLINE', value: '\n', line: lines.length, col: 1 });
    }

    while (indentStack.length > 1) {
      indentStack.pop();
      tokens.push({ type: 'DEDENT', value: 0, line: lines.length, col: 1 });
    }
    tokens.push({ type: 'EOF', value: '', line: lines.length, col: 1 });
    return tokens;
  }

  // --- 2. PARSER (AST) ---
  function parse(tokens) {
    let idx = 0;
    const peek = () => tokens[idx];
    const next = () => tokens[idx++];

    function expect(type, value, friendlyMsg) {
      const tok = peek();
      if (tok.type !== type || (value !== undefined && tok.value !== value)) {
        throw new CompileError(friendlyMsg || `Очікувалось "${value || type}" у рядку ${tok.line}.`, tok.line, tok.col);
      }
      return next();
    }

    // Python constructs that have no Scratch equivalent: explain what to do instead of a generic error
    const UNSUPPORTED_STMT_HINTS = {
      return: 'return не підтримується: власні блоки Scratch нічого не повертають. Збережіть результат у змінну (result = ...) і прочитайте її після виклику.',
      break: 'break не підтримується в Scratch. Використайте цикл "while умова:" або прапорець-змінну, чи stop("this script").',
      continue: 'continue не підтримується в Scratch. Загорніть решту тіла циклу в "if умова:".',
      class: 'class не підтримується: у Scratch немає класів. Для даних спрайта використовуйте self.назва.',
      import: 'import не потрібен: усі команди (move, say, ...) вже доступні одразу.',
      from: 'from ... import не потрібен: усі команди (move, say, ...) вже доступні одразу.',
      lambda: 'lambda не підтримується в Scratch. Оголосіть власний блок через def назва(...):.',
      try: 'try/except не підтримується в Scratch.',
      except: 'try/except не підтримується в Scratch.',
      finally: 'try/finally не підтримується в Scratch.',
      raise: 'raise не підтримується в Scratch.',
      with: 'with не підтримується в Scratch.',
      global: 'global не потрібен: звичайні змінні вже глобальні, локальні пишуться як self.назва.',
      nonlocal: 'nonlocal не підтримується в Scratch.',
      del: 'del не підтримується. Для списків використовуйте list_delete(...).',
      yield: 'yield не підтримується в Scratch.',
      async: 'async/await не підтримується в Scratch.',
      await: 'async/await не підтримується в Scratch.',
      assert: 'assert не підтримується в Scratch.'
    };

    function unsupportedConstructError(tok) {
      if (tok.type !== 'IDENT' || !Object.prototype.hasOwnProperty.call(UNSUPPORTED_STMT_HINTS, tok.value)) return null;
      const nxt = tokens[idx + 1];
      // "return = 5" style identifiers still work as plain variable names
      if (nxt && nxt.type === 'OP' && ['=', '+=', '-=', '*=', '/='].includes(nxt.value)) return null;
      return new CompileError(`${UNSUPPORTED_STMT_HINTS[tok.value]} (рядок ${tok.line})`, tok.line, tok.col);
    }

    function skipNewlines() {
      while (peek().type === 'NEWLINE') next();
    }

    function parseProgram() {
      const topNodes = [];
      skipNewlines();
      while (peek().type !== 'EOF') {
        const tok = peek();
        if (tok.type === 'PUNCT' && tok.value === '@') {
          topNodes.push(parseHandler());
        } else if (tok.type === 'KW' && tok.value === 'def') {
          topNodes.push(parseCustomProcedure());
        } else {
          const hint = unsupportedConstructError(tok);
          if (hint) throw hint;
          throw new CompileError(
            `У рядку ${tok.line} код верхнього рівня має починатися з декоратора події (наприклад, @when_flag_clicked) або оголошення функції (def назва():).`,
            tok.line,
            tok.col
          );
        }
        skipNewlines();
      }
      return topNodes;
    }

    function parseHandler() {
      const atTok = expect('PUNCT', '@');
      const decName = expect('IDENT', undefined, `Очікувалась назва події після @ у рядку ${atTok.line}.`).value;
      if (decName === 'warp') {
        if (peek().type === 'PUNCT' && peek().value === '(') {
          next();
          expect('PUNCT', ')', `Декоратор @warp не приймає аргументів у рядку ${atTok.line}.`);
        }
        expect('NEWLINE', undefined, `Після декоратора @warp має бути перехід на новий рядок (${atTok.line}).`);
        skipNewlines();
        return parseCustomProcedure(true, atTok.line);
      }
      const decArgs = [];
      if (peek().type === 'PUNCT' && peek().value === '(') {
        next();
        if (!(peek().type === 'PUNCT' && peek().value === ')')) {
          decArgs.push(parseExpr());
          while (peek().type === 'PUNCT' && peek().value === ',') {
            next();
            decArgs.push(parseExpr());
          }
        }
        expect('PUNCT', ')', `Забули закрити дужку ")" у декораторі рядка ${atTok.line}.`);
      }
      expect('NEWLINE', undefined, `Після декоратора @${decName} має бути перехід на новий рядок (${atTok.line}).`);
      skipNewlines();

      const defTok = expect('KW', 'def', `Після декоратора @${decName} очікується "def назва():" у рядку ${peek().line}.`);
      const fnName = expect('IDENT', undefined, `Очікувалась назва функції після def у рядку ${defTok.line}.`).value;
      expect('PUNCT', '(', `Очікувались дужки () після ${fnName} у рядку ${defTok.line}.`);
      expect('PUNCT', ')', `Очікувалась закриваюча дужка ) після ${fnName}( у рядку ${defTok.line}.`);
      expect('PUNCT', ':', `Забули двокрапку ":" в кінці def ${fnName}() у рядку ${defTok.line}.`);
      expect('NEWLINE', undefined, `Після ":" потрібен новий рядок з відступом (${defTok.line}).`);

      const body = parseBlock(defTok.line);
      return { type: 'Handler', decorator: decName, decArgs, fnName, body, line: atTok.line };
    }

    function parseCustomProcedure(warp = false, startLine = null) {
      const defTok = expect('KW', 'def', `Після @warp очікується "def назва(...):" у рядку ${peek().line}.`);
      const fnName = expect('IDENT', undefined, `Очікувалась назва функції після def у рядку ${defTok.line}.`).value;
      expect('PUNCT', '(', `Очікувалась "(" після ${fnName} у рядку ${defTok.line}.`);
      const params = [];
      const paramTypes = []; // 'any' (text/number, %s) or 'bool' (boolean, %b)
      const readParam = (msg) => {
        params.push(expect('IDENT', undefined, msg).value);
        if (peek().type === 'PUNCT' && peek().value === ':') {
          next();
          const typeTok = expect('IDENT', undefined, `Після ":" очікується тип параметра "bool" (рядок ${defTok.line}).`);
          if (typeTok.value !== 'bool') {
            throw new CompileError(
              `Непідтримуваний тип параметра "${typeTok.value}" у рядку ${defTok.line}: можна писати лише "ім'я: bool" для логічного аргументу.`,
              typeTok.line,
              typeTok.col
            );
          }
          paramTypes.push('bool');
        } else {
          paramTypes.push('any');
        }
      };
      if (!(peek().type === 'PUNCT' && peek().value === ')')) {
        readParam(`Очікувалось ім'я параметра у рядку ${defTok.line}.`);
        while (peek().type === 'PUNCT' && peek().value === ',') {
          next();
          readParam(`Очікувалось ім'я параметра після коми у рядку ${defTok.line}.`);
        }
      }
      expect('PUNCT', ')', `Забули закрити дужку ")" у def ${fnName} у рядку ${defTok.line}.`);
      expect('PUNCT', ':', `Забули двокрапку ":" в кінці def ${fnName} у рядку ${defTok.line}.`);
      expect('NEWLINE', undefined, `Після ":" потрібен новий рядок з відступом (${defTok.line}).`);

      const body = parseBlock(defTok.line);
      return { type: 'ProcDef', fnName, params, paramTypes, warp: !!warp, body, line: startLine || defTok.line };
    }

    function parseBlock(parentLine) {
      expect('INDENT', undefined, `Очікувався відступ (4 пробіли) після рядка ${parentLine}.`);
      const stmts = [];
      while (peek().type !== 'DEDENT' && peek().type !== 'EOF') {
        skipNewlines();
        if (peek().type === 'DEDENT' || peek().type === 'EOF') break;
        const stmt = parseStmt();
        if (stmt) stmts.push(stmt);
      }
      if (peek().type === 'DEDENT') next();
      return stmts;
    }

    function parseIfChain(ifLine) {
      const cond = parseExpr();
      expect('PUNCT', ':', `Забули двокрапку ":" після умови у рядку ${ifLine}.`);
      expect('NEWLINE', undefined);
      const thenBody = parseBlock(ifLine);
      let elseBody = null;
      skipNewlines();

      if (peek().type === 'KW' && peek().value === 'elif') {
        const elifTok = next();
        elseBody = [parseIfChain(elifTok.line)];
      } else if (peek().type === 'KW' && peek().value === 'else') {
        const elseTok = next();
        expect('PUNCT', ':', `Забули двокрапку ":" після else у рядку ${elseTok.line}.`);
        expect('NEWLINE', undefined);
        elseBody = parseBlock(elseTok.line);
      }

      return { type: 'If', cond, thenBody, elseBody, line: ifLine };
    }

    function parseStmt() {
      const tok = peek();
      const unsupported = unsupportedConstructError(tok);
      if (unsupported) throw unsupported;

      if (tok.type === 'KW' && tok.value === 'pass') {
        next();
        expect('NEWLINE', undefined);
        return { type: 'Pass', line: tok.line };
      }

      // for i in range(n):
      if (tok.type === 'KW' && tok.value === 'for') {
        next();
        const varTok = expect('IDENT', undefined, `Очікувалась змінна циклу після for у рядку ${tok.line}.`);
        expect('KW', 'in', `Очікувалось ключове слово "in" у циклі for у рядку ${tok.line}.`);
        const rangeTok = expect('IDENT', 'range', `У Scratch підтримується цикл "for ${varTok.value} in range(кількість):" (рядок ${tok.line}).`);
        expect('PUNCT', '(', `Очікувалась "(" після range у рядку ${rangeTok.line}.`);
        const countExpr = parseExpr();
        expect('PUNCT', ')', `Забули ")" після range(...) у рядку ${tok.line}.`);
        expect('PUNCT', ':', `Забули двокрапку ":" в кінці рядка for (${tok.line}).`);
        expect('NEWLINE', undefined);
        const body = parseBlock(tok.line);
        return { type: 'Repeat', loopVar: varTok.value, count: countExpr, body, line: tok.line };
      }

      // while True: | while not cond: | while cond:
      if (tok.type === 'KW' && tok.value === 'while') {
        next();
        if (peek().type === 'KW' && peek().value === 'True') {
          next();
          expect('PUNCT', ':', `Забули двокрапку ":" після while True у рядку ${tok.line}.`);
          expect('NEWLINE', undefined);
          const body = parseBlock(tok.line);
          return { type: 'Forever', body, line: tok.line };
        }
        if (peek().type === 'KW' && peek().value === 'not') {
          next();
          const cond = parseExpr();
          expect('PUNCT', ':', `Забули двокрапку ":" після умови while not у рядку ${tok.line}.`);
          expect('NEWLINE', undefined);
          const body = parseBlock(tok.line);
          return { type: 'RepeatUntil', cond, body, line: tok.line };
        }
        const cond = parseExpr();
        expect('PUNCT', ':', `Забули двокрапку ":" після умови while у рядку ${tok.line}.`);
        expect('NEWLINE', undefined);
        const body = parseBlock(tok.line);
        const invertedCond =
          cond.type === 'BinOp' && (cond.op === '!=' || cond.op === '<=' || cond.op === '>=')
            ? {
                ...cond,
                op: cond.op === '!=' ? '==' : cond.op === '<=' ? '>' : '<'
              }
            : { type: 'UnaryOp', op: 'not', expr: cond, line: tok.line };
        return {
          type: 'RepeatUntil',
          cond: invertedCond,
          body,
          line: tok.line
        };
      }

      // if / elif / else
      if (tok.type === 'KW' && tok.value === 'if') {
        next();
        return parseIfChain(tok.line);
      }

      // Assignment or Function Call (including self.var local variables)
      if (tok.type === 'IDENT') {
        const idTok = next();
        let targetName = idTok.value;
        let isLocal = false;
        if (peek().type === 'PUNCT' && peek().value === '.') {
          if (idTok.value !== 'self') {
            throw new CompileError(`Локальні змінні спрайта пишуться через "self.назва" (рядок ${tok.line}).`, tok.line);
          }
          next();
          const attrTok = expect('IDENT', undefined, `Очікувалась назва локальної змінної після "self." у рядку ${tok.line}.`);
          targetName = attrTok.value;
          isLocal = true;
        }
        if (peek().type === 'OP' && ['=', '+=', '-=', '*=', '/='].includes(peek().value)) {
          const op = next().value;
          const value = parseExpr();
          expect('NEWLINE', undefined);
          const localProp = isLocal ? { isLocal: true } : {};
          if (op === '=') {
            return { type: 'Assign', name: targetName, ...localProp, value, line: tok.line };
          }
          if (op === '+=') {
            return { type: 'ChangeVar', name: targetName, ...localProp, value, line: tok.line };
          }
          if (op === '-=') {
            const negVal =
              value.type === 'Number'
                ? { type: 'Number', value: -value.value, line: tok.line }
                : { type: 'UnaryOp', op: '-', expr: value, line: tok.line };
            return { type: 'ChangeVar', name: targetName, ...localProp, value: negVal, line: tok.line };
          }
          const binOp = op === '*=' ? '*' : '/';
          return {
            type: 'Assign',
            name: targetName,
            ...localProp,
            value: {
              type: 'BinOp',
              op: binOp,
              left: { type: 'Var', name: targetName, ...localProp, line: tok.line },
              right: value,
              line: tok.line
            },
            line: tok.line
          };
        }
        if (!isLocal && peek().type === 'PUNCT' && peek().value === '(') {
          const args = parseArgList(tok.line);
          expect('NEWLINE', undefined);
          return { type: 'Call', name: idTok.value, args, line: tok.line };
        }
      }

      throw new CompileError(`Незрозуміла команда "${tok.value}" у рядку ${tok.line}.`, tok.line, tok.col);
    }

    function parseArgList(line) {
      expect('PUNCT', '(');
      const args = [];
      if (!(peek().type === 'PUNCT' && peek().value === ')')) {
        args.push(parseExpr());
        while (peek().type === 'PUNCT' && peek().value === ',') {
          next();
          args.push(parseExpr());
        }
      }
      expect('PUNCT', ')', `Забули закрити дужку ")" у рядку ${line}.`);
      return args;
    }

    function parseExpr() {
      const expr = parseOr();
      if (peek().type === 'KW' && peek().value === 'if') {
        const t = peek();
        throw new CompileError(
          `Тернарний вираз "a if умова else b" не підтримується (рядок ${t.line}). Запишіть його як звичайний "if умова: ... else: ...".`,
          t.line,
          t.col
        );
      }
      return expr;
    }

    function parseOr() {
      let left = parseAnd();
      while (peek().type === 'KW' && peek().value === 'or') {
        const op = next().value;
        left = { type: 'BinOp', op, left, right: parseAnd(), line: left.line };
      }
      return left;
    }

    function parseAnd() {
      let left = parseNot();
      while (peek().type === 'KW' && peek().value === 'and') {
        const op = next().value;
        left = { type: 'BinOp', op, left, right: parseNot(), line: left.line };
      }
      return left;
    }

    function parseNot() {
      if (peek().type === 'KW' && peek().value === 'not') {
        const tok = next();
        return { type: 'UnaryOp', op: 'not', expr: parseNot(), line: tok.line };
      }
      return parseCmp();
    }

    function parseCmp() {
      let left = parseAdd();
      while (peek().type === 'OP' && ['==', '!=', '<', '>', '<=', '>='].includes(peek().value)) {
        const op = next().value;
        left = { type: 'BinOp', op, left, right: parseAdd(), line: left.line };
      }
      return left;
    }

    function parseAdd() {
      let left = parseMul();
      while (peek().type === 'OP' && ['+', '-'].includes(peek().value)) {
        const op = next().value;
        left = { type: 'BinOp', op, left, right: parseMul(), line: left.line };
      }
      return left;
    }

    function parseMul() {
      let left = parseUnary();
      while (peek().type === 'OP' && ['*', '/', '%', '//'].includes(peek().value)) {
        const op = next().value;
        const right = parseUnary();
        if (op === '//') {
          left = {
            type: 'Call',
            name: 'floor',
            args: [{ type: 'BinOp', op: '/', left, right, line: left.line }],
            line: left.line
          };
        } else {
          left = { type: 'BinOp', op, left, right, line: left.line };
        }
      }
      return left;
    }

    function parseUnary() {
      if (peek().type === 'OP' && peek().value === '-') {
        const tok = next();
        const operand = parseUnary();
        // Constant-fold negative number literals (-150 -> Number(-150)) for clean Scratch inputs
        if (operand.type === 'Number') {
          return { type: 'Number', value: -operand.value, line: tok.line };
        }
        return { type: 'UnaryOp', op: '-', expr: operand, line: tok.line };
      }
      if (peek().type === 'OP' && peek().value === '+') {
        next();
        return parseUnary();
      }
      return parsePrimary();
    }

    function parsePrimary() {
      const tok = peek();
      if (tok.type === 'NUMBER') {
        next();
        return { type: 'Number', value: tok.value, line: tok.line };
      }
      if (tok.type === 'STRING') {
        next();
        return { type: 'String', value: tok.value, line: tok.line };
      }
      if (tok.type === 'KW' && (tok.value === 'True' || tok.value === 'False')) {
        next();
        return { type: 'Bool', value: tok.value === 'True', line: tok.line };
      }
      if (tok.type === 'PUNCT' && tok.value === '(') {
        next();
        const expr = parseExpr();
        expect('PUNCT', ')', `Забули закрити дужку ")" у рядку ${tok.line}.`);
        return expr;
      }
      if (tok.type === 'IDENT') {
        if (tok.value === 'lambda') {
          throw new CompileError(`${UNSUPPORTED_STMT_HINTS.lambda} (рядок ${tok.line})`, tok.line, tok.col);
        }
        next();
        if (peek().type === 'PUNCT' && peek().value === '.') {
          if (tok.value !== 'self') {
            throw new CompileError(`Локальні змінні спрайта пишуться через "self.назва" (рядок ${tok.line}).`, tok.line, tok.col);
          }
          next();
          const attrTok = expect('IDENT', undefined, `Очікувалась назва локальної змінної після "self." у рядку ${tok.line}.`);
          return { type: 'Var', name: attrTok.value, isLocal: true, line: tok.line };
        }
        if (peek().type === 'PUNCT' && peek().value === '(') {
          const args = parseArgList(tok.line);
          return { type: 'Call', name: tok.value, args, line: tok.line };
        }
        return { type: 'Var', name: tok.value, line: tok.line };
      }
      throw new CompileError(`Неочікуваний вираз "${tok.value}" у рядку ${tok.line}.`, tok.line, tok.col);
    }

    return parseProgram();
  }

  // --- 2b. RAW SCRIPT PRESERVATION (blocks the DSL cannot express) ---
  function getDecompiler() {
    if (typeof module !== 'undefined' && module.exports && typeof require === 'function') {
      try {
        return require('./decompiler.js');
      } catch (_) {
        /* fall through to the browser global */
      }
    }
    return global.PyScratchDecompiler || null;
  }

  // Block ids referenced from a block's inputs (strings at index >= 1 of an input array are block ids;
  // nested arrays are primitive literals / variable / list / broadcast references).
  function inputBlockRefs(block) {
    const refs = [];
    for (const inp of Object.values(block.inputs || {})) {
      if (!Array.isArray(inp)) continue;
      for (let i = 1; i < inp.length; i++) {
        if (typeof inp[i] === 'string') refs.push(inp[i]);
      }
    }
    return refs;
  }

  /**
   * Finds top-level scripts of `target` that the decompiler cannot express as DSL code (it prints a
   * "# [збережено без змін]" comment for them) and returns them as a self-contained raw block map.
   */
  function collectRawScripts(target, stageTarget) {
    const empty = { blocks: {}, roots: [], procedures: [] };
    const old = target.blocks;
    const dec = getDecompiler();
    if (!dec || !old || typeof old !== 'object') return empty;
    const report = {};
    try {
      dec.decompileTarget(target, stageTarget || null, report);
    } catch (_) {
      return empty;
    }
    const rootIds = report.unsupported ? Array.from(report.unsupported.keys()) : [];
    if (rootIds.length === 0) return empty;

    const rawBlocks = {};
    const stack = rootIds.slice();
    while (stack.length) {
      const id = stack.pop();
      const b = old[id];
      if (!b || rawBlocks[id]) continue;
      rawBlocks[id] = b;
      if (typeof b.next === 'string') stack.push(b.next);
      stack.push(...inputBlockRefs(b));
    }

    const procedures = [];
    for (const rootId of rootIds) {
      const def = old[rootId];
      if (!def || def.opcode !== 'procedures_definition') continue;
      const protoRef = def.inputs && def.inputs.custom_block ? def.inputs.custom_block[1] : null;
      const proto = typeof protoRef === 'string' ? old[protoRef] : null;
      const mut = (proto && proto.mutation) || {};
      let paramIds = [];
      let paramNames = [];
      try {
        paramIds = JSON.parse(mut.argumentids || '[]');
        paramNames = JSON.parse(mut.argumentnames || '[]');
      } catch (_) {
        continue;
      }
      procedures.push({
        fnName: dec.extractProcName ? dec.extractProcName(mut.proccode) : String(mut.proccode || '').split('%')[0].trim(),
        proccode: mut.proccode,
        paramIds,
        paramNames,
        warp: mut.warp === 'true' || mut.warp === true,
        raw: true
      });
    }
    return { blocks: rawBlocks, roots: rootIds, procedures };
  }

  // --- 3. SCRATCH 3.0 CODE GENERATOR ---
  function compileToScratch(source, target, stageTarget, projectJson) {
    const tokens = tokenize(source);
    const ast = parse(tokens);

    // Scripts of an imported .sb3 that the DSL cannot express are kept verbatim (see mergeRawScripts)
    const raw = collectRawScripts(target, stageTarget);

    let idCounter = 1;
    const genId = () => 'b_' + idCounter++;
    const blocks = {};
    const variables = {};
    const localVariables = {};
    const lists = {};
    const localLists = {};
    const declaredLocalLists = new Set();
    const procedures = {}; // fnName -> { proccode, paramNames, paramIds, warp }
    let activeProcedureParams = null; // Set of param names when compiling inside a ProcDef
    let activeProcedureBoolParams = null; // subset of activeProcedureParams declared as `name: bool`
    let usesPen = false;

    const globalHost = stageTarget || target;
    const prevOwned = target._pyCompiledOwned || {
      globalVars: new Set(),
      localVars: new Set(),
      globalLists: new Set(),
      localLists: new Set(),
      broadcasts: new Set()
    };
    const nextOwned = {
      globalVars: new Set(),
      localVars: new Set(),
      globalLists: new Set(),
      localLists: new Set(),
      broadcasts: new Set()
    };
    const usedGlobalVarIds = new Set();
    const usedLocalVarIds = new Set();
    const usedGlobalListIds = new Set();
    const usedLocalListIds = new Set();
    const usedBroadcastIds = new Set();
    let currentLine = null; // line of the statement being compiled (for diagnostics raised deep inside helpers)
    let stmtTailId = null; // last block id of a statement that expands to several top-level blocks

    function ensureLocalVar(name) {
      const host = target.isStage ? globalHost : target;
      if (localVariables[name]) {
        usedLocalVarIds.add(localVariables[name]);
        return localVariables[name];
      }
      if (!target.isStage) {
        // A sprite-local variable must not share its name with a global (Stage) variable
        const clash = Object.entries(globalHost.variables || {}).find(
          ([gid, v]) => v[0] === name && !prevOwned.globalVars.has(gid)
        );
        if (clash) {
          throw new CompileError(
            `Локальна змінна "self.${name}" конфліктує з глобальною змінною "${name}". Дайте їм різні імена.`,
            currentLine
          );
        }
      }
      const localMatch = Object.entries(host.variables || {}).find(([, v]) => v[0] === name);
      if (localMatch) {
        localVariables[name] = localMatch[0];
        if (prevOwned.localVars.has(localMatch[0])) nextOwned.localVars.add(localMatch[0]);
        usedLocalVarIds.add(localMatch[0]);
        return localMatch[0];
      }
      const varId = (target.isStage ? 'v_' : 'lv_') + name + '_' + idCounter++;
      localVariables[name] = varId;
      if (!host.variables) host.variables = {};
      host.variables[varId] = [name, 0];
      nextOwned.localVars.add(varId);
      usedLocalVarIds.add(varId);
      return varId;
    }

    function ensureVar(name, isLocal = false) {
      if (isLocal) return ensureLocalVar(name);
      if (variables[name]) {
        usedGlobalVarIds.add(variables[name]);
        return variables[name];
      }
      // Check target local variables first, then stage global variables
      const localMatch = Object.entries(target.variables || {}).find(([, v]) => v[0] === name);
      if (localMatch) {
        variables[name] = localMatch[0];
        if (prevOwned.localVars.has(localMatch[0])) nextOwned.localVars.add(localMatch[0]);
        usedLocalVarIds.add(localMatch[0]);
        return localMatch[0];
      }
      const globalMatch = Object.entries(globalHost.variables || {}).find(([, v]) => v[0] === name);
      if (globalMatch) {
        variables[name] = globalMatch[0];
        if (prevOwned.globalVars.has(globalMatch[0])) nextOwned.globalVars.add(globalMatch[0]);
        usedGlobalVarIds.add(globalMatch[0]);
        return globalMatch[0];
      }
      // Create new variables on Stage (global) by default, matching Scratch's "For all sprites" default
      const varId = 'v_' + name + '_' + idCounter++;
      variables[name] = varId;
      if (!globalHost.variables) globalHost.variables = {};
      globalHost.variables[varId] = [name, 0];
      nextOwned.globalVars.add(varId);
      usedGlobalVarIds.add(varId);
      return varId;
    }

    function ensureLocalList(name) {
      const host = target.isStage ? globalHost : target;
      if (localLists[name]) {
        usedLocalListIds.add(localLists[name]);
        return localLists[name];
      }
      const localMatch = Object.entries(host.lists || {}).find(([, v]) => v[0] === name);
      if (localMatch) {
        localLists[name] = localMatch[0];
        if (prevOwned.localLists.has(localMatch[0])) nextOwned.localLists.add(localMatch[0]);
        usedLocalListIds.add(localMatch[0]);
        return localMatch[0];
      }
      const listId = (target.isStage ? 'l_' : 'll_') + name + '_' + idCounter++;
      localLists[name] = listId;
      if (!host.lists) host.lists = {};
      host.lists[listId] = [name, []];
      nextOwned.localLists.add(listId);
      usedLocalListIds.add(listId);
      return listId;
    }

    function ensureList(name, isLocal = false) {
      if (isLocal || declaredLocalLists.has(name)) return ensureLocalList(name);
      if (lists[name]) {
        usedGlobalListIds.add(lists[name]);
        return lists[name];
      }
      const localMatch = Object.entries(target.lists || {}).find(([, v]) => v[0] === name);
      if (localMatch) {
        lists[name] = localMatch[0];
        if (prevOwned.localLists.has(localMatch[0])) nextOwned.localLists.add(localMatch[0]);
        usedLocalListIds.add(localMatch[0]);
        return localMatch[0];
      }
      const globalMatch = Object.entries(globalHost.lists || {}).find(([, v]) => v[0] === name);
      if (globalMatch) {
        lists[name] = globalMatch[0];
        if (prevOwned.globalLists.has(globalMatch[0])) nextOwned.globalLists.add(globalMatch[0]);
        usedGlobalListIds.add(globalMatch[0]);
        return globalMatch[0];
      }
      const listId = 'l_' + name + '_' + idCounter++;
      lists[name] = listId;
      if (!globalHost.lists) globalHost.lists = {};
      globalHost.lists[listId] = [name, []];
      nextOwned.globalLists.add(listId);
      usedGlobalListIds.add(listId);
      return listId;
    }

    function ensureBroadcast(msg) {
      if (!globalHost.broadcasts) globalHost.broadcasts = {};
      const existing = Object.entries(globalHost.broadcasts).find(([, v]) => v === msg);
      if (existing) {
        if (prevOwned.broadcasts.has(existing[0])) nextOwned.broadcasts.add(existing[0]);
        usedBroadcastIds.add(existing[0]);
        return existing[0];
      }
      const bId = 'bc_' + idCounter++;
      globalHost.broadcasts[bId] = msg;
      nextOwned.broadcasts.add(bId);
      usedBroadcastIds.add(bId);
      return bId;
    }

    function checkChoice(raw, whitelistKey, line, normalize = (v) => v) {
      const wl = FIELD_WHITELISTS[whitelistKey];
      const val = normalize(String(raw));
      if (!wl.values.includes(val)) {
        throw new CompileError(
          `Недопустиме значення "${raw}" для ${wl.label} у рядку ${line}. Допустимі: ${wl.values.map((v) => '"' + v + '"').join(', ')}.`,
          line
        );
      }
      return val;
    }

    // Literal string argument for a field; non-string expressions are rejected for field values.
    function literalArg(expr, defaultVal, what, line) {
      if (!expr) return defaultVal;
      if (expr.type !== 'String') {
        throw new CompileError(`${what} має бути текстом у лапках (рядок ${line}).`, line);
      }
      return expr.value === '' ? defaultVal : String(expr.value);
    }

    function checkKeyOption(raw, line) {
      const key = String(raw);
      if (!KEY_OPTIONS.has(key.toLowerCase())) {
        throw new CompileError(
          `Недопустима клавіша "${key}" у рядку ${line}. Допустимі: "space", "up arrow", "down arrow", "left arrow", "right arrow", "enter", "any", літери "a"-"z" та цифри "0"-"9".`,
          line
        );
      }
      return key;
    }

    function checkTargetKind(name, line) {
      if (target.isStage && SPRITE_ONLY_CALLS.has(name)) {
        throw new CompileError(
          `Блок "${name}()" (рядок ${line}) доступний лише спрайтам, а ви пишете код для Сцени.`,
          line
        );
      }
      if (!target.isStage && STAGE_ONLY_CALLS.has(name)) {
        throw new CompileError(
          `Блок "${name}()" (рядок ${line}) доступний лише на Сцені, а ви пишете код для спрайта.`,
          line
        );
      }
    }

    function createBlock(opcode, parentId, inputs = {}, fields = {}, extra = {}) {
      const id = genId();
      blocks[id] = {
        opcode,
        next: null,
        parent: parentId || null,
        inputs,
        fields,
        shadow: !!extra.shadow,
        topLevel: !!extra.topLevel
      };
      if (extra.mutation) {
        blocks[id].mutation = extra.mutation;
      }
      if (extra.comment) {
        blocks[id].comment = extra.comment;
      }
      if (extra.line) {
        // Non-breaking metadata for UI block->line highlighting (ignored by Scratch VM)
        Object.defineProperty(blocks[id], '_line', {
          value: extra.line,
          enumerable: false,
          configurable: true
        });
      }
      if (extra.topLevel) {
        blocks[id].x = extra.x || 40;
        blocks[id].y = extra.y || 40;
      }
      return id;
    }

    // Reads of a custom block parameter: boolean parameters use argument_reporter_boolean
    function createArgReporter(expr, parentId) {
      const opcode =
        activeProcedureBoolParams && activeProcedureBoolParams.has(expr.name)
          ? 'argument_reporter_boolean'
          : 'argument_reporter_string_number';
      return createBlock(opcode, parentId, {}, { VALUE: [expr.name, null] }, { line: expr.line });
    }

    function compileInput(expr, parentId, defaultShadowType = 4) {
      if (!expr) return [1, [defaultShadowType, '']];

      if (expr.type === 'Number') {
        return [1, [defaultShadowType === 10 ? 10 : 4, String(expr.value)]];
      }
      if (expr.type === 'String') {
        if (defaultShadowType === 9 && /^#[0-9a-fA-F]{6}$/.test(expr.value)) {
          return [1, [9, expr.value]];
        }
        return [1, [10, expr.value]];
      }
      if (expr.type === 'Bool') {
        return [1, [10, expr.value ? 'true' : 'false']];
      }
      if (expr.type === 'Var') {
        if (!expr.isLocal && activeProcedureParams && activeProcedureParams.has(expr.name)) {
          const argBlockId = createArgReporter(expr, parentId);
          return [3, argBlockId, [defaultShadowType, '']];
        }
        const varId = ensureVar(expr.name, !!expr.isLocal);
        return [3, [12, expr.name, varId], [defaultShadowType, '0']];
      }

      const blockId = compileReporter(expr, parentId);
      return [3, blockId, [defaultShadowType, '']];
    }

    function compileBoolInput(expr, parentId) {
      if (!expr) return undefined;
      if (expr.type === 'Bool') {
        if (expr.value) {
          const id = createBlock('operator_equals', parentId, {
            OPERAND1: [1, [10, '1']],
            OPERAND2: [1, [10, '1']]
          });
          return [2, id];
        } else {
          const id = createBlock('operator_equals', parentId, {
            OPERAND1: [1, [10, '1']],
            OPERAND2: [1, [10, '0']]
          });
          return [2, id];
        }
      }
      if (
        expr.type === 'Var' &&
        !expr.isLocal &&
        activeProcedureBoolParams &&
        activeProcedureBoolParams.has(expr.name)
      ) {
        return [2, createArgReporter(expr, parentId)];
      }
      if (expr.type === 'Var') {
        const id = createBlock('operator_equals', parentId);
        blocks[id].inputs = {
          OPERAND1: compileInput(expr, id, 10),
          OPERAND2: [1, [10, 'true']]
        };
        return [2, id];
      }
      const blockId = compileReporter(expr, parentId);
      return [2, blockId];
    }

    function compileShadowMenu(opcode, fieldName, fieldVal, parentId) {
      const id = createBlock(opcode, parentId, {}, { [fieldName]: [fieldVal, null] }, { shadow: true });
      return [1, id];
    }

    function compileShadowedExpr(expr, parentId, shadowPayload) {
      if (expr.type === 'Var') {
        if (!expr.isLocal && activeProcedureParams && activeProcedureParams.has(expr.name)) {
          const argBlockId = createArgReporter(expr, parentId);
          return [3, argBlockId, shadowPayload];
        }
        const varId = ensureVar(expr.name, !!expr.isLocal);
        return [3, [12, expr.name, varId], shadowPayload];
      }
      const repId = compileReporter(expr, parentId);
      return [3, repId, shadowPayload];
    }

    function compileMenuOrExpr(expr, menuOpcode, fieldName, defaultVal, parentId, normalizeLiteral = null) {
      if (!expr || expr.type === 'String') {
        let val = expr && expr.value !== undefined ? String(expr.value) : defaultVal;
        if (normalizeLiteral) val = normalizeLiteral(val);
        return compileShadowMenu(menuOpcode, fieldName, val, parentId);
      }
      const shadowId = createBlock(menuOpcode, parentId, {}, { [fieldName]: [defaultVal, null] }, { shadow: true });
      return compileShadowedExpr(expr, parentId, shadowId);
    }

    // Menu slot that holds a number (drum, note, instrument): a numeric literal fills the menu shadow,
    // any other expression is plugged on top of a default menu shadow.
    function compileNumMenuOrExpr(expr, menuOpcode, fieldName, defaultVal, parentId, what, line) {
      let literal = null;
      if (!expr) {
        literal = defaultVal;
      } else if (expr.type === 'Number') {
        literal = String(expr.value);
      } else if (expr.type === 'String') {
        if (expr.value !== '' && Number.isFinite(Number(expr.value))) literal = String(Number(expr.value));
        else {
          throw new CompileError(`${what} має бути числом (рядок ${line}), а не текстом "${expr.value}".`, line);
        }
      }
      if (literal !== null) return compileShadowMenu(menuOpcode, fieldName, literal, parentId);
      const shadowId = createBlock(menuOpcode, parentId, {}, { [fieldName]: [defaultVal, null] }, { shadow: true });
      return compileShadowedExpr(expr, parentId, shadowId);
    }

    // show_variable / hide_variable / show_list / hide_list keep a (hidden by default) monitor entry in project.json
    function ensureMonitor(kind, name, id) {
      if (!projectJson || !id) return;
      if (!Array.isArray(projectJson.monitors)) projectJson.monitors = [];
      if (projectJson.monitors.some((m) => m && m.id === id)) return;
      const isList = kind === 'list';
      const store = (isList ? target.lists : target.variables) || {};
      const isLocal = !target.isStage && store[id] !== undefined;
      const host = isLocal ? target : globalHost;
      const entry = (isList ? host.lists : host.variables) || {};
      const slot = projectJson.monitors.length % 12;
      const monitor = {
        id,
        mode: isList ? 'list' : 'default',
        opcode: isList ? 'data_listcontents' : 'data_variable',
        params: isList ? { LIST: name } : { VARIABLE: name },
        spriteName: isLocal ? target.name : null,
        value: entry[id] ? (isList ? [...(entry[id][1] || [])] : entry[id][1]) : isList ? [] : 0,
        width: 0,
        height: 0,
        x: 5,
        y: 5 + slot * 26,
        visible: false
      };
      if (!isList) {
        monitor.sliderMin = 0;
        monitor.sliderMax = 100;
        monitor.isDiscrete = true;
      }
      projectJson.monitors.push(monitor);
    }

    function compileBroadcastInput(expr, parentId) {
      if (!expr || expr.type === 'String') {
        const msg = expr && expr.value ? String(expr.value) : 'message1';
        const bId = ensureBroadcast(msg);
        return [1, [11, msg, bId]];
      }
      const defaultBId = ensureBroadcast('message1');
      return compileShadowedExpr(expr, parentId, [11, 'message1', defaultBId]);
    }

    function compileReporter(expr, parentId) {
      if (expr.type === 'UnaryOp' && expr.op === '-') {
        const id = createBlock('operator_subtract', parentId, {}, {}, { line: expr.line });
        blocks[id].inputs = {
          NUM1: [1, [4, '0']],
          NUM2: compileInput(expr.expr, id, 4)
        };
        return id;
      }
      if (expr.type === 'UnaryOp' && expr.op === 'not') {
        const id = createBlock('operator_not', parentId, {}, {}, { line: expr.line });
        blocks[id].inputs = { OPERAND: compileBoolInput(expr.expr, id) };
        return id;
      }
      if (expr.type === 'BinOp') {
        if (expr.op === '!=' || expr.op === '<=' || expr.op === '>=') {
          const innerOp =
            expr.op === '!=' ? 'operator_equals' : expr.op === '<=' ? 'operator_gt' : 'operator_lt';
          const notId = createBlock('operator_not', parentId, {}, {}, { line: expr.line });
          const innerId = createBlock(innerOp, notId, {}, {}, { line: expr.line });
          blocks[innerId].inputs = {
            OPERAND1: compileInput(expr.left, innerId, 10),
            OPERAND2: compileInput(expr.right, innerId, 10)
          };
          blocks[notId].inputs = { OPERAND: [2, innerId] };
          return notId;
        }

        const opMap = {
          '+': ['operator_add', 'NUM1', 'NUM2', 4],
          '-': ['operator_subtract', 'NUM1', 'NUM2', 4],
          '*': ['operator_multiply', 'NUM1', 'NUM2', 4],
          '/': ['operator_divide', 'NUM1', 'NUM2', 4],
          '%': ['operator_mod', 'NUM1', 'NUM2', 4],
          '==': ['operator_equals', 'OPERAND1', 'OPERAND2', 10],
          '<': ['operator_lt', 'OPERAND1', 'OPERAND2', 10],
          '>': ['operator_gt', 'OPERAND1', 'OPERAND2', 10],
          and: ['operator_and', 'OPERAND1', 'OPERAND2', 'bool'],
          or: ['operator_or', 'OPERAND1', 'OPERAND2', 'bool']
        };
        const spec = opMap[expr.op];
        if (!spec) throw new CompileError(`Непідтримуваний оператор "${expr.op}" у рядку ${expr.line}.`, expr.line);
        const id = createBlock(spec[0], parentId, {}, {}, { line: expr.line });
        if (spec[3] === 'bool') {
          blocks[id].inputs = {
            [spec[1]]: compileBoolInput(expr.left, id),
            [spec[2]]: compileBoolInput(expr.right, id)
          };
        } else {
          blocks[id].inputs = {
            [spec[1]]: compileInput(expr.left, id, spec[3]),
            [spec[2]]: compileInput(expr.right, id, spec[3])
          };
        }
        return id;
      }

      if (expr.type === 'Call') {
        const a = expr.args;
        checkTargetKind(expr.name, expr.line);
        switch (expr.name) {
          case 'x_position':
            return createBlock('motion_xposition', parentId, {}, {}, { line: expr.line });
          case 'y_position':
            return createBlock('motion_yposition', parentId, {}, {}, { line: expr.line });
          case 'direction':
            return createBlock('motion_direction', parentId, {}, {}, { line: expr.line });
          case 'size':
            return createBlock('looks_size', parentId, {}, {}, { line: expr.line });
          case 'costume_number':
            return createBlock('looks_costumenumbername', parentId, {}, { NUMBER_NAME: ['number', null] }, { line: expr.line });
          case 'costume_name':
            return createBlock('looks_costumenumbername', parentId, {}, { NUMBER_NAME: ['name', null] }, { line: expr.line });
          case 'backdrop_number':
            return createBlock('looks_backdropnumbername', parentId, {}, { NUMBER_NAME: ['number', null] }, { line: expr.line });
          case 'backdrop_name':
            return createBlock('looks_backdropnumbername', parentId, {}, { NUMBER_NAME: ['name', null] }, { line: expr.line });
          case 'volume':
            return createBlock('sound_volume', parentId, {}, {}, { line: expr.line });
          case 'answer':
            return createBlock('sensing_answer', parentId, {}, {}, { line: expr.line });
          case 'mouse_x':
            return createBlock('sensing_mousex', parentId, {}, {}, { line: expr.line });
          case 'mouse_y':
            return createBlock('sensing_mousey', parentId, {}, {}, { line: expr.line });
          case 'mouse_down':
            return createBlock('sensing_mousedown', parentId, {}, {}, { line: expr.line });
          case 'timer':
            return createBlock('sensing_timer', parentId, {}, {}, { line: expr.line });
          case 'random': {
            const id = createBlock('operator_random', parentId, {}, {}, { line: expr.line });
            blocks[id].inputs = {
              FROM: compileInput(a[0], id, 4),
              TO: compileInput(a[1], id, 4)
            };
            return id;
          }
          case 'join': {
            const id = createBlock('operator_join', parentId, {}, {}, { line: expr.line });
            blocks[id].inputs = {
              STRING1: compileInput(a[0], id, 10),
              STRING2: compileInput(a[1], id, 10)
            };
            return id;
          }
          case 'letter_of': {
            const id = createBlock('operator_letter_of', parentId, {}, {}, { line: expr.line });
            blocks[id].inputs = {
              LETTER: compileInput(a[0], id, 4),
              STRING: compileInput(a[1], id, 10)
            };
            return id;
          }
          case 'len':
          case 'length_of': {
            const id = createBlock('operator_length', parentId, {}, {}, { line: expr.line });
            blocks[id].inputs = { STRING: compileInput(a[0], id, 10) };
            return id;
          }
          case 'contains': {
            const id = createBlock('operator_contains', parentId, {}, {}, { line: expr.line });
            blocks[id].inputs = {
              STRING1: compileInput(a[0], id, 10),
              STRING2: compileInput(a[1], id, 10)
            };
            return id;
          }
          case 'round_num':
          case 'round': {
            const id = createBlock('operator_round', parentId, {}, {}, { line: expr.line });
            blocks[id].inputs = { NUM: compileInput(a[0], id, 4) };
            return id;
          }
          case 'math_op': {
            const opName = checkChoice(literalArg(a[0], 'abs', 'Назва операції math_op', expr.line), 'mathOp', expr.line);
            const id = createBlock('operator_mathop', parentId, {}, { OPERATOR: [opName, null] }, { line: expr.line });
            blocks[id].inputs = { NUM: compileInput(a[1], id, 4) };
            return id;
          }
          case 'key_pressed': {
            const id = createBlock('sensing_keypressed', parentId, {}, {}, { line: expr.line });
            blocks[id].inputs = {
              KEY_OPTION: compileMenuOrExpr(a[0], 'sensing_keyoptions', 'KEY_OPTION', 'space', id, (v) =>
                checkKeyOption(v, expr.line)
              )
            };
            return id;
          }
          case 'touching': {
            const id = createBlock('sensing_touchingobject', parentId, {}, {}, { line: expr.line });
            blocks[id].inputs = {
              TOUCHINGOBJECTMENU: compileMenuOrExpr(
                a[0],
                'sensing_touchingobjectmenu',
                'TOUCHINGOBJECTMENU',
                '_edge_',
                id,
                (v) => (v === '' || v === 'edge' ? '_edge_' : v === 'mouse' ? '_mouse_' : v)
              )
            };
            return id;
          }
          case 'distance_to': {
            const id = createBlock('sensing_distanceto', parentId, {}, {}, { line: expr.line });
            blocks[id].inputs = {
              DISTANCETOMENU: compileMenuOrExpr(
                a[0],
                'sensing_distancetomenu',
                'DISTANCETOMENU',
                '_mouse_',
                id,
                (v) => (v === '' || v === 'mouse' ? '_mouse_' : v)
              )
            };
            return id;
          }
          case 'attribute_of': {
            const prop = literalArg(a[0], 'x position', 'Назва властивості attribute_of', expr.line);
            const knownProp = SENSING_OF_PROPERTIES.find((p) => p.toLowerCase() === prop.toLowerCase());
            if (knownProp && knownProp !== prop) {
              throw new CompileError(
                `Недопустима властивість "${prop}" у рядку ${expr.line}. Напишіть "${knownProp}" (регістр має значення). Допустимі: ${SENSING_OF_PROPERTIES.map((v) => '"' + v + '"').join(', ')} або назва змінної.`,
                expr.line
              );
            }
            const id = createBlock('sensing_of', parentId, {}, { PROPERTY: [prop, null] }, { line: expr.line });
            blocks[id].inputs = {
              OBJECT: compileMenuOrExpr(
                a[1],
                'sensing_of_object_menu',
                'OBJECT',
                '_stage_',
                id,
                (v) => (v === '' || v === 'Stage' || v === 'stage' ? '_stage_' : v)
              )
            };
            return id;
          }
          case 'touching_color': {
            const id = createBlock('sensing_touchingcolor', parentId, {}, {}, { line: expr.line });
            blocks[id].inputs = { COLOR: compileInput(a[0], id, 9) };
            return id;
          }
          case 'color_is_touching_color': {
            const id = createBlock('sensing_coloristouchingcolor', parentId, {}, {}, { line: expr.line });
            blocks[id].inputs = {
              COLOR: compileInput(a[0], id, 9),
              COLOR2: compileInput(a[1], id, 9)
            };
            return id;
          }
          case 'current_time': {
            const unit = checkChoice(
              literalArg(a[0], 'YEAR', 'Одиниця часу current_time', expr.line),
              'currentMenu',
              expr.line,
              (v) => v.toUpperCase()
            );
            return createBlock('sensing_current', parentId, {}, { CURRENTMENU: [unit, null] }, { line: expr.line });
          }
          case 'days_since_2000':
            return createBlock('sensing_dayssince2000', parentId, {}, {}, { line: expr.line });
          case 'username':
            return createBlock('sensing_username', parentId, {}, {}, { line: expr.line });
          case 'loudness':
            return createBlock('sensing_loudness', parentId, {}, {}, { line: expr.line });
          case 'tempo':
            return createBlock('music_getTempo', parentId, {}, {}, { line: expr.line });
          case 'language':
            return createBlock('translate_getViewerLanguage', parentId, {}, {}, { line: expr.line });
          case 'translate': {
            const id = createBlock('translate_getTranslate', parentId, {}, {}, { line: expr.line });
            blocks[id].inputs = {
              WORDS: compileInput(a[0], id, 10),
              LANGUAGE: compileMenuOrExpr(a[1], 'translate_menu_languages', 'languages', 'en', id)
            };
            return id;
          }
          case 'list_item':
          case 'local_list_item': {
            const listName = a[0] && a[0].value ? String(a[0].value) : 'list';
            const listId = ensureList(listName, expr.name === 'local_list_item');
            const id = createBlock('data_itemoflist', parentId, {}, { LIST: [listName, listId] }, { line: expr.line });
            blocks[id].inputs = { INDEX: compileInput(a[1], id, 7) };
            return id;
          }
          case 'list_length':
          case 'local_list_length': {
            const listName = a[0] && a[0].value ? String(a[0].value) : 'list';
            const listId = ensureList(listName, expr.name === 'local_list_length');
            return createBlock('data_lengthoflist', parentId, {}, { LIST: [listName, listId] }, { line: expr.line });
          }
          case 'list_contains':
          case 'local_list_contains': {
            const listName = a[0] && a[0].value ? String(a[0].value) : 'list';
            const listId = ensureList(listName, expr.name === 'local_list_contains');
            const id = createBlock('data_listcontainsitem', parentId, {}, { LIST: [listName, listId] }, { line: expr.line });
            blocks[id].inputs = { ITEM: compileInput(a[1], id, 10) };
            return id;
          }
          case 'list_index_of':
          case 'local_list_index_of': {
            const listName = a[0] && a[0].value ? String(a[0].value) : 'list';
            const listId = ensureList(listName, expr.name === 'local_list_index_of');
            const id = createBlock('data_itemnumoflist', parentId, {}, { LIST: [listName, listId] }, { line: expr.line });
            blocks[id].inputs = { ITEM: compileInput(a[1], id, 10) };
            return id;
          }
        }

        if (MATH_OP_ALIASES[expr.name]) {
          const opName = MATH_OP_ALIASES[expr.name];
          const id = createBlock('operator_mathop', parentId, {}, { OPERATOR: [opName, null] }, { line: expr.line });
          blocks[id].inputs = { NUM: compileInput(a[0], id, 4) };
          return id;
        }

        throw new CompileError(`Невідома функція-значення "${expr.name}()" у рядку ${expr.line}.`, expr.line);
      }
      throw new CompileError(`Неможливо обчислити вираз у рядку ${expr.line}.`, expr.line);
    }

    function astUsesVar(node, varName) {
      if (!node) return false;
      if (Array.isArray(node)) return node.some((n) => astUsesVar(n, varName));
      if (typeof node !== 'object') return false;
      if (
        (node.type === 'Var' || node.type === 'Assign' || node.type === 'ChangeVar') &&
        !node.isLocal &&
        node.name === varName
      ) {
        return true;
      }
      return Object.values(node).some((val) => val && typeof val === 'object' && astUsesVar(val, varName));
    }

    function compileStmtList(stmts, parentId) {
      let firstId = null;
      let prevId = parentId;

      for (const stmt of stmts) {
        if (stmt.type === 'Pass') continue;
        stmtTailId = null;
        currentLine = stmt.line;
        const id = compileStmt(stmt, prevId);
        const tailId = stmtTailId || id;
        stmtTailId = null;
        if (!id) continue;
        if (!firstId) firstId = id;
        if (prevId && prevId !== parentId) {
          blocks[prevId].next = id;
        }
        prevId = tailId;
      }
      return firstId;
    }

    function compileStmt(stmt, parentId) {
      if (stmt.type === 'Pass') return null;

      if (stmt.type === 'Assign') {
        const varId = ensureVar(stmt.name, !!stmt.isLocal);
        const id = createBlock('data_setvariableto', parentId, {}, { VARIABLE: [stmt.name, varId] }, { line: stmt.line });
        blocks[id].inputs = { VALUE: compileInput(stmt.value, id, 10) };
        return id;
      }
      if (stmt.type === 'ChangeVar') {
        const varId = ensureVar(stmt.name, !!stmt.isLocal);
        const id = createBlock('data_changevariableby', parentId, {}, { VARIABLE: [stmt.name, varId] }, { line: stmt.line });
        blocks[id].inputs = { VALUE: compileInput(stmt.value, id, 4) };
        return id;
      }
      if (stmt.type === 'Repeat') {
        // "for i in range(n)" with a body that reads i: emit "set i to 0" before the loop and
        // "change i by 1" at the end of the body, so .sb3 matches the preview (i = 0..n-1).
        const realBody = stmt.body.filter((st) => st.type !== 'Pass');
        const lastStmt = realBody[realBody.length - 1];
        const alreadyIncrements =
          lastStmt &&
          lastStmt.type === 'ChangeVar' &&
          !lastStmt.isLocal &&
          lastStmt.name === stmt.loopVar &&
          lastStmt.value &&
          lastStmt.value.type === 'Number' &&
          lastStmt.value.value === 1;
        const needsCounter =
          !!stmt.loopVar &&
          !(activeProcedureParams && activeProcedureParams.has(stmt.loopVar)) &&
          astUsesVar(stmt.body, stmt.loopVar);
        let initId = null;
        let loopVarId = null;
        if (needsCounter) {
          loopVarId = ensureVar(stmt.loopVar, false);
          if (!alreadyIncrements) {
            initId = createBlock(
              'data_setvariableto',
              parentId,
              {},
              { VARIABLE: [stmt.loopVar, loopVarId] },
              { line: stmt.line }
            );
            blocks[initId].inputs = { VALUE: [1, [10, '0']] };
          }
        }
        const id = createBlock('control_repeat', initId || parentId, {}, {}, { line: stmt.line });
        blocks[id].inputs = { TIMES: compileInput(stmt.count, id, 4) };
        const subFirst = compileStmtList(stmt.body, id);
        if (subFirst) blocks[id].inputs.SUBSTACK = [2, subFirst];
        if (needsCounter && !alreadyIncrements && subFirst) {
          let lastId = subFirst;
          while (blocks[lastId].next) lastId = blocks[lastId].next;
          const incId = createBlock(
            'data_changevariableby',
            lastId,
            {},
            { VARIABLE: [stmt.loopVar, loopVarId] },
            { line: stmt.line }
          );
          blocks[incId].inputs = { VALUE: [1, [4, '1']] };
          blocks[lastId].next = incId;
        }
        if (initId) {
          blocks[initId].next = id;
          stmtTailId = id;
          return initId;
        }
        return id;
      }
      if (stmt.type === 'Forever') {
        const id = createBlock('control_forever', parentId, {}, {}, { line: stmt.line });
        const subFirst = compileStmtList(stmt.body, id);
        if (subFirst) blocks[id].inputs = { SUBSTACK: [2, subFirst] };
        return id;
      }
      if (stmt.type === 'RepeatUntil') {
        const id = createBlock('control_repeat_until', parentId, {}, {}, { line: stmt.line });
        blocks[id].inputs = { CONDITION: compileBoolInput(stmt.cond, id) };
        const subFirst = compileStmtList(stmt.body, id);
        if (subFirst) blocks[id].inputs.SUBSTACK = [2, subFirst];
        return id;
      }
      if (stmt.type === 'If') {
        const hasElse = stmt.elseBody && stmt.elseBody.some((s) => s.type !== 'Pass');
        const opcode = hasElse ? 'control_if_else' : 'control_if';
        const id = createBlock(opcode, parentId, {}, {}, { line: stmt.line });
        blocks[id].inputs = { CONDITION: compileBoolInput(stmt.cond, id) };
        const thenFirst = compileStmtList(stmt.thenBody, id);
        if (thenFirst) blocks[id].inputs.SUBSTACK = [2, thenFirst];
        if (hasElse) {
          const elseFirst = compileStmtList(stmt.elseBody, id);
          if (elseFirst) blocks[id].inputs.SUBSTACK2 = [2, elseFirst];
        }
        return id;
      }
      if (stmt.type === 'Call') {
        return compileCallStmt(stmt, parentId);
      }
      throw new CompileError(`Непідтримувана конструкція у рядку ${stmt.line}.`, stmt.line);
    }

    function compileCallStmt(stmt, parentId) {
      const a = stmt.args;
      checkTargetKind(stmt.name, stmt.line);

      // Check if calling a user-defined procedure (My Block)
      if (procedures[stmt.name]) {
        const proc = procedures[stmt.name];
        if (a.length !== proc.paramNames.length) {
          throw new CompileError(
            `Функція "${stmt.name}" очікує аргументів: ${proc.paramNames.length}, а передано ${a.length} (рядок ${stmt.line}).`,
            stmt.line
          );
        }
        const id = createBlock(
          'procedures_call',
          parentId,
          {},
          {},
          {
            line: stmt.line,
            mutation: {
              tagName: 'mutation',
              children: [],
              proccode: proc.proccode,
              argumentids: JSON.stringify(proc.paramIds),
              warp: proc.warp ? 'true' : 'false'
            }
          }
        );
        const inputs = {};
        const argKinds = String(proc.proccode || '').match(/%[sb]/g) || [];
        proc.paramIds.forEach((pId, idx) => {
          if (argKinds[idx] === '%b') {
            // a number / text literal in a boolean slot counts as true unless it is 0, "" or "false"
            let argExpr = a[idx];
            if (argExpr && (argExpr.type === 'Number' || argExpr.type === 'String')) {
              const v = argExpr.value;
              argExpr = { type: 'Bool', value: !(v === 0 || v === '' || v === '0' || String(v).toLowerCase() === 'false'), line: argExpr.line };
            }
            inputs[pId] = compileBoolInput(argExpr, id) || [1, [10, '']];
          } else {
            inputs[pId] = compileInput(a[idx], id, 10);
          }
        });
        blocks[id].inputs = inputs;
        return id;
      }

      if (stmt.name === 'local_list') {
        const listName = a[0] && a[0].value ? String(a[0].value) : 'list';
        ensureLocalList(listName);
        return null;
      }

      const id = createBlock('placeholder', parentId, {}, {}, { line: stmt.line });

      const mapSimple = {
        move: ['motion_movesteps', 'STEPS', 4],
        turn_right: ['motion_turnright', 'DEGREES', 4],
        turn_left: ['motion_turnleft', 'DEGREES', 4],
        set_x: ['motion_setx', 'X', 4],
        set_y: ['motion_sety', 'Y', 4],
        change_x: ['motion_changexby', 'DX', 4],
        change_y: ['motion_changeyby', 'DY', 4],
        point_in_direction: ['motion_pointindirection', 'DIRECTION', 4],
        set_size: ['looks_setsizeto', 'SIZE', 4],
        change_size: ['looks_changesizeby', 'CHANGE', 4],
        set_volume: ['sound_setvolumeto', 'VOLUME', 4],
        change_volume: ['sound_changevolumeby', 'VOLUME', 4],
        wait: ['control_wait', 'DURATION', 4],
        ask: ['sensing_askandwait', 'QUESTION', 10],
        rest: ['music_restForBeats', 'BEATS', 4],
        set_tempo: ['music_setTempo', 'TEMPO', 4],
        change_tempo: ['music_changeTempo', 'TEMPO', 4],
        speak: ['text2speech_speakAndWait', 'WORDS', 10]
      };

      if (mapSimple[stmt.name]) {
        const [op, inpName, shadowType] = mapSimple[stmt.name];
        blocks[id].opcode = op;
        blocks[id].inputs = { [inpName]: compileInput(a[0], id, shadowType) };
        return id;
      }

      switch (stmt.name) {
        case 'goto':
          if (a.length === 1) {
            blocks[id].opcode = 'motion_goto';
            blocks[id].inputs = {
              TO: compileMenuOrExpr(
                a[0],
                'motion_goto_menu',
                'TO',
                '_random_',
                id,
                (v) => (v === '' || v === 'random' ? '_random_' : v === 'mouse' ? '_mouse_' : v)
              )
            };
            return id;
          }
          blocks[id].opcode = 'motion_gotoxy';
          blocks[id].inputs = { X: compileInput(a[0], id, 4), Y: compileInput(a[1], id, 4) };
          return id;
        case 'goto_random':
          blocks[id].opcode = 'motion_goto';
          blocks[id].inputs = { TO: compileShadowMenu('motion_goto_menu', 'TO', '_random_', id) };
          return id;
        case 'goto_mouse':
          blocks[id].opcode = 'motion_goto';
          blocks[id].inputs = { TO: compileShadowMenu('motion_goto_menu', 'TO', '_mouse_', id) };
          return id;
        case 'glide':
          blocks[id].opcode = 'motion_glidesecstoxy';
          blocks[id].inputs = {
            SECS: compileInput(a[0], id, 4),
            X: compileInput(a[1], id, 4),
            Y: compileInput(a[2], id, 4)
          };
          return id;
        case 'glide_to':
          blocks[id].opcode = 'motion_glideto';
          blocks[id].inputs = {
            SECS: compileInput(a[0], id, 4),
            TO: compileMenuOrExpr(
              a[1],
              'motion_glideto_menu',
              'TO',
              '_random_',
              id,
              (v) => (v === '' || v === 'random' ? '_random_' : v === 'mouse' ? '_mouse_' : v)
            )
          };
          return id;
        case 'point_towards':
          blocks[id].opcode = 'motion_pointtowards';
          blocks[id].inputs = {
            TOWARDS: compileMenuOrExpr(
              a[0],
              'motion_pointtowards_menu',
              'TOWARDS',
              '_mouse_',
              id,
              (v) => (v === '' || v === 'mouse' ? '_mouse_' : v)
            )
          };
          return id;
        case 'if_on_edge_bounce':
          blocks[id].opcode = 'motion_ifonedgebounce';
          return id;
        case 'set_rotation_style': {
          const style = checkChoice(literalArg(a[0], 'all around', 'Стиль обертання', stmt.line), 'rotationStyle', stmt.line);
          blocks[id].opcode = 'motion_setrotationstyle';
          blocks[id].fields = { STYLE: [style, null] };
          return id;
        }
        case 'switch_backdrop':
          blocks[id].opcode = 'looks_switchbackdropto';
          blocks[id].inputs = {
            BACKDROP: compileMenuOrExpr(a[0], 'looks_backdrops', 'BACKDROP', 'backdrop1', id)
          };
          return id;
        case 'switch_backdrop_and_wait':
          blocks[id].opcode = 'looks_switchbackdroptoandwait';
          blocks[id].inputs = {
            BACKDROP: compileMenuOrExpr(a[0], 'looks_backdrops', 'BACKDROP', 'backdrop1', id)
          };
          return id;
        case 'next_backdrop':
          blocks[id].opcode = 'looks_nextbackdrop';
          return id;
        case 'go_to_layer': {
          const layer = a[0] && a[0].value ? String(a[0].value).toLowerCase() : 'front';
          blocks[id].opcode = 'looks_gotofrontback';
          blocks[id].fields = { FRONT_BACK: [layer === 'back' ? 'back' : 'front', null] };
          return id;
        }
        case 'change_layer': {
          const dir = a[0] && a[0].value ? String(a[0].value).toLowerCase() : 'forward';
          blocks[id].opcode = 'looks_goforwardbackwardlayers';
          blocks[id].fields = { FORWARD_BACKWARD: [dir === 'backward' ? 'backward' : 'forward', null] };
          blocks[id].inputs = { NUM: compileInput(a[1], id, 7) };
          return id;
        }
        case 'switch_costume':
          blocks[id].opcode = 'looks_switchcostumeto';
          blocks[id].inputs = {
            COSTUME: compileMenuOrExpr(a[0], 'looks_costume', 'COSTUME', 'costume1', id)
          };
          return id;
        case 'next_costume':
          blocks[id].opcode = 'looks_nextcostume';
          return id;
        case 'say':
          if (a.length >= 2) {
            blocks[id].opcode = 'looks_sayforsecs';
            blocks[id].inputs = { MESSAGE: compileInput(a[0], id, 10), SECS: compileInput(a[1], id, 4) };
          } else {
            blocks[id].opcode = 'looks_say';
            blocks[id].inputs = { MESSAGE: compileInput(a[0], id, 10) };
          }
          return id;
        case 'think':
          if (a.length >= 2) {
            blocks[id].opcode = 'looks_thinkforsecs';
            blocks[id].inputs = { MESSAGE: compileInput(a[0], id, 10), SECS: compileInput(a[1], id, 4) };
          } else {
            blocks[id].opcode = 'looks_think';
            blocks[id].inputs = { MESSAGE: compileInput(a[0], id, 10) };
          }
          return id;
        case 'set_effect': {
          const eff = checkChoice(literalArg(a[0], 'COLOR', 'Назва ефекту', stmt.line), 'looksEffect', stmt.line, (v) => v.toUpperCase());
          blocks[id].opcode = 'looks_seteffectto';
          blocks[id].fields = { EFFECT: [eff, null] };
          blocks[id].inputs = { VALUE: compileInput(a[1], id, 4) };
          return id;
        }
        case 'change_effect': {
          const eff = checkChoice(literalArg(a[0], 'COLOR', 'Назва ефекту', stmt.line), 'looksEffect', stmt.line, (v) => v.toUpperCase());
          blocks[id].opcode = 'looks_changeeffectby';
          blocks[id].fields = { EFFECT: [eff, null] };
          blocks[id].inputs = { CHANGE: compileInput(a[1], id, 4) };
          return id;
        }
        case 'clear_effects':
          blocks[id].opcode = 'looks_cleargraphiceffects';
          return id;
        case 'show':
          blocks[id].opcode = 'looks_show';
          return id;
        case 'hide':
          blocks[id].opcode = 'looks_hide';
          return id;
        case 'play_sound':
          blocks[id].opcode = 'sound_play';
          blocks[id].inputs = {
            SOUND_MENU: compileMenuOrExpr(a[0], 'sound_sounds_menu', 'SOUND_MENU', 'pop', id)
          };
          return id;
        case 'play_sound_until_done':
          blocks[id].opcode = 'sound_playuntildone';
          blocks[id].inputs = {
            SOUND_MENU: compileMenuOrExpr(a[0], 'sound_sounds_menu', 'SOUND_MENU', 'pop', id)
          };
          return id;
        case 'stop_all_sounds':
          blocks[id].opcode = 'sound_stopallsounds';
          return id;
        case 'set_sound_effect': {
          const eff = checkChoice(literalArg(a[0], 'PITCH', 'Назва ефекту звуку', stmt.line), 'soundEffect', stmt.line, (v) => v.toUpperCase());
          blocks[id].opcode = 'sound_seteffectto';
          blocks[id].fields = { EFFECT: [eff, null] };
          blocks[id].inputs = { VALUE: compileInput(a[1], id, 4) };
          return id;
        }
        case 'change_sound_effect': {
          const eff = checkChoice(literalArg(a[0], 'PITCH', 'Назва ефекту звуку', stmt.line), 'soundEffect', stmt.line, (v) => v.toUpperCase());
          blocks[id].opcode = 'sound_changeeffectby';
          blocks[id].fields = { EFFECT: [eff, null] };
          blocks[id].inputs = { VALUE: compileInput(a[1], id, 4) };
          return id;
        }
        case 'clear_sound_effects':
          blocks[id].opcode = 'sound_cleareffects';
          return id;
        case 'pen_clear':
          usesPen = true;
          blocks[id].opcode = 'pen_clear';
          return id;
        case 'pen_stamp':
          usesPen = true;
          blocks[id].opcode = 'pen_stamp';
          return id;
        case 'pen_down':
          usesPen = true;
          blocks[id].opcode = 'pen_penDown';
          return id;
        case 'pen_up':
          usesPen = true;
          blocks[id].opcode = 'pen_penUp';
          return id;
        case 'set_pen_color':
          usesPen = true;
          blocks[id].opcode = 'pen_setPenColorToColor';
          blocks[id].inputs = { COLOR: compileInput(a[0], id, 9) };
          return id;
        case 'set_pen_param': {
          usesPen = true;
          blocks[id].opcode = 'pen_setPenColorParamTo';
          blocks[id].inputs = {
            COLOR_PARAM: compileMenuOrExpr(a[0], 'pen_menu_colorParam', 'colorParam', 'color', id),
            VALUE: compileInput(a[1], id, 4)
          };
          return id;
        }
        case 'change_pen_param': {
          usesPen = true;
          blocks[id].opcode = 'pen_changePenColorParamBy';
          blocks[id].inputs = {
            COLOR_PARAM: compileMenuOrExpr(a[0], 'pen_menu_colorParam', 'colorParam', 'color', id),
            VALUE: compileInput(a[1], id, 4)
          };
          return id;
        }
        case 'set_pen_size':
          usesPen = true;
          blocks[id].opcode = 'pen_setPenSizeTo';
          blocks[id].inputs = { SIZE: compileInput(a[0], id, 4) };
          return id;
        case 'change_pen_size':
          usesPen = true;
          blocks[id].opcode = 'pen_changePenSizeBy';
          blocks[id].inputs = { SIZE: compileInput(a[0], id, 4) };
          return id;
        case 'wait_until':
          blocks[id].opcode = 'control_wait_until';
          blocks[id].inputs = { CONDITION: compileBoolInput(a[0], id) };
          return id;
        case 'stop': {
          const opt = checkChoice(literalArg(a[0], 'all', 'Параметр stop()', stmt.line), 'stopOption', stmt.line);
          blocks[id].opcode = 'control_stop';
          blocks[id].fields = { STOP_OPTION: [opt, null] };
          blocks[id].mutation = {
            tagName: 'mutation',
            children: [],
            hasnext: String(opt === 'other scripts in sprite')
          };
          return id;
        }
        case 'create_clone':
          blocks[id].opcode = 'control_create_clone_of';
          blocks[id].inputs = {
            CLONE_OPTION: compileMenuOrExpr(
              a[0],
              'control_create_clone_of_menu',
              'CLONE_OPTION',
              '_myself_',
              id,
              (v) => (v === '' || v === 'myself' ? '_myself_' : v)
            )
          };
          return id;
        case 'delete_this_clone':
          blocks[id].opcode = 'control_delete_this_clone';
          return id;
        case 'set_drag_mode': {
          const mode = checkChoice(literalArg(a[0], 'draggable', 'Режим перетягування', stmt.line), 'dragMode', stmt.line);
          blocks[id].opcode = 'sensing_setdragmode';
          blocks[id].fields = { DRAG_MODE: [mode, null] };
          return id;
        }
        case 'reset_timer':
          blocks[id].opcode = 'sensing_resettimer';
          return id;
        case 'broadcast':
          blocks[id].opcode = 'event_broadcast';
          blocks[id].inputs = { BROADCAST_INPUT: compileBroadcastInput(a[0], id) };
          return id;
        case 'broadcast_and_wait':
          blocks[id].opcode = 'event_broadcastandwait';
          blocks[id].inputs = { BROADCAST_INPUT: compileBroadcastInput(a[0], id) };
          return id;
        case 'show_variable':
        case 'hide_variable': {
          const arg = a[0];
          const varName = arg && arg.type === 'Var' ? arg.name : arg && arg.value !== undefined ? String(arg.value) : 'var';
          const isLocal = !!(arg && arg.type === 'Var' && arg.isLocal);
          const varId = ensureVar(varName, isLocal);
          blocks[id].opcode = stmt.name === 'show_variable' ? 'data_showvariable' : 'data_hidevariable';
          blocks[id].fields = { VARIABLE: [varName, varId] };
          ensureMonitor('variable', varName, varId);
          return id;
        }
        case 'show_list':
        case 'hide_list': {
          const listName = a[0] && a[0].value ? String(a[0].value) : 'list';
          const listId = ensureList(listName);
          blocks[id].opcode = stmt.name === 'show_list' ? 'data_showlist' : 'data_hidelist';
          blocks[id].fields = { LIST: [listName, listId] };
          ensureMonitor('list', listName, listId);
          return id;
        }
        case 'play_drum':
          blocks[id].opcode = 'music_playDrumForBeats';
          blocks[id].inputs = {
            DRUM: compileNumMenuOrExpr(a[0], 'music_menu_DRUM', 'DRUM', '1', id, 'Номер барабана', stmt.line),
            BEATS: compileInput(a[1], id, 4)
          };
          return id;
        case 'play_note':
          blocks[id].opcode = 'music_playNoteForBeats';
          blocks[id].inputs = {
            NOTE: compileNumMenuOrExpr(a[0], 'note', 'NOTE', '60', id, 'Нота (MIDI-номер)', stmt.line),
            BEATS: compileInput(a[1], id, 4)
          };
          return id;
        case 'set_instrument':
          blocks[id].opcode = 'music_setInstrument';
          blocks[id].inputs = {
            INSTRUMENT: compileNumMenuOrExpr(a[0], 'music_menu_INSTRUMENT', 'INSTRUMENT', '1', id, 'Номер інструмента', stmt.line)
          };
          return id;
        case 'set_voice':
          blocks[id].opcode = 'text2speech_setVoice';
          blocks[id].inputs = {
            VOICES: compileMenuOrExpr(a[0], 'text2speech_menu_voices', 'voices', 'ALTO', id, (v) =>
              checkChoice(v, 'ttsVoice', stmt.line, (x) => x.toUpperCase())
            )
          };
          return id;
        case 'set_language':
          blocks[id].opcode = 'text2speech_setLanguage';
          blocks[id].inputs = {
            LANGUAGE: compileMenuOrExpr(a[0], 'text2speech_menu_languages', 'languages', 'en', id)
          };
          return id;
        case 'list_add':
        case 'local_list_add': {
          const listName = a[0] && a[0].value ? String(a[0].value) : 'list';
          const listId = ensureList(listName, stmt.name === 'local_list_add');
          blocks[id].opcode = 'data_addtolist';
          blocks[id].fields = { LIST: [listName, listId] };
          blocks[id].inputs = { ITEM: compileInput(a[1], id, 10) };
          return id;
        }
        case 'list_delete':
        case 'local_list_delete': {
          const listName = a[0] && a[0].value ? String(a[0].value) : 'list';
          const listId = ensureList(listName, stmt.name === 'local_list_delete');
          blocks[id].opcode = 'data_deleteoflist';
          blocks[id].fields = { LIST: [listName, listId] };
          blocks[id].inputs = { INDEX: compileInput(a[1], id, 7) };
          return id;
        }
        case 'list_clear':
        case 'local_list_clear': {
          const listName = a[0] && a[0].value ? String(a[0].value) : 'list';
          const listId = ensureList(listName, stmt.name === 'local_list_clear');
          blocks[id].opcode = 'data_deletealloflist';
          blocks[id].fields = { LIST: [listName, listId] };
          return id;
        }
        case 'list_insert':
        case 'local_list_insert': {
          const listName = a[0] && a[0].value ? String(a[0].value) : 'list';
          const listId = ensureList(listName, stmt.name === 'local_list_insert');
          blocks[id].opcode = 'data_insertatlist';
          blocks[id].fields = { LIST: [listName, listId] };
          blocks[id].inputs = {
            INDEX: compileInput(a[1], id, 7),
            ITEM: compileInput(a[2], id, 10)
          };
          return id;
        }
        case 'list_replace':
        case 'local_list_replace': {
          const listName = a[0] && a[0].value ? String(a[0].value) : 'list';
          const listId = ensureList(listName, stmt.name === 'local_list_replace');
          blocks[id].opcode = 'data_replaceitemoflist';
          blocks[id].fields = { LIST: [listName, listId] };
          blocks[id].inputs = {
            INDEX: compileInput(a[1], id, 7),
            ITEM: compileInput(a[2], id, 10)
          };
          return id;
        }
        default:
          throw new CompileError(`Невідома команда "${stmt.name}()" у рядку ${stmt.line}.`, stmt.line);
      }
    }

    // Pass 1: Register all ProcDef nodes and local list declarations
    function scanLocalLists(node) {
      if (!node) return;
      if (Array.isArray(node)) {
        node.forEach(scanLocalLists);
        return;
      }
      if (typeof node !== 'object') return;
      if (
        node.type === 'Call' &&
        (node.name === 'local_list' || node.name.startsWith('local_list_')) &&
        node.args &&
        node.args[0] &&
        node.args[0].value
      ) {
        declaredLocalLists.add(String(node.args[0].value));
      }
      Object.values(node).forEach((v) => {
        if (v && typeof v === 'object') scanLocalLists(v);
      });
    }
    scanLocalLists(ast);

    for (const rawProc of raw.procedures) {
      procedures[rawProc.fnName] = rawProc;
    }

    for (const node of ast) {
      if (node.type === 'ProcDef') {
        if (procedures[node.fnName] && procedures[node.fnName].raw) {
          throw new CompileError(
            `Власний блок "${node.fnName}" (рядок ${node.line}) уже існує в проєкті як скрипт, який DSL не вміє показувати; оберіть інше ім'я.`,
            node.line
          );
        }
        const paramIds = node.params.map((p) => `arg_${node.fnName}_${p}`);
        const paramTypes = node.params.map((_, i) => (node.paramTypes && node.paramTypes[i]) || 'any');
        const proccode =
          node.params.length > 0
            ? `${node.fnName} ${paramTypes.map((t) => (t === 'bool' ? '%b' : '%s')).join(' ')}`
            : node.fnName;
        procedures[node.fnName] = {
          fnName: node.fnName,
          paramNames: node.params,
          paramTypes,
          paramIds,
          proccode,
          warp: !!node.warp
        };
      }
    }

    // Pass 2: Compile top-level ProcDef and Handler nodes
    let yOffset = 40;
    for (const node of ast) {
      if (node.type === 'ProcDef') {
        const proc = procedures[node.fnName];
        const defId = createBlock(
          'procedures_definition',
          null,
          {},
          {},
          { topLevel: true, x: 40, y: yOffset, line: node.line }
        );
        const protoInputs = {};
        const protoId = createBlock(
          'procedures_prototype',
          defId,
          protoInputs,
          {},
          {
            shadow: true,
            mutation: {
              tagName: 'mutation',
              children: [],
              proccode: proc.proccode,
              argumentids: JSON.stringify(proc.paramIds),
              argumentnames: JSON.stringify(proc.paramNames),
              argumentdefaults: JSON.stringify(proc.paramNames.map((_, i) => (proc.paramTypes[i] === 'bool' ? 'false' : ''))),
              warp: proc.warp ? 'true' : 'false'
            }
          }
        );
        proc.paramNames.forEach((pName, i) => {
          const argShadowId = createBlock(
            proc.paramTypes[i] === 'bool' ? 'argument_reporter_boolean' : 'argument_reporter_string_number',
            protoId,
            {},
            { VALUE: [pName, null] },
            { shadow: true }
          );
          protoInputs[proc.paramIds[i]] = [1, argShadowId];
        });
        blocks[defId].inputs = { custom_block: [1, protoId] };

        activeProcedureParams = new Set(proc.paramNames);
        activeProcedureBoolParams = new Set(proc.paramNames.filter((_, i) => proc.paramTypes[i] === 'bool'));
        const firstBodyId = compileStmtList(node.body, defId);
        activeProcedureParams = null;
        activeProcedureBoolParams = null;

        if (firstBodyId) {
          blocks[defId].next = firstBodyId;
        }
        yOffset += 220;
        continue;
      }

      const h = node;
      let hatId;
      if (h.decorator === 'when_flag_clicked') {
        hatId = createBlock('event_whenflagclicked', null, {}, {}, { topLevel: true, x: 40, y: yOffset, line: h.line });
      } else if (h.decorator === 'when_key_pressed') {
        const key = h.decArgs[0]
          ? checkKeyOption(literalArg(h.decArgs[0], 'space', 'Клавіша у @when_key_pressed', h.line), h.line)
          : 'space';
        hatId = createBlock(
          'event_whenkeypressed',
          null,
          {},
          { KEY_OPTION: [key, null] },
          { topLevel: true, x: 40, y: yOffset, line: h.line }
        );
      } else if (h.decorator === 'when_this_sprite_clicked' || h.decorator === 'when_stage_clicked') {
        const op = target.isStage ? 'event_whenstageclicked' : 'event_whenthisspriteclicked';
        hatId = createBlock(op, null, {}, {}, { topLevel: true, x: 40, y: yOffset, line: h.line });
      } else if (h.decorator === 'when_backdrop_switches') {
        const bg = h.decArgs[0] ? String(h.decArgs[0].value) : 'backdrop1';
        hatId = createBlock(
          'event_whenbackdropswitchesto',
          null,
          {},
          { BACKDROP: [bg, null] },
          { topLevel: true, x: 40, y: yOffset, line: h.line }
        );
      } else if (h.decorator === 'when_message_received') {
        const msg = h.decArgs[0] ? String(h.decArgs[0].value) : 'message1';
        const bId = ensureBroadcast(msg);
        hatId = createBlock(
          'event_whenbroadcastreceived',
          null,
          {},
          { BROADCAST_OPTION: [msg, bId] },
          { topLevel: true, x: 40, y: yOffset, line: h.line }
        );
      } else if (h.decorator === 'when_greater_than') {
        const sensor = checkChoice(
          literalArg(h.decArgs[0], 'LOUDNESS', 'Датчик у @when_greater_than', h.line),
          'greaterThan',
          h.line,
          (v) => v.toUpperCase()
        );
        hatId = createBlock(
          'event_whengreaterthan',
          null,
          {},
          { WHENGREATERTHANMENU: [sensor, null] },
          { topLevel: true, x: 40, y: yOffset, line: h.line }
        );
        blocks[hatId].inputs = {
          VALUE: compileInput(h.decArgs[1], hatId, 4)
        };
      } else if (h.decorator === 'when_touching') {
        if (target.isStage) {
          throw new CompileError(`@when_touching (рядок ${h.line}) доступний лише спрайтам: Сцена ні до чого не торкається.`, h.line);
        }
        const touchRaw = literalArg(h.decArgs[0], '_mouse_', "Об'єкт у @when_touching", h.line);
        const touchVal = touchRaw === 'edge' ? '_edge_' : touchRaw === 'mouse' ? '_mouse_' : touchRaw;
        hatId = createBlock('event_whentouchingobject', null, {}, {}, { topLevel: true, x: 40, y: yOffset, line: h.line });
        blocks[hatId].inputs = {
          TOUCHINGOBJECTMENU: compileShadowMenu('event_touchingobjectmenu', 'TOUCHINGOBJECTMENU', touchVal, hatId)
        };
      } else if (h.decorator === 'when_cloned') {
        if (target.isStage) {
          throw new CompileError(`@when_cloned (рядок ${h.line}) доступний лише спрайтам: Сцену клонувати не можна.`, h.line);
        }
        hatId = createBlock('control_start_as_clone', null, {}, {}, { topLevel: true, x: 40, y: yOffset, line: h.line });
      } else {
        throw new CompileError(`Невідомий декоратор @${h.decorator} у рядку ${h.line}.`, h.line);
      }

      const firstBodyId = compileStmtList(h.body, hatId);
      if (firstBodyId) {
        blocks[hatId].next = firstBodyId;
      }
      yOffset += 220;
    }

    // Re-attach preserved raw scripts (collision-free ids) and fix up comments
    const rawIdMap = mergeRawScripts();
    function mergeRawScripts() {
      const idMap = {};
      const rawIds = Object.keys(raw.blocks);
      const taken = new Set(Object.keys(blocks));
      for (const id of rawIds) {
        let newId = id;
        if (taken.has(newId)) {
          let n = 1;
          newId = `raw_${id}`;
          while (taken.has(newId) || raw.blocks[newId] !== undefined) newId = `raw_${id}_${n++}`;
        }
        taken.add(newId);
        idMap[id] = newId;
      }
      const remap = (ref) => (typeof ref === 'string' && idMap[ref] !== undefined ? idMap[ref] : ref);
      for (const id of rawIds) {
        const src = raw.blocks[id];
        const copy = { ...src };
        if (src.parent !== undefined) copy.parent = remap(src.parent);
        if (src.next !== undefined) copy.next = remap(src.next);
        if (src.inputs) {
          copy.inputs = {};
          for (const [k, inp] of Object.entries(src.inputs)) {
            copy.inputs[k] = Array.isArray(inp) ? inp.map((v, i) => (i >= 1 ? remap(v) : v)) : inp;
          }
        }
        blocks[idMap[id]] = copy;
        // Variables / lists / broadcasts referenced by preserved blocks must survive the orphan cleanup
        const refIds = [];
        for (const f of Object.values(src.fields || {})) {
          if (Array.isArray(f) && typeof f[1] === 'string') refIds.push(f[1]);
        }
        for (const inp of Object.values(src.inputs || {})) {
          if (!Array.isArray(inp)) continue;
          for (let i = 1; i < inp.length; i++) {
            if (Array.isArray(inp[i]) && typeof inp[i][2] === 'string') refIds.push(inp[i][2]);
          }
        }
        for (const ref of refIds) {
          if (prevOwned.globalVars.has(ref)) { usedGlobalVarIds.add(ref); nextOwned.globalVars.add(ref); }
          if (prevOwned.localVars.has(ref)) { usedLocalVarIds.add(ref); nextOwned.localVars.add(ref); }
          if (prevOwned.globalLists.has(ref)) { usedGlobalListIds.add(ref); nextOwned.globalLists.add(ref); }
          if (prevOwned.localLists.has(ref)) { usedLocalListIds.add(ref); nextOwned.localLists.add(ref); }
          if (prevOwned.broadcasts.has(ref)) { usedBroadcastIds.add(ref); nextOwned.broadcasts.add(ref); }
        }
      }
      return idMap;
    }

    // Comments anchored to regenerated blocks would dangle (or, worse, attach to a different block that got the
    // same generated id), so only workspace comments and comments of preserved raw scripts survive.
    if (target.comments && typeof target.comments === 'object') {
      const keptComments = {};
      for (const [cid, c] of Object.entries(target.comments)) {
        if (!c || c.blockId === null || c.blockId === undefined) {
          keptComments[cid] = c;
        } else if (rawIdMap[c.blockId] !== undefined) {
          keptComments[cid] = { ...c, blockId: rawIdMap[c.blockId] };
        }
      }
      target.comments = keptComments;
    }

    target.blocks = blocks;
    const deletedMonitorIds = new Set();

    // Clean up orphaned compiler-owned variables, lists, and broadcasts no longer referenced by any target
    const otherTargets = projectJson && Array.isArray(projectJson.targets)
      ? projectJson.targets.filter((t) => t !== target)
      : [];
    const isIdUsedElsewhere = (id) =>
      otherTargets.some((t) => {
        const owned = t._pyCompiledOwned;
        if (
          owned &&
          (owned.globalVars.has(id) || owned.globalLists.has(id) || owned.broadcasts.has(id))
        ) {
          return true;
        }
        return Object.values(t.blocks || {}).some((b) => {
          if (!b) return false;
          if (b.fields && Object.values(b.fields).some((f) => Array.isArray(f) && f[1] === id)) return true;
          if (b.inputs && Object.values(b.inputs).some((inp) => Array.isArray(inp) && Array.isArray(inp[1]) && inp[1][2] === id)) return true;
          return false;
        });
      });

    for (const oldId of prevOwned.globalVars) {
      if (!usedGlobalVarIds.has(oldId) && globalHost.variables && !isIdUsedElsewhere(oldId)) {
        delete globalHost.variables[oldId];
        deletedMonitorIds.add(oldId);
      }
    }
    for (const oldId of prevOwned.localVars) {
      const host = target.isStage ? globalHost : target;
      if (!usedLocalVarIds.has(oldId) && host.variables) {
        delete host.variables[oldId];
        deletedMonitorIds.add(oldId);
      }
    }
    for (const oldId of prevOwned.globalLists) {
      if (!usedGlobalListIds.has(oldId) && globalHost.lists && !isIdUsedElsewhere(oldId)) {
        delete globalHost.lists[oldId];
        deletedMonitorIds.add(oldId);
      }
    }
    for (const oldId of prevOwned.localLists) {
      const host = target.isStage ? globalHost : target;
      if (!usedLocalListIds.has(oldId) && host.lists) {
        delete host.lists[oldId];
        deletedMonitorIds.add(oldId);
      }
    }
    for (const oldId of prevOwned.broadcasts) {
      if (!usedBroadcastIds.has(oldId) && globalHost.broadcasts && !isIdUsedElsewhere(oldId)) {
        delete globalHost.broadcasts[oldId];
      }
    }

    // Monitors of removed variables / lists would otherwise stay in project.json pointing at nothing
    if (projectJson && Array.isArray(projectJson.monitors) && deletedMonitorIds.size > 0) {
      projectJson.monitors = projectJson.monitors.filter((m) => !(m && deletedMonitorIds.has(m.id)));
    }

    Object.defineProperty(target, '_pyCompiledOwned', {
      value: nextOwned,
      enumerable: false,
      configurable: true,
      writable: true
    });

    if (projectJson) {
      if (!projectJson.extensions) projectJson.extensions = [];
      for (const [extName, prefix] of Object.entries(EXTENSION_PREFIXES)) {
        const usedHere = extName === 'pen' && usesPen;
        const usedAnywhere =
          usedHere ||
          (Array.isArray(projectJson.targets)
            ? projectJson.targets.some((t) =>
                Object.values((t && t.blocks) || {}).some((b) => b && typeof b.opcode === 'string' && b.opcode.startsWith(prefix))
              )
            : false) ||
          Object.values(blocks).some((b) => b && typeof b.opcode === 'string' && b.opcode.startsWith(prefix));
        if (usedAnywhere) {
          if (!projectJson.extensions.includes(extName)) projectJson.extensions.push(extName);
        } else if (projectJson.extensions.includes(extName)) {
          projectJson.extensions = projectJson.extensions.filter((ext) => ext !== extName);
        }
      }
    }

    return { blocks, usesPen, ast };
  }

  const api = { compileToScratch, CompileError, tokenize, parse };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    global.PyScratchCompiler = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
