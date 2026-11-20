# pyScratch Python DSL Reference

This document specifies every Python-inspired DSL construct supported by the pyScratch compiler ([`js/compiler.js`](../js/compiler.js)), decompiler ([`js/decompiler.js`](../js/decompiler.js)), and Canvas 2D stage simulator ([`js/preview.js`](../js/preview.js)), along with exact Scratch 3.0 opcode mappings, arguments, and runtime behavior.

---

## 1. Core Syntax & Compiler Rules

### Top-Level Program Structure
Every top-level construct in a target script (Stage or Sprite) **must** be one of:
1. **An event handler**: a `@decorator` immediately followed by a parameterless `def handler_name():` block.
2. **A custom procedure**: `def proc_name(arg1, arg2):` with zero or more parameter names.

Top-level imperative statements (e.g., calling `move(10)` or assigning `score = 0` outside a `def`) are rejected with a `CompileError`.

### Indentation, Comments, & Identifiers
- **Indentation**: 4 spaces per level is recommended. Tab characters (`\t`) count as 4 spaces. The tokenizer only checks consistency: a dedent must return to a previously used indentation level, otherwise a `CompileError` ("Wrong indentation on line N …" / "Неправильний відступ у рядку N …") points to the offending line. It does not require multiples of 4.
- **Line continuation**: inside `()` and `[]` a statement may span several lines (blank lines and `#` comments are allowed in between), and a trailing backslash `\` continues the line explicitly. An unclosed bracket is reported at the line where it was opened; a stray or mismatched closing bracket is reported at its own position.
- **Comments**: `#` begins a single-line comment. Empty lines and comments are ignored by the tokenizer and are **not** stored in `target.comments` (comment round-tripping is not implemented).
- **Identifiers**: any Unicode letter (`\p{L}`) or `_` to start, then letters, digits and combining marks (identifiers cannot start with a digit).
- **Error positions**: tokens and `CompileError` carry a 1-based `line` and `col` (`col` may be `null` for errors that are only known per line).
- **Diagnostics language**: every `CompileError` message, the block tree labels and the comments the decompiler writes (`# === PLAYER SCRIPT (Sprite1) ===`, `# [kept unchanged] …`) come from [`js/messages.js`](../js/messages.js) in the language of the page (`uk` at `/`, `en` at `/en/`, `ru` at `/ru/`). In Node.js without `PyScratchI18n` they are Ukrainian. Comments never affect compilation, so code written on one language page compiles the same on the others.
- **Unsupported Python constructs** produce a dedicated hint instead of a generic syntax error: `return`, `break`, `continue`, `class`, `import` / `from`, `lambda`, `try`/`except`, `with`, `global`, f-strings (and `r`/`b`/`u` string prefixes), `**` and the ternary `a if cond else b`.
- **Reserved keywords**: `def`, `for`, `in`, `while`, `if`, `elif`, `else`, `pass`, `and`, `or`, `not`, `True`, `False`.

### Literals & Negative Literal Folding
- **Numbers**: Integer and floating-point literals (e.g., `10`, `0.25`). Unary `-` applied to a numeric literal (e.g., `-150`) is **constant-folded** at parse time into a negative number AST node (`[1, [4, "-150"]]`) rather than emitting `operator_subtract(0, 150)`. Unary `+` is ignored.
- **Strings**: Single-quoted (`'...'`) or double-quoted (`"..."`), supporting the escapes `\n \t \r \b \f \v \0 \\ \' \" \xNN \uNNNN`. Any other backslash sequence (e.g. `"\d"`) is a `CompileError`; write `\\` for a literal backslash. Strings are single-line. A string matching `/^#[0-9a-fA-F]{6}$/` compiles as a Scratch color picker input (shadow type `9`) **only in colour slots** (`set_pen_color`, `touching_color`, `color_is_touching_color`); everywhere else (e.g. `say("#ff0000")`) it is ordinary text (type `10`).
- **Booleans**: `True` and `False`. In value slots they serialize as `"true"` / `"false"` (type `10`); in boolean condition slots they compile to `operator_equals("1", "1")` and `operator_equals("1", "0")`.

### Variable, List & Parameter Scoping
- **Global Stage Scope (Default)**: Newly assigned bare variables (`score = 0`) and `list_*("name", ...)` calls are registered on the **Stage** target (`Stage.variables` and `Stage.lists`) by default, matching Scratch's "For all sprites" global sharing. When modifying an imported `.sb3` project, pre-existing sprite-local variables/lists on `target` are matched before falling back to `Stage`.
- **Sprite-Local Variables (`self.var`)**: Prefixing a variable with `self.` (e.g., `self.hp = 100`, `self.hp -= 25`) registers the variable on the **sprite target** (`target.variables`) instead of `Stage`. `decompileTarget(target, stageTarget)` preserves `self.var` syntax, and `StagePreview` isolates `actor.localVars` per sprite and deep-copies them onto each newly spawned clone.
- **Sprite-Local Lists (`local_list` & `local_list_*`)**: Calling `local_list("inv")` or any `local_list_*` helper (`local_list_add`, `local_list_item`, `local_list_length`, `local_list_contains`, `local_list_index_of`, `local_list_insert`, `local_list_replace`, `local_list_delete`, `local_list_clear`) registers the list on `target.lists` ("For this sprite only"). Once `local_list("inv")` is declared in a sprite script, subsequent `list_*("inv", ...)` calls in that sprite also bind to the local list. `StagePreview` deep-copies `actor.localLists` onto each clone.
- **Procedure Parameters**: Inside a `def proc(a, b):` body, reading `a` or `b` compiles to `argument_reporter_string_number` instead of a global variable. In `StagePreview`, procedure arguments live in a per-call `localScope` dictionary, while assignments (`x = ...`, `x += ...`) mutate `this.vars` (or `actor.localVars` when using `self.x`).
- **Dynamic Reporter Inputs in Menu Slots**: Single-argument menu blocks (`goto`, `glide_to`, `point_towards`, `switch_costume`, `switch_backdrop`, `switch_backdrop_and_wait`, `play_sound`, `play_sound_until_done`, `touching`, `distance_to`, `key_pressed`, `attribute_of`, `create_clone`, `broadcast`, `broadcast_and_wait`, `set_pen_param`, `change_pen_param`) accept either string literals or dynamic variable/reporter expressions (`compileMenuOrExpr` / `compileBroadcastInput`).
- **Name conflicts**: a sprite-local variable (`self.x`) may not share a name with a global (Stage) variable `x`; the compiler raises a `CompileError` ("clashes with the global variable" / "конфліктує з глобальною змінною") instead of silently shadowing.
- **`for` loop variable**: `for i in range(n)` is a normal Scratch variable named `i` in the generated project. When the body reads `i`, the compiler emits `set i to 0` before the `repeat` and `change i by 1` as the last body block, so the `.sb3` behaves like the preview (`i = 0 … n-1`; after the loop `i == n`). The decompiler folds that pattern back into `for i in range(n)`; a body that already ends with `i += 1` is left as is. If the body never reads `i`, no counter blocks are emitted. Loop-variable names that are parameters of the enclosing `def` are not touched.
- **Differences from Python**: `//` is `floor(a / b)` (so `-7 // 2 == -4`, as in Python) but the division is Scratch's: dividing by zero never raises, `x / 0` is `Infinity`/`-Infinity` and `0 / 0` is `NaN` (same for `//`), `%` takes the sign of the divisor like Python and `x % 0` is `NaN`. All numbers are IEEE-754 doubles, so integers are exact only up to 2^53 (no arbitrary-precision `int`). `and`/`or` always evaluate both sides and return booleans, not operands. Strings and numbers are compared Scratch-style (case-insensitive, numeric when both look numeric). Variables are not block-scoped: a bare name is always a global variable (never local to `def` or `if`), only `self.name`, `local_list(...)` and procedure parameters are local. There is no `None`, tuple, dict, slicing or `in` operator for values (use `contains()` / `list_contains()`).
- **1-Based Indexing**: `list_item`, `list_index_of`, `list_delete`, `list_insert`, `list_replace`, their `local_list_*` counterparts, and `letter_of` use **1-based indexing**, matching Scratch 3.0.

---

### Validation of Field Values & Blocks per Target
The compiler rejects values Scratch would silently ignore, with a `CompileError` (in the page language) listing the allowed values:
- `set_effect` / `change_effect`: `COLOR FISHEYE WHIRL PIXELATE MOSAIC BRIGHTNESS GHOST` (case-insensitive); `set_sound_effect` / `change_sound_effect`: `PITCH PAN`.
- `set_rotation_style`: `"left-right"`, `"don't rotate"`, `"all around"`; `set_drag_mode`: `"draggable"`, `"not draggable"`; `stop`: `"all"`, `"this script"`, `"other scripts in sprite"`.
- Keys of `@when_key_pressed` / `key_pressed`: `space`, the four `… arrow`, `enter`, `any`, `a`–`z`, `0`–`9` (checked only for string literals).
- `math_op` operator (`abs floor ceiling sqrt sin cos tan asin acos atan ln log "e ^" "10 ^"`), `current_time` unit (`YEAR MONTH DATE DAYOFWEEK HOUR MINUTE SECOND`), `@when_greater_than` sensor (`LOUDNESS`, `TIMER`).
- `attribute_of` property: the known names (`"x position"`, `"costume #"`, …) must be spelled exactly (a wrong-case spelling is an error); any other string is treated as the name of a variable of the other object and is not validated.
- Field arguments must be string literals, not expressions.
- **Stage vs. sprite**: motion blocks, `say`/`think`, `show`/`hide`, size and costume blocks, `touching*`, `distance_to`, `set_drag_mode`, `delete_this_clone` and the position/direction/size/costume reporters are sprite-only and raise a `CompileError` in a Stage script; `@when_cloned` is also sprite-only. There are currently no DSL blocks that are Stage-only (`switch_backdrop_and_wait` is hidden from the sprite palette in Scratch but runs fine on sprites, so it stays allowed).
- Calling a custom block with the wrong number of arguments is a `CompileError`.

### Imported Projects: Scripts the DSL Cannot Express
When an imported `.sb3` contains top-level scripts with opcodes the decompiler does not know (unknown hats, extension blocks such as `videoSensing_*` or `makeymakey_*`, loose block stacks, …), `decompileTarget` does not render them; it prints a `# [kept unchanged] …` comment instead (`# [збережено без змін] …` on the Ukrainian page, `# [сохранено без изменений] …` on the Russian one). On every recompile `compileToScratch` keeps those scripts verbatim: their blocks are merged back into `target.blocks` (ids that collide with generated ids are renamed to `raw_<id>`, with `parent`/`next`/inputs/comment links rewritten), their variables/lists/broadcasts are protected from orphan cleanup, and custom blocks defined inside such scripts remain callable from DSL code. They cannot be edited or deleted from the code editor. Comments attached to regenerated blocks are dropped (workspace comments and comments on preserved scripts are kept), and monitors of variables/lists removed by the cleanup are removed from `project.monitors`.

---

## 2. Event Decorators & Broadcasts (`Events` & `Control` Hats)

Event decorators must precede a zero-parameter function (`def name():`), except `@warp`, which precedes a custom procedure `def proc(...):`.

| Python DSL | Scratch 3.0 Opcode | Fields / Inputs | Notes |
| --- | --- | --- | --- |
| `@when_flag_clicked` | `event_whenflagclicked` | — | Runs when the green flag / **Run** button is triggered. |
| `@when_key_pressed(key)` | `event_whenkeypressed` | Field `KEY_OPTION` (`"space"` default) | Keys: `"space"`, `"up arrow"`, `"down arrow"`, `"left arrow"`, `"right arrow"`, `"enter"`, `"any"`, or single character (`"a"`..`"z"`, `"0"`..`"9"`). |
| `@when_this_sprite_clicked` | `event_whenthisspriteclicked` | — | Compiles to `event_whenstageclicked` if placed in the Stage tab. |
| `@when_stage_clicked` | `event_whenstageclicked` | — | Compiles to `event_whenthisspriteclicked` if placed in a Sprite tab. |
| `@when_backdrop_switches(name)` | `event_whenbackdropswitchesto` | Field `BACKDROP` (`"backdrop1"` default) | Fires when `switch_backdrop(name)`, `switch_backdrop_and_wait(name)`, or `next_backdrop()` activates `name`. |
| `@when_message_received(msg)` | `event_whenbroadcastreceived` | Field `BROADCAST_OPTION` (`"message1"` default) | Registers `msg` in Stage `broadcasts`. Re-broadcasting restarts still-running handlers on each actor in `StagePreview`. |
| `@when_greater_than(sensor, val)` | `event_whengreaterthan` | Field `WHENGREATERTHANMENU` (`"TIMER"` \| `"LOUDNESS"`), input `VALUE` | Edge-triggered hat firing when `sensor > val`. In `StagePreview`, `"timer"` polls every 50ms (`"loudness"` evaluates to `0`). |
| `@when_cloned` | `control_start_as_clone` | — | Executes inside each newly created clone with inherited local state. |
| `@when_touching(obj)` | `event_whentouchingobject` | Input `TOUCHINGOBJECTMENU` (shadow `event_touchingobjectmenu`, field `TOUCHINGOBJECTMENU`) | `obj` is `"edge"` (`"_edge_"`), `"mouse"` (`"_mouse_"`, default) or a sprite name; the raw `"_edge_"` / `"_mouse_"` spellings are accepted too. Sprite-only (`CompileError` on the Stage). Edge-triggered: in `StagePreview` the script starts when the sprite *begins* touching the object (polled every 50 ms, hidden sprites never touch). Decompiles back to `@when_touching("edge")`. |

### Broadcast Statements (`Events`)

| Python DSL | Scratch 3.0 Opcode | Inputs | Notes |
| --- | --- | --- | --- |
| `broadcast(msg)` | `event_broadcast` | `BROADCAST_INPUT` (`[1, [11, msg, bId]]` or reporter) | Sends broadcast asynchronously without waiting; restarts active receivers for `msg`. |
| `broadcast_and_wait(msg)` | `event_broadcastandwait` | `BROADCAST_INPUT` (`[1, [11, msg, bId]]` or reporter) | Sends broadcast and awaits completion of all triggered handlers. |

```python
@when_flag_clicked
def main():
    broadcast("start_wave")

@when_message_received("start_wave")
def on_wave():
    say("Wave started!", 1.5)

@when_key_pressed("space")
def jump():
    change_y(40)
    wait(0.2)
    change_y(-40)
```

---

## 3. Custom Procedures (`My Blocks`)

| Python DSL | Scratch 3.0 Opcodes | Mutation / Fields | Notes |
| --- | --- | --- | --- |
| `def name(p1, p2):` | `procedures_definition` + `procedures_prototype` + `argument_reporter_string_number` | `proccode`: `"name %s %s"` (or `"name"` if 0 params), `argumentids`, `argumentnames`, `argumentdefaults`, `warp: "false"` | Two-pass compilation allows calling procedures defined later in the script. |
| `@warp` + `def name(p1, p2):` | `procedures_definition` + `procedures_prototype` + `argument_reporter_string_number` | Same as above with `warp: "true"` | "Run without screen refresh": executes synchronously in `StagePreview` without 16ms frame yields (500ms safety yield). |
| `def name(a, flag: bool):` | `procedures_definition` + `procedures_prototype` + `argument_reporter_string_number` / `argument_reporter_boolean` | `proccode`: `"name %s %b"`, `argumentdefaults`: `""` for text/number and `"false"` for boolean | A parameter annotated `: bool` becomes a Scratch **boolean argument** (`%b`, hexagonal slot). Reading `flag` inside the body emits `argument_reporter_boolean` (usable in `if`/`while` conditions and in value slots). `bool` is the only supported annotation; any other type is a `CompileError`. The decompiler prints `%b` arguments back as `name: bool`, and an empty boolean slot of an imported project as `False`. |
| `name(v1, v2)` | `procedures_call` | `proccode`, `argumentids`, `warp: "true" \| "false"`; inputs keyed by `paramId` | Statement-only (Scratch custom blocks do not return values). `stop("this script")` inside a procedure exits the caller script as well. For `%b` parameters pass a condition (`touching("edge")`, `True`, `a < b`); a number or text literal counts as true unless it is `0`, `""` or `"false"`. In `StagePreview` a boolean parameter is coerced to `True`/`False` on entry. |

```python
@warp
def fast_ring(count, step):
    for i in range(count):
        move(step)
        turn_right(360 / count)

@when_flag_clicked
def main():
    pen_down()
    fast_ring(12, 20)
    pen_up()
```

---

## 4. Control Flow & Clones (`control_*`)

| Python DSL | Scratch 3.0 Opcode | Inputs / Fields / Mutations | Notes |
| --- | --- | --- | --- |
| `for i in range(n):` | `control_repeat` | `TIMES` (`n`), `SUBSTACK` | Accepts a single count expression `n`. In `StagePreview`, `i` is bound in `localScope` (`0..n-1`); in `.sb3` compilation, if the body reads `i` the compiler registers a variable `i` and emits `set i to 0` before the loop plus `change i by 1` at the end of the body (see §1 *`for` loop variable*); it decompiles back to `for i in range(...):`. |
| `while True:` | `control_forever` | `SUBSTACK` | Infinite loop until stopped or clone deleted. |
| `while not cond:` | `control_repeat_until` | `CONDITION` (`cond`), `SUBSTACK` | Maps directly to Scratch's `repeat until`. |
| `while cond:` | `control_repeat_until` | `CONDITION` (`operator_not(cond)`), `SUBSTACK` | Compiles by wrapping `cond` in `operator_not`. |
| `if cond:` / `elif cond2:` / `else:` | `control_if` / `control_if_else` | `CONDITION`, `SUBSTACK`, `SUBSTACK2` | `elif` compiles as a nested `control_if` / `control_if_else` inside `SUBSTACK2` and is reconstructed back to `elif` on decompilation. |
| `pass` | *(none)* | — | Emits no blocks; generated by the decompiler for empty script bodies. |
| `wait(secs)` | `control_wait` | `DURATION` (`secs`) | Pauses current script for `secs` seconds (cancellable on stop/restart). |
| `wait_until(cond)` | `control_wait_until` | `CONDITION` (`cond`) | Polls every ~16ms in `StagePreview` until `cond` is truthy. |
| `stop(option)` | `control_stop` | Field `STOP_OPTION`: `"all"`, `"this script"`, or `"other scripts in sprite"`; mutation `hasnext`: `"true"` iff `"other scripts in sprite"` | Defaults to `"all"`. In `StagePreview`: `"this script"` exits the current script (propagating out of procedures), `"other scripts in sprite"` / `"other scripts in stage"` cancels sibling threads on that actor only, and `"all"` halts the stage. |
| `create_clone(target)` | `control_create_clone_of` | `CLONE_OPTION` (`control_create_clone_of_menu`: `"_myself_"`, sprite name, or expr) | Pass `"myself"` (`"_myself_"`), a sprite name, or expression. `StagePreview` enforces Scratch's 300-clone cap (`actor.isClone`) and deep-copies `localVars`, `localLists`, `effects`, `soundEffects`, `penHsl`, and `draggable`. |
| `delete_this_clone()` | `control_delete_this_clone` | — | Deletes the current clone and aborts its remaining statements. |

```python
@when_flag_clicked
def main():
    self.hp = 100
    for i in range(4):
        create_clone("myself")
        turn_right(90)
    while not touching("edge"):
        move(5)
        wait(0.05)
    stop("all")

@when_cloned
def burst():
    self.hp -= 25
    move(40)
    wait(0.5)
    delete_this_clone()
```

---

## 5. Motion (`motion_*`)

### Statements

| Python DSL | Scratch 3.0 Opcode | Inputs / Fields | Notes |
| --- | --- | --- | --- |
| `move(steps)` | `motion_movesteps` | `STEPS` | Moves in current `direction` (`90` = right, `0` = up). |
| `turn_right(deg)` | `motion_turnright` | `DEGREES` | Rotates clockwise by `deg` degrees. |
| `turn_left(deg)` | `motion_turnleft` | `DEGREES` | Rotates counter-clockwise by `deg` degrees. |
| `goto(x, y)` | `motion_gotoxy` | `X`, `Y` | Moves to coordinates `(x, y)` (`x: -240..240`, `y: -180..180`). Like Scratch, `StagePreview` fences the sprite so at least 15 px of its costume stays on the stage, so a large sprite can sit partly beyond the edge. |
| `goto(target)` | `motion_goto` | `TO` (`motion_goto_menu` or expr) | Single argument: `"random"` (`"_random_"`), `"mouse"` (`"_mouse_"`), `"SpriteName"`, or reporter expression. |
| `goto_random()` | `motion_goto` | `TO`: `"_random_"` | Shorthand for `goto("random")`; decompiles as `goto_random()`. |
| `goto_mouse()` | `motion_goto` | `TO`: `"_mouse_"` | Shorthand for `goto("mouse")`; decompiles as `goto_mouse()`. |
| `glide(secs, x, y)` | `motion_glidesecstoxy` | `SECS`, `X`, `Y` | Interpolates position over `secs` seconds (draws pen trail if pen is down). |
| `glide_to(secs, target)` | `motion_glideto` | `SECS`, `TO` (`motion_glideto_menu` or expr) | Glides over `secs` seconds toward `"random"` (`"_random_"`), `"mouse"` (`"_mouse_"`), `"SpriteName"`, or expression. |
| `point_in_direction(dir)` | `motion_pointindirection` | `DIRECTION` | Sets direction in degrees (`0` = up, `90` = right, `180` = down, `-90` = left). |
| `point_towards(target)` | `motion_pointtowards` | `TOWARDS` (`motion_pointtowards_menu` or expr) | Accepts `"mouse"` (`"_mouse_"`), `"SpriteName"`, or expression. |
| `set_x(x)` | `motion_setx` | `X` | Sets horizontal coordinate. |
| `change_x(dx)` | `motion_changexby` | `DX` | Adds `dx` to `x`. |
| `set_y(y)` | `motion_sety` | `Y` | Sets vertical coordinate. |
| `change_y(dy)` | `motion_changeyby` | `DY` | Adds `dy` to `y`. |
| `if_on_edge_bounce()` | `motion_ifonedgebounce` | — | Reflects direction and clamps sprite inside stage bounds using costume half-size (capped at half the stage, so sprites larger than the stage do not jitter). |
| `set_rotation_style(style)` | `motion_setrotationstyle` | Field `STYLE` | `"all around"`, `"left-right"`, or `"don't rotate"`. |

### Reporters

| Python DSL | Scratch 3.0 Opcode | Notes |
| --- | --- | --- |
| `x_position()` | `motion_xposition` | Current sprite X position (rounded in `StagePreview`). |
| `y_position()` | `motion_yposition` | Current sprite Y position (rounded in `StagePreview`). |
| `direction()` | `motion_direction` | Current sprite direction in degrees (rounded in `StagePreview`). |

```python
@when_flag_clicked
def patrol():
    set_rotation_style("left-right")
    goto(0, 0)
    glide_to(0.5, "random")
    point_in_direction(90)
    for i in range(60):
        move(8)
        if_on_edge_bounce()
        wait(0.03)
```

---

## 6. Looks (`looks_*`)

### Statements

| Python DSL | Scratch 3.0 Opcode | Inputs / Fields | Notes |
| --- | --- | --- | --- |
| `say(msg, secs)` | `looks_sayforsecs` | `MESSAGE`, `SECS` | Displays speech bubble for `secs` seconds and clears it. |
| `say(msg)` | `looks_say` | `MESSAGE` | Displays persistent speech bubble. |
| `think(msg, secs)` | `looks_thinkforsecs` | `MESSAGE`, `SECS` | Displays thought bubble for `secs` seconds and clears it. |
| `think(msg)` | `looks_think` | `MESSAGE` | Displays persistent thought bubble. |
| `switch_costume(name)` | `looks_switchcostumeto` | `COSTUME` (`looks_costume` menu or expr) | Accepts costume name (default `"costume1"`, `"costume2"`, `"star"`), `"next costume"`, `"previous costume"`, `"random costume"`, 1-based index, or expression. |
| `next_costume()` | `looks_nextcostume` | — | Cycles to the next costume in `target.costumes`. |
| `switch_backdrop(name)` | `looks_switchbackdropto` | `BACKDROP` (`looks_backdrops` menu or expr) | Built-in backdrops: `"space_bg"`, `"level_2"`, `"grid_bg"`. Also supports `"next backdrop"`, `"previous backdrop"`, `"random backdrop"`, or 1-based index. Triggers `@when_backdrop_switches`. |
| `switch_backdrop_and_wait(name)` | `looks_switchbackdroptoandwait` | `BACKDROP` (`looks_backdrops` menu or expr) | Switches backdrop and awaits completion of all `@when_backdrop_switches` handlers. |
| `next_backdrop()` | `looks_nextbackdrop` | — | Cycles to the next backdrop and triggers `@when_backdrop_switches`. |
| `go_to_layer(layer)` | `looks_gotofrontback` | Field `FRONT_BACK`: `"front"` \| `"back"` | Moves sprite to the frontmost or backmost `layerOrder`. |
| `change_layer(dir, num)` | `looks_goforwardbackwardlayers` | Field `FORWARD_BACKWARD`: `"forward"` \| `"backward"`, input `NUM` | Shifts sprite `num` layers forward or backward in `layerOrder`. |
| `set_size(pct)` | `looks_setsizeto` | `SIZE` | Sets sprite scale percentage (`5..500` in `StagePreview`). |
| `change_size(delta)` | `looks_changesizeby` | `CHANGE` | Changes sprite scale by `delta` (`5..500` clamped in `StagePreview`). |
| `set_effect(effect, val)` | `looks_seteffectto` | Field `EFFECT` (uppercased), input `VALUE` | Compiles uppercase (`COLOR`, `GHOST`, `BRIGHTNESS`, `PIXELATE`, `MOSAIC`, `FISHEYE`, `WHIRL`); decompiles lowercase. |
| `change_effect(effect, delta)` | `looks_changeeffectby` | Field `EFFECT` (uppercased), input `CHANGE` | `StagePreview` renders `color` (`hue-rotate`), `ghost` (`globalAlpha`), `brightness`, `pixelate`, and `mosaic` (including on Stage backdrop). `fisheye` and `whirl` compile/decompile without Canvas warping. |
| `clear_effects()` | `looks_cleargraphiceffects` | — | Resets all graphic effects to `0`. |
| `show()` | `looks_show` | — | Makes sprite visible (`visible = true`). |
| `hide()` | `looks_hide` | — | Hides sprite (`visible = false`). |

### Reporters

| Python DSL | Scratch 3.0 Opcode | Fields | Notes |
| --- | --- | --- | --- |
| `size()` | `looks_size` | — | Current sprite scale percentage. |
| `costume_number()` | `looks_costumenumbername` | `NUMBER_NAME: ["number", null]` | 1-based costume index. |
| `costume_name()` | `looks_costumenumbername` | `NUMBER_NAME: ["name", null]` | Active costume name. |
| `backdrop_number()` | `looks_backdropnumbername` | `NUMBER_NAME: ["number", null]` | 1-based backdrop index. |
| `backdrop_name()` | `looks_backdropnumbername` | `NUMBER_NAME: ["name", null]` | Active backdrop name. |

```python
@when_flag_clicked
def intro():
    switch_backdrop_and_wait("space_bg")
    go_to_layer("front")
    change_layer("backward", 1)
    switch_costume("costume1")
    show()
    set_size(120)
    say(join("Backdrop: ", backdrop_name()), 2)
    set_effect("color", 35)
    set_effect("ghost", 25)
```

---

## 7. Sound (`sound_*`)

### Statements & Reporter

| Python DSL | Scratch 3.0 Opcode | Inputs / Fields | Notes |
| --- | --- | --- | --- |
| `play_sound(name)` | `sound_play` | `SOUND_MENU` (`sound_sounds_menu` or expr) | Default assets include `"pop"` and `"laser"`. Plays without waiting. |
| `play_sound_until_done(name)` | `sound_playuntildone` | `SOUND_MENU` (`sound_sounds_menu` or expr) | Plays sound and awaits actual playback `onended` completion. |
| `stop_all_sounds()` | `sound_stopallsounds` | — | Stops all active Web Audio sound sources immediately. |
| `set_sound_effect(eff, val)` | `sound_seteffectto` | Field `EFFECT` (`"PITCH"` \| `"PAN"`), input `VALUE` | Sets sound effect (`pitch` clamped `-360..360`, `pan` clamped `-100..100` in `StagePreview`). |
| `change_sound_effect(eff, delta)` | `sound_changeeffectby` | Field `EFFECT` (`"PITCH"` \| `"PAN"`), input `VALUE` | Adjusts `pitch` or `pan` effect by `delta`. |
| `clear_sound_effects()` | `sound_cleareffects` | — | Resets `pitch` and `pan` effects to `0`. |
| `set_volume(pct)` | `sound_setvolumeto` | `VOLUME` | Sets actor volume (`0..100` in `StagePreview`), connected to Web Audio `GainNode`. |
| `change_volume(delta)` | `sound_changevolumeby` | `VOLUME` | Adjusts actor volume (`0..100` clamped). |
| `volume()` | `sound_volume` | — | Reporter returning current actor volume. |

> **Simulator note**: `StagePreview` decodes real `.wav` and `.mp3` buffers from `assetsMap` via `AudioContext.decodeAudioData` (routing through `GainNode` for `volume`, `StereoPannerNode` for `pan`, and `playbackRate` for `pitch`), falling back to Web Audio oscillator synthesis if an asset buffer is absent. `.sb3` exports bundle valid procedural PCM `.wav` assets (`pop`, `laser`) and any uploaded `.wav`/`.mp3` sounds.

```python
@when_flag_clicked
def audio_demo():
    set_volume(80)
    set_sound_effect("pitch", 20)
    change_sound_effect("pan", -25)
    play_sound_until_done("pop")
    clear_sound_effects()
    play_sound("laser")
```

---

## 8. Pen Extension (`pen_*`)

Using any `pen_*` statement automatically flags `usesPen = true` and appends `"pen"` to `projectJson.extensions` in `.sb3` exports.

| Python DSL | Scratch 3.0 Opcode | Inputs | Notes |
| --- | --- | --- | --- |
| `pen_clear()` | `pen_clear` | — | Clears all pen strokes and stamps from the stage pen layer. |
| `pen_stamp()` | `pen_stamp` | — | Stamps the sprite's current costume onto the pen layer. |
| `pen_down()` | `pen_penDown` | — | Stamps a dot at the current position (as in Scratch) and enables continuous line drawing as the sprite moves/glides. |
| `pen_up()` | `pen_penUp` | — | Lifts the pen to stop drawing while moving. |
| `set_pen_color(color)` | `pen_setPenColorToColor` | `COLOR` | Hex color string (e.g., `"#00ffcc"`) compiles as Scratch color shadow type `9` and syncs `actor.penHsl`. |
| `set_pen_param(param, val)` | `pen_setPenColorParamTo` | `COLOR_PARAM` (`pen_menu_colorParam` or expr), `VALUE` | Supports `"color"`, `"saturation"`, `"brightness"`, and `"transparency"` in both `.sb3` and `StagePreview` (`penHsl`). |
| `change_pen_param(param, delta)` | `pen_changePenColorParamBy` | `COLOR_PARAM` (`pen_menu_colorParam` or expr), `VALUE` | Increments pen color/saturation/brightness/transparency in both `.sb3` and `StagePreview`. |
| `set_pen_size(size)` | `pen_setPenSizeTo` | `SIZE` | Sets stroke width in pixels (`>= 1` in `StagePreview`). |
| `change_pen_size(delta)` | `pen_changePenSizeBy` | `SIZE` | Adjusts stroke width (`>= 1` clamped in `StagePreview`). |

```python
@when_flag_clicked
def draw_square():
    pen_clear()
    set_pen_color("#38bdf8")
    set_pen_size(3)
    pen_down()
    for i in range(4):
        move(80)
        turn_right(90)
    pen_up()
    pen_stamp()
```

---

## 9. Sensing (`sensing_*`)

### Statements & Reporters

| Python DSL | Scratch 3.0 Opcode | Inputs / Fields | Notes |
| --- | --- | --- | --- |
| `ask(question)` | `sensing_askandwait` | `QUESTION` | Shows speech bubble + inline prompt overlay in `StagePreview` and pauses until submitted. |
| `answer()` | `sensing_answer` | — | Returns the most recent answer submitted to `ask()`. |
| `touching(target)` | `sensing_touchingobject` | `TOUCHINGOBJECTMENU` (`sensing_touchingobjectmenu` or expr) | `"edge"` -> `"_edge_"`, `"mouse"` -> `"_mouse_"`, `"SpriteName"`, or expression. |
| `touching_color(color)` | `sensing_touchingcolor` | `COLOR` (color shadow `9` or expr) | Checks rendered Canvas 2D pixel region around actor in `StagePreview` (`±16` RGB tolerance). |
| `color_is_touching_color(c1, c2)` | `sensing_coloristouchingcolor` | `COLOR`, `COLOR2` | Checks adjacent pixel pairs (`±2px` neighborhood) matching `c1` and `c2` in `StagePreview`. |
| `set_drag_mode(mode)` | `sensing_setdragmode` | Field `DRAG_MODE`: `"draggable"` \| `"not draggable"` | Enables or disables live pointer dragging on the Canvas stage in `StagePreview`. |
| `distance_to(target)` | `sensing_distanceto` | `DISTANCETOMENU` (`sensing_distancetomenu` or expr) | `"mouse"` -> `"_mouse_"`, `"SpriteName"`, or expression. Returns rounded Euclidean distance. |
| `attribute_of(attr, target)` | `sensing_of` | Field `PROPERTY`, input `OBJECT` (`sensing_of_object_menu` or expr) | Reads `"x position"`, `"y position"`, `"direction"`, `"costume #"`, `"costume name"`, `"size"`, `"volume"`, `"backdrop #"`, `"backdrop name"`, sprite-local variables, or global Stage variables (`"Stage"` -> `"_stage_"`). |
| `key_pressed(key)` | `sensing_keypressed` | `KEY_OPTION` (`sensing_keyoptions` or expr) | Accepts `"space"`, `"up arrow"`, `"down arrow"`, `"left arrow"`, `"right arrow"`, `"enter"`, `"any"`, letters/digits, or an expression. |
| `mouse_x()` | `sensing_mousex` | — | Stage mouse X coordinate (`-240..240`). |
| `mouse_y()` | `sensing_mousey` | — | Stage mouse Y coordinate (`-180..180`). |
| `mouse_down()` | `sensing_mousedown` | — | Boolean: `true` while mouse button is pressed on the stage canvas. |
| `timer()` | `sensing_timer` | — | Seconds elapsed since run start or last `reset_timer()`. |
| `reset_timer()` | `sensing_resettimer` | — | Resets the stage timer to `0`. |
| `current_time(unit)` | `sensing_current` | Field `CURRENTMENU` (uppercased) | Units: `"year"`, `"month"` (`1..12`), `"date"`, `"dayofweek"` (`1=Sun..7=Sat`), `"hour"`, `"minute"`, `"second"`. (`StagePreview` also accepts `current(unit)`). |
| `days_since_2000()` | `sensing_dayssince2000` | — | Fractional UTC days elapsed since `2000-01-01T00:00:00Z`. |
| `username()` | `sensing_username` | — | Returns `"player"` in `StagePreview`. |
| `loudness()` | `sensing_loudness` | — | Compiles/decompiles cleanly; returns `0` in `StagePreview`. |

```python
@when_flag_clicked
def quiz():
    reset_timer()
    set_drag_mode("draggable")
    ask("What is your name?")
    say(join("Hello, ", answer()), 2)
```

---

## 10. Variables & Lists (`data_*`)

### Variables

| Python DSL | Scratch 3.0 Opcode | Fields / Inputs | Notes |
| --- | --- | --- | --- |
| `var = expr` | `data_setvariableto` | Field `VARIABLE`, input `VALUE` | Sets global Stage variable value. |
| `self.var = expr` | `data_setvariableto` | Field `VARIABLE` (sprite-owned ID), input `VALUE` | Sets sprite-local ("For this sprite only") variable; isolated per clone in `StagePreview`. |
| `var += expr` / `self.var += expr` | `data_changevariableby` | Field `VARIABLE`, input `VALUE` | Increments global or sprite-local variable by `expr`. |
| `var -= expr` / `self.var -= expr` | `data_changevariableby` | Field `VARIABLE`, input `VALUE` | Negates numeric literal directly (`-25`) or wraps `expr` in `operator_subtract(0, expr)`. |
| `var *= expr` / `self.var *= expr` | `data_setvariableto` + `operator_multiply` | Field `VARIABLE`, `VALUE` = `var * expr` | Desugared at parse time into assignment with multiplication. |
| `var /= expr` / `self.var /= expr` | `data_setvariableto` + `operator_divide` | Field `VARIABLE`, `VALUE` = `var / expr` | Desugared at parse time into assignment with division. |
| `show_variable(v)` / `hide_variable(v)` | `data_showvariable` / `data_hidevariable` | Field `VARIABLE` | Pass `"name"` for global or `self.var` for sprite-local. Updates `visibleMonitors`/`hiddenMonitors` in `StagePreview`. The compiler also adds a hidden monitor entry (`visible: false`, `mode: "default"`, `opcode: "data_variable"`, `params.VARIABLE`, `spriteName` = `null` for globals or the sprite name for `self.var`, default position `x: 5`, `y: 5 + 26·n`) to `projectJson.monitors`, keyed by the variable id; existing monitors are never modified, and monitors of variables removed by the orphan cleanup are deleted. In the IDE, shown variables appear as Scratch-style monitors on top of the stage (`default`, `large` and interactive `slider` modes from imported projects are honoured); a sprite-local monitor always shows that sprite's own value. |

### Lists (1-Based Indexing)

Every global `list_*` helper has a sprite-local counterpart `local_list_*` that stores the list in `target.lists` ("For this sprite only") and isolates data per clone in `StagePreview`.

| Python DSL | Local Variant | Scratch 3.0 Opcode | Fields / Inputs | Notes |
| --- | --- | --- | --- | --- |
| — | `local_list(name)` | *(declaration only)* | — | Registers `name` in `target.lists` without emitting a block; subsequent `list_*(name, ...)` calls in that sprite also bind locally. |
| `list_add(list, item)` | `local_list_add(list, item)` | `data_addtolist` | Field `LIST`, input `ITEM` | Appends `item` to the end of `list`. |
| `list_delete(list, index)` | `local_list_delete(list, index)` | `data_deleteoflist` | Field `LIST`, input `INDEX` | Removes element at 1-based `index` (`"last"`, `"random"`, `"all"` supported in `StagePreview`). |
| `list_clear(list)` | `local_list_clear(list)` | `data_deletealloflist` | Field `LIST` | Clears all items from `list`. |
| `list_insert(list, index, item)` | `local_list_insert(list, index, item)` | `data_insertatlist` | Field `LIST`, inputs `INDEX`, `ITEM` | Inserts `item` at 1-based `index` (`"last"`, `"random"` supported in `StagePreview`). |
| `list_replace(list, index, item)` | `local_list_replace(list, index, item)` | `data_replaceitemoflist` | Field `LIST`, inputs `INDEX`, `ITEM` | Replaces element at 1-based `index` (`"last"`, `"random"`, `"all"` supported in `StagePreview`). |
| `list_item(list, index)` | `local_list_item(list, index)` | `data_itemoflist` | Field `LIST`, input `INDEX` | Reporter returning element at 1-based `index` (`"last"`, `"random"`, `"all"` supported; `""` if out of bounds). |
| `list_length(list)` | `local_list_length(list)` | `data_lengthoflist` | Field `LIST` | Reporter returning number of items in `list`. |
| `list_contains(list, item)` | `local_list_contains(list, item)` | `data_listcontainsitem` | Field `LIST`, input `ITEM` | Boolean reporter checking whether `list` contains `item` (case-insensitive). |
| `list_index_of(list, item)` | `local_list_index_of(list, item)` | `data_itemnumoflist` | Field `LIST`, input `ITEM` | Reporter returning 1-based index of `item` in `list` (`0` if not found). |
| `show_list(list)` / `hide_list(list)` | — | `data_showlist` / `data_hidelist` | Field `LIST` | Updates `visibleMonitors`/`hiddenMonitors` in `StagePreview` (works with local lists declared via `local_list(list)`). Adds a hidden `data_listcontents` monitor (`mode: "list"`) to `projectJson.monitors` exactly like `show_variable`. The IDE's variable watch panel hides names that are hidden this way; shown lists appear as scrollable list monitors on the stage. |

> **Note**: The first argument (`list`) to all `list_*` / `local_list_*` functions should be a string literal naming the Scratch list (e.g., `"inventory"`).

```python
@when_flag_clicked
def inventory_demo():
    self.hp = 100
    self.hp -= 25
    local_list("bag")
    local_list_add("bag", "key")
    local_list_insert("bag", 1, "map")
    local_list_replace("bag", 2, "golden_key")
    if local_list_contains("bag", "golden_key"):
        idx = local_list_index_of("bag", "golden_key")
        say(join("Key at slot: ", idx), 2)
```

---

## 11. Operators & Math (`operator_*`)

### Arithmetic, Comparisons & Boolean Logic

| Python DSL | Scratch 3.0 Opcode | Notes |
| --- | --- | --- |
| `a + b` | `operator_add` | Addition (`NUM1`, `NUM2`). |
| `a - b` | `operator_subtract` | Subtraction (`NUM1`, `NUM2`). |
| `-expr` | Negative literal or `operator_subtract(0, expr)` | Numeric literals fold directly (e.g., `-5`); non-literal expressions compile to `0 - expr` and decompile back to `-expr`. |
| `a * b` | `operator_multiply` | Multiplication (`NUM1`, `NUM2`). |
| `a / b` | `operator_divide` | Division (`NUM1`, `NUM2`). Always true division; division by zero yields `Infinity`/`NaN` and never an error. |
| `a // b` | `operator_mathop` (`floor`) + `operator_divide` | Desugared at parse time to `floor(a / b)`; division by zero gives `Infinity`/`NaN` (Python would raise). |
| `a % b` | `operator_mod` | Modulo (`NUM1`, `NUM2`). |
| `a == b` | `operator_equals` | Equality (`OPERAND1`, `OPERAND2`). |
| `a < b` | `operator_lt` | Less than (`OPERAND1`, `OPERAND2`). |
| `a > b` | `operator_gt` | Greater than (`OPERAND1`, `OPERAND2`). |
| `a != b` | `operator_not` + `operator_equals` | Compiles via negation; reconstructed cleanly as `(a != b)` by `decompiler.js`. |
| `a <= b` | `operator_not` + `operator_gt` | Compiles via negation; reconstructed cleanly as `(a <= b)` by `decompiler.js`. |
| `a >= b` | `operator_not` + `operator_lt` | Compiles via negation; reconstructed cleanly as `(a >= b)` by `decompiler.js`. |
| `a and b` | `operator_and` | Logical conjunction (`OPERAND1`, `OPERAND2`). |
| `a or b` | `operator_or` | Logical disjunction (`OPERAND1`, `OPERAND2`). |
| `not a` | `operator_not` | Logical negation (`OPERAND`). |

### String, Random & Rounding Reporters

| Python DSL | Scratch 3.0 Opcode | Inputs | Notes |
| --- | --- | --- | --- |
| `random(a, b)` | `operator_random` | `FROM`, `TO` | Same rule as Scratch: a random **integer** between `a` and `b` inclusive when both ends are whole numbers, otherwise a random **decimal** (`random(0.0, 1.0)`, `random(1, 5.5)`). A literal written with a decimal point keeps it in the `.sb3` (`"1.0"`), so `random(1.0, 10)` stays a decimal draw in Scratch too. |
| `join(s1, s2)` | `operator_join` | `STRING1`, `STRING2` | Concatenates two strings/numbers. |
| `letter_of(idx, s)` | `operator_letter_of` | `LETTER`, `STRING` | Returns character at 1-based position `idx`. |
| `length_of(s)` / `len(s)` | `operator_length` | `STRING` | Compiles to `operator_length` and decompiles as `length_of(s)`. (`StagePreview` `len()` also returns `.length` if passed an array value). |
| `contains(s, sub)` | `operator_contains` | `STRING1`, `STRING2` | Case-insensitive substring check. |
| `round(n)` / `round_num(n)` | `operator_round` | `NUM` | Both compile to `operator_round`; decompiles as `round_num(n)`. |

### Math Functions (`operator_mathop`)

| Python DSL | `OPERATOR` Field | Decompiles To | `StagePreview` Support |
| --- | --- | --- | --- |
| `abs(n)` | `"abs"` | `abs(n)` | Supported |
| `floor(n)` | `"floor"` | `floor(n)` | Supported |
| `ceil(n)` / `ceiling(n)` | `"ceiling"` | `ceil(n)` | Supported |
| `sqrt(n)` | `"sqrt"` | `sqrt(n)` | Supported |
| `sin(n)` | `"sin"` | `sin(n)` | Supported (degrees) |
| `cos(n)` | `"cos"` | `cos(n)` | Supported (degrees) |
| `tan(n)` | `"tan"` | `tan(n)` | Supported (degrees) |
| `asin(n)` | `"asin"` | `asin(n)` | Supported (returns degrees) |
| `acos(n)` | `"acos"` | `acos(n)` | Supported (returns degrees) |
| `atan(n)` | `"atan"` | `atan(n)` | Supported (returns degrees) |
| `ln(n)` | `"ln"` | `ln(n)` | Supported (natural log) |
| `log(n)` | `"log"` | `log(n)` | Supported (base-10 log) |
| `exp(n)` | `"e ^"` | `exp(n)` | Supported (`Math.exp(n)`) |
| `pow10(n)` | `"10 ^"` | `pow10(n)` | Supported (`Math.pow(10, n)`) |
| `math_op(op, n)` | `op` | Direct alias above (or `math_op(op, n)` if unknown) | All 14 Scratch `operator_mathop` operations supported |

```python
@when_flag_clicked
def math_demo():
    angle = 45
    dx = round_num(cos(angle) * 100)
    dy = round_num(sin(angle) * 100)
    steps = 17 // 3
    if (dx >= 70) and not (steps == 0):
        say(join("Target X: ", dx), 2)
```

---

## 12. Music Extension (`music_*`)

Using any music block appends `"music"` to `projectJson.extensions` (and removes it again when no target uses `music_*` any more). Drum, note and instrument arguments accept a number literal (placed into the menu shadow block) or any reporter expression (plugged over a default menu shadow). A non-numeric text literal is a `CompileError`.

| Python DSL | Scratch 3.0 Opcode | Inputs | Notes |
| --- | --- | --- | --- |
| `play_drum(drum, beats)` | `music_playDrumForBeats` | `DRUM` (shadow `music_menu_DRUM`, field `DRUM`), `BEATS` | `drum` is `1`–`18` (1 snare, 2 bass, 3 side stick, 4 crash, 5 open hi-hat, 6 closed hi-hat, 7 tambourine, 8 hand clap, 9 claves, 10 wood block, 11 cowbell, 12 triangle, 13 bongo, 14 conga, 15 cabasa, 16 guiro, 17 vibraslap, 18 cuica). |
| `rest(beats)` | `music_restForBeats` | `BEATS` | Silent wait. |
| `play_note(note, beats)` | `music_playNoteForBeats` | `NOTE` (shadow block `note`, field `NOTE`), `BEATS` | `note` is a MIDI number (`60` = middle C, clamped to `0`–`130` in `StagePreview`). |
| `set_instrument(n)` | `music_setInstrument` | `INSTRUMENT` (shadow `music_menu_INSTRUMENT`, field `INSTRUMENT`) | `1`–`21` (piano, electric piano, organ, guitar, electric guitar, bass, pizzicato, cello, trombone, clarinet, saxophone, flute, wooden flute, bassoon, choir, vibraphone, music box, steel drum, marimba, synth lead, synth pad). Per sprite. |
| `set_tempo(bpm)` | `music_setTempo` | `TEMPO` | Beats per minute; clamped to `20`–`500` in `StagePreview`. |
| `change_tempo(delta)` | `music_changeTempo` | `TEMPO` | Adds `delta` to the tempo (same clamp). |
| `tempo()` | `music_getTempo` | — | Reporter: current tempo (default `60`). |

> **Simulator note**: `StagePreview` plays notes with a Web Audio oscillator (the waveform depends on the instrument) and drums with oscillators / filtered noise, scaled by the sprite volume. The mute toggle silences them, but the script still waits `beats × 60 / tempo` seconds like in Scratch. Without Web Audio (headless tests) only the waiting happens. `stop` cancels pending waits.

```python
@when_flag_clicked
def melody():
    set_instrument(4)
    set_tempo(120)
    for i in range(4):
        play_note(60 + i * 2, 0.5)
    rest(0.5)
    play_drum(2, 0.25)
```

---

## 13. Text to Speech & Translate (`text2speech_*`, `translate_*`)

Using these blocks appends `"text2speech"` / `"translate"` to `projectJson.extensions` (removed again when unused). They work on sprites and on the Stage.

| Python DSL | Scratch 3.0 Opcode | Inputs | Notes |
| --- | --- | --- | --- |
| `speak(text)` | `text2speech_speakAndWait` | `WORDS` | Speaks `text` and waits until it is finished. |
| `set_voice(voice)` | `text2speech_setVoice` | `VOICES` (shadow `text2speech_menu_voices`, field `voices`) | `"alto"` (default), `"tenor"`, `"squeak"`, `"giant"`, `"kitten"` (case-insensitive, stored upper-case, decompiled lower-case); other literals are a `CompileError`. |
| `set_language(lang)` | `text2speech_setLanguage` | `LANGUAGE` (shadow `text2speech_menu_languages`, field `languages`) | Scratch language code such as `"en"`, `"es"`, `"ru"`, `"zh-cn"`, `"pt-br"` (not validated). |
| `translate(text, lang)` | `translate_getTranslate` | `WORDS`, `LANGUAGE` (shadow `translate_menu_languages`, field `languages`) | Reporter returning the translated text. |
| `language()` | `translate_getViewerLanguage` | — | Reporter: the viewer's language code. |

> **Simulator note**: `speak()` uses the browser's `speechSynthesis` (pitch / rate follow the voice, `lang` follows `set_language`) and waits for the end of the utterance; it is skipped when the mute toggle is on or the browser has no speech synthesis. There is no network access: `translate(text, lang)` returns `text` **unchanged** and `language()` returns `"en"` in `StagePreview` (real translation only happens in Scratch).

```python
@when_flag_clicked
def talk():
    set_voice("kitten")
    set_language("es")
    speak("Hola")
    say(translate("Hello", "es"), 2)
```

---

## 14. Browser IDE URL Query Parameters

The web application ([`index.html`](../index.html) / [`js/app.js`](../js/app.js)) parses `window.location.search` on startup to support iframe embeds, lesson deep-links, and shareable programs:

| Query Parameter | Accepted Values | Effect |
| --- | --- | --- |
| `embed` | `1` or `true` | Adds `embed-mode` class to `document.body`, hiding the template bar, quick-insert command palette, brand subtitle, and reset button for compact iframe embedding. |
| `snippet` | `hexagon`, `functions`, `arrows`, `clones`, `quiz`, `levels`, `pong`, `maze`, `clicker` | Loads the specified built-in template into the active sprite editor on startup, with comments and phrases in the page language (defaults to `hexagon` if omitted or unknown). |
| `code` | `<base64url>` | Decodes UTF-8 Base64URL-encoded Python DSL code into the active sprite editor (overrides `snippet`). Produced by clicking **Share / Поділитися** (`#btn-share`). |
| `autorun` | `1` or `true` | Automatically compiles all targets and clicks `#btn-run` on startup (skipped if `code` failed to decode). |

Example embed URL:

```text
https://sivochka.com/pyScratch/?embed=1&snippet=clones&autorun=1
```

Without `embed`, `snippet` or `code`, the IDE reopens the pupil's last project from the browser: the code of every sprite (`localStorage`, key `pyscratch_autosave_v1`) and a full snapshot of `project.json` with costumes and sounds (IndexedDB database `pyscratch_autosave`). Switching the page language saves the draft first and reopens it on the other language page. `?embed=1` never reads or writes the draft.
