# Changelog

All notable changes to **pyScratch** are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [Semantic Versioning](https://semver.org/).
Every update to the repository must bump the version in `package.json` and `js/sb3Bridge.js` (`meta.agent`) and record an entry here so builds are easy to track across lessons and releases.

## [1.3.0] - 2026-11-20

### Added
- **LocalStorage Autosave & Unsaved Guard (`js/app.js`, `js/i18n.js`)**: Automatically saves active project scripts to `localStorage` (`pyscratch_autosave_v1`, 500 ms debounce + `pagehide`/`beforeunload` flush), restores drafts on reload (unless `?embed=1`, `?code=`, or `?snippet=` is specified), and prompts before leaving with unsaved edits or resetting a dirty template.
- **Full-Project Autosave in IndexedDB (`js/app.js`)**: Alongside the `localStorage` code draft, a snapshot of `project.json` plus all costumes and sounds is kept in IndexedDB (`pyscratch_autosave`), so a reload also restores sprite positions/sizes, added sprites, uploaded costumes/sounds/backdrops and an opened `.sb3` file. Uploading assets now marks the project as changed, and an opened `.sb3` is snapshotted immediately. The full restore never overwrites work typed before IndexedDB answers.
- **Smart Palette Insertion (`js/app.js`)**: A palette chip lands on its own line with the indentation of the surrounding script (one level deeper after a `:` line) instead of being glued to the code at the caret; `@hat`/`def` chips go to column 0 after the end of the current script so they never split it; reporters clicked inside an argument (`goto(|0, 0)`) replace the literal under the caret.
- **Delete Sprite Confirmation (`js/app.js`, `js/i18n.js`)**: Deleting a sprite now requires explicit confirmation via localized `confirm()` in `uk`, `en`, and `ru`.
- **Editable Stage Telemetry (`index.html`, `en/`, `ru/`, `style.css`, `js/app.js`, `js/layout.js`)**: `X`, `Y`, `Size`, and `Direction` under the stage are now directly editable `<input type="number">` fields with focus-guard during 60 FPS playback, `Enter`/`Escape` handling, and automatic disabling when the Stage is selected.
- **Localized Palette Tooltips (`js/i18n.js`)**: Every command chip across all 13 palette categories now displays a localized `title` tooltip explaining what the command does in `uk`, `en`, and `ru`.
- **Stage Fullscreen Mode (`index.html`, `en/`, `ru/`, `style.css`, `js/layout.js`)**: Added a fullscreen stage toggle button (`#btn-stage-fullscreen`) with `Esc` exit and responsive stage scaling.
- **Live On-Stage Monitors & Sliders (`index.html`, `en/`, `ru/`, `style.css`, `js/preview.js`, `js/app.js`)**: Renders visible `projectJson.monitors` and runtime `show_variable` / `show_list` overlays directly over the 480×360 stage (`default`, `large`, interactive `slider`, and scrollable `list` modes) with collision-free auto-placement (`layoutMonitors`) and diffed DOM updates.
- **Tests (`test/test_roundtrip.js`)**: Added Suite 15 covering float/int `random()`, `bitmapResolution` scaling, 15 px Scratch stage fencing, on-stage monitor layout & slider updates, and 3-locale HTML + palette tooltip coverage. The test suite now has 15 sections.

### Fixed
- **Native Undo (`Ctrl+Z`) After Palette Clicks (`js/app.js`, `js/layout.js`)**: Palette chip insertions, `Tab`, and auto-indented `Enter` now go through `replaceEditorRange` (`execCommand('insertText')` with `setRangeText` fallback) while preserving cursor selection on `mousedown`, keeping the browser's native Undo stack intact.
- **Floating-Point `random(a, b)` (`js/compiler.js`, `js/preview.js`)**: Preserves decimal literals (`0.0`, `1.0`) in AST and `.sb3` output and matches `scratch-vm` float vs. integer random semantics.
- **HiDPI `bitmapResolution` Scaling (`js/preview.js`)**: Costumes with `bitmapResolution > 1` are now scaled by `1 / bitmapResolution` in both rendering and bounding-box sizing.
- **Scratch 3.0 Stage Fencing (`js/preview.js`)**: `moveActorTo()` now keeps at least a 15 px visible margin of the sprite costume inside the 480×360 stage instead of hard-clamping sprite centers to ±240/±180.

- **Review fixes before release (`js/compiler.js`, `js/preview.js`, `js/app.js`)**: double negation of a float literal (`- -2.0`) no longer writes `"--2.0"` (read by Scratch as 0) into the `.sb3`; `if_on_edge_bounce` clamps the sprite half-size to the stage so sprites bigger than the stage no longer jitter; `pen_down()` stamps a dot like Scratch; focusing and leaving the X/Y/Size/Direction fields without an edit no longer freezes the live runtime position into the project; the IndexedDB snapshot is written even when `localStorage` is blocked and is skipped on restore when a newer draft exists; on-stage monitors of sprite-local variables show that sprite's value instead of the selected sprite's; Tab and Enter auto-indent keep plain insertion (smart placement applies only to palette/doc clicks), and command chips never land inside an argument.

## [1.2.3] - 2026-11-18

### Fixed
- **Guide & FAQ (`index.html`, `ru/`)**: Scratch 3.0 shows "Load from your computer" untranslated in every locale (scratch-gui shared message without l10n), so the uk/ru guide and FAQ now quote it as-is instead of an invented translation.

## [1.2.2] - 2026-11-18

### Fixed
- **Guide (`index.html`)**: the Scratch 3.0 menu item is quoted with its real Ukrainian label «Файл → Вивантажити на ваш комп’ютер».

## [1.2.1] - 2026-11-18

### Added
- **Page heading (`index.html`, `en/`, `ru/`)**: the menu-bar tagline is now a localized, keyword-bearing `<h1>` that keeps the `pyScratch` brand (uk: "Scratch на Python онлайн", en: "Scratch to Python converter online", ru: "Scratch в Python онлайн"). It no longer uses `data-i18n`, so the page language always wins.
- **Static guide & FAQ below the IDE (`index.html`, `en/`, `ru/`, `style.css`)**: a crawlable, localized section explaining what pyScratch does, how to open an `.sb3` online and convert it to Python step by step, what the DSL supports, its honest limits, privacy (everything runs in the browser) and a 7-question FAQ. The same questions and answers are mirrored as a `FAQPage` node in each page's JSON-LD `@graph`. Hidden in `?embed=1` mode.

### Changed
- **Layout (`style.css`)**: the page can now scroll vertically; the menu bar and IDE still fill exactly the first screen (`.gui` height is `100dvh` minus `--menu-bar-h`). Between 821 px and 1100 px the H1 moves to its own row instead of being hidden.

## [1.2.0] - 2026-11-17

### Added
- **Touching hat (`js/compiler.js`, `js/decompiler.js`, `js/preview.js`)**: `@when_touching("Sprite2" | "edge" | "mouse")` compiles to `event_whentouchingobject` with an `event_touchingobjectmenu` shadow, decompiles back to the same DSL and fires in `StagePreview` on the rising edge of touching.
- **Music extension**: `play_drum`, `rest`, `play_note`, `set_instrument`, `set_tempo`, `change_tempo` and the `tempo()` reporter (`music_*` with `music_menu_DRUM`, `music_menu_INSTRUMENT` and `note` shadows); `"music"` is added to / removed from `projectJson.extensions` automatically. The preview has a small Web Audio synth (oscillator + noise drums) that respects the mute toggle and waits `beats × 60 / tempo` seconds.
- **Text to Speech & Translate extensions**: `speak`, `set_voice`, `set_language`, `translate(text, lang)` and `language()` (`text2speech_*`, `translate_*`). The preview speaks through `speechSynthesis` when available (respecting mute); `translate()` returns the text unchanged because the preview never uses the network.
- **Boolean custom-block arguments**: `def jump(height, flag: bool):` compiles to a `%b` argument with `argument_reporter_boolean`, decompiles back to `flag: bool`, and the preview coerces such arguments to booleans.
- **Monitors**: `show_variable` / `hide_variable` / `show_list` / `hide_list` now keep a hidden monitor entry (id, `data_variable` / `data_listcontents`, sprite binding, default position) in `projectJson.monitors`; the existing orphan cleanup removes them with their variable. The IDE variable watch hides names hidden this way.
- **IDE (`index.html`, `en/`, `ru/`, `js/app.js`, `js/i18n.js`, `style.css`)**: new Music, Text to Speech and Translate palette categories, `@when_touching` and `: bool` palette entries, API reference rows and uk/en/ru labels.
- **Docs (`docs/DSL_REFERENCE.md`)**: new sections 12 (Music) and 13 (Text to Speech & Translate); URL parameters moved to section 14.
- **Tests (`test/test_roundtrip.js`)**: Suite 14 covers compile / decompile / second-round idempotency, extension bookkeeping, monitors and the preview runtime of all Stage 5 blocks; the file now has 14 test sections.

### Changed
- Suite 13 now uses `makeymakey_*` / `videoSensing_*` opcodes as the "DSL cannot express this" examples, because `event_whentouchingobject` and `music_*` are supported blocks now.
- Extension bookkeeping in the compiler is generic (`pen`, `music`, `text2speech`, `translate`) and based on the opcodes present in any target.

## [1.1.0] - 2026-11-17

### Fixed
- **IDE & Snippet Routing (`js/app.js`)**: Switching to a snippet while the Stage tab is active now targets the first sprite instead of overwriting Stage scripts; `.sb3` download `URL.revokeObjectURL` is deferred so Safari/WebKit downloads complete reliably; PNG compression preserves alpha transparency instead of converting transparent costumes to JPEG.
- **Decompiler (`js/decompiler.js`, `js/app.js`)**: Sanitized custom procedure argument reporters to match `def` parameters (`step size` -> `step_size`); added cycle protection in `decompileChain`, `decompileReporter`, and `renderBlocksTree`; quoted non-numeric values in type `4..8` shadows.
- **StagePreview Runtime (`js/preview.js`)**: Fixed `show_variable(self.var)` / `hide_variable(self.var)` monitor name resolution; added `NaN`/non-numeric guards in `moveActorTo`, `_glideToCoords`, turns, and direction updates; closed active `ask()` prompts when `stop("other scripts in sprite")` cancels the asking script.
- **Bridge & i18n (`js/sb3Bridge.js`, `js/i18n.js`)**: Validated non-empty `targets` in `loadSb3`, prevented `assetsMap` from overwriting `project.json` in `saveSb3`, and avoided `$` replacement-pattern corruption in `i18n.t()`.
- **Previous Audit Batch (`d8c4f44`)**: Compiler orphan cleanup (`_pyCompiledOwned`), `while !=` simplification, `when_key_pressed` repeat guard, `stop("all")` `ask()` cleanup, `clearRect`, Scratch-compatible comparisons, WAV chunk `0` handling, and CI Node 22 alignment.

### Added
- **Versioning Policy**: Added mandatory SemVer versioning workflow (`package.json`, `js/sb3Bridge.js`, `CHANGELOG.md`, `CONTRIBUTING.md`, `README.md`).
- **Regression Tests (`test/test_roundtrip.js`)**: Added Suite 11 and Suite 12 covering all reliability audit fixes. The file now has 13 test sections in total.

## [1.0.0] - 2026-11-16

### Added
- Initial public release of pyScratch: bidirectional Python DSL ↔ Scratch 3.0 (`.sb3`) compiler and decompiler, 480×360 Canvas 2D `StagePreview`, `.sb3` ZIP bridge, `.sb3` Inspector & Asset Optimizer, UK/EN/RU localization (`js/i18n.js`), and 9 learning templates (including `pong`, `maze`, and `clicker`).
