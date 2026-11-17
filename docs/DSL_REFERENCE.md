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
- **4-space indentation**: Blocks require consistent 4-space indentation. Tab characters (`\t`) are normalized to 4 spaces during tokenization (`tokenize`). Misaligned dedents throw a `CompileError` pointing to the offending line.
- **Comments**: `#` begins a single-line comment. Empty lines and comments are ignored by the tokenizer.
- **Identifiers**: Supports ASCII `[a-zA-Z0-9_]` and Cyrillic Unicode `[\u0400-\u04FF]` characters (identifiers cannot start with a digit).
- **Reserved keywords**: `def`, `for`, `in`, `while`, `if`, `elif`, `else`, `pass`, `and`, `or`, `not`, `True`, `False`.

### Literals & Negative Literal Folding
- **Numbers**: Integer and floating-point literals (e.g., `10`, `0.25`). Unary `-` applied to a numeric literal (e.g., `-150`) is **constant-folded** at parse time into a negative number AST node (`[1, [4, "-150"]]`) rather than emitting `operator_subtract(0, 150)`. Unary `+` is ignored.
- **Strings**: Single-quoted (`'...'`) or double-quoted (`"..."`), supporting `\n`, `\t`, and escaped quotes/backslashes. Strings matching `/^#[0-9a-fA-F]{6}$/` compile as Scratch color picker inputs (shadow type `9`); all other strings compile as text inputs (shadow type `10`).
- **Booleans**: `True` and `False`. In value slots they serialize as `"true"` / `"false"` (type `10`); in boolean condition slots they compile to `operator_equals("1", "1")` and `operator_equals("1", "0")`.

### Variable, List & Parameter Scoping
- **Global Stage Scope (Default)**: Newly assigned variables and newly referenced lists are registered on the **Stage** target (`Stage.variables` and `Stage.lists`) by default, matching Scratch's "For all sprites" global sharing. When modifying an imported `.sb3` project, pre-existing sprite-local variables/lists on `target` are matched before falling back to `Stage`.
- **Procedure Parameters**: Inside a `def proc(a, b):` body, reading `a` or `b` compiles to `argument_reporter_string_number` instead of a global variable. In `StagePreview`, procedure arguments live in a per-call `localScope` dictionary, while assignments (`x = ...`, `x += ...`) always mutate global `this.vars`.
- **1-Based Indexing**: `list_item`, `list_delete`, `list_insert`, `list_replace`, and `letter_of` use **1-based indexing**, matching Scratch 3.0.

---

## 2. Event Decorators & Broadcasts (`Events` & `Control` Hats)

Event decorators must precede a zero-parameter function (`def name():`).

| Python DSL | Scratch 3.0 Opcode | Fields / Inputs | Notes |
| --- | --- | --- | --- |
| `@when_flag_clicked` | `event_whenflagclicked` | — | Runs when the green flag / **Run** button is triggered. |
| `@when_key_pressed(key)` | `event_whenkeypressed` | Field `KEY_OPTION` (`"space"` default) | Keys: `"space"`, `"up arrow"`, `"down arrow"`, `"left arrow"`, `"right arrow"`, `"enter"`, `"any"`, or single character (`"a"`..`"z"`, `"0"`..`"9"`). |
| `@when_this_sprite_clicked` | `event_whenthisspriteclicked` | — | Compiles to `event_whenstageclicked` if placed in the Stage tab. |
| `@when_stage_clicked` | `event_whenstageclicked` | — | Compiles to `event_whenthisspriteclicked` if placed in a Sprite tab. |
| `@when_backdrop_switches(name)` | `event_whenbackdropswitchesto` | Field `BACKDROP` (`"backdrop1"` default) | Fires when `switch_backdrop(name)` or `next_backdrop()` activates `name`. |
| `@when_message_received(msg)` | `event_whenbroadcastreceived` | Field `BROADCAST_OPTION` (`"message1"` default) | Registers `msg` in Stage `broadcasts`. |
| `@when_cloned` | `control_start_as_clone` | — | Executes inside each newly created clone. |

### Broadcast Statements (`Events`)

| Python DSL | Scratch 3.0 Opcode | Inputs | Notes |
| --- | --- | --- | --- |
| `broadcast(msg)` | `event_broadcast` | `BROADCAST_INPUT` (`[1, [11, msg, bId]]`) | Sends broadcast asynchronously without waiting. |
| `broadcast_and_wait(msg)` | `event_broadcastandwait` | `BROADCAST_INPUT` (`[1, [11, msg, bId]]`) | Sends broadcast and awaits completion of all triggered handlers. |

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
| `name(v1, v2)` | `procedures_call` | `proccode`, `argumentids`, `warp: "false"`; inputs keyed by `paramId` | Statement-only (Scratch custom blocks do not return values). |

```python
def polygon(sides, length):
    for i in range(sides):
        move(length)
        turn_right(360 / sides)

@when_flag_clicked
def main():
    pen_down()
    polygon(6, 70)
    pen_up()
```

---

## 4. Control Flow & Clones (`control_*`)

| Python DSL | Scratch 3.0 Opcode | Inputs / Fields / Mutations | Notes |
| --- | --- | --- | --- |
| `for i in range(n):` | `control_repeat` | `TIMES` (`n`), `SUBSTACK` | Accepts a single count expression `n`. The loop variable identifier (e.g., `i`) is syntax-only and not created in Scratch; decompiles as `for i in range(...):`. |
| `while True:` | `control_forever` | `SUBSTACK` | Infinite loop until stopped or clone deleted. |
| `while not cond:` | `control_repeat_until` | `CONDITION` (`cond`), `SUBSTACK` | Maps directly to Scratch's `repeat until`. |
| `while cond:` | `control_repeat_until` | `CONDITION` (`operator_not(cond)`), `SUBSTACK` | Compiles by wrapping `cond` in `operator_not`. |
| `if cond:` / `elif cond2:` / `else:` | `control_if` / `control_if_else` | `CONDITION`, `SUBSTACK`, `SUBSTACK2` | `elif` compiles as a nested `control_if` / `control_if_else` inside `SUBSTACK2` and is reconstructed back to `elif` on decompilation. |
| `pass` | *(none)* | — | Emits no blocks; generated by the decompiler for empty script bodies. |
| `wait(secs)` | `control_wait` | `DURATION` (`secs`) | Pauses current script for `secs` seconds. |
| `wait_until(cond)` | `control_wait_until` | `CONDITION` (`cond`) | Polls every ~16ms in `StagePreview` until `cond` is truthy. |
| `stop(option)` | `control_stop` | Field `STOP_OPTION`: `"all"`, `"this script"`, or `"other scripts in sprite"`; mutation `hasnext`: `"true"` iff `"other scripts in sprite"` | Defaults to `"all"`. In `StagePreview`, `"this script"` exits only the current script; other options stop the simulation. |
| `create_clone(target)` | `control_create_clone_of` | `CLONE_OPTION` shadow `control_create_clone_of_menu` (`"_myself_"` or sprite name) | Pass `"myself"` (mapped to `"_myself_"`) or a sprite name literal. `StagePreview` caps total actors at 150. |
| `delete_this_clone()` | `control_delete_this_clone` | — | Deletes the current clone and aborts its remaining statements. |

```python
@when_flag_clicked
def main():
    for i in range(4):
        create_clone("myself")
        turn_right(90)
    while not touching("edge"):
        move(5)
        wait(0.05)
    stop("all")

@when_cloned
def burst():
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
| `goto(x, y)` | `motion_gotoxy` | `X`, `Y` | Moves to coordinates `(x, y)` (`x: -240..240`, `y: -180..180`). |
| `goto(target)` | `motion_goto` | `TO` shadow `motion_goto_menu` | Single string literal: `"random"` (`"_random_"`), `"mouse"` (`"_mouse_"`), or `"SpriteName"`. |
| `goto_random()` | `motion_goto` | `TO`: `"_random_"` | Shorthand for `goto("random")`; decompiles as `goto_random()`. |
| `goto_mouse()` | `motion_goto` | `TO`: `"_mouse_"` | Shorthand for `goto("mouse")`; decompiles as `goto_mouse()`. |
| `glide(secs, x, y)` | `motion_glidesecstoxy` | `SECS`, `X`, `Y` | Interpolates position over `secs` seconds (draws pen trail if pen is down). |
| `point_in_direction(dir)` | `motion_pointindirection` | `DIRECTION` | Sets direction in degrees (`0` = up, `90` = right, `180` = down, `-90` = left). |
| `point_towards(target)` | `motion_pointtowards` | `TOWARDS` shadow `motion_pointtowards_menu` | Accepts `"mouse"` (`"_mouse_"`) or `"SpriteName"`. |
| `set_x(x)` | `motion_setx` | `X` | Sets horizontal coordinate. |
| `change_x(dx)` | `motion_changexby` | `DX` | Adds `dx` to `x`. |
| `set_y(y)` | `motion_sety` | `Y` | Sets vertical coordinate. |
| `change_y(dy)` | `motion_changeyby` | `DY` | Adds `dy` to `y`. |
| `if_on_edge_bounce()` | `motion_ifonedgebounce` | — | Reflects direction and clamps sprite inside stage bounds when near edges. |
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
| `switch_costume(name)` | `looks_switchcostumeto` | `COSTUME` (`looks_costume` menu or expr) | Accepts costume name string (default `"costume1"`, `"costume2"`, `"star"`) or expression. |
| `next_costume()` | `looks_nextcostume` | — | Cycles to the next costume in `target.costumes`. |
| `switch_backdrop(name)` | `looks_switchbackdropto` | `BACKDROP` (`looks_backdrops` menu or expr) | Built-in backdrops: `"space_bg"`, `"level_2"`, `"grid_bg"`. Triggers `@when_backdrop_switches`. |
| `next_backdrop()` | `looks_nextbackdrop` | — | Cycles to the next backdrop and triggers `@when_backdrop_switches`. |
| `set_size(pct)` | `looks_setsizeto` | `SIZE` | Sets sprite scale percentage (`5..500` in `StagePreview`). |
| `change_size(delta)` | `looks_changesizeby` | `CHANGE` | Changes sprite scale by `delta` (`5..500` clamped in `StagePreview`). |
| `set_effect(effect, val)` | `looks_seteffectto` | Field `EFFECT` (uppercased), input `VALUE` | E.g. `"color"`. Compiles uppercase for Scratch; decompiles lowercase. |
| `change_effect(effect, delta)` | `looks_changeeffectby` | Field `EFFECT` (uppercased), input `CHANGE` | `StagePreview` visually renders `"color"` (`hue-rotate`); other Scratch effects compile cleanly to `.sb3`. |
| `clear_effects()` | `looks_cleargraphiceffects` | — | Resets graphic effects to `0`. |
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
    switch_backdrop("space_bg")
    switch_costume("costume1")
    show()
    set_size(120)
    say(join("Backdrop: ", backdrop_name()), 2)
    set_effect("color", 35)
```

---

## 7. Sound (`sound_*`)

### Statements & Reporter

| Python DSL | Scratch 3.0 Opcode | Inputs | Notes |
| --- | --- | --- | --- |
| `play_sound(name)` | `sound_play` | `SOUND_MENU` (`sound_sounds_menu` or expr) | Default assets include `"pop"` and `"laser"`. Plays without waiting. |
| `play_sound_until_done(name)` | `sound_playuntildone` | `SOUND_MENU` (`sound_sounds_menu` or expr) | Plays sound and waits until finished (~140ms in `StagePreview`). |
| `stop_all_sounds()` | `sound_stopallsounds` | — | Compiles to `.sb3`; no-op in `StagePreview`. |
| `set_volume(pct)` | `sound_setvolumeto` | `VOLUME` | Sets actor volume (`0..100` in `StagePreview`). |
| `change_volume(delta)` | `sound_changevolumeby` | `VOLUME` | Adjusts actor volume (`0..100` clamped). |
| `volume()` | `sound_volume` | — | Reporter returning current actor volume. |

> **Simulator note**: `StagePreview` synthesizes sounds via the Web Audio API (`sawtooth` sweep if `name` contains `"laser"`, `sine` sweep otherwise), while `.sb3` exports bundle valid procedural PCM `.wav` assets (`pop`, `laser`).

```python
@when_flag_clicked
def audio_demo():
    set_volume(80)
    play_sound_until_done("pop")
    play_sound("laser")
```

---

## 8. Pen Extension (`pen_*`)

Using any `pen_*` statement automatically flags `usesPen = true` and appends `"pen"` to `projectJson.extensions` in `.sb3` exports.

| Python DSL | Scratch 3.0 Opcode | Inputs | Notes |
| --- | --- | --- | --- |
| `pen_clear()` | `pen_clear` | — | Clears all pen strokes and stamps from the stage pen layer. |
| `pen_stamp()` | `pen_stamp` | — | Stamps the sprite's current costume onto the pen layer. |
| `pen_down()` | `pen_penDown` | — | Enables continuous line drawing as the sprite moves/glides. |
| `pen_up()` | `pen_penUp` | — | Lifts the pen to stop drawing while moving. |
| `set_pen_color(color)` | `pen_setPenColorToColor` | `COLOR` | Hex color string (e.g., `"#00ffcc"`) compiles as Scratch color shadow type `9`. |
| `set_pen_param(param, val)` | `pen_setPenColorParamTo` | `COLOR_PARAM` (`pen_menu_colorParam` field `colorParam`), `VALUE` | Compiles/decompiles cleanly to `.sb3` (e.g., `"color"`, `"saturation"`, `"brightness"`, `"transparency"`). Not simulated in `StagePreview`. |
| `change_pen_param(param, delta)` | `pen_changePenColorParamBy` | `COLOR_PARAM` (`pen_menu_colorParam` field `colorParam`), `VALUE` | Compiles/decompiles cleanly to `.sb3`. Not simulated in `StagePreview`. |
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

| Python DSL | Scratch 3.0 Opcode | Inputs | Notes |
| --- | --- | --- | --- |
| `ask(question)` | `sensing_askandwait` | `QUESTION` | Shows speech bubble + inline prompt overlay in `StagePreview` and pauses until submitted. |
| `answer()` | `sensing_answer` | — | Returns the most recent answer submitted to `ask()`. |
| `touching(target)` | `sensing_touchingobject` | `TOUCHINGOBJECTMENU` (`sensing_touchingobjectmenu`) | `"edge"` -> `"_edge_"`, `"mouse"` -> `"_mouse_"`, or `"SpriteName"`. |
| `distance_to(target)` | `sensing_distanceto` | `DISTANCETOMENU` (`sensing_distancetomenu`) | `"mouse"` -> `"_mouse_"`, or `"SpriteName"`. Returns rounded Euclidean distance. |
| `key_pressed(key)` | `sensing_keypressed` | `KEY_OPTION` (`sensing_keyoptions` or expr) | Accepts `"space"`, `"up arrow"`, `"down arrow"`, `"left arrow"`, `"right arrow"`, `"enter"`, `"any"`, letters/digits, or an expression. |
| `mouse_x()` | `sensing_mousex` | — | Stage mouse X coordinate (`-240..240`). |
| `mouse_y()` | `sensing_mousey` | — | Stage mouse Y coordinate (`-180..180`). |
| `mouse_down()` | `sensing_mousedown` | — | Boolean: `true` while mouse button is pressed on the stage canvas. |
| `timer()` | `sensing_timer` | — | Seconds elapsed since run start or last `reset_timer()`. |
| `reset_timer()` | `sensing_resettimer` | — | Resets the stage timer to `0`. |

```python
@when_flag_clicked
def quiz():
    reset_timer()
    ask("What is your name?")
    say(join("Hello, ", answer()), 2)
```

---

## 10. Variables & Lists (`data_*`)

### Variables

| Python DSL | Scratch 3.0 Opcode | Fields / Inputs | Notes |
| --- | --- | --- | --- |
| `var = expr` | `data_setvariableto` | Field `VARIABLE`, input `VALUE` | Sets variable value. Registers new variables on Stage globally. |
| `var += expr` | `data_changevariableby` | Field `VARIABLE`, input `VALUE` | Increments variable by `expr`. |
| `var -= expr` | `data_changevariableby` | Field `VARIABLE`, input `VALUE` | Negates numeric literal directly or wraps `expr` in `operator_subtract(0, expr)`. |
| `var *= expr` | `data_setvariableto` + `operator_multiply` | Field `VARIABLE`, `VALUE` = `var * expr` | Desugared at parse time into assignment with multiplication. |
| `var /= expr` | `data_setvariableto` + `operator_divide` | Field `VARIABLE`, `VALUE` = `var / expr` | Desugared at parse time into assignment with division. |

### Lists (1-Based Indexing)

| Python DSL | Scratch 3.0 Opcode | Fields / Inputs | Notes |
| --- | --- | --- | --- |
| `list_add(list, item)` | `data_addtolist` | Field `LIST`, input `ITEM` | Appends `item` to the end of `list`. |
| `list_delete(list, index)` | `data_deleteoflist` | Field `LIST`, input `INDEX` | Removes element at 1-based `index`. |
| `list_clear(list)` | `data_deletealloflist` | Field `LIST` | Clears all items from `list`. |
| `list_insert(list, index, item)` | `data_insertatlist` | Field `LIST`, inputs `INDEX`, `ITEM` | Inserts `item` at 1-based `index`. |
| `list_replace(list, index, item)` | `data_replaceitemoflist` | Field `LIST`, inputs `INDEX`, `ITEM` | Replaces element at 1-based `index`. |
| `list_item(list, index)` | `data_itemoflist` | Field `LIST`, input `INDEX` | Reporter returning element at 1-based `index` (`""` if out of bounds). |
| `list_length(list)` | `data_lengthoflist` | Field `LIST` | Reporter returning number of items in `list`. |
| `list_contains(list, item)` | `data_listcontainsitem` | Field `LIST`, input `ITEM` | Boolean reporter checking whether `list` contains `item`. |

> **Note**: The first argument (`list`) to all `list_*` functions should be a string literal naming the Scratch list (e.g., `"inventory"`).

```python
@when_flag_clicked
def inventory_demo():
    score = 10
    score += 5
    score -= 2
    score *= 2
    list_clear("bag")
    list_add("bag", "key")
    list_insert("bag", 1, "map")
    list_replace("bag", 2, "golden_key")
    if list_contains("bag", "golden_key"):
        say(join("Items: ", list_length("bag")), 2)
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
| `a / b` | `operator_divide` | Division (`NUM1`, `NUM2`). |
| `a // b` | `operator_mathop` (`floor`) + `operator_divide` | Desugared at parse time to `floor(a / b)`. |
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
| `random(a, b)` | `operator_random` | `FROM`, `TO` | Random integer between `a` and `b` inclusive (in `StagePreview`). |
| `join(s1, s2)` | `operator_join` | `STRING1`, `STRING2` | Concatenates two strings/numbers. |
| `letter_of(idx, s)` | `operator_letter_of` | `LETTER`, `STRING` | Returns character at 1-based position `idx`. |
| `length_of(s)` | `operator_length` | `STRING` | Returns string length. |
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
| `asin(n)` | `"asin"` | `math_op("asin", n)` | `.sb3` compile/decompile only |
| `acos(n)` | `"acos"` | `math_op("acos", n)` | `.sb3` compile/decompile only |
| `atan(n)` | `"atan"` | `math_op("atan", n)` | `.sb3` compile/decompile only |
| `ln(n)` | `"ln"` | `math_op("ln", n)` | `.sb3` compile/decompile only |
| `log(n)` | `"log"` | `math_op("log", n)` | `.sb3` compile/decompile only |
| `math_op(op, n)` | `op` | Direct func (for `abs`, `floor`, `ceil`, `sqrt`, `sin`, `cos`, `tan`) or `math_op(op, n)` | `abs`, `floor`, `ceiling`, `sqrt`, `sin`, `cos` |

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
