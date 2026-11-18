# Changelog

All notable changes to **pyScratch** are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [Semantic Versioning](https://semver.org/).
Every update to the repository must bump the version in `package.json` and `js/sb3Bridge.js` (`meta.agent`) and record an entry here so builds are easy to track across lessons and releases.

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
