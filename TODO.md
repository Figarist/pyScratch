# pyScratch — Scratch 3.0 Parity Audit & Roadmap

Comprehensive parity checklist auditing the current codebase (`js/sb3Bridge.js`, `js/compiler.js`, `js/decompiler.js`, `js/preview.js`, `js/app.js`, `index.html`, `test/test_roundtrip.js`) against 100% 1:1 Scratch 3.0 VM and `.sb3` specification parity.

**Legend**
- `[x]` Implemented & verified in the current codebase
- `[ ]` Missing, incomplete, or mismatched against 1:1 Scratch 3.0 parity

---

## 1. Core Architecture & `.sb3` Serialization (`js/sb3Bridge.js`, `js/compiler.js`, `js/decompiler.js`)

- [x] **Tokenizer & AST Parser with line tracking and Ukrainian syntax error diagnostics** (`tokenize`, `parse`, `CompileError` in `js/compiler.js`; non-enumerable `block._line` metadata for block-to-line navigation; editor cursor line/column telemetry `Ряд / Стовп` in `js/app.js`).
  - *Note:* `CompileError` and AST tokens currently store `line` only (no column `col` offset).
- [x] **Lossless round-trip compilation & decompilation for supported DSL blocks** (`compileToScratch` <-> `decompileTarget`, verified idempotent across second compilation and `.sb3` ZIP round-trip in `test/test_roundtrip.js`).
- [x] **Negative number literal folding** (`parseUnary` in `js/compiler.js` folds `-150` directly into `Number(-150)` / `[1, [4, "-150"]]` without an `operator_subtract(0, 150)` wrapper; `decompileReporter` & `readInput` in `js/decompiler.js` preserve negative numbers).
- [x] **RFC 1321 MD5 calculation for SVG and binary WAV assets** (`md5Bytes` / `md5` in `js/sb3Bridge.js`, verified against Node `crypto` on UTF-8 strings and binary WAV buffers).
- [x] **`.sb3` ZIP unpacking and DEFLATE packing via `JSZip`** (`loadSb3` / `saveSb3` in `js/sb3Bridge.js`).
- [ ] **Preserve and generate `projectJson.monitors`**:
  - `createDefaultProject` initializes `monitors: []`; `compiler.js` and `decompiler.js` do not create or serialize variable/list stage monitors (`mode`: `"default"`, `"large"`, `"slider"`, `sliderMin`, `sliderMax`, `isDiscrete`, `x`, `y`, `width`, `height`, `visible`). (`StagePreview` tracks `visibleMonitors`/`hiddenMonitors` sets from `show_variable`/`hide_variable`/`show_list`/`hide_list` and reads initial `projectJson.monitors` visibility, but does not render on-stage monitor overlays.)
- [ ] **Preserve Scratch block comments (`target.comments`) as Python `#` comments and vice versa**:
  - `tokenize()` in `js/compiler.js` discards `#` comments; `createBlock()` checks `extra.comment` (unused); `compileToScratch()` overwrites `target.blocks` without building `target.comments`; `decompileTarget()` in `js/decompiler.js` ignores `target.comments`.
- [x] **Reporter expressions in single-argument menu blocks**:
  - `compileMenuOrExpr` and `compileBroadcastInput` in `js/compiler.js` (plus `readMenuOrExpr` in `js/decompiler.js`) support both literal menu shadows and dynamic variable/reporter expressions across `goto`, `glide_to`, `point_towards`, `switch_costume`, `switch_backdrop`, `switch_backdrop_and_wait`, `play_sound`, `play_sound_until_done`, `touching`, `distance_to`, `attribute_of`, `key_pressed`, `create_clone`, `broadcast`, `broadcast_and_wait`, `set_pen_param`, and `change_pen_param`.
- [ ] **Column (`col`) tracking on tokens & `CompileError`** for precise character-range diagnostics in the editor.
- [ ] **Graceful round-trip preservation of unrecognized external `.sb3` blocks**:
  - `decompileChain` emits `# невідомий блок: <opcode>`, and `compileToScratch` replaces `target.blocks = blocks`, which drops unsupported hats/blocks when saving an imported `.sb3`.

---

## 2. Clones & Variable Scoping — Critical 1:1 Scratch Behavior (`js/compiler.js`, `js/decompiler.js`, `js/preview.js`)

- [x] **Clone lifecycle blocks**: `@when_cloned` (`control_start_as_clone`), `create_clone("myself" | sprite)` (`control_create_clone_of` + `control_create_clone_of_menu`), and `delete_this_clone()` (`control_delete_this_clone`) across `compiler.js`, `decompiler.js`, and `preview.js`.
- [x] **Stage-global variables and lists**: `score = 0`, `+=`, `-=`, `*=`, `/=` (`data_setvariableto`, `data_changevariableby`) and global lists hosted on `stageTarget` (`ensureVar`, `ensureList` in `js/compiler.js`).
- [x] **Sprite-local ("For this sprite only") variables and lists**:
  - `self.var = val` (`isLocal: true` -> `ensureLocalVar` on `target.variables`) and `local_list` / `local_list_*` (`ensureLocalList` on `target.lists`) in `js/compiler.js`.
  - `decompileTarget(target, stageTarget)` in `js/decompiler.js` distinguishes sprite-local vs. stage-global variable/list IDs and emits `self.` / `local_list_*` cleanly.
  - `StagePreview` (`js/preview.js`) stores per-actor `localVars` and `localLists` (`_resolveVarAccess`, `_getListContainer`) isolated from global `this.vars` and `this.lists`.
- [x] **Per-clone state inheritance**:
  - `create_clone` in `js/preview.js` deep-copies the parent sprite's `localVars`, `localLists`, `effects`, `soundEffects`, `penHsl`, `layerOrder`, and `draggable` onto each newly spawned clone.
- [x] **300-clone limit**:
  - `js/preview.js` enforces Scratch 3.0 VM's exact global 300-clone limit (`this.actors.filter((a) => a.isClone).length >= 300`).
- [x] **Scoped thread stopping (`stop("other scripts in sprite")`)**:
  - `js/preview.js` tracks per-actor `_scriptGen` tokens in `_createScriptCtx` so `"other scripts in sprite"` / `"other scripts in stage"` cancels sibling threads on that specific actor/clone while allowing the calling script to continue.
- [ ] **Loop counter variable access (`for i in range(n):`)**:
  - `StagePreview` (`js/preview.js`) now binds `stmt.loopVar` in `localScope` (`0..count-1`), and `compiler.js` calls `ensureVar(stmt.loopVar, false)` when referenced in the body; however, `compiler.js` still emits `control_repeat` without generating `data_setvariableto` (`0`) / `data_changevariableby` (`1`) counter blocks for `.sb3` execution inside Scratch 3.0.

---

## 3. Motion (`motion_*`) — 1:1 Block Matrix

| Scratch 3.0 Opcode | Python DSL | Compiler / Decompiler | StagePreview | Status |
| :--- | :--- | :--- | :--- | :--- |
| `motion_movesteps` | `move(steps)` | Yes | Yes | `[x]` |
| `motion_turnright` | `turn_right(deg)` | Yes | Yes | `[x]` |
| `motion_turnleft` | `turn_left(deg)` | Yes | Yes | `[x]` |
| `motion_gotoxy` | `goto(x, y)` | Yes | Yes | `[x]` |
| `motion_goto` + `motion_goto_menu` | `goto("random" \| "mouse" \| sprite)`, `goto_random()`, `goto_mouse()` | Yes (menu or expr) | Yes | `[x]` |
| `motion_glidesecstoxy` | `glide(secs, x, y)` | Yes | Yes | `[x]` |
| `motion_glideto` + `motion_glideto_menu` | `glide_to(secs, "random" \| "mouse" \| sprite)` | Yes (menu or expr) | Yes | `[x]` |
| `motion_pointindirection` | `point_in_direction(dir)` | Yes | Yes | `[x]` |
| `motion_pointtowards` + `motion_pointtowards_menu` | `point_towards("mouse" \| sprite)` | Yes (menu or expr) | Yes | `[x]` |
| `motion_changexby` / `motion_setx` | `change_x(dx)` / `set_x(x)` | Yes | Yes | `[x]` |
| `motion_changeyby` / `motion_sety` | `change_y(dy)` / `set_y(y)` | Yes | Yes | `[x]` |
| `motion_ifonedgebounce` | `if_on_edge_bounce()` | Yes | Half-size bounds | `[x]` |
| `motion_setrotationstyle` | `set_rotation_style(style)` | Yes | Yes | `[x]` |
| `motion_xposition` / `motion_yposition` / `motion_direction` | `x_position()` / `y_position()` / `direction()` | Yes | Yes | `[x]` |

### Remaining Motion Parity Gaps
- [x] **`glide_to(secs, "random" | "mouse" | sprite)`** (`motion_glideto` + `motion_glideto_menu`) in `compiler.js`, `decompiler.js` (including `formatBlockUk`), and `preview.js`.
- [ ] **Accurate rotated/scaled costume bounding-box edge collision in `if_on_edge_bounce()`**:
  - `js/preview.js` (`_getActorHalfSize` + `if_on_edge_bounce`) now uses unrotated costume dimensions (`naturalWidth/2 * scale`, `naturalHeight/2 * scale`, falling back to `24 * scale`) rather than calculating the rotated & pivot-offset bounding box against `[-240, 240] × [-180, 180]`.
- [ ] **Stage fencing & floating-point motion reporters**:
  - `moveActorTo()` (`js/preview.js`) clamps sprite centers strictly to `[-240, 240]` / `[-180, 180]` rather than Scratch's fencing rule (keeping at least a visible margin of the costume inside the stage), and `x_position()`/`y_position()`/`direction()` round via `Math.round`.

---

## 4. Looks (`looks_*`) — 1:1 Block Matrix

| Scratch 3.0 Opcode | Python DSL | Compiler / Decompiler | StagePreview | Status |
| :--- | :--- | :--- | :--- | :--- |
| `looks_say` / `looks_sayforsecs` | `say(msg)` / `say(msg, secs)` | Yes | Yes | `[x]` |
| `looks_think` / `looks_thinkforsecs` | `think(msg)` / `think(msg, secs)` | Yes | Yes | `[x]` |
| `looks_switchcostumeto` + `looks_costume` | `switch_costume(name)` | Yes | Name, 1-based #, next/prev/random | `[x]` |
| `looks_nextcostume` | `next_costume()` | Yes | Yes | `[x]` |
| `looks_switchbackdropto` + `looks_backdrops` | `switch_backdrop(name)` | Yes | Name, 1-based #, next/prev/random | `[x]` |
| `looks_switchbackdroptoandwait` | `switch_backdrop_and_wait(backdrop)` | Yes | Yes | `[x]` |
| `looks_nextbackdrop` | `next_backdrop()` | Yes | Yes | `[x]` |
| `looks_gotofrontback` | `go_to_layer("front" \| "back")` | Yes | Yes (`layerOrder`) | `[x]` |
| `looks_goforwardbackwardlayers` | `change_layer("forward" \| "backward", num)` | Yes | Yes (`layerOrder`) | `[x]` |
| `looks_changesizeby` / `looks_setsizeto` | `change_size(d)` / `set_size(s)` | Yes | Yes | `[x]` |
| `looks_changeeffectby` / `looks_seteffectto` / `looks_cleargraphiceffects` | `change_effect(eff, d)` / `set_effect(eff, v)` / `clear_effects()` | Yes | `color`, `ghost`, `brightness`, `pixelate`, `mosaic` | `[x]` |
| `looks_show` / `looks_hide` | `show()` / `hide()` | Yes | Yes | `[x]` |
| `looks_costumenumbername` | `costume_number()` / `costume_name()` | Yes | Yes | `[x]` |
| `looks_backdropnumbername` | `backdrop_number()` / `backdrop_name()` | Yes | Yes | `[x]` |
| `looks_size` | `size()` | Yes | Yes | `[x]` |

### Remaining Looks Parity Gaps
- [x] **`switch_backdrop_and_wait(backdrop)`** (`looks_switchbackdroptoandwait`) across `compiler.js`, `decompiler.js` (including `formatBlockUk`), and `preview.js` (awaiting `triggerBackdrop(bg)` completion).
- [x] **`go_to_layer("front" | "back")`** (`looks_gotofrontback`) and **`change_layer("forward" | "backward", num)`** (`looks_goforwardbackwardlayers`) with dynamic `layerOrder` sorting in `StagePreview.render()` and `_handleCanvasClick()`.
- [ ] **Canvas 2D rendering for all 7 graphic effects**:
  - `StagePreview` (`js/preview.js`) now stores all 7 effects and renders `color` (`hue-rotate`), `ghost` (`globalAlpha`), `brightness` (`brightness()` filter), `pixelate` (offscreen downscaled canvas), and `mosaic` (tiled draw), plus applies effects to the Stage backdrop; **however**, pixel-warping shaders for `fisheye` and `whirl` remain unimplemented.
- [ ] **`bitmapResolution` scaling (`1 / bitmapResolution`) for imported PNG/JPG costumes**:
  - 1-based numeric costume/backdrop lookup and `"previous backdrop"` / `"random backdrop"` / `"next backdrop"` options are implemented in `StagePreview`, while `_drawActor()` still draws raster costumes at `naturalWidth × naturalHeight` without dividing by `costumeObj.bitmapResolution`.

---

## 5. Sound (`sound_*`) — 1:1 Block Matrix

| Scratch 3.0 Opcode | Python DSL | Compiler / Decompiler | StagePreview | Status |
| :--- | :--- | :--- | :--- | :--- |
| `sound_play` + `sound_sounds_menu` | `play_sound(sound)` | Yes | Web Audio buffer + synth fallback | `[x]` |
| `sound_playuntildone` + `sound_sounds_menu` | `play_sound_until_done(sound)` | Yes | Awaits `onended` | `[x]` |
| `sound_stopallsounds` | `stop_all_sounds()` | Yes | Stops all active nodes | `[x]` |
| `sound_changevolumeby` / `sound_setvolumeto` | `change_volume(d)` / `set_volume(v)` | Yes | Connected to `GainNode` | `[x]` |
| `sound_volume` | `volume()` | Yes | Yes | `[x]` |
| `sound_seteffectto` | `set_sound_effect("pitch" \| "pan", val)` | Yes | Yes (`playbackRate` / `StereoPannerNode`) | `[x]` |
| `sound_changeeffectby` | `change_sound_effect("pitch" \| "pan", delta)` | Yes | Yes | `[x]` |
| `sound_cleareffects` | `clear_sound_effects()` | Yes | Yes | `[x]` |

### Remaining Sound Parity Gaps
- [x] **`set_sound_effect("pitch" | "pan", val)`** (`sound_seteffectto`), **`change_sound_effect("pitch" | "pan", delta)`** (`sound_changeeffectby`), and **`clear_sound_effects()`** (`sound_cleareffects`) across `compiler.js`, `decompiler.js` (including `formatBlockUk`), and `preview.js`.
- [x] **Real `.wav` / `.mp3` decoding and playback in `StagePreview` via Web Audio API**:
  - `playProjectSound()` decodes binary audio buffers from `assetsMap` with `AudioContext.decodeAudioData` (falling back to `playSynthSound` when an asset is missing), routes through `GainNode` (`volume`), `StereoPannerNode` (`pan`), and `playbackRate` (`pitch`), awaits `onended`, and tracks active nodes in `_activeAudioNodes` for `_stopAllSounds()`.

---

## 6. Events (`event_*`) — 1:1 Block Matrix

| Scratch 3.0 Opcode | Python DSL | Compiler / Decompiler | StagePreview | Status |
| :--- | :--- | :--- | :--- | :--- |
| `event_whenflagclicked` | `@when_flag_clicked` | Yes | Yes | `[x]` |
| `event_whenkeypressed` | `@when_key_pressed(key)` | Yes | Yes | `[x]` |
| `event_whenthisspriteclicked` | `@when_this_sprite_clicked` | Yes | Yes (radius hitbox) | `[x]` |
| `event_whenstageclicked` | `@when_stage_clicked` | Yes | Yes | `[x]` |
| `event_whenbackdropswitchesto` | `@when_backdrop_switches(bg)` | Yes | Yes | `[x]` |
| `event_whenbroadcastreceived` | `@when_message_received(msg)` | Yes | Yes (restart semantics) | `[x]` |
| `event_broadcast` / `event_broadcastandwait` | `broadcast(msg)` / `broadcast_and_wait(msg)` | Yes (menu or expr) | Yes | `[x]` |
| `event_whengreaterthan` | `@when_greater_than("timer" \| "loudness", value)` | Yes | Edge-triggered `"timer"` (`"loudness"` stub `0`) | `[x]` |

### Remaining Events Parity Gaps
- [x] **`@when_greater_than("timer" | "loudness", value)`** (`event_whengreaterthan`) in `compiler.js`, `decompiler.js` (including `formatBlockUk`), and `StagePreview` (`_startGreaterThanWatcher` 50ms edge-triggered polling loop).
- [x] **Scratch broadcast restart semantics**:
  - `StagePreview._triggerBroadcastOnActor()` cancels any still-running `when_message_received(msg)` `scriptCtx` instances on that actor before restarting.

---

## 7. Sensing (`sensing_*`) — 1:1 Block Matrix

| Scratch 3.0 Opcode | Python DSL | Compiler / Decompiler | StagePreview | Status |
| :--- | :--- | :--- | :--- | :--- |
| `sensing_touchingobject` + menu | `touching("edge" \| "mouse" \| sprite)` | Yes (menu or expr) | Bounds/radius heuristic | `[x]` |
| `sensing_distanceto` + menu | `distance_to("mouse" \| sprite)` | Yes (menu or expr) | Yes | `[x]` |
| `sensing_askandwait` / `sensing_answer` | `ask(question)` / `answer()` | Yes | Yes | `[x]` |
| `sensing_keypressed` + `sensing_keyoptions` | `key_pressed(key)` | Yes | Yes | `[x]` |
| `sensing_mousedown` / `sensing_mousex` / `sensing_mousey` | `mouse_down()` / `mouse_x()` / `mouse_y()` | Yes | Yes | `[x]` |
| `sensing_timer` / `sensing_resettimer` | `timer()` / `reset_timer()` | Yes | Yes | `[x]` |
| `sensing_of` + `sensing_of_object_menu` | `attribute_of(attribute, target)` | Yes | Yes | `[x]` |
| `sensing_touchingcolor` | `touching_color("#rrggbb")` | Yes | Canvas `getImageData` box check | `[x]` |
| `sensing_coloristouchingcolor` | `color_is_touching_color("#c1", "#c2")` | Yes | Canvas `getImageData` pair check | `[x]` |
| `sensing_setdragmode` | `set_drag_mode("draggable" \| "not draggable")` | Yes | Yes (live canvas drag) | `[x]` |
| `sensing_current` | `current_time("year" \| "month" \| "date" \| "dayofweek" \| "hour" \| "minute" \| "second")` | Yes | Yes | `[x]` |
| `sensing_dayssince2000` | `days_since_2000()` | Yes | Yes | `[x]` |
| `sensing_username` | `username()` | Yes | Returns `"player"` | `[x]` |
| `sensing_loudness` | `loudness()` | Yes | Returns `0` stub | `[x]` |

### Remaining Sensing Parity Gaps
- [x] **`attribute_of(attribute, target)`** (`sensing_of` + `sensing_of_object_menu`) across `compiler.js`, `decompiler.js`, and `preview.js` (reads sprite properties, stage properties, sprite-local `localVars`, and global `vars`).
- [x] **`touching_color("#rrggbb")`** and **`color_is_touching_color("#c1", "#c2")`** via Canvas 2D `getImageData` pixel sampling in `_getActorPixelBox` (samples combined rendered canvas box around actor rather than separating sprite costume pixels from backdrop).
- [x] **`set_drag_mode("draggable" | "not draggable")`** (`sensing_setdragmode`) + `target.draggable` inheritance + live mouse dragging on the Canvas stage in `StagePreview._bindCanvasMouse()`.
- [ ] **Live microphone `AnalyserNode` for `loudness()`**:
  - `current_time(unit)`, `days_since_2000()`, and `username()` (`"player"`) are implemented in `StagePreview`, while `loudness()` still returns a constant `0` instead of sampling Web Audio `AnalyserNode` microphone RMS (`0..100`, `-1` if unavailable).
- [ ] **Pixel-accurate costume hit-testing** in `touching()` and `_handleCanvasClick()` (currently circular radius heuristic `24 * scale` / `32 * avgScale` / `_getActorHalfSize`).

---

## 8. Operators (`operator_*`) & Pythonic Sugar

- [x] **Arithmetic, comparisons, and boolean logic**: `+`, `-`, `*`, `/`, `%`, `//` (compiles to `floor(a / b)`), `==`, `!=`, `<`, `>`, `<=`, `>=`, `and`, `or`, `not`.
- [x] **String, random & rounding reporters**: `random(a, b)` (`operator_random`), `join(s1, s2)` (`operator_join`), `letter_of(i, s)` (`operator_letter_of`), `length_of(s)` / `len(s)` (`operator_length`), `contains(s1, s2)` (`operator_contains`), `round(x)` / `round_num(x)` (`operator_round`).
- [x] **Full `operator_mathop` round-trip & `StagePreview` support**: `abs`, `floor`, `ceil`/`ceiling`, `sqrt`, `sin`, `cos`, `tan`, `asin`, `acos`, `atan`, `ln`, `log`, `exp` (`"e ^"`), `pow10` (`"10 ^"`), and `math_op(op, num)` across `compiler.js`, `decompiler.js`, and `preview.js`.
- [ ] **Floating-point `random(a, b)`**:
  - Scratch's `operator_random` returns floating-point values when either bound has a decimal point, whereas `StagePreview.evalExpr` (`js/preview.js`) currently truncates with `Math.floor`.
- [ ] **Pythonic list/string sugar**:
  - `len(x)` currently aliases `operator_length` (string length) rather than dispatching to `data_lengthoflist` for known list names.
  - `list_name[i]` indexing (`data_itemoflist`) / indexed assignment (`data_replaceitemoflist`) and `item in list_name` (`data_listcontainsitem`) / `substr in str` (`operator_contains`) are not yet parsed.

---

## 9. Data (`data_*`) — Variables & Lists

- [x] **Variable assignment & mutation**: `var = val` / `self.var = val` (`data_setvariableto`), `+=`, `-=` (`data_changevariableby`), `*=`, `/=`.
- [x] **Core list operations (global & sprite-local)**: `list_add` / `local_list_add` (`data_addtolist`), `list_delete` / `local_list_delete` (`data_deleteoflist`), `list_clear` / `local_list_clear` (`data_deletealloflist`), `list_insert` / `local_list_insert` (`data_insertatlist`), `list_replace` / `local_list_replace` (`data_replaceitemoflist`), `list_item` / `local_list_item` (`data_itemoflist`), `list_length` / `local_list_length` (`data_lengthoflist`), `list_contains` / `local_list_contains` (`data_listcontainsitem`).
- [x] **`list_index_of(list, item)` / `local_list_index_of(list, item)`** (`data_itemnumoflist`): returns 1-based index of matching item (or `0` if absent) across `compiler.js`, `decompiler.js`, and `preview.js`.
- [ ] **`show_variable(var)` (`data_showvariable`), `hide_variable(var)` (`data_hidevariable`), `show_list(list)` (`data_showlist`), `hide_list(list)` (`data_hidelist`)**:
  - Compilation, decompilation, `formatBlockUk`, and `StagePreview` monitor visibility sets (`visibleMonitors`/`hiddenMonitors`) are implemented, while `projectJson.monitors` generation and live on-stage monitor rendering remain unimplemented.
- [x] **Scratch special list index keywords (`"last"`, `"random"`, `"all"`)** in `_listItem`, `_listDelete`, `_listInsert`, and `_listReplace` inside `StagePreview` (`js/preview.js`).

---

## 10. Custom Procedures (`procedures_*`) & Extensions (`pen_*`)

- [x] **Custom procedures (`def name(params):` and procedure calls)**: `procedures_definition`, `procedures_prototype`, `procedures_call`, and `argument_reporter_string_number` (`%s`) across `compiler.js`, `decompiler.js`, and `preview.js`.
- [x] **Pen extension compilation, decompilation & runtime (`pen_*`)**: `pen_clear`, `pen_stamp`, `pen_penDown`, `pen_penUp`, `pen_setPenColorToColor`, `pen_setPenColorParamTo`, `pen_changePenColorParamBy`, `pen_setPenSizeTo`, `pen_changePenSizeBy` in `compiler.js` & `decompiler.js` (auto-enables `"pen"` in `projectJson.extensions`).
- [x] **`@warp` decorator on `def` for "Run without screen refresh"**:
  - `@warp` in `js/compiler.js` sets `mutation.warp = "true"` on `procedures_prototype` and `procedures_call`; `decompileTarget` in `js/decompiler.js` emits `@warp`; `StagePreview` (`js/preview.js`) executes `@warp` bodies synchronously without 16ms frame yields (with a 500ms cooperative safety yield).
- [ ] **Boolean parameter reporters (`argument_reporter_boolean`, `%b`) in custom procedures**:
  - `decompileReporter` (`js/decompiler.js`) reads `argument_reporter_boolean`, while `compiler.js` currently only generates untyped `%s` slots (`argument_reporter_string_number`) and does not parse typed boolean parameters (`flag: bool`) or multi-segment `proccode` templates.
- [x] **Full HSV/transparency simulation for `set_pen_param` / `change_pen_param` on the Canvas 2D Pen layer**:
  - `StagePreview` (`js/preview.js`) tracks `actor.penHsl` (`color`, `saturation`, `brightness`, `transparency`), synchronizes `set_pen_color("#rrggbb")` via `_rgbToHsl`, and strokes paths with computed HSLA color.
- [x] **`stop("this script")` propagation inside custom procedures**:
  - `execCall` (`js/preview.js`) propagates `'RETURN_SCRIPT'` across nested procedure calls so `stop("this script")` halts the enclosing caller script.

---

## 11. Web IDE & Asset Management (`index.html`, `js/app.js`, `js/sb3Bridge.js`)

- [x] **Multi-target tabs & sprite creation**: Stage + Sprite tabs (`#target-tabs`), `+ Спрайт` (`#btn-add-sprite` -> `Sb3Bridge.addSpriteToProject`).
- [x] **Python DSL syntax highlighting & editor ergonomics**: `highlightPython` (updated `apiRe` & `self` keyword), line numbers, syntax error / active block line markers, scroll sync, `Tab` 4-space insert, auto-indent on `:`, `Ctrl/Cmd+Enter` run shortcut.
- [x] **Interactive Scratch block tree inspector**: `#view-blocks` (`renderBlocksTree` using `formatBlockUk` covering all new Motion, Looks, Sound, Events, Sensing, and Data statement/hat blocks) with click-to-jump to Python source line.
- [x] **Asset viewer, quick palette, API docs, and 6 templates**: `#view-assets`, `#quick-palette`, `#view-docs` (`API_DOCS` updated with all new DSL functions), and 6 snippets (`hexagon`, `functions`, `arrows`, `clones`, `quiz`, `levels`).
- [x] **Upload custom SVG/PNG/JPG costumes and backdrops**:
  - File pickers (`#upload-backdrop-input`, `#upload-costume-input` in `index.html`) + `handleCostumeUpload` (`js/app.js`) + `Sb3Bridge.addCostumeAsset` (`js/sb3Bridge.js`, parsing SVG/PNG/JPG dimensions for `rotationCenterX`/`rotationCenterY` and MD5 `assetId`/`md5ext`) refreshing `StagePreview.syncProjectAssets`.
- [x] **Upload WAV/MP3 sounds**:
  - File picker (`#upload-sound-input`) + `handleSoundUpload` (`js/app.js`) + `Sb3Bridge.addSoundAsset` (`js/sb3Bridge.js`, parsing WAV `rate` & `sampleCount` headers and MD5 `assetId`/`md5ext`). *(Note: per-sound preview/delete UI buttons remain open below.)*
- [x] **Rename / delete sprites**:
  - UI controls (`#btn-rename-sprite`, `#btn-delete-sprite` in `js/app.js`) + `Sb3Bridge.renameSprite` and `Sb3Bridge.deleteSprite` (`js/sb3Bridge.js`).
- [ ] **Delete, preview, or reorder individual costumes, backdrops, and sounds** in `#view-assets`.
- [x] **Edit sprite properties in the UI**:
  - Editable inspector inputs for `x`, `y`, `size`, `direction`, `rotationStyle`, `visible`, and `draggable` (`js/app.js` + `Sb3Bridge.updateSpriteProps`) synced directly to `projectJson.targets[activeTargetIdx]` and `StagePreview`.
- [ ] **On-stage variable/list monitor overlay over `#stage-canvas`**:
  - Render `projectJson.monitors` directly over `#stage-canvas` (supporting default, large, and draggable slider modes). *(Note: `formatBlockUk` translations for all statement/hat opcodes and `apiRe` syntax highlighting are already completed.)*

---

## 12. Open Parity Items (Stage 2)

- **Remaining Open Parity Items**:
  - `projectJson.monitors` serialization & live Canvas monitor/slider overlay, `target.comments` <-> `#` round-trip, unrecognized `.sb3` block preservation, `control_repeat` counter blocks in `.sb3` output, `%b` boolean procedure parameters, Pythonic `list[i]`/`in`/`len(list)` sugar, float `random()`, `fisheye`/`whirl` shaders, `bitmapResolution` scaling, rotated bounding-box `if_on_edge_bounce()`, stage fencing, pixel costume hit-testing, live mic `loudness()`, per-asset delete/reorder UI, `og:image`/JSON-LD SEO tags, and `sivochka.com` Part B landing page.

---

## 13. Architecture Split — Open-Source Tool (`pyScratch`) + `sivochka.com` Tutor Landing Page & Integration

### Part A — `pyScratch` Open-Source Standalone & Embeddable App (`Figarist/pyScratch` repo)
- [x] **Embed mode (`?embed=1&snippet=clones&autorun=1` URL query parameters)** to render a compact, iframe-ready Editor + Stage view (`body.embed-mode` in `style.css`, query parsing in `js/app.js`)
- [x] **Shareable code links (`?code=<base64url>`)** + **Share (`#btn-share`)** button so students and teachers can share Python-Scratch programs via a single URL
- [x] **Drag-and-Drop `.sb3` file import** (`#drop-overlay` in `index.html` and `js/app.js`)
- [x] **Subtle header attribution links** (`sivochka.com` and `GitHub` in `index.html`)
- [x] **GitHub Pages live deployment** at `https://figarist.github.io/pyScratch/`
- [ ] **Complete SEO & OpenGraph meta tags** (`og:title`, `og:description`, `og:type`, and `og:url` are present in `index.html`; `og:image` and JSON-LD `SoftwareApplication` schema are still missing)

### Part B — `sivochka.com` Educational Landing Page & Tutor Trust Funnel
- [ ] **Dedicated SEO landing page on `sivochka.com`** targeting parents and students transitioning from Scratch 3.0 to Python
- [ ] **Interactive embedded `pyScratch` live demo** showing side-by-side Python code, Scratch 3.0 blocks, and 480×360 stage execution
- [ ] **"Upload your child's `.sb3` project and see it in Python"** interactive hook on the landing page
- [ ] **Authority & trust block** highlighting the open-source `pyScratch` platform on GitHub + direct CTA to book a Scratch / Python tutoring session on `sivochka.com`

---

## History

### Stage 2 multi-agent waves (completed, historical)

- **Wave 1 (Completed — Agents 4, 5 & 6)**:
  - **Compiler & Decompiler (`js/compiler.js`, `js/decompiler.js`)**: Implemented `self.var` & `local_list_*` scoping, `@warp`, `@when_greater_than`, `glide_to`, `switch_backdrop_and_wait`, `go_to_layer`, `change_layer`, `set_sound_effect`/`change_sound_effect`/`clear_sound_effects`, `attribute_of`, `touching_color`, `color_is_touching_color`, `set_drag_mode`, `current_time`, `days_since_2000`, `username`, `loudness`, `list_index_of`, `show_variable`/`hide_variable`/`show_list`/`hide_list`, `len`/`exp`/`pow10`/`tan`/`asin`/`acos`/`atan`/`ln`/`log`, dynamic menu reporter inputs (`compileMenuOrExpr`), and full `formatBlockUk` statement/hat labels.
  - **Stage Runtime (`js/preview.js`)**: Implemented per-actor `localVars`/`localLists` + clone deep-copy inheritance, 300-clone cap, scoped `stop("other scripts in sprite")`, loop counter `i` binding in `localScope`, synchronous `@warp`, `RETURN_SCRIPT` propagation, `layerOrder` sorting, Canvas 2D effects (`color`, `ghost`, `brightness`, `pixelate`, `mosaic`), Web Audio `.wav`/`.mp3` decoding (`GainNode`, `StereoPannerNode`, `playbackRate`, `onended`, `_stopAllSounds`), Pen HSV/alpha simulation, broadcast restart semantics, live stage dragging, and pixel-color sensing.
  - **Web IDE & Bridge (`js/sb3Bridge.js`, `index.html`, `style.css`, `js/app.js`)**: Implemented `renameSprite`, `deleteSprite`, `updateSpriteProps`, `addCostumeAsset`, `addSoundAsset`, interactive Sprite & Asset Manager UI, Drag-and-Drop `.sb3`, `?embed=1`/`?snippet=`/`?code=`/`?autorun=1` URL parameters, Share (`#btn-share`) button, and `sivochka.com` / GitHub header links.
- **Wave 2 (Completed — Agent 3)**:
  - Added **Suite 9: Full 1:1 Scratch 3.0 Parity & End-to-End Integration** in [`test/test_roundtrip.js`](test/test_roundtrip.js), updated [`README.md`](README.md), [`docs/DSL_REFERENCE.md`](docs/DSL_REFERENCE.md), and [`TODO.md`](TODO.md), pushed to `main`, and enabled GitHub Pages.
