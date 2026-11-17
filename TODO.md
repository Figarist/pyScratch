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
  - `createDefaultProject` initializes `monitors: []`; neither `compiler.js`, `decompiler.js`, `preview.js`, nor `app.js` creates, updates, or renders variable/list stage monitors (`mode`: `"default"`, `"large"`, `"slider"`, `sliderMin`, `sliderMax`, `isDiscrete`, `x`, `y`, `width`, `height`, `visible`).
- [ ] **Preserve Scratch block comments (`target.comments`) as Python `#` comments and vice versa**:
  - `tokenize()` in `js/compiler.js` discards `#` comments; `createBlock()` checks `extra.comment` (unused); `compileToScratch()` overwrites `target.blocks` without building `target.comments`; `decompileTarget()` in `js/decompiler.js` ignores `target.comments`.
- [ ] **Reporter expressions in single-argument menu blocks**:
  - `goto`, `point_towards`, `touching`, `distance_to`, `create_clone`, `broadcast`, and `broadcast_and_wait` in `compileCallStmt()` / `compileReporter()` (`js/compiler.js`) currently read only `a[0].value` (string literal) instead of using `compileMenuOrExpr` / dynamic reporter inputs.
- [ ] **Column (`col`) tracking on tokens & `CompileError`** for precise character-range diagnostics in the editor.
- [ ] **Graceful round-trip preservation of unrecognized external `.sb3` blocks**:
  - `decompileChain` emits `# невідомий блок: <opcode>`, and `compileToScratch` replaces `target.blocks = blocks`, which drops unsupported hats/blocks when saving an imported `.sb3`.

---

## 2. Clones & Variable Scoping — Critical 1:1 Scratch Behavior (`js/compiler.js`, `js/decompiler.js`, `js/preview.js`)

- [x] **Clone lifecycle blocks**: `@when_cloned` (`control_start_as_clone`), `create_clone("myself" | sprite)` (`control_create_clone_of` + `control_create_clone_of_menu`), and `delete_this_clone()` (`control_delete_this_clone`) across `compiler.js`, `decompiler.js`, and `preview.js`.
- [x] **Stage-global variables and lists**: `score = 0`, `+=`, `-=`, `*=`, `/=` (`data_setvariableto`, `data_changevariableby`) and global lists hosted on `stageTarget` (`ensureVar`, `ensureList` in `js/compiler.js`).
- [ ] **Sprite-local ("For this sprite only") variables and lists**:
  - Add Python DSL syntax such as `self.var = val` (or `local_var("var", val)` / `local_list("list")`) so `compiler.js` emits declarations into `spriteTarget.variables` / `spriteTarget.lists` instead of `stageTarget`.
  - Update `decompileTarget(target, stageTarget)` in `js/decompiler.js` to distinguish sprite-local vs. stage-global variable/list IDs and emit `self.` or local declarations cleanly (currently `decompileTarget` takes only `(target)` and emits bare identifiers).
  - Update `StagePreview` (`js/preview.js`) so each actor stores its own `localVars` and `localLists` instead of merging all targets into the global `this.vars` and `this.lists` maps in `reset()`.
- [ ] **Per-clone state inheritance**:
  - `create_clone` in `js/preview.js` (`{ ...src, isClone: true, ... }`) currently shallow-copies `src` with no per-clone variable/list maps. Must deep-copy the parent sprite's `localVars` and `localLists` (and clone-owned costume/pen/effect state) onto each newly spawned clone so clones hold independent IDs, HP, velocity, etc.
- [ ] **300-clone limit**:
  - `js/preview.js` currently checks `if (this.actors.length > 150) break;` (line 956), which caps total actors at 150 instead of matching Scratch 3.0 VM's exact **global 300-clone limit** (counting `actor.isClone` only, excluding Stage and original sprites).
- [ ] **Scoped thread stopping (`stop("other scripts in sprite")`)**:
  - `js/preview.js` (`case 'stop'`, lines 1038–1046) treats every option other than `"this script"` as `"all"`, setting `this.isRunning = false; this.runId++;` and killing the entire runtime across all sprites. Must track active threads per actor/clone instance so `"other scripts in sprite"` terminates only sibling threads on that specific sprite/clone while letting the calling script continue (`hasnext: "true"`).
- [ ] **Loop counter variable access (`for i in range(n):`)**:
  - `parseStmt()` (`js/compiler.js`) records `loopVar` in the `Repeat` AST node, but `compileStmt()` ignores `stmt.loopVar` and `StagePreview.execBlock()` never binds `stmt.loopVar` in `localScope` or `vars`. When the loop variable is referenced inside the loop body, emit a counter variable initialized to `0` and incremented by `1` per iteration (and bind it in `StagePreview`).

---

## 3. Motion (`motion_*`) — 1:1 Block Matrix

| Scratch 3.0 Opcode | Python DSL | Compiler / Decompiler | StagePreview | Status |
| :--- | :--- | :--- | :--- | :--- |
| `motion_movesteps` | `move(steps)` | Yes | Yes | `[x]` |
| `motion_turnright` | `turn_right(deg)` | Yes | Yes | `[x]` |
| `motion_turnleft` | `turn_left(deg)` | Yes | Yes | `[x]` |
| `motion_gotoxy` | `goto(x, y)` | Yes | Yes | `[x]` |
| `motion_goto` + `motion_goto_menu` | `goto("random" \| "mouse" \| sprite)`, `goto_random()`, `goto_mouse()` | Yes (literal only) | Yes | `[x]` |
| `motion_glidesecstoxy` | `glide(secs, x, y)` | Yes | Yes | `[x]` |
| `motion_pointindirection` | `point_in_direction(dir)` | Yes | Yes | `[x]` |
| `motion_pointtowards` + `motion_pointtowards_menu` | `point_towards("mouse" \| sprite)` | Yes (literal only) | Yes | `[x]` |
| `motion_changexby` / `motion_setx` | `change_x(dx)` / `set_x(x)` | Yes | Yes | `[x]` |
| `motion_changeyby` / `motion_sety` | `change_y(dy)` / `set_y(y)` | Yes | Yes | `[x]` |
| `motion_ifonedgebounce` | `if_on_edge_bounce()` | Yes | Approximate | `[x]` |
| `motion_setrotationstyle` | `set_rotation_style(style)` | Yes (no `formatBlockUk`) | Yes | `[x]` |
| `motion_xposition` / `motion_yposition` / `motion_direction` | `x_position()` / `y_position()` / `direction()` | Yes | Yes | `[x]` |
| `motion_glideto` + `motion_glideto_menu` | `glide_to(secs, "random" \| "mouse" \| sprite)` | Missing | Missing | `[ ]` |

### Remaining Motion Parity Gaps
- [ ] **`glide_to(secs, "random" | "mouse" | sprite)`** (`motion_glideto` + `motion_glideto_menu`) in `compiler.js`, `decompiler.js` (including `formatBlockUk`), and `preview.js`.
- [ ] **Accurate costume bounding-box edge collision in `if_on_edge_bounce()`**:
  - `js/preview.js` (lines 828–837) currently uses fixed center thresholds (`±225`, `±165`) instead of calculating the sprite's scaled & rotated costume bounding box against the `[-240, 240] × [-180, 180]` stage bounds and pushing back by the exact overhang.
- [ ] **Stage fencing & floating-point motion reporters**:
  - `moveActorTo()` (`js/preview.js`) clamps sprite centers strictly to `[-240, 240]` / `[-180, 180]` rather than Scratch's fencing rule (keeping at least a visible margin of the costume inside the stage), and `x_position()`/`y_position()`/`direction()` round via `Math.round`.

---

## 4. Looks (`looks_*`) — 1:1 Block Matrix

| Scratch 3.0 Opcode | Python DSL | Compiler / Decompiler | StagePreview | Status |
| :--- | :--- | :--- | :--- | :--- |
| `looks_say` / `looks_sayforsecs` | `say(msg)` / `say(msg, secs)` | Yes | Yes | `[x]` |
| `looks_think` / `looks_thinkforsecs` | `think(msg)` / `think(msg, secs)` | Yes | Yes | `[x]` |
| `looks_switchcostumeto` + `looks_costume` | `switch_costume(name)` | Yes | Name-only | `[x]` |
| `looks_nextcostume` | `next_costume()` | Yes | Yes | `[x]` |
| `looks_switchbackdropto` + `looks_backdrops` | `switch_backdrop(name)` | Yes | Name-only | `[x]` |
| `looks_nextbackdrop` | `next_backdrop()` | Yes | Yes | `[x]` |
| `looks_changesizeby` / `looks_setsizeto` | `change_size(d)` / `set_size(s)` | Yes | Yes | `[x]` |
| `looks_changeeffectby` / `looks_seteffectto` / `looks_cleargraphiceffects` | `change_effect(eff, d)` / `set_effect(eff, v)` / `clear_effects()` | Yes (no `formatBlockUk`) | `color` only | `[x]` |
| `looks_show` / `looks_hide` | `show()` / `hide()` | Yes | Yes | `[x]` |
| `looks_costumenumbername` | `costume_number()` / `costume_name()` | Yes | Yes | `[x]` |
| `looks_backdropnumbername` | `backdrop_number()` / `backdrop_name()` | Yes | Yes | `[x]` |
| `looks_size` | `size()` | Yes | Yes | `[x]` |
| `looks_switchbackdroptoandwait` | `switch_backdrop_and_wait(backdrop)` | Missing | Missing | `[ ]` |
| `looks_gotofrontback` | `go_to_layer("front" \| "back")` | Missing | Missing | `[ ]` |
| `looks_goforwardbackwardlayers` | `change_layer("forward" \| "backward", num)` | Missing | Missing | `[ ]` |

### Remaining Looks Parity Gaps
- [ ] **`switch_backdrop_and_wait(backdrop)`** (`looks_switchbackdroptoandwait`) across `compiler.js`, `decompiler.js`, and `preview.js` (awaiting `triggerBackdrop(bg)` completion).
- [ ] **`go_to_layer("front" | "back")`** (`looks_gotofrontback`) and **`change_layer("forward" | "backward", num)`** (`looks_goforwardbackwardlayers`) with dynamic `layerOrder` sorting in `StagePreview.render()` and `_handleCanvasClick()` (currently `render()` iterates `this.actors` in array order without sorting by `layerOrder`).
- [ ] **Canvas 2D rendering for all 7 graphic effects**:
  - `StagePreview` (`js/preview.js`) currently stores and renders only `color` (`hue-rotate`). Add full effect state and rendering for `ghost` (`globalAlpha`), `brightness` (Canvas `brightness()` filter / pixel pass), `fisheye`, `whirl`, `pixelate`, and `mosaic`, plus applying graphic effects when rendering the Stage backdrop.
- [ ] **1-based numeric costume/backdrop lookup & special backdrop options** (`"previous backdrop"`, `"random backdrop"`, `"next backdrop"`, and numeric indices in `switch_costume` / `switch_backdrop`) in `StagePreview`, plus `bitmapResolution` scaling (`1 / bitmapResolution`) when drawing imported PNG/JPG costumes in `_drawActor()`.

---

## 5. Sound (`sound_*`) — 1:1 Block Matrix

| Scratch 3.0 Opcode | Python DSL | Compiler / Decompiler | StagePreview | Status |
| :--- | :--- | :--- | :--- | :--- |
| `sound_play` + `sound_sounds_menu` | `play_sound(sound)` | Yes | Synth beep | `[x]` |
| `sound_playuntildone` + `sound_sounds_menu` | `play_sound_until_done(sound)` | Yes | Synth + fixed 140ms | `[x]` |
| `sound_stopallsounds` | `stop_all_sounds()` | Yes | No-op | `[x]` |
| `sound_changevolumeby` / `sound_setvolumeto` | `change_volume(d)` / `set_volume(v)` | Yes (no `formatBlockUk`) | Yes (unconnected to audio) | `[x]` |
| `sound_volume` | `volume()` | Yes | Yes | `[x]` |
| `sound_seteffectto` | `set_sound_effect("pitch" \| "pan", val)` | Missing | Missing | `[ ]` |
| `sound_changeeffectby` | `change_sound_effect("pitch" \| "pan", delta)` | Missing | Missing | `[ ]` |
| `sound_cleareffects` | `clear_sound_effects()` | Missing | Missing | `[ ]` |

### Remaining Sound Parity Gaps
- [ ] **`set_sound_effect("pitch" | "pan", val)`** (`sound_seteffectto`), **`change_sound_effect("pitch" | "pan", delta)`** (`sound_changeeffectby`), and **`clear_sound_effects()`** (`sound_cleareffects`) across `compiler.js`, `decompiler.js`, and `preview.js`.
- [ ] **Real `.wav` / `.mp3` decoding and playback in `StagePreview` via Web Audio API**:
  - Decode binary audio buffers from `assetsMap` with `AudioContext.decodeAudioData` (falling back to synth only when an asset is missing).
  - Route playback through `GainNode` (actor `volume`), `StereoPannerNode` (`pan` effect), and `playbackRate` (`pitch` effect).
  - Track active `AudioBufferSourceNode` instances so `play_sound_until_done()` awaits actual `onended` duration and `stop_all_sounds()` / `stop("all")` / `reset()` immediately stops all active sources.

---

## 6. Events (`event_*`) — 1:1 Block Matrix

| Scratch 3.0 Opcode | Python DSL | Compiler / Decompiler | StagePreview | Status |
| :--- | :--- | :--- | :--- | :--- |
| `event_whenflagclicked` | `@when_flag_clicked` | Yes | Yes | `[x]` |
| `event_whenkeypressed` | `@when_key_pressed(key)` | Yes | Yes | `[x]` |
| `event_whenthisspriteclicked` | `@when_this_sprite_clicked` | Yes | Yes (radius hitbox) | `[x]` |
| `event_whenstageclicked` | `@when_stage_clicked` | Yes | Yes | `[x]` |
| `event_whenbackdropswitchesto` | `@when_backdrop_switches(bg)` | Yes | Yes | `[x]` |
| `event_whenbroadcastreceived` | `@when_message_received(msg)` | Yes | Yes (no restart) | `[x]` |
| `event_broadcast` / `event_broadcastandwait` | `broadcast(msg)` / `broadcast_and_wait(msg)` | Yes (literal only) | Yes | `[x]` |
| `event_whengreaterthan` | `@when_greater_than("timer" \| "loudness", value)` | Missing | Missing | `[ ]` |

### Remaining Events Parity Gaps
- [ ] **`@when_greater_than("timer" | "loudness", value)`** (`event_whengreaterthan`) in `compiler.js`, `decompiler.js`, and `StagePreview` edge-triggered monitoring loop.
- [ ] **Scratch broadcast restart semantics**:
  - `StagePreview.triggerBroadcast(msg)` (`js/preview.js`, lines 504–511) currently launches duplicate concurrent executions instead of cancelling and restarting any still-running `when_message_received(msg)` thread on each actor (matching Scratch 3.0 VM).

---

## 7. Sensing (`sensing_*`) — 1:1 Block Matrix

| Scratch 3.0 Opcode | Python DSL | Compiler / Decompiler | StagePreview | Status |
| :--- | :--- | :--- | :--- | :--- |
| `sensing_touchingobject` + menu | `touching("edge" \| "mouse" \| sprite)` | Yes (literal only) | Bounds heuristic | `[x]` |
| `sensing_distanceto` + menu | `distance_to("mouse" \| sprite)` | Yes (literal only) | Yes | `[x]` |
| `sensing_askandwait` / `sensing_answer` | `ask(question)` / `answer()` | Yes | Yes | `[x]` |
| `sensing_keypressed` + `sensing_keyoptions` | `key_pressed(key)` | Yes | Yes | `[x]` |
| `sensing_mousedown` / `sensing_mousex` / `sensing_mousey` | `mouse_down()` / `mouse_x()` / `mouse_y()` | Yes | Yes | `[x]` |
| `sensing_timer` / `sensing_resettimer` | `timer()` / `reset_timer()` | Yes | Yes | `[x]` |
| `sensing_of` + `sensing_of_object_menu` | `attribute_of(attribute, target)` | Missing | Missing | `[ ]` |
| `sensing_touchingcolor` | `touching_color("#rrggbb")` | Missing | Missing | `[ ]` |
| `sensing_coloristouchingcolor` | `color_is_touching_color("#c1", "#c2")` | Missing | Missing | `[ ]` |
| `sensing_setdragmode` | `set_drag_mode("draggable" \| "not draggable")` | Missing | Missing | `[ ]` |
| `sensing_current` | `current_time("year" \| "month" \| "date" \| "dayofweek" \| "hour" \| "minute" \| "second")` | Missing | Missing | `[ ]` |
| `sensing_dayssince2000` | `days_since_2000()` | Missing | Missing | `[ ]` |
| `sensing_username` | `username()` | Missing | Missing | `[ ]` |
| `sensing_loudness` | `loudness()` | Missing | Missing | `[ ]` |

### Remaining Sensing Parity Gaps
- [ ] **`attribute_of(attribute, target)`** (`sensing_of` + `sensing_of_object_menu`): reading `"x position"`, `"y position"`, `"direction"`, `"costume #"`, `"costume name"`, `"size"`, `"volume"`, `"backdrop #"`, `"backdrop name"`, or any sprite-local / stage variable from `target`.
- [ ] **`touching_color("#rrggbb")`** (`sensing_touchingcolor`) and **`color_is_touching_color("#c1", "#c2")`** (`sensing_coloristouchingcolor`) using offscreen Canvas 2D pixel sampling of sprite costume vs. backdrop + pen + other sprites.
- [ ] **`set_drag_mode("draggable" | "not draggable")`** (`sensing_setdragmode`) + copying `target.draggable` in `_createActorFromTarget()` and implementing live mouse dragging on the Canvas stage in `StagePreview._bindCanvasMouse()`.
- [ ] **`current_time(unit)`** (`sensing_current`, note Scratch `dayofweek` is 1=Sunday..7=Saturday and `month` is 1..12), **`days_since_2000()`** (`sensing_dayssince2000`, UTC days since `2000-01-01T00:00:00Z`), **`username()`** (`sensing_username`), and **`loudness()`** (`sensing_loudness`, Web Audio `AnalyserNode` microphone RMS 0–100 with `-1` fallback when unpermitted/headless).
- [ ] **Pixel-accurate costume hit-testing** in `touching()` and `_handleCanvasClick()` (currently circular radius heuristic `24 * scale` / `32 * avgScale`).

---

## 8. Operators (`operator_*`) & Pythonic Sugar

- [x] **Arithmetic, comparisons, and boolean logic**: `+`, `-`, `*`, `/`, `%`, `//` (compiles to `floor(a / b)`), `==`, `!=`, `<`, `>`, `<=`, `>=`, `and`, `or`, `not`.
- [x] **String, random & rounding reporters**: `random(a, b)` (`operator_random`), `join(s1, s2)` (`operator_join`), `letter_of(i, s)` (`operator_letter_of`), `length_of(s)` (`operator_length`), `contains(s1, s2)` (`operator_contains`), `round(x)` / `round_num(x)` (`operator_round`).
- [x] **Basic `operator_mathop` support**: `abs`, `floor`, `ceil`/`ceiling`, `sqrt`, `sin`, `cos`, `tan`, and `math_op(op, num)`.
- [ ] **Full round-trip & `StagePreview` support for `asin`, `acos`, `atan`, `ln`, `log`, `e ^`, `10 ^` (and `tan` in `math_op`)**:
  - *Verified exact gaps:*
    - `js/compiler.js`: `MATH_OP_ALIASES` includes `asin`, `acos`, `atan`, `ln`, `log`, but has no direct Python aliases (e.g. `exp`, `pow10`) for `"e ^"` and `"10 ^"` (only `math_op("e ^", x)` / `math_op("10 ^", x)`).
    - `js/decompiler.js`: `operator_mathop` only maps `abs`, `floor`, `ceiling` (`ceil`), `sqrt`, `sin`, `cos`, `tan` to direct calls; `asin`, `acos`, `atan`, `ln`, `log` fall back to `math_op("...", x)`.
    - `js/preview.js`: `evalExpr()` direct function switch handles only `abs`, `floor`, `ceil`/`ceiling`, `sqrt`, `sin`, `cos`, `tan` (calling `asin`/`acos`/`atan`/`ln`/`log` directly returns `0`!); and `case 'math_op'` (lines 598–608) handles only `abs`, `floor`, `ceiling`, `sqrt`, `sin`, `cos` — **`tan` is missing in `math_op`**, and `asin`, `acos`, `atan`, `ln`, `log`, `e ^`, `10 ^` all fall through to `return v;` unchanged.
  - Also note Scratch's `operator_random` returns floating-point numbers when either bound has a decimal point, whereas `preview.js` (lines 571–577) always truncates with `Math.floor`.
- [ ] **Pythonic list/string sugar**:
  - `len(x)` -> compiles to `data_lengthoflist` (for known lists) or `operator_length` (for strings/expressions).
  - `list_name[i]` -> indexing (`data_itemoflist`) and indexed assignment `list_name[i] = val` (`data_replaceitemoflist`); `tokenize()` already produces `PUNCT` tokens for `[` and `]`.
  - `item in list_name` / `substr in str` -> compiles to `data_listcontainsitem` or `operator_contains` (token `KW 'in'` already exists).

---

## 9. Data (`data_*`) — Variables & Lists

- [x] **Variable assignment & mutation**: `var = val` (`data_setvariableto`), `var += d`, `var -= d` (`data_changevariableby`), `var *= d`, `var /= d`.
- [x] **Core list operations**: `list_add` (`data_addtolist`), `list_delete` (`data_deleteoflist`), `list_clear` (`data_deletealloflist`), `list_insert` (`data_insertatlist`), `list_replace` (`data_replaceitemoflist`), `list_item` (`data_itemoflist`), `list_length` (`data_lengthoflist`), `list_contains` (`data_listcontainsitem`).
- [ ] **`list_index_of(list, item)`** (`data_itemnumoflist`): returns 1-based index of matching item (or `0` if absent) across `compiler.js`, `decompiler.js`, and `preview.js`.
- [ ] **`show_variable(var)` (`data_showvariable`), `hide_variable(var)` (`data_hidevariable`), `show_list(list)` (`data_showlist`), `hide_list(list)` (`data_hidelist`)**: compile/decompile and toggle monitor visibility in `projectJson.monitors` & `StagePreview`.
- [ ] **Scratch special list index keywords (`"last"`, `"random"`, `"all"`)** in `list_item` and `list_delete` inside `StagePreview` (currently `preview.js` evaluates `Number(arg(1))` only).

---

## 10. Custom Procedures (`procedures_*`) & Extensions (`pen_*`)

- [x] **Custom procedures (`def name(params):` and procedure calls)**: `procedures_definition`, `procedures_prototype`, `procedures_call`, and `argument_reporter_string_number` (`%s`) across `compiler.js`, `decompiler.js`, and `preview.js`.
- [x] **Pen extension compilation & decompilation (`pen_*`)**: `pen_clear`, `pen_stamp`, `pen_penDown`, `pen_penUp`, `pen_setPenColorToColor`, `pen_setPenColorParamTo`, `pen_changePenColorParamBy`, `pen_setPenSizeTo`, `pen_changePenSizeBy` in `compiler.js` & `decompiler.js` (auto-enables `"pen"` in `projectJson.extensions`).
- [ ] **`@warp` decorator on `def` for "Run without screen refresh"**:
  - `parseProgram()` in `js/compiler.js` currently treats any top-level `@` as an event `Handler` (requiring 0 params); support `@warp` before `def fn(params):` and set `mutation.warp = "true"` on `procedures_prototype` and `procedures_call`.
  - `decompileTarget()` in `js/decompiler.js` should emit `@warp` when `proto.mutation.warp === "true"`.
  - `StagePreview` (`js/preview.js`) should execute `@warp` procedures synchronously without `await this.sleep(16)` frame yields or mid-call renders (with a 500ms safety timeout like Scratch VM).
- [ ] **Boolean parameter reporters (`argument_reporter_boolean`, `%b`) in custom procedures**:
  - Support typed boolean parameters (e.g., `def foo(flag: bool):` or `%b` proccodes from imported `.sb3` files) so `procedures_prototype` preserves `%b` slots, `compileBoolInput` emits `argument_reporter_boolean`, and `decompileTarget` reconstructs parameter types and multi-segment Scratch `proccode` labels cleanly.
- [ ] **Full HSV/transparency simulation for `set_pen_param` / `change_pen_param` on the Canvas 2D Pen layer**:
  - `js/preview.js` (`execCall`) currently has **no cases** for `set_pen_param` or `change_pen_param` (they silently no-op). Add per-actor `penHue`, `penSaturation`, `penBrightness`, `penTransparency` (0–100 Scratch scale), synchronize with `set_pen_color("#rrggbb")`, and render stroked paths with computed RGBA/HSLA color.
- [ ] **`stop("this script")` propagation inside custom procedures**:
  - Currently returning `'RETURN_SCRIPT'` from `execCall` (`js/preview.js`, line 739) exits only the procedure body instead of halting the enclosing caller script as Scratch 3.0 does.

---

## 11. Web IDE & Asset Management (`index.html`, `js/app.js`, `js/sb3Bridge.js`)

- [x] **Multi-target tabs & sprite creation**: Stage + Sprite tabs (`#target-tabs`), `+ Спрайт` (`#btn-add-sprite` -> `Sb3Bridge.addSpriteToProject`).
- [x] **Python DSL syntax highlighting & editor ergonomics**: `highlightPython`, line numbers, syntax error / active block line markers, scroll sync, `Tab` 4-space insert, auto-indent on `:`, `Ctrl/Cmd+Enter` run shortcut.
- [x] **Interactive Scratch block tree inspector**: `#view-blocks` (`renderBlocksTree` using `formatBlockUk`) with click-to-jump to Python source line.
- [x] **Asset viewer, quick palette, API docs, and 6 templates**: `#view-assets`, `#quick-palette`, `#view-docs` (`API_DOCS`), and 6 snippets (`hexagon`, `functions`, `arrows`, `clones`, `quiz`, `levels`).
- [ ] **Upload custom SVG/PNG costumes and backdrops**:
  - File picker & `Sb3Bridge` helpers to add SVG or raster PNG/JPG costumes to the active target (calculating MD5 `assetId`/`md5ext`, image dimensions, and default center `rotationCenterX`/`rotationCenterY`, and refreshing `StagePreview.syncProjectAssets`).
- [ ] **Upload WAV/MP3 sounds**:
  - File picker & `Sb3Bridge` helper to parse WAV headers (`rate`, `sampleCount`) or decode MP3 duration/metadata, compute MD5 `assetId`/`md5ext`, register into `target.sounds` & `assetsMap`, and preview/delete sounds.
- [ ] **Rename / delete sprites and manage target assets**:
  - UI controls + `Sb3Bridge` helpers to rename a sprite (updating references/tabs safely), delete non-stage sprites, and delete or reorder costumes, backdrops, and sounds.
- [ ] **Edit sprite properties in the UI**:
  - Editable inspector inputs for `x`, `y`, `size`, `direction`, `visible`, `rotationStyle`, and `draggable` synced to `projectJson.targets[activeTargetIdx]` and `StagePreview`.
- [ ] **On-stage variable/list monitor overlay & complete `formatBlockUk` coverage**:
  - Render `projectJson.monitors` directly over `#stage-canvas` (supporting default, large, and draggable slider modes), add `formatBlockUk` translations for currently raw opcodes (`looks_seteffectto`, `looks_changeeffectby`, `looks_cleargraphiceffects`, `sound_setvolumeto`, `sound_changevolumeby`, `pen_setPenColorParamTo`, `pen_changePenColorParamBy`, `motion_setrotationstyle`, `data_insertatlist`, `data_replaceitemoflist`), and sync `apiRe` syntax highlighting with new DSL functions (`tan`, `asin`, `acos`, `atan`, `ln`, `log`, `round`, etc.).

---

## 12. Planned Multi-Agent Execution Roadmap (Stage 2)

Work in Stage 2 is divided between **Agent 4 (Compiler & Decompiler Engineer)** — owning `js/compiler.js`, `js/decompiler.js`, `js/sb3Bridge.js`, and `test/test_roundtrip.js` — and **Agent 5 (Stage Runtime & Clones Engineer)** — owning `js/preview.js` (plus IDE wiring in `index.html`, `js/app.js`, and `style.css`).

### Milestone 1 — Clones, Local Scoping & Critical Runtime Fixes *(Highest Priority)*
- **Agent 4 (`compiler.js`, `decompiler.js`, `test/test_roundtrip.js`):**
  - Add sprite-local variable/list DSL syntax (`self.var` / `local_var` / `local_list`) reading/writing `spriteTarget.variables` and `spriteTarget.lists`, and update `decompileTarget(target, stageTarget)` to preserve scope cleanly.
  - Emit counter variable initialization + increment for `for i in range(n):` when the loop variable is referenced inside the loop body.
  - Add unit/round-trip assertions for local variables/lists and loop counters.
- **Agent 5 (`preview.js`):**
  - Split `StagePreview` state into global `vars`/`lists` (Stage) and per-actor `localVars`/`localLists`.
  - Implement deep-copy inheritance of `localVars`, `localLists`, and actor properties in `create_clone()`.
  - Raise the clone cap from `150` total actors to Scratch-accurate `300` clones (`actor.isClone`).
  - Fix `stop("other scripts in sprite")` using per-actor thread tokens/abort handles so only sibling scripts on that actor/clone are cancelled while the calling script continues.
  - Bind `stmt.loopVar` during `Repeat` execution and propagate `RETURN_SCRIPT` across custom procedure calls.

### Milestone 2 — Missing Motion, Looks, Events, Data, Operators & `@warp`
- **Agent 4 (`compiler.js`, `decompiler.js`):**
  - Implement compilation & decompilation for `glide_to` (`motion_glideto`), `switch_backdrop_and_wait` (`looks_switchbackdroptoandwait`), `go_to_layer` (`looks_gotofrontback`), `change_layer` (`looks_goforwardbackwardlayers`), `list_index_of` (`data_itemnumoflist`), `show_variable`/`hide_variable`/`show_list`/`hide_list`, `@warp` decorator (`mutation.warp = "true"`), and boolean procedure parameters (`%b`, `argument_reporter_boolean`).
  - Add Pythonic sugar (`len()`, `list[i]`, `in`), reporter inputs on menu blocks (`goto`, `point_towards`, `touching`, `distance_to`, `create_clone`, `broadcast`), `operator_mathop` round-trip aliases (`e ^`, `10 ^`, `asin`, `acos`, `atan`, `ln`, `log`), and missing `formatBlockUk` Ukrainian labels.
- **Agent 5 (`preview.js`):**
  - Execute `glide_to`, `switch_backdrop_and_wait`, `go_to_layer`/`change_layer` with `layerOrder`-sorted rendering and click hit-testing.
  - Implement Canvas 2D rendering for all 7 graphic effects (`color`, `ghost`, `brightness`, `fisheye`, `whirl`, `pixelate`, `mosaic`) and `bitmapResolution` costume scaling.
  - Implement accurate rotated/scaled costume bounding-box `if_on_edge_bounce()`, Scratch broadcast restart semantics in `triggerBroadcast()`, synchronous `@warp` procedure execution, `list_index_of` + `"last"`/`"random"`/`"all"` list selectors, float `random()`, and all `operator_mathop` operations (`tan`, `asin`, `acos`, `atan`, `ln`, `log`, `e ^`, `10 ^`).

### Milestone 3 — Sensing, Sound Audio Buffers, Pen HSV, Monitors, Comments & Asset Manager UI
- **Agent 4 (`compiler.js`, `decompiler.js`, `sb3Bridge.js`):**
  - Implement `attribute_of` (`sensing_of`), `touching_color` (`sensing_touchingcolor`), `color_is_touching_color` (`sensing_coloristouchingcolor`), `set_drag_mode` (`sensing_setdragmode`), `current_time` (`sensing_current`), `days_since_2000` (`sensing_dayssince2000`), `username` (`sensing_username`), `loudness` (`sensing_loudness`), `@when_greater_than` (`event_whengreaterthan`), and `set_sound_effect`/`change_sound_effect`/`clear_sound_effects`.
  - Implement `projectJson.monitors` generation/round-trip and `target.comments` <-> Python `#` comment serialization.
  - Extend `Sb3Bridge` with costume/backdrop/sound upload, sprite rename/delete, and property update APIs.
- **Agent 5 (`preview.js`) & IDE (`index.html`, `js/app.js`, `style.css`):**
  - Decode and play real `.wav`/`.mp3` buffers from `assetsMap` via Web Audio API (`decodeAudioData`), supporting `volume`, `pitch`/`pan` effects, true `play_sound_until_done()` timing, and source tracking for `stop_all_sounds()`.
  - Implement full HSV + transparency color model for `set_pen_param`/`change_pen_param`.
  - Implement pixel-accurate `touching_color`/`color_is_touching_color` & costume hit-testing, `attribute_of`, `current_time`/`days_since_2000`/`username`/`loudness`, `@when_greater_than`, live Canvas sprite dragging (`draggable`), and on-stage monitor overlays (`default`, `large`, `slider`).
  - Build Web IDE controls for uploading SVG/PNG costumes & backdrops, uploading WAV/MP3 sounds, renaming/deleting sprites, and editing sprite properties (`x`, `y`, `size`, `direction`, `visible`, `rotationStyle`, `draggable`).

---

## 13. Architecture Split — Open-Source Tool (`pyScratch`) + `sivochka.com` Tutor Landing Page & Integration

### Part A — `pyScratch` Open-Source Standalone & Embeddable App (`Figarist/pyScratch` repo)
- [ ] **Embed mode (`?embed=1&snippet=clones&autorun=1` URL query parameters)** to render a compact, iframe-ready Editor + Stage view for lesson pages and blog posts
- [ ] **Shareable code links (`?code=<base64url>`)** so students and teachers can share Python-Scratch programs via a single URL
- [ ] **Subtle, configurable header/footer attribution badge** (`Built by sivochka.com — Scratch & Python Tutoring` + GitHub Star/Fork link)
- [ ] **SEO & OpenGraph meta tags** (`og:title`, `og:description`, `og:image`, JSON-LD `SoftwareApplication` schema) and GitHub Pages deployment workflow (`pyscratch.sivochka.com` or `sivochka.com/pyscratch`)

### Part B — `sivochka.com` Educational Landing Page & Tutor Trust Funnel
- [ ] **Dedicated SEO landing page on `sivochka.com`** targeting parents and students transitioning from Scratch 3.0 to Python
- [ ] **Interactive embedded `pyScratch` live demo** showing side-by-side Python code, Scratch 3.0 blocks, and 480×360 stage execution
- [ ] **"Upload your child's `.sb3` project and see it in Python"** interactive hook on the landing page
- [ ] **Authority & trust block** highlighting the open-source `pyScratch` platform on GitHub + direct CTA to book a Scratch / Python tutoring session on `sivochka.com`
