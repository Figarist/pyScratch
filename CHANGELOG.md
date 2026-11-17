# Changelog

All notable changes to **pyScratch** are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [Semantic Versioning](https://semver.org/).
Every update to the repository must bump the version in `package.json` and `js/sb3Bridge.js` (`meta.agent`) and record an entry here so builds are easy to track across lessons and releases.

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
