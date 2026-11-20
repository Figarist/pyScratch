/**
 * decompiler.js
 * Decompiles Scratch 3.0 target.blocks into clean, idiomatic Python-DSL code (4-space indent)
 * and provides human-readable Scratch block labels (uk / en / ru, see js/messages.js) for the visual inspector.
 */

(function (global) {
  'use strict';

  // Localized message from js/messages.js (browser global or Node require); the bare key if the catalog is not loaded.
  function tr(key, params) {
    let catalog = global.PyScratchMessages;
    if (!catalog && typeof module !== 'undefined' && module.exports && typeof require === 'function') {
      try { catalog = require('./messages.js'); } catch (_) { catalog = null; }
    }
    return catalog ? catalog.format(key, params) : key;
  }

  const PYTHON_RESERVED_IDENTS = new Set([
    'def', 'for', 'in', 'while', 'if', 'elif', 'else', 'pass',
    'and', 'or', 'not', 'True', 'False', 'self', 'range'
  ]);

  function sanitizeIdent(raw, fallback = 'item') {
    const cleaned = String(raw || '')
      .trim()
      .replace(/[^a-zA-Z0-9_\u0400-\u04FF]/g, '_');
    if (!cleaned) return fallback;
    const safe = /^[0-9]/.test(cleaned) ? '_' + cleaned : cleaned;
    return PYTHON_RESERVED_IDENTS.has(safe) ? `${safe}_var` : safe;
  }

  function extractProcName(proccode) {
    if (!proccode) return 'custom_block';
    const base = String(proccode).split('%')[0].trim();
    return sanitizeIdent(base, 'custom_block');
  }

  // Argument kinds of a custom block in declaration order: '%s' (text/number) or '%b' (boolean)
  function procArgKinds(proccode) {
    return String(proccode || '').match(/%[sb]/g) || [];
  }

  function createBlockReader(blocks, target = null, stageTarget = null, onUnknown = null) {
    function isLocalVar(varName, varId) {
      if (!target || target.isStage || !target.variables) return false;
      if (varId && target.variables[varId]) return true;
      if (varId && stageTarget && stageTarget.variables && stageTarget.variables[varId]) return false;
      return Object.values(target.variables).some((v) => v && v[0] === varName);
    }

    function isLocalList(listName, listId) {
      if (!target || target.isStage || !target.lists) return false;
      if (listId && target.lists[listId]) return true;
      if (listId && stageTarget && stageTarget.lists && stageTarget.lists[listId]) return false;
      return Object.values(target.lists).some((l) => l && l[0] === listName);
    }

    function formatVarName(varName, varId) {
      const ident = sanitizeIdent(varName, 'var');
      return isLocalVar(varName, varId) ? `self.${ident}` : ident;
    }

    function readFieldWithId(block, name, fallback = '') {
      if (block && block.fields && block.fields[name]) {
        return [block.fields[name][0], block.fields[name][1] ?? null];
      }
      return [fallback, null];
    }

    function readField(block, name, fallback = '') {
      return readFieldWithId(block, name, fallback)[0];
    }

    function readInput(block, name) {
      if (!block || !block.inputs || !block.inputs[name]) return '0';
      const inp = block.inputs[name];
      const val = inp[1];
      if (!val) return '0';

      if (typeof val === 'string') {
        const child = blocks[val];
        if (child && child.shadow) {
          const fKeys = Object.keys(child.fields || {});
          if (fKeys.length > 0) {
            return JSON.stringify(String(child.fields[fKeys[0]][0]));
          }
        }
        return decompileReporter(val);
      }

      if (Array.isArray(val)) {
        const type = val[0];
        // 4..8: numeric literals
        if (type >= 4 && type <= 8) {
          if (val[1] === '' || val[1] === null || val[1] === undefined) return '0';
          const strVal = String(val[1]).trim();
          if (/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(strVal)) return strVal;
          const num = Number(strVal);
          if (strVal !== '' && Number.isFinite(num)) return String(num);
          return JSON.stringify(String(val[1]));
        }
        // 9: color (#hex), 10: string, 11: broadcast
        if (type === 9 || type === 10 || type === 11) {
          const strVal = String(val[1] ?? '');
          // If type 10 holds a canonical numeric literal (no leading zeros like "007"), keep it numeric
          if (type === 10 && /^-?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(strVal)) {
            return strVal;
          }
          return JSON.stringify(strVal);
        }
        // 12: variable [12, varName, varId]
        if (type === 12) {
          return formatVarName(val[1], val[2]);
        }
        // 13: list [13, listName, listId]
        if (type === 13) {
          return JSON.stringify(String(val[1]));
        }
      }
      return '0';
    }

    function readMenuOrExpr(block, inputName, fieldName, fallback = '') {
      if (!block || !block.inputs || !block.inputs[inputName]) {
        return JSON.stringify(fallback);
      }
      const val = block.inputs[inputName][1];
      if (typeof val === 'string' && blocks[val]) {
        const targetBlock = blocks[val];
        if (targetBlock.shadow) {
          let fVal = readField(targetBlock, fieldName, fallback);
          if (fVal === '_edge_') fVal = 'edge';
          if (fVal === '_mouse_') fVal = 'mouse';
          if (fVal === '_random_') fVal = 'random';
          if (fVal === '_myself_') fVal = 'myself';
          if (fVal === '_stage_') fVal = 'Stage';
          return JSON.stringify(fVal);
        }
        return decompileReporter(val);
      }
      if (Array.isArray(val) && val[0] === 12) {
        return formatVarName(val[1], val[2]);
      }
      return JSON.stringify(fallback);
    }

    // Menu slot holding a number (drum / note / instrument): numeric menu values are printed as numbers
    function readNumMenuOrExpr(block, inputName, fieldName, fallback) {
      const inp = block && block.inputs ? block.inputs[inputName] : null;
      const val = inp ? inp[1] : null;
      if (typeof val === 'string' && blocks[val]) {
        const child = blocks[val];
        if (child.shadow) {
          const raw = readField(child, fieldName, fallback);
          const n = Number(raw);
          return raw !== '' && Number.isFinite(n) ? String(n) : String(fallback);
        }
        return decompileReporter(val);
      }
      if (Array.isArray(val) && val[0] === 12) return formatVarName(val[1], val[2]);
      if (Array.isArray(val) && val[0] >= 4 && val[0] <= 8) return readInput(block, inputName);
      return String(fallback);
    }

    // Menu slot with a lowercase-normalised literal (the compiler upper-cases it again)
    function readLowerMenuOrExpr(block, inputName, fieldName, fallback) {
      const out = readMenuOrExpr(block, inputName, fieldName, fallback);
      if (out.startsWith('"')) {
        try {
          return JSON.stringify(String(JSON.parse(out)).toLowerCase());
        } catch (_) {
          return out;
        }
      }
      return out;
    }

    const activeReporters = new Set();

    function decompileReporter(blockId) {
      if (!blockId || activeReporters.has(blockId)) return '0';
      const b = blocks[blockId];
      if (!b) return '0';
      activeReporters.add(blockId);
      try {
        switch (b.opcode) {
          case 'argument_reporter_string_number':
          case 'argument_reporter_boolean':
            return sanitizeIdent(readField(b, 'VALUE', 'arg'), 'arg');
        case 'motion_xposition':
          return 'x_position()';
        case 'motion_yposition':
          return 'y_position()';
        case 'motion_direction':
          return 'direction()';
        case 'looks_size':
          return 'size()';
        case 'looks_costumenumbername': {
          const mode = readField(b, 'NUMBER_NAME', 'number');
          return mode === 'name' ? 'costume_name()' : 'costume_number()';
        }
        case 'looks_backdropnumbername': {
          const mode = readField(b, 'NUMBER_NAME', 'name');
          return mode === 'number' ? 'backdrop_number()' : 'backdrop_name()';
        }
        case 'sound_volume':
          return 'volume()';
        case 'sensing_answer':
          return 'answer()';
        case 'sensing_mousex':
          return 'mouse_x()';
        case 'sensing_mousey':
          return 'mouse_y()';
        case 'sensing_mousedown':
          return 'mouse_down()';
        case 'sensing_timer':
          return 'timer()';
        case 'operator_random':
          return `random(${readInput(b, 'FROM')}, ${readInput(b, 'TO')})`;
        case 'operator_join':
          return `join(${readInput(b, 'STRING1')}, ${readInput(b, 'STRING2')})`;
        case 'operator_letter_of':
          return `letter_of(${readInput(b, 'LETTER')}, ${readInput(b, 'STRING')})`;
        case 'operator_length':
          return `length_of(${readInput(b, 'STRING')})`;
        case 'operator_contains':
          return `contains(${readInput(b, 'STRING1')}, ${readInput(b, 'STRING2')})`;
        case 'operator_round':
          return `round_num(${readInput(b, 'NUM')})`;
        case 'operator_mathop': {
          const op = readField(b, 'OPERATOR', 'abs');
          const num = readInput(b, 'NUM');
          const directFuncs = new Set(['abs', 'floor', 'sqrt', 'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'ln', 'log']);
          if (directFuncs.has(op)) return `${op}(${num})`;
          if (op === 'ceiling') return `ceil(${num})`;
          if (op === 'e ^') return `exp(${num})`;
          if (op === '10 ^') return `pow10(${num})`;
          return `math_op(${JSON.stringify(op)}, ${num})`;
        }
        case 'operator_add':
          return `(${readInput(b, 'NUM1')} + ${readInput(b, 'NUM2')})`;
        case 'operator_subtract': {
          const n1 = readInput(b, 'NUM1');
          const n2 = readInput(b, 'NUM2');
          if (n1 === '0') return `-${n2}`;
          return `(${n1} - ${n2})`;
        }
        case 'operator_multiply':
          return `(${readInput(b, 'NUM1')} * ${readInput(b, 'NUM2')})`;
        case 'operator_divide':
          return `(${readInput(b, 'NUM1')} / ${readInput(b, 'NUM2')})`;
        case 'operator_mod':
          return `(${readInput(b, 'NUM1')} % ${readInput(b, 'NUM2')})`;
        case 'operator_equals':
          return `(${readInput(b, 'OPERAND1')} == ${readInput(b, 'OPERAND2')})`;
        case 'operator_lt':
          return `(${readInput(b, 'OPERAND1')} < ${readInput(b, 'OPERAND2')})`;
        case 'operator_gt':
          return `(${readInput(b, 'OPERAND1')} > ${readInput(b, 'OPERAND2')})`;
        case 'operator_and':
          return `(${readInput(b, 'OPERAND1')} and ${readInput(b, 'OPERAND2')})`;
        case 'operator_or':
          return `(${readInput(b, 'OPERAND1')} or ${readInput(b, 'OPERAND2')})`;
        case 'operator_not': {
          const innerId = b.inputs && b.inputs.OPERAND ? b.inputs.OPERAND[1] : null;
          const inner = typeof innerId === 'string' ? blocks[innerId] : null;
          if (inner) {
            if (inner.opcode === 'operator_equals') {
              return `(${readInput(inner, 'OPERAND1')} != ${readInput(inner, 'OPERAND2')})`;
            }
            if (inner.opcode === 'operator_gt') {
              return `(${readInput(inner, 'OPERAND1')} <= ${readInput(inner, 'OPERAND2')})`;
            }
            if (inner.opcode === 'operator_lt') {
              return `(${readInput(inner, 'OPERAND1')} >= ${readInput(inner, 'OPERAND2')})`;
            }
          }
          return `not (${readInput(b, 'OPERAND')})`;
        }
        case 'sensing_keypressed':
          return `key_pressed(${readMenuOrExpr(b, 'KEY_OPTION', 'KEY_OPTION', 'space')})`;
        case 'sensing_touchingobject':
          return `touching(${readMenuOrExpr(b, 'TOUCHINGOBJECTMENU', 'TOUCHINGOBJECTMENU', 'edge')})`;
        case 'sensing_touchingcolor':
          return `touching_color(${readInput(b, 'COLOR')})`;
        case 'sensing_coloristouchingcolor':
          return `color_is_touching_color(${readInput(b, 'COLOR')}, ${readInput(b, 'COLOR2')})`;
        case 'sensing_distanceto':
          return `distance_to(${readMenuOrExpr(b, 'DISTANCETOMENU', 'DISTANCETOMENU', 'mouse')})`;
        case 'sensing_of':
          return `attribute_of(${JSON.stringify(readField(b, 'PROPERTY', 'x position'))}, ${readMenuOrExpr(b, 'OBJECT', 'OBJECT', 'Stage')})`;
        case 'sensing_current':
          return `current_time(${JSON.stringify(readField(b, 'CURRENTMENU', 'YEAR').toLowerCase())})`;
        case 'sensing_dayssince2000':
          return 'days_since_2000()';
        case 'sensing_username':
          return 'username()';
        case 'sensing_loudness':
          return 'loudness()';
        case 'music_getTempo':
          return 'tempo()';
        case 'translate_getViewerLanguage':
          return 'language()';
        case 'translate_getTranslate':
          return `translate(${readInput(b, 'WORDS')}, ${readMenuOrExpr(b, 'LANGUAGE', 'languages', 'en')})`;
        case 'data_itemoflist': {
          const [listName, listId] = readFieldWithId(b, 'LIST', 'list');
          const fn = isLocalList(listName, listId) ? 'local_list_item' : 'list_item';
          return `${fn}(${JSON.stringify(listName)}, ${readInput(b, 'INDEX')})`;
        }
        case 'data_lengthoflist': {
          const [listName, listId] = readFieldWithId(b, 'LIST', 'list');
          const fn = isLocalList(listName, listId) ? 'local_list_length' : 'list_length';
          return `${fn}(${JSON.stringify(listName)})`;
        }
        case 'data_listcontainsitem': {
          const [listName, listId] = readFieldWithId(b, 'LIST', 'list');
          const fn = isLocalList(listName, listId) ? 'local_list_contains' : 'list_contains';
          return `${fn}(${JSON.stringify(listName)}, ${readInput(b, 'ITEM')})`;
        }
        case 'data_itemnumoflist': {
          const [listName, listId] = readFieldWithId(b, 'LIST', 'list');
          const fn = isLocalList(listName, listId) ? 'local_list_index_of' : 'list_index_of';
          return `${fn}(${JSON.stringify(listName)}, ${readInput(b, 'ITEM')})`;
        }
        default:
          if (onUnknown && !b.shadow) onUnknown(b.opcode);
          return `0`;
        }
      } finally {
        activeReporters.delete(blockId);
      }
    }

    return {
      readField,
      readFieldWithId,
      readInput,
      readMenuOrExpr,
      readNumMenuOrExpr,
      readLowerMenuOrExpr,
      decompileReporter,
      isLocalVar,
      isLocalList,
      formatVarName
    };
  }

  /**
   * @param {object} target
   * @param {object|null} stageTarget
   * @param {{unsupported?: Map<string, string[]>}} [report] optional out-parameter: filled with
   *   top-level script id -> opcodes that the DSL cannot express. Such scripts are NOT rendered as code
   *   (the compiler keeps them verbatim when the project is recompiled).
   */
  function decompileTarget(target, stageTarget = null, report = null) {
    const blocks = target.blocks || {};
    const unsupportedByRoot = new Map();
    let currentRoot = null;
    const markUnknown = (opcode) => {
      if (currentRoot === null) return;
      if (!unsupportedByRoot.has(currentRoot)) unsupportedByRoot.set(currentRoot, []);
      const list = unsupportedByRoot.get(currentRoot);
      if (!list.includes(opcode)) list.push(opcode);
    };
    const topBlocks = Object.entries(blocks)
      .filter(([, b]) => b && b.topLevel && !b.shadow)
      .sort((a, b) => (a[1].y || 0) - (b[1].y || 0));

    if (topBlocks.length === 0) {
      return tr('dec_empty_header', { kind: target.isStage ? tr('dec_kind_stage') : tr('dec_kind_sprite'), name: target.name });
    }

    const {
      readField,
      readFieldWithId,
      readInput,
      readMenuOrExpr,
      readNumMenuOrExpr,
      readLowerMenuOrExpr,
      isLocalVar,
      isLocalList,
      formatVarName
    } = createBlockReader(blocks, target, stageTarget, markUnknown);

    const listBlockOps = new Set([
      'data_addtolist',
      'data_deleteoflist',
      'data_deletealloflist',
      'data_insertatlist',
      'data_replaceitemoflist',
      'data_itemoflist',
      'data_lengthoflist',
      'data_listcontainsitem',
      'data_itemnumoflist'
    ]);
    const localListsWithOps = new Set();
    for (const b of Object.values(blocks)) {
      if (b && listBlockOps.has(b.opcode) && b.fields && b.fields.LIST) {
        const [lName, lId] = b.fields.LIST;
        if (isLocalList(lName, lId)) localListsWithOps.add(lName);
      }
    }
    const emittedLocalListDecls = new Set();

    let handlerIndex = 1;
    const parts = [];
    parts.push(tr('dec_header', { kind: target.isStage ? tr('dec_kind_stage_script') : tr('dec_kind_sprite_script'), name: target.name }));

    function decompileIf(b, indent, keyword = 'if', visited = new Set()) {
      const lines = [];
      const pad = '    '.repeat(indent);
      lines.push(`${pad}${keyword} ${readInput(b, 'CONDITION')}:`);
      const sub1 = b.inputs && b.inputs.SUBSTACK ? b.inputs.SUBSTACK[1] : null;
      lines.push(...(sub1 ? decompileChain(sub1, indent + 1, visited) : [`${pad}    pass`]));

      if (b.opcode === 'control_if_else') {
        const sub2 = b.inputs && b.inputs.SUBSTACK2 ? b.inputs.SUBSTACK2[1] : null;
        if (
          sub2 &&
          !visited.has(sub2) &&
          blocks[sub2] &&
          (blocks[sub2].opcode === 'control_if' || blocks[sub2].opcode === 'control_if_else') &&
          !blocks[sub2].next
        ) {
          visited.add(sub2);
          lines.push(...decompileIf(blocks[sub2], indent, 'elif', visited));
        } else {
          lines.push(`${pad}else:`);
          lines.push(...(sub2 ? decompileChain(sub2, indent + 1, visited) : [`${pad}    pass`]));
        }
      }
      return lines;
    }

    function decompileChain(startId, indent, visited = new Set()) {
      const lines = [];
      let currId = startId;
      const pad = '    '.repeat(indent);

      while (currId && blocks[currId] && !visited.has(currId)) {
        visited.add(currId);
        const b = blocks[currId];
        switch (b.opcode) {
          case 'motion_movesteps':
            lines.push(`${pad}move(${readInput(b, 'STEPS')})`);
            break;
          case 'motion_turnright':
            lines.push(`${pad}turn_right(${readInput(b, 'DEGREES')})`);
            break;
          case 'motion_turnleft':
            lines.push(`${pad}turn_left(${readInput(b, 'DEGREES')})`);
            break;
          case 'motion_gotoxy':
            lines.push(`${pad}goto(${readInput(b, 'X')}, ${readInput(b, 'Y')})`);
            break;
          case 'motion_goto': {
            const dest = readMenuOrExpr(b, 'TO', 'TO', 'random');
            if (dest === '"random"') lines.push(`${pad}goto_random()`);
            else if (dest === '"mouse"') lines.push(`${pad}goto_mouse()`);
            else lines.push(`${pad}goto(${dest})`);
            break;
          }
          case 'motion_glidesecstoxy':
            lines.push(`${pad}glide(${readInput(b, 'SECS')}, ${readInput(b, 'X')}, ${readInput(b, 'Y')})`);
            break;
          case 'motion_glideto':
            lines.push(`${pad}glide_to(${readInput(b, 'SECS')}, ${readMenuOrExpr(b, 'TO', 'TO', 'random')})`);
            break;
          case 'motion_setx':
            lines.push(`${pad}set_x(${readInput(b, 'X')})`);
            break;
          case 'motion_sety':
            lines.push(`${pad}set_y(${readInput(b, 'Y')})`);
            break;
          case 'motion_changexby':
            lines.push(`${pad}change_x(${readInput(b, 'DX')})`);
            break;
          case 'motion_changeyby':
            lines.push(`${pad}change_y(${readInput(b, 'DY')})`);
            break;
          case 'motion_pointindirection':
            lines.push(`${pad}point_in_direction(${readInput(b, 'DIRECTION')})`);
            break;
          case 'motion_pointtowards':
            lines.push(`${pad}point_towards(${readMenuOrExpr(b, 'TOWARDS', 'TOWARDS', 'mouse')})`);
            break;
          case 'motion_ifonedgebounce':
            lines.push(`${pad}if_on_edge_bounce()`);
            break;
          case 'motion_setrotationstyle':
            lines.push(`${pad}set_rotation_style(${JSON.stringify(readField(b, 'STYLE', 'all around'))})`);
            break;

          case 'looks_switchbackdropto':
            lines.push(`${pad}switch_backdrop(${readMenuOrExpr(b, 'BACKDROP', 'BACKDROP', 'backdrop1')})`);
            break;
          case 'looks_switchbackdroptoandwait':
            lines.push(`${pad}switch_backdrop_and_wait(${readMenuOrExpr(b, 'BACKDROP', 'BACKDROP', 'backdrop1')})`);
            break;
          case 'looks_nextbackdrop':
            lines.push(`${pad}next_backdrop()`);
            break;
          case 'looks_gotofrontback':
            lines.push(`${pad}go_to_layer(${JSON.stringify(readField(b, 'FRONT_BACK', 'front'))})`);
            break;
          case 'looks_goforwardbackwardlayers':
            lines.push(
              `${pad}change_layer(${JSON.stringify(readField(b, 'FORWARD_BACKWARD', 'forward'))}, ${readInput(b, 'NUM')})`
            );
            break;
          case 'looks_switchcostumeto':
            lines.push(`${pad}switch_costume(${readMenuOrExpr(b, 'COSTUME', 'COSTUME', 'costume1')})`);
            break;
          case 'looks_nextcostume':
            lines.push(`${pad}next_costume()`);
            break;
          case 'looks_sayforsecs':
            lines.push(`${pad}say(${readInput(b, 'MESSAGE')}, ${readInput(b, 'SECS')})`);
            break;
          case 'looks_say':
            lines.push(`${pad}say(${readInput(b, 'MESSAGE')})`);
            break;
          case 'looks_thinkforsecs':
            lines.push(`${pad}think(${readInput(b, 'MESSAGE')}, ${readInput(b, 'SECS')})`);
            break;
          case 'looks_think':
            lines.push(`${pad}think(${readInput(b, 'MESSAGE')})`);
            break;
          case 'looks_show':
            lines.push(`${pad}show()`);
            break;
          case 'looks_hide':
            lines.push(`${pad}hide()`);
            break;
          case 'looks_setsizeto':
            lines.push(`${pad}set_size(${readInput(b, 'SIZE')})`);
            break;
          case 'looks_changesizeby':
            lines.push(`${pad}change_size(${readInput(b, 'CHANGE')})`);
            break;
          case 'looks_seteffectto':
            lines.push(
              `${pad}set_effect(${JSON.stringify(readField(b, 'EFFECT', 'COLOR').toLowerCase())}, ${readInput(b, 'VALUE')})`
            );
            break;
          case 'looks_changeeffectby':
            lines.push(
              `${pad}change_effect(${JSON.stringify(readField(b, 'EFFECT', 'COLOR').toLowerCase())}, ${readInput(b, 'CHANGE')})`
            );
            break;
          case 'looks_cleargraphiceffects':
            lines.push(`${pad}clear_effects()`);
            break;

          case 'sound_play':
            lines.push(`${pad}play_sound(${readMenuOrExpr(b, 'SOUND_MENU', 'SOUND_MENU', 'pop')})`);
            break;
          case 'sound_playuntildone':
            lines.push(`${pad}play_sound_until_done(${readMenuOrExpr(b, 'SOUND_MENU', 'SOUND_MENU', 'pop')})`);
            break;
          case 'sound_stopallsounds':
            lines.push(`${pad}stop_all_sounds()`);
            break;
          case 'sound_seteffectto':
            lines.push(
              `${pad}set_sound_effect(${JSON.stringify(readField(b, 'EFFECT', 'PITCH').toLowerCase())}, ${readInput(b, 'VALUE')})`
            );
            break;
          case 'sound_changeeffectby':
            lines.push(
              `${pad}change_sound_effect(${JSON.stringify(readField(b, 'EFFECT', 'PITCH').toLowerCase())}, ${readInput(b, 'VALUE')})`
            );
            break;
          case 'sound_cleareffects':
            lines.push(`${pad}clear_sound_effects()`);
            break;
          case 'sound_setvolumeto':
            lines.push(`${pad}set_volume(${readInput(b, 'VOLUME')})`);
            break;
          case 'sound_changevolumeby':
            lines.push(`${pad}change_volume(${readInput(b, 'VOLUME')})`);
            break;

          case 'pen_clear':
            lines.push(`${pad}pen_clear()`);
            break;
          case 'pen_stamp':
            lines.push(`${pad}pen_stamp()`);
            break;
          case 'pen_penDown':
            lines.push(`${pad}pen_down()`);
            break;
          case 'pen_penUp':
            lines.push(`${pad}pen_up()`);
            break;
          case 'pen_setPenColorToColor':
            lines.push(`${pad}set_pen_color(${readInput(b, 'COLOR')})`);
            break;
          case 'pen_setPenColorParamTo':
            lines.push(
              `${pad}set_pen_param(${readMenuOrExpr(b, 'COLOR_PARAM', 'colorParam', 'color')}, ${readInput(b, 'VALUE')})`
            );
            break;
          case 'pen_changePenColorParamBy':
            lines.push(
              `${pad}change_pen_param(${readMenuOrExpr(b, 'COLOR_PARAM', 'colorParam', 'color')}, ${readInput(b, 'VALUE')})`
            );
            break;
          case 'pen_setPenSizeTo':
            lines.push(`${pad}set_pen_size(${readInput(b, 'SIZE')})`);
            break;
          case 'pen_changePenSizeBy':
            lines.push(`${pad}change_pen_size(${readInput(b, 'SIZE')})`);
            break;

          case 'control_wait':
            lines.push(`${pad}wait(${readInput(b, 'DURATION')})`);
            break;
          case 'control_wait_until':
            lines.push(`${pad}wait_until(${readInput(b, 'CONDITION')})`);
            break;
          case 'control_stop':
            lines.push(`${pad}stop(${JSON.stringify(readField(b, 'STOP_OPTION', 'all'))})`);
            break;
          case 'control_create_clone_of':
            lines.push(`${pad}create_clone(${readMenuOrExpr(b, 'CLONE_OPTION', 'CLONE_OPTION', 'myself')})`);
            break;
          case 'control_delete_this_clone':
            lines.push(`${pad}delete_this_clone()`);
            break;

          case 'music_playDrumForBeats':
            lines.push(`${pad}play_drum(${readNumMenuOrExpr(b, 'DRUM', 'DRUM', 1)}, ${readInput(b, 'BEATS')})`);
            break;
          case 'music_restForBeats':
            lines.push(`${pad}rest(${readInput(b, 'BEATS')})`);
            break;
          case 'music_playNoteForBeats':
            lines.push(`${pad}play_note(${readNumMenuOrExpr(b, 'NOTE', 'NOTE', 60)}, ${readInput(b, 'BEATS')})`);
            break;
          case 'music_setInstrument':
            lines.push(`${pad}set_instrument(${readNumMenuOrExpr(b, 'INSTRUMENT', 'INSTRUMENT', 1)})`);
            break;
          case 'music_setTempo':
            lines.push(`${pad}set_tempo(${readInput(b, 'TEMPO')})`);
            break;
          case 'music_changeTempo':
            lines.push(`${pad}change_tempo(${readInput(b, 'TEMPO')})`);
            break;
          case 'text2speech_speakAndWait':
            lines.push(`${pad}speak(${readInput(b, 'WORDS')})`);
            break;
          case 'text2speech_setVoice':
            lines.push(`${pad}set_voice(${readLowerMenuOrExpr(b, 'VOICES', 'voices', 'ALTO')})`);
            break;
          case 'text2speech_setLanguage':
            lines.push(`${pad}set_language(${readMenuOrExpr(b, 'LANGUAGE', 'languages', 'en')})`);
            break;

          case 'sensing_askandwait':
            lines.push(`${pad}ask(${readInput(b, 'QUESTION')})`);
            break;
          case 'sensing_setdragmode':
            lines.push(`${pad}set_drag_mode(${JSON.stringify(readField(b, 'DRAG_MODE', 'draggable'))})`);
            break;
          case 'sensing_resettimer':
            lines.push(`${pad}reset_timer()`);
            break;

          case 'event_broadcast':
            lines.push(`${pad}broadcast(${readInput(b, 'BROADCAST_INPUT')})`);
            break;
          case 'event_broadcastandwait':
            lines.push(`${pad}broadcast_and_wait(${readInput(b, 'BROADCAST_INPUT')})`);
            break;

          case 'data_setvariableto': {
            const [vName, vId] = readFieldWithId(b, 'VARIABLE', 'var');
            lines.push(`${pad}${formatVarName(vName, vId)} = ${readInput(b, 'VALUE')}`);
            break;
          }
          case 'data_changevariableby': {
            const [vName, vId] = readFieldWithId(b, 'VARIABLE', 'var');
            lines.push(`${pad}${formatVarName(vName, vId)} += ${readInput(b, 'VALUE')}`);
            break;
          }
          case 'data_showvariable':
          case 'data_hidevariable': {
            const [vName, vId] = readFieldWithId(b, 'VARIABLE', 'var');
            const fn = b.opcode === 'data_showvariable' ? 'show_variable' : 'hide_variable';
            const arg = isLocalVar(vName, vId) ? `self.${sanitizeIdent(vName, 'var')}` : JSON.stringify(vName);
            lines.push(`${pad}${fn}(${arg})`);
            break;
          }
          case 'data_showlist':
          case 'data_hidelist': {
            const [listName, listId] = readFieldWithId(b, 'LIST', 'list');
            if (isLocalList(listName, listId) && !localListsWithOps.has(listName) && !emittedLocalListDecls.has(listName)) {
              lines.push(`${pad}local_list(${JSON.stringify(listName)})`);
              emittedLocalListDecls.add(listName);
            }
            const fn = b.opcode === 'data_showlist' ? 'show_list' : 'hide_list';
            lines.push(`${pad}${fn}(${JSON.stringify(listName)})`);
            break;
          }

          case 'data_addtolist': {
            const [listName, listId] = readFieldWithId(b, 'LIST', 'list');
            const fn = isLocalList(listName, listId) ? 'local_list_add' : 'list_add';
            lines.push(`${pad}${fn}(${JSON.stringify(listName)}, ${readInput(b, 'ITEM')})`);
            break;
          }
          case 'data_deleteoflist': {
            const [listName, listId] = readFieldWithId(b, 'LIST', 'list');
            const fn = isLocalList(listName, listId) ? 'local_list_delete' : 'list_delete';
            lines.push(`${pad}${fn}(${JSON.stringify(listName)}, ${readInput(b, 'INDEX')})`);
            break;
          }
          case 'data_deletealloflist': {
            const [listName, listId] = readFieldWithId(b, 'LIST', 'list');
            const fn = isLocalList(listName, listId) ? 'local_list_clear' : 'list_clear';
            lines.push(`${pad}${fn}(${JSON.stringify(listName)})`);
            break;
          }
          case 'data_insertatlist': {
            const [listName, listId] = readFieldWithId(b, 'LIST', 'list');
            const fn = isLocalList(listName, listId) ? 'local_list_insert' : 'list_insert';
            lines.push(`${pad}${fn}(${JSON.stringify(listName)}, ${readInput(b, 'INDEX')}, ${readInput(b, 'ITEM')})`);
            break;
          }
          case 'data_replaceitemoflist': {
            const [listName, listId] = readFieldWithId(b, 'LIST', 'list');
            const fn = isLocalList(listName, listId) ? 'local_list_replace' : 'list_replace';
            lines.push(`${pad}${fn}(${JSON.stringify(listName)}, ${readInput(b, 'INDEX')}, ${readInput(b, 'ITEM')})`);
            break;
          }

          case 'procedures_call': {
            const mut = b.mutation || {};
            const fnName = extractProcName(mut.proccode);
            let argIds = [];
            try {
              argIds = JSON.parse(mut.argumentids || '[]');
            } catch (_) {
              argIds = [];
            }
            const kinds = procArgKinds(mut.proccode);
            const callArgs = argIds.map((id, i) =>
              kinds[i] === '%b' && !(b.inputs && b.inputs[id] && b.inputs[id][1]) ? 'False' : readInput(b, id)
            );
            lines.push(`${pad}${fnName}(${callArgs.join(', ')})`);
            break;
          }

          case 'control_repeat': {
            const times = readInput(b, 'TIMES');
            const sub = b.inputs && b.inputs.SUBSTACK ? b.inputs.SUBSTACK[1] : null;
            const bodyLines = sub ? decompileChain(sub, indent + 1, visited) : [`${pad}    pass`];
            // Recognise the counter pattern the compiler emits for "for i in range(n)":
            //   set i to 0 / repeat n { ...; change i by 1 }  ->  for i in range(n): ...
            const initLine = `${pad}i = 0`;
            const incLine = `${pad}    i += 1`;
            if (
              lines.length > 0 &&
              lines[lines.length - 1] === initLine &&
              bodyLines.length > 1 &&
              bodyLines[bodyLines.length - 1] === incLine &&
              bodyLines.slice(0, -1).some((ln) => /(^|[^\w.])i(?!\w)/.test(ln.replace(/"(?:[^"\\]|\\.)*"/g, '""')))
            ) {
              lines.pop();
              bodyLines.pop();
            }
            lines.push(`${pad}for i in range(${times}):`);
            lines.push(...bodyLines);
            break;
          }
          case 'control_forever': {
            lines.push(`${pad}while True:`);
            const sub = b.inputs && b.inputs.SUBSTACK ? b.inputs.SUBSTACK[1] : null;
            lines.push(...(sub ? decompileChain(sub, indent + 1, visited) : [`${pad}    pass`]));
            break;
          }
          case 'control_repeat_until': {
            lines.push(`${pad}while not (${readInput(b, 'CONDITION')}):`);
            const sub = b.inputs && b.inputs.SUBSTACK ? b.inputs.SUBSTACK[1] : null;
            lines.push(...(sub ? decompileChain(sub, indent + 1, visited) : [`${pad}    pass`]));
            break;
          }
          case 'control_if':
          case 'control_if_else':
            lines.push(...decompileIf(b, indent, 'if', visited));
            break;

          default:
            markUnknown(b.opcode);
            lines.push(tr('dec_unknown_block_line', { pad: pad, opcode: b.opcode }));
        }
        currId = b.next;
      }
      return lines;
    }

    const usedFnNames = new Set();
    const allocFnName = (baseName) => {
      let candidate = baseName;
      let suffix = 2;
      while (usedFnNames.has(candidate)) {
        candidate = `${baseName}_${suffix++}`;
      }
      usedFnNames.add(candidate);
      return candidate;
    };

    for (const [rootId, hat] of topBlocks) {
      currentRoot = rootId;
      const partsMark = parts.length;
      emitScript(hat);
      if (unsupportedByRoot.has(rootId)) {
        parts.length = partsMark;
        parts.push(
          tr('dec_raw_script', { opcodes: unsupportedByRoot.get(rootId).join(', ') })
        );
      }
      currentRoot = null;
    }
    if (report) report.unsupported = unsupportedByRoot;
    return parts.join('\n');

    function emitScript(hat) {
      if (hat.opcode === 'procedures_definition') {
        const protoId = hat.inputs && hat.inputs.custom_block ? hat.inputs.custom_block[1] : null;
        const proto = protoId ? blocks[protoId] : null;
        const mut = (proto && proto.mutation) || {};
        const fnName = allocFnName(extractProcName(mut.proccode));
        let argNames = [];
        try {
          argNames = JSON.parse(mut.argumentnames || '[]').map((n) => sanitizeIdent(n, 'arg'));
        } catch (_) {
          argNames = [];
        }
        const isWarp = mut.warp === 'true' || mut.warp === true;
        const argKinds = procArgKinds(mut.proccode);
        const argDecls = argNames.map((n, i) => (argKinds[i] === '%b' ? `${n}: bool` : n)).join(', ');
        parts.push(isWarp ? `@warp\ndef ${fnName}(${argDecls}):` : `def ${fnName}(${argDecls}):`);
        const bodyLines = hat.next ? decompileChain(hat.next, 1) : ['    pass'];
        parts.push(bodyLines.join('\n') + '\n');
        return;
      }

      let dec = '@when_flag_clicked';
      let fnName = handlerIndex === 1 ? 'main' : `script_${handlerIndex}`;
      if (hat.opcode === 'event_whenflagclicked') {
        dec = '@when_flag_clicked';
      } else if (hat.opcode === 'event_whenkeypressed') {
        const key = readField(hat, 'KEY_OPTION', 'space');
        dec = `@when_key_pressed(${JSON.stringify(key)})`;
        fnName = `on_key_${sanitizeIdent(key)}`;
      } else if (hat.opcode === 'event_whenthisspriteclicked') {
        dec = '@when_this_sprite_clicked';
        fnName = 'on_sprite_clicked';
      } else if (hat.opcode === 'event_whenstageclicked') {
        dec = '@when_stage_clicked';
        fnName = 'on_stage_clicked';
      } else if (hat.opcode === 'event_whenbackdropswitchesto') {
        const bg = readField(hat, 'BACKDROP', 'backdrop1');
        dec = `@when_backdrop_switches(${JSON.stringify(bg)})`;
        fnName = `on_${sanitizeIdent(bg)}`;
      } else if (hat.opcode === 'event_whenbroadcastreceived') {
        const msg = readField(hat, 'BROADCAST_OPTION', 'message1');
        dec = `@when_message_received(${JSON.stringify(msg)})`;
        fnName = `on_${sanitizeIdent(msg)}`;
      } else if (hat.opcode === 'event_whengreaterthan') {
        const sensor = readField(hat, 'WHENGREATERTHANMENU', 'LOUDNESS').toLowerCase();
        const val = readInput(hat, 'VALUE');
        dec = `@when_greater_than(${JSON.stringify(sensor)}, ${val})`;
        fnName = `on_${sanitizeIdent(sensor)}_gt_${handlerIndex}`;
      } else if (hat.opcode === 'event_whentouchingobject') {
        const dest = readMenuOrExpr(hat, 'TOUCHINGOBJECTMENU', 'TOUCHINGOBJECTMENU', 'mouse');
        let destName = 'mouse';
        try {
          destName = String(JSON.parse(dest));
        } catch (_) {
          /* expression in a hat slot: keep default name */
        }
        dec = `@when_touching(${dest})`;
        fnName = `on_touching_${sanitizeIdent(destName)}`;
      } else if (hat.opcode === 'control_start_as_clone') {
        dec = '@when_cloned';
        fnName = `on_clone_${handlerIndex}`;
      } else {
        // Not a hat the DSL knows (unknown event hat or a loose block stack): keep it verbatim on recompile
        markUnknown(hat.opcode);
        return;
      }

      handlerIndex++;
      fnName = allocFnName(fnName);
      parts.push(`${dec}\ndef ${fnName}():`);
      const bodyLines = hat.next ? decompileChain(hat.next, 1) : ['    pass'];
      parts.push(bodyLines.join('\n') + '\n');
    }
  }

  // Human-readable label for each Scratch block in the page language (for educational block tree inspection).
  // The historical name formatBlockUk is kept for compatibility; formatBlock is the same function.
  function formatBlockUk(blockId, blocks) {
    const b = blocks[blockId];
    if (!b) return { label: tr('blk_unknown'), category: 'motion' };
    const { readField, readInput, readMenuOrExpr, readNumMenuOrExpr } = createBlockReader(blocks);

    let category = 'motion';
    if (b.opcode.startsWith('event_')) category = 'events';
    else if (b.opcode.startsWith('looks_')) category = 'looks';
    else if (b.opcode.startsWith('sound_')) category = 'sound';
    else if (b.opcode.startsWith('pen_')) category = 'pen';
    else if (b.opcode.startsWith('music_') || b.opcode === 'note') category = 'music';
    else if (b.opcode.startsWith('text2speech_')) category = 'text2speech';
    else if (b.opcode.startsWith('translate_')) category = 'translate';
    else if (b.opcode.startsWith('control_')) category = 'control';
    else if (b.opcode.startsWith('sensing_')) category = 'sensing';
    else if (b.opcode.startsWith('operator_')) category = 'operators';
    else if (b.opcode.startsWith('data_')) category = 'data';
    else if (b.opcode.startsWith('procedures_')) category = 'custom';

    let label = b.opcode;
    switch (b.opcode) {
      case 'event_whenflagclicked':
        label = tr('blk_when_flag');
        break;
      case 'event_whenkeypressed':
        label = tr('blk_when_key', { key: readField(b, 'KEY_OPTION', 'space') });
        break;
      case 'event_whenthisspriteclicked':
        label = tr('blk_when_sprite_clicked');
        break;
      case 'event_whenstageclicked':
        label = tr('blk_when_stage_clicked');
        break;
      case 'event_whenbackdropswitchesto':
        label = tr('blk_when_backdrop', { backdrop: readField(b, 'BACKDROP', 'backdrop1') });
        break;
      case 'event_whenbroadcastreceived':
        label = tr('blk_when_broadcast', { message: readField(b, 'BROADCAST_OPTION', 'message1') });
        break;
      case 'event_whengreaterthan':
        label = tr('blk_when_greater', { sensor: readField(b, 'WHENGREATERTHANMENU', 'LOUDNESS').toLowerCase(), value: readInput(b, 'VALUE') });
        break;
      case 'event_broadcast':
        label = tr('blk_broadcast', { message: readInput(b, 'BROADCAST_INPUT') });
        break;
      case 'event_broadcastandwait':
        label = tr('blk_broadcast_wait', { message: readInput(b, 'BROADCAST_INPUT') });
        break;
      case 'control_start_as_clone':
        label = tr('blk_when_clone');
        break;
      case 'event_whentouchingobject':
        label = tr('blk_when_touching', { object: readMenuOrExpr(b, 'TOUCHINGOBJECTMENU', 'TOUCHINGOBJECTMENU', 'mouse') });
        break;
      case 'music_playDrumForBeats':
        label = tr('blk_drum', { drum: readNumMenuOrExpr(b, 'DRUM', 'DRUM', 1), beats: readInput(b, 'BEATS') });
        break;
      case 'music_restForBeats':
        label = tr('blk_rest', { beats: readInput(b, 'BEATS') });
        break;
      case 'music_playNoteForBeats':
        label = tr('blk_note', { note: readNumMenuOrExpr(b, 'NOTE', 'NOTE', 60), beats: readInput(b, 'BEATS') });
        break;
      case 'music_setInstrument':
        label = tr('blk_instrument', { instrument: readNumMenuOrExpr(b, 'INSTRUMENT', 'INSTRUMENT', 1) });
        break;
      case 'music_setTempo':
        label = tr('blk_set_tempo', { tempo: readInput(b, 'TEMPO') });
        break;
      case 'music_changeTempo':
        label = tr('blk_change_tempo', { tempo: readInput(b, 'TEMPO') });
        break;
      case 'music_getTempo':
        label = tr('blk_tempo');
        break;
      case 'text2speech_speakAndWait':
        label = tr('blk_speak', { words: readInput(b, 'WORDS') });
        break;
      case 'text2speech_setVoice':
        label = tr('blk_set_voice', { voice: readMenuOrExpr(b, 'VOICES', 'voices', 'ALTO') });
        break;
      case 'text2speech_setLanguage':
        label = tr('blk_set_language', { language: readMenuOrExpr(b, 'LANGUAGE', 'languages', 'en') });
        break;
      case 'translate_getTranslate':
        label = tr('blk_translate', { words: readInput(b, 'WORDS'), language: readMenuOrExpr(b, 'LANGUAGE', 'languages', 'en') });
        break;
      case 'translate_getViewerLanguage':
        label = tr('blk_viewer_language');
        break;
      case 'procedures_definition': {
        const protoId = b.inputs && b.inputs.custom_block ? b.inputs.custom_block[1] : null;
        const proto = protoId ? blocks[protoId] : null;
        const mut = (proto && proto.mutation) || {};
        label = tr('blk_define', { proccode: mut.proccode || tr('blk_block') });
        break;
      }
      case 'procedures_call': {
        const mut = b.mutation || {};
        const fnName = extractProcName(mut.proccode);
        let argIds = [];
        try { argIds = JSON.parse(mut.argumentids || '[]'); } catch (_) {}
        const args = argIds.map((id) => readInput(b, id));
        label = tr('blk_call', { name: fnName, args: args.join(', ') });
        break;
      }
      case 'motion_movesteps':
        label = tr('blk_move', { steps: readInput(b, 'STEPS') });
        break;
      case 'motion_turnright':
        label = tr('blk_turn_right', { degrees: readInput(b, 'DEGREES') });
        break;
      case 'motion_turnleft':
        label = tr('blk_turn_left', { degrees: readInput(b, 'DEGREES') });
        break;
      case 'motion_gotoxy':
        label = tr('blk_goto_xy', { x: readInput(b, 'X'), y: readInput(b, 'Y') });
        break;
      case 'motion_goto':
        label = tr('blk_goto', { target: readMenuOrExpr(b, 'TO', 'TO', 'random') });
        break;
      case 'motion_glidesecstoxy':
        label = tr('blk_glide_xy', { secs: readInput(b, 'SECS'), x: readInput(b, 'X'), y: readInput(b, 'Y') });
        break;
      case 'motion_glideto':
        label = tr('blk_glide_to', { secs: readInput(b, 'SECS'), target: readMenuOrExpr(b, 'TO', 'TO', 'random') });
        break;
      case 'motion_setx':
        label = tr('blk_set_x', { x: readInput(b, 'X') });
        break;
      case 'motion_sety':
        label = tr('blk_set_y', { y: readInput(b, 'Y') });
        break;
      case 'motion_changexby':
        label = tr('blk_change_x', { dx: readInput(b, 'DX') });
        break;
      case 'motion_changeyby':
        label = tr('blk_change_y', { dy: readInput(b, 'DY') });
        break;
      case 'motion_pointindirection':
        label = tr('blk_point_direction', { direction: readInput(b, 'DIRECTION') });
        break;
      case 'motion_pointtowards':
        label = tr('blk_point_towards', { target: readMenuOrExpr(b, 'TOWARDS', 'TOWARDS', 'mouse') });
        break;
      case 'motion_ifonedgebounce':
        label = tr('blk_bounce');
        break;
      case 'motion_setrotationstyle':
        label = tr('blk_rotation_style', { style: readField(b, 'STYLE', 'all around') });
        break;
      case 'looks_switchbackdropto':
        label = tr('blk_switch_backdrop', { backdrop: readMenuOrExpr(b, 'BACKDROP', 'BACKDROP', 'backdrop1') });
        break;
      case 'looks_switchbackdroptoandwait':
        label = tr('blk_switch_backdrop_wait', { backdrop: readMenuOrExpr(b, 'BACKDROP', 'BACKDROP', 'backdrop1') });
        break;
      case 'looks_nextbackdrop':
        label = tr('blk_next_backdrop');
        break;
      case 'looks_gotofrontback':
        label = readField(b, 'FRONT_BACK', 'front') === 'back' ? tr('blk_go_back') : tr('blk_go_front');
        break;
      case 'looks_goforwardbackwardlayers': {
        const dir = readField(b, 'FORWARD_BACKWARD', 'forward') === 'backward' ? tr('blk_dir_backward') : tr('blk_dir_forward');
        label = tr('blk_layers', { dir: dir, num: readInput(b, 'NUM') });
        break;
      }
      case 'looks_switchcostumeto':
        label = tr('blk_switch_costume', { costume: readMenuOrExpr(b, 'COSTUME', 'COSTUME', 'costume1') });
        break;
      case 'looks_nextcostume':
        label = tr('blk_next_costume');
        break;
      case 'looks_sayforsecs':
        label = tr('blk_say_for', { message: readInput(b, 'MESSAGE'), secs: readInput(b, 'SECS') });
        break;
      case 'looks_say':
        label = tr('blk_say', { message: readInput(b, 'MESSAGE') });
        break;
      case 'looks_thinkforsecs':
        label = tr('blk_think_for', { message: readInput(b, 'MESSAGE'), secs: readInput(b, 'SECS') });
        break;
      case 'looks_think':
        label = tr('blk_think', { message: readInput(b, 'MESSAGE') });
        break;
      case 'looks_show':
        label = tr('blk_show');
        break;
      case 'looks_hide':
        label = tr('blk_hide');
        break;
      case 'looks_setsizeto':
        label = tr('blk_set_size', { size: readInput(b, 'SIZE') });
        break;
      case 'looks_changesizeby':
        label = tr('blk_change_size', { change: readInput(b, 'CHANGE') });
        break;
      case 'looks_seteffectto':
        label = tr('blk_set_effect', { effect: readField(b, 'EFFECT', 'COLOR').toLowerCase(), value: readInput(b, 'VALUE') });
        break;
      case 'looks_changeeffectby':
        label = tr('blk_change_effect', { effect: readField(b, 'EFFECT', 'COLOR').toLowerCase(), change: readInput(b, 'CHANGE') });
        break;
      case 'looks_cleargraphiceffects':
        label = tr('blk_clear_effects');
        break;
      case 'sound_play':
        label = tr('blk_play_sound', { sound: readMenuOrExpr(b, 'SOUND_MENU', 'SOUND_MENU', 'pop') });
        break;
      case 'sound_playuntildone':
        label = tr('blk_play_sound_wait', { sound: readMenuOrExpr(b, 'SOUND_MENU', 'SOUND_MENU', 'pop') });
        break;
      case 'sound_stopallsounds':
        label = tr('blk_stop_sounds');
        break;
      case 'sound_setvolumeto':
        label = tr('blk_set_volume', { volume: readInput(b, 'VOLUME') });
        break;
      case 'sound_changevolumeby':
        label = tr('blk_change_volume', { volume: readInput(b, 'VOLUME') });
        break;
      case 'sound_seteffectto':
        label = tr('blk_set_sound_effect', { effect: readField(b, 'EFFECT', 'PITCH').toLowerCase(), value: readInput(b, 'VALUE') });
        break;
      case 'sound_changeeffectby':
        label = tr('blk_change_sound_effect', { effect: readField(b, 'EFFECT', 'PITCH').toLowerCase(), value: readInput(b, 'VALUE') });
        break;
      case 'sound_cleareffects':
        label = tr('blk_clear_sound_effects');
        break;
      case 'pen_clear':
        label = tr('blk_pen_clear');
        break;
      case 'pen_stamp':
        label = tr('blk_pen_stamp');
        break;
      case 'pen_penDown':
        label = tr('blk_pen_down');
        break;
      case 'pen_penUp':
        label = tr('blk_pen_up');
        break;
      case 'pen_setPenColorToColor':
        label = tr('blk_pen_color', { color: readInput(b, 'COLOR') });
        break;
      case 'pen_setPenColorParamTo':
        label = tr('blk_set_pen_param', { param: readMenuOrExpr(b, 'COLOR_PARAM', 'colorParam', 'color'), value: readInput(b, 'VALUE') });
        break;
      case 'pen_changePenColorParamBy':
        label = tr('blk_change_pen_param', { param: readMenuOrExpr(b, 'COLOR_PARAM', 'colorParam', 'color'), value: readInput(b, 'VALUE') });
        break;
      case 'pen_setPenSizeTo':
        label = tr('blk_set_pen_size', { size: readInput(b, 'SIZE') });
        break;
      case 'pen_changePenSizeBy':
        label = tr('blk_change_pen_size', { size: readInput(b, 'SIZE') });
        break;
      case 'control_wait':
        label = tr('blk_wait', { secs: readInput(b, 'DURATION') });
        break;
      case 'control_wait_until':
        label = tr('blk_wait_until', { condition: readInput(b, 'CONDITION') });
        break;
      case 'control_repeat':
        label = tr('blk_repeat', { times: readInput(b, 'TIMES') });
        break;
      case 'control_forever':
        label = tr('blk_forever');
        break;
      case 'control_repeat_until':
        label = tr('blk_repeat_until', { condition: readInput(b, 'CONDITION') });
        break;
      case 'control_if':
        label = tr('blk_if', { condition: readInput(b, 'CONDITION') });
        break;
      case 'control_if_else':
        label = tr('blk_if_else', { condition: readInput(b, 'CONDITION') });
        break;
      case 'control_stop':
        label = tr('blk_stop', { option: readField(b, 'STOP_OPTION', 'all') });
        break;
      case 'control_create_clone_of':
        label = tr('blk_create_clone', { target: readMenuOrExpr(b, 'CLONE_OPTION', 'CLONE_OPTION', 'myself') });
        break;
      case 'control_delete_this_clone':
        label = tr('blk_delete_clone');
        break;
      case 'sensing_askandwait':
        label = tr('blk_ask', { question: readInput(b, 'QUESTION') });
        break;
      case 'sensing_setdragmode': {
        const mode = readField(b, 'DRAG_MODE', 'draggable');
        label = tr('blk_drag_mode', { mode: mode === 'not draggable' ? tr('blk_not_draggable') : tr('blk_draggable') });
        break;
      }
      case 'sensing_resettimer':
        label = tr('blk_reset_timer');
        break;
      case 'data_setvariableto':
        label = tr('blk_set_var', { var: readField(b, 'VARIABLE', 'var'), value: readInput(b, 'VALUE') });
        break;
      case 'data_changevariableby':
        label = tr('blk_change_var', { var: readField(b, 'VARIABLE', 'var'), value: readInput(b, 'VALUE') });
        break;
      case 'data_showvariable':
        label = tr('blk_show_var', { var: readField(b, 'VARIABLE', 'var') });
        break;
      case 'data_hidevariable':
        label = tr('blk_hide_var', { var: readField(b, 'VARIABLE', 'var') });
        break;
      case 'data_showlist':
        label = tr('blk_show_list', { list: readField(b, 'LIST', 'list') });
        break;
      case 'data_hidelist':
        label = tr('blk_hide_list', { list: readField(b, 'LIST', 'list') });
        break;
      case 'data_addtolist':
        label = tr('blk_list_add', { item: readInput(b, 'ITEM'), list: readField(b, 'LIST', 'list') });
        break;
      case 'data_deleteoflist':
        label = tr('blk_list_delete', { index: readInput(b, 'INDEX'), list: readField(b, 'LIST', 'list') });
        break;
      case 'data_deletealloflist':
        label = tr('blk_list_clear', { list: readField(b, 'LIST', 'list') });
        break;
      case 'data_insertatlist':
        label = tr('blk_list_insert', { item: readInput(b, 'ITEM'), index: readInput(b, 'INDEX'), list: readField(b, 'LIST', 'list') });
        break;
      case 'data_replaceitemoflist':
        label = tr('blk_list_replace', { index: readInput(b, 'INDEX'), list: readField(b, 'LIST', 'list'), item: readInput(b, 'ITEM') });
        break;
    }

    return { label, opcode: b.opcode, category, line: b._line || null };
  }

  const api = { decompileTarget, formatBlockUk, formatBlock: formatBlockUk, extractProcName };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    global.PyScratchDecompiler = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
