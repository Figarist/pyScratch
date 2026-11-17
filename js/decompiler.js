/**
 * decompiler.js
 * Decompiles Scratch 3.0 target.blocks into clean, idiomatic Python-DSL code (4-space indent)
 * and provides human-readable Ukrainian Scratch block labels for the visual inspector.
 */

(function (global) {
  'use strict';

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

  function createBlockReader(blocks, target = null, stageTarget = null) {
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
          return val[1] === '' || val[1] === null || val[1] === undefined ? '0' : String(val[1]);
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

    function decompileReporter(blockId) {
      const b = blocks[blockId];
      if (!b) return '0';
      switch (b.opcode) {
        case 'argument_reporter_string_number':
        case 'argument_reporter_boolean':
          return readField(b, 'VALUE', 'arg');
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
          return `0`;
      }
    }

    return {
      readField,
      readFieldWithId,
      readInput,
      readMenuOrExpr,
      decompileReporter,
      isLocalVar,
      isLocalList,
      formatVarName
    };
  }

  function decompileTarget(target, stageTarget = null) {
    const blocks = target.blocks || {};
    const topBlocks = Object.entries(blocks)
      .filter(([, b]) => b && b.topLevel && !b.shadow)
      .sort((a, b) => (a[1].y || 0) - (b[1].y || 0));

    if (topBlocks.length === 0) {
      return `# === ${target.isStage ? 'СЦЕНА' : 'СПРАЙТ'} (${target.name}) ===\n# Поки що немає скриптів. Напишіть @when_flag_clicked нижче!\n`;
    }

    const {
      readField,
      readFieldWithId,
      readInput,
      readMenuOrExpr,
      isLocalVar,
      isLocalList,
      formatVarName
    } = createBlockReader(blocks, target, stageTarget);

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
    parts.push(`# === ${target.isStage ? 'СКРИПТ СЦЕНИ' : 'СКРИПТ ГРАВЦЯ'} (${target.name}) ===\n`);

    function decompileIf(b, indent, keyword = 'if') {
      const lines = [];
      const pad = '    '.repeat(indent);
      lines.push(`${pad}${keyword} ${readInput(b, 'CONDITION')}:`);
      const sub1 = b.inputs && b.inputs.SUBSTACK ? b.inputs.SUBSTACK[1] : null;
      lines.push(...(sub1 ? decompileChain(sub1, indent + 1) : [`${pad}    pass`]));

      if (b.opcode === 'control_if_else') {
        const sub2 = b.inputs && b.inputs.SUBSTACK2 ? b.inputs.SUBSTACK2[1] : null;
        if (
          sub2 &&
          blocks[sub2] &&
          (blocks[sub2].opcode === 'control_if' || blocks[sub2].opcode === 'control_if_else') &&
          !blocks[sub2].next
        ) {
          lines.push(...decompileIf(blocks[sub2], indent, 'elif'));
        } else {
          lines.push(`${pad}else:`);
          lines.push(...(sub2 ? decompileChain(sub2, indent + 1) : [`${pad}    pass`]));
        }
      }
      return lines;
    }

    function decompileChain(startId, indent) {
      const lines = [];
      let currId = startId;
      const pad = '    '.repeat(indent);

      while (currId && blocks[currId]) {
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
            const callArgs = argIds.map((id) => readInput(b, id));
            lines.push(`${pad}${fnName}(${callArgs.join(', ')})`);
            break;
          }

          case 'control_repeat': {
            lines.push(`${pad}for i in range(${readInput(b, 'TIMES')}):`);
            const sub = b.inputs && b.inputs.SUBSTACK ? b.inputs.SUBSTACK[1] : null;
            lines.push(...(sub ? decompileChain(sub, indent + 1) : [`${pad}    pass`]));
            break;
          }
          case 'control_forever': {
            lines.push(`${pad}while True:`);
            const sub = b.inputs && b.inputs.SUBSTACK ? b.inputs.SUBSTACK[1] : null;
            lines.push(...(sub ? decompileChain(sub, indent + 1) : [`${pad}    pass`]));
            break;
          }
          case 'control_repeat_until': {
            lines.push(`${pad}while not (${readInput(b, 'CONDITION')}):`);
            const sub = b.inputs && b.inputs.SUBSTACK ? b.inputs.SUBSTACK[1] : null;
            lines.push(...(sub ? decompileChain(sub, indent + 1) : [`${pad}    pass`]));
            break;
          }
          case 'control_if':
          case 'control_if_else':
            lines.push(...decompileIf(b, indent, 'if'));
            break;

          default:
            lines.push(`${pad}# невідомий блок: ${b.opcode}`);
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

    for (const [, hat] of topBlocks) {
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
        parts.push(
          isWarp ? `@warp\ndef ${fnName}(${argNames.join(', ')}):` : `def ${fnName}(${argNames.join(', ')}):`
        );
        const bodyLines = hat.next ? decompileChain(hat.next, 1) : ['    pass'];
        parts.push(bodyLines.join('\n') + '\n');
        continue;
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
      } else if (hat.opcode === 'control_start_as_clone') {
        dec = '@when_cloned';
        fnName = `on_clone_${handlerIndex}`;
      } else {
        continue;
      }

      handlerIndex++;
      fnName = allocFnName(fnName);
      parts.push(`${dec}\ndef ${fnName}():`);
      const bodyLines = hat.next ? decompileChain(hat.next, 1) : ['    pass'];
      parts.push(bodyLines.join('\n') + '\n');
    }

    return parts.join('\n');
  }

  // Human-readable Ukrainian label for each Scratch block (for educational block tree inspection)
  function formatBlockUk(blockId, blocks) {
    const b = blocks[blockId];
    if (!b) return { label: 'невідомий блок', category: 'motion' };
    const { readField, readInput, readMenuOrExpr } = createBlockReader(blocks);

    let category = 'motion';
    if (b.opcode.startsWith('event_')) category = 'events';
    else if (b.opcode.startsWith('looks_')) category = 'looks';
    else if (b.opcode.startsWith('sound_')) category = 'sound';
    else if (b.opcode.startsWith('pen_')) category = 'pen';
    else if (b.opcode.startsWith('control_')) category = 'control';
    else if (b.opcode.startsWith('sensing_')) category = 'sensing';
    else if (b.opcode.startsWith('operator_')) category = 'operators';
    else if (b.opcode.startsWith('data_')) category = 'data';
    else if (b.opcode.startsWith('procedures_')) category = 'custom';

    let label = b.opcode;
    switch (b.opcode) {
      case 'event_whenflagclicked':
        label = 'Коли натиснуто зелений прапорець';
        break;
      case 'event_whenkeypressed':
        label = `Коли клавішу [${readField(b, 'KEY_OPTION', 'space')}] натиснуто`;
        break;
      case 'event_whenthisspriteclicked':
        label = 'Коли спрайт натиснуто';
        break;
      case 'event_whenstageclicked':
        label = 'Коли сцену натиснуто';
        break;
      case 'event_whenbackdropswitchesto':
        label = `Коли тло змінюється на [${readField(b, 'BACKDROP', 'backdrop1')}]`;
        break;
      case 'event_whenbroadcastreceived':
        label = `Коли я отримую [${readField(b, 'BROADCAST_OPTION', 'message1')}]`;
        break;
      case 'event_whengreaterthan':
        label = `Коли [${readField(b, 'WHENGREATERTHANMENU', 'LOUDNESS').toLowerCase()}] > (${readInput(b, 'VALUE')})`;
        break;
      case 'event_broadcast':
        label = `Оповістити (${readInput(b, 'BROADCAST_INPUT')})`;
        break;
      case 'event_broadcastandwait':
        label = `Оповістити (${readInput(b, 'BROADCAST_INPUT')}) і чекати`;
        break;
      case 'control_start_as_clone':
        label = 'Коли я починаю як клон';
        break;
      case 'procedures_definition': {
        const protoId = b.inputs && b.inputs.custom_block ? b.inputs.custom_block[1] : null;
        const proto = protoId ? blocks[protoId] : null;
        const mut = (proto && proto.mutation) || {};
        label = `Визначити: ${mut.proccode || 'блок'}`;
        break;
      }
      case 'procedures_call': {
        const mut = b.mutation || {};
        const fnName = extractProcName(mut.proccode);
        let argIds = [];
        try { argIds = JSON.parse(mut.argumentids || '[]'); } catch (_) {}
        const args = argIds.map((id) => readInput(b, id));
        label = `Викликати ${fnName}(${args.join(', ')})`;
        break;
      }
      case 'motion_movesteps':
        label = `Перемістити на (${readInput(b, 'STEPS')}) кроків`;
        break;
      case 'motion_turnright':
        label = `Повернути праворуч на (${readInput(b, 'DEGREES')}) град.`;
        break;
      case 'motion_turnleft':
        label = `Повернути ліворуч на (${readInput(b, 'DEGREES')}) град.`;
        break;
      case 'motion_gotoxy':
        label = `Перейти в x: (${readInput(b, 'X')}) y: (${readInput(b, 'Y')})`;
        break;
      case 'motion_goto':
        label = `Перейти до [${readMenuOrExpr(b, 'TO', 'TO', 'random')}]`;
        break;
      case 'motion_glidesecstoxy':
        label = `Ковзати (${readInput(b, 'SECS')}) сек до x: (${readInput(b, 'X')}) y: (${readInput(b, 'Y')})`;
        break;
      case 'motion_glideto':
        label = `Ковзати (${readInput(b, 'SECS')}) сек до [${readMenuOrExpr(b, 'TO', 'TO', 'random')}]`;
        break;
      case 'motion_setx':
        label = `Встановити x в (${readInput(b, 'X')})`;
        break;
      case 'motion_sety':
        label = `Встановити y в (${readInput(b, 'Y')})`;
        break;
      case 'motion_changexby':
        label = `Змінити x на (${readInput(b, 'DX')})`;
        break;
      case 'motion_changeyby':
        label = `Змінити y на (${readInput(b, 'DY')})`;
        break;
      case 'motion_pointindirection':
        label = `Повернути в напрямку (${readInput(b, 'DIRECTION')})`;
        break;
      case 'motion_pointtowards':
        label = `Слідувати за [${readMenuOrExpr(b, 'TOWARDS', 'TOWARDS', 'mouse')}]`;
        break;
      case 'motion_ifonedgebounce':
        label = 'Якщо на межі, відбити';
        break;
      case 'motion_setrotationstyle':
        label = `Встановити стиль обертання [${readField(b, 'STYLE', 'all around')}]`;
        break;
      case 'looks_switchbackdropto':
        label = `Змінити тло на [${readMenuOrExpr(b, 'BACKDROP', 'BACKDROP', 'backdrop1')}]`;
        break;
      case 'looks_switchbackdroptoandwait':
        label = `Змінити тло на [${readMenuOrExpr(b, 'BACKDROP', 'BACKDROP', 'backdrop1')}] і чекати`;
        break;
      case 'looks_nextbackdrop':
        label = 'Наступне тло';
        break;
      case 'looks_gotofrontback':
        label = readField(b, 'FRONT_BACK', 'front') === 'back' ? 'Перейти на задній план' : 'Перейти на передній план';
        break;
      case 'looks_goforwardbackwardlayers': {
        const dir = readField(b, 'FORWARD_BACKWARD', 'forward') === 'backward' ? 'назад' : 'вперед';
        label = `Перемістити ${dir} на (${readInput(b, 'NUM')}) шарів`;
        break;
      }
      case 'looks_switchcostumeto':
        label = `Змінити образ на [${readMenuOrExpr(b, 'COSTUME', 'COSTUME', 'costume1')}]`;
        break;
      case 'looks_nextcostume':
        label = 'Наступний образ';
        break;
      case 'looks_sayforsecs':
        label = `Говорити (${readInput(b, 'MESSAGE')}) протягом (${readInput(b, 'SECS')}) сек`;
        break;
      case 'looks_say':
        label = `Говорити (${readInput(b, 'MESSAGE')})`;
        break;
      case 'looks_thinkforsecs':
        label = `Думати (${readInput(b, 'MESSAGE')}) протягом (${readInput(b, 'SECS')}) сек`;
        break;
      case 'looks_think':
        label = `Думати (${readInput(b, 'MESSAGE')})`;
        break;
      case 'looks_show':
        label = 'Показати';
        break;
      case 'looks_hide':
        label = 'Сховати';
        break;
      case 'looks_setsizeto':
        label = `Встановити розмір (${readInput(b, 'SIZE')}) %`;
        break;
      case 'looks_changesizeby':
        label = `Змінити розмір на (${readInput(b, 'CHANGE')})`;
        break;
      case 'looks_seteffectto':
        label = `Встановити ефект [${readField(b, 'EFFECT', 'COLOR').toLowerCase()}] в (${readInput(b, 'VALUE')})`;
        break;
      case 'looks_changeeffectby':
        label = `Змінити ефект [${readField(b, 'EFFECT', 'COLOR').toLowerCase()}] на (${readInput(b, 'CHANGE')})`;
        break;
      case 'looks_cleargraphiceffects':
        label = 'Очистити графічні ефекти';
        break;
      case 'sound_play':
        label = `Відтворити звук [${readMenuOrExpr(b, 'SOUND_MENU', 'SOUND_MENU', 'pop')}]`;
        break;
      case 'sound_playuntildone':
        label = `Відтворити звук [${readMenuOrExpr(b, 'SOUND_MENU', 'SOUND_MENU', 'pop')}] до кінця`;
        break;
      case 'sound_stopallsounds':
        label = 'Зупинити всі звуки';
        break;
      case 'sound_setvolumeto':
        label = `Встановити гучність (${readInput(b, 'VOLUME')}) %`;
        break;
      case 'sound_changevolumeby':
        label = `Змінити гучність на (${readInput(b, 'VOLUME')})`;
        break;
      case 'sound_seteffectto':
        label = `Встановити звуковий ефект [${readField(b, 'EFFECT', 'PITCH').toLowerCase()}] в (${readInput(b, 'VALUE')})`;
        break;
      case 'sound_changeeffectby':
        label = `Змінити звуковий ефект [${readField(b, 'EFFECT', 'PITCH').toLowerCase()}] на (${readInput(b, 'VALUE')})`;
        break;
      case 'sound_cleareffects':
        label = 'Очистити звукові ефекти';
        break;
      case 'pen_clear':
        label = 'Очистити все (Олівець)';
        break;
      case 'pen_stamp':
        label = 'Штамп (Олівець)';
        break;
      case 'pen_penDown':
        label = 'Опустити олівець';
        break;
      case 'pen_penUp':
        label = 'Підняти олівець';
        break;
      case 'pen_setPenColorToColor':
        label = `Надати олівцю колір (${readInput(b, 'COLOR')})`;
        break;
      case 'pen_setPenColorParamTo':
        label = `Встановити параметр олівця [${readMenuOrExpr(b, 'COLOR_PARAM', 'colorParam', 'color')}] в (${readInput(b, 'VALUE')})`;
        break;
      case 'pen_changePenColorParamBy':
        label = `Змінити параметр олівця [${readMenuOrExpr(b, 'COLOR_PARAM', 'colorParam', 'color')}] на (${readInput(b, 'VALUE')})`;
        break;
      case 'pen_setPenSizeTo':
        label = `Встановити розмір олівця (${readInput(b, 'SIZE')})`;
        break;
      case 'pen_changePenSizeBy':
        label = `Змінити розмір олівця на (${readInput(b, 'SIZE')})`;
        break;
      case 'control_wait':
        label = `Чекати (${readInput(b, 'DURATION')}) сек`;
        break;
      case 'control_wait_until':
        label = `Чекати до <${readInput(b, 'CONDITION')}>`;
        break;
      case 'control_repeat':
        label = `Повторити (${readInput(b, 'TIMES')}) разів`;
        break;
      case 'control_forever':
        label = 'Повторювати завжди';
        break;
      case 'control_repeat_until':
        label = `Повторювати до <${readInput(b, 'CONDITION')}>`;
        break;
      case 'control_if':
        label = `Якщо <${readInput(b, 'CONDITION')}> то`;
        break;
      case 'control_if_else':
        label = `Якщо <${readInput(b, 'CONDITION')}> то ... інакше`;
        break;
      case 'control_stop':
        label = `Зупинити [${readField(b, 'STOP_OPTION', 'all')}]`;
        break;
      case 'control_create_clone_of':
        label = `Створити клон з [${readMenuOrExpr(b, 'CLONE_OPTION', 'CLONE_OPTION', 'myself')}]`;
        break;
      case 'control_delete_this_clone':
        label = 'Вилучити цей клон';
        break;
      case 'sensing_askandwait':
        label = `Запитати (${readInput(b, 'QUESTION')}) і чекати`;
        break;
      case 'sensing_setdragmode': {
        const mode = readField(b, 'DRAG_MODE', 'draggable');
        label = `Встановити режим перетягування [${mode === 'not draggable' ? 'не перетягується' : 'перетягується'}]`;
        break;
      }
      case 'sensing_resettimer':
        label = 'Перезапустити таймер';
        break;
      case 'data_setvariableto':
        label = `Надати [${readField(b, 'VARIABLE', 'var')}] значення (${readInput(b, 'VALUE')})`;
        break;
      case 'data_changevariableby':
        label = `Змінити [${readField(b, 'VARIABLE', 'var')}] на (${readInput(b, 'VALUE')})`;
        break;
      case 'data_showvariable':
        label = `Показати змінну [${readField(b, 'VARIABLE', 'var')}]`;
        break;
      case 'data_hidevariable':
        label = `Сховати змінну [${readField(b, 'VARIABLE', 'var')}]`;
        break;
      case 'data_showlist':
        label = `Показати список [${readField(b, 'LIST', 'list')}]`;
        break;
      case 'data_hidelist':
        label = `Сховати список [${readField(b, 'LIST', 'list')}]`;
        break;
      case 'data_addtolist':
        label = `Додати (${readInput(b, 'ITEM')}) до [${readField(b, 'LIST', 'list')}]`;
        break;
      case 'data_deleteoflist':
        label = `Вилучити (${readInput(b, 'INDEX')}) з [${readField(b, 'LIST', 'list')}]`;
        break;
      case 'data_deletealloflist':
        label = `Вилучити все з [${readField(b, 'LIST', 'list')}]`;
        break;
      case 'data_insertatlist':
        label = `Вставити (${readInput(b, 'ITEM')}) у позицію (${readInput(b, 'INDEX')}) списку [${readField(b, 'LIST', 'list')}]`;
        break;
      case 'data_replaceitemoflist':
        label = `Замінити елемент (${readInput(b, 'INDEX')}) списку [${readField(b, 'LIST', 'list')}] на (${readInput(b, 'ITEM')})`;
        break;
    }

    return { label, opcode: b.opcode, category, line: b._line || null };
  }

  const api = { decompileTarget, formatBlockUk };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    global.PyScratchDecompiler = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
