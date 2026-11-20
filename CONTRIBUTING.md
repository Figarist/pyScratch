# Contributing to pyScratch

Welcome to **pyScratch**! Thank you for helping build an open-source, zero-dependency bridge between visual Scratch 3.0 programming and text-based Python.

We welcome pull requests of all sizes—from implementing missing Scratch 3.0 blocks and runtime behaviors in [`TODO.md`](TODO.md) to improving diagnostics, tests, and documentation.

---

## Architecture Overview

`pyScratch` is intentionally **zero-dependency** and runs directly in modern browsers and Node.js without a bundler, transpiler, or build step:

| Component | Purpose |
| --- | --- |
| [`js/compiler.js`](js/compiler.js) | Tokenizes Python DSL source (`tokenize`), parses into an AST (`parse`), emits localized `CompileError` diagnostics, and compiles ASTs into Scratch 3.0 `project.json` blocks, variables, lists, broadcasts, custom procedures, and extensions (`compileToScratch`). |
| [`js/decompiler.js`](js/decompiler.js) | Decompiles Scratch 3.0 `target.blocks` back into 4-space-indented Python DSL (`decompileTarget`) and generates localized block labels for the visual block tree inspector (`formatBlock`, alias `formatBlockUk`). |
| [`js/preview.js`](js/preview.js) | `StagePreview` 480×360 Canvas 2D execution engine supporting multi-sprite ASTs, clones, custom procedures, Pen drawing/stamping, Web Audio synthesis, input sensing, and live telemetry. |
| [`js/sb3Bridge.js`](js/sb3Bridge.js) | Packs and unpacks `.sb3` ZIP archives (`loadSb3`, `saveSb3`), computes RFC 1321 MD5 hashes (`md5`), and generates default SVG costumes/backdrops and procedural `.wav` sounds. |
| [`js/inspector.js`](js/inspector.js) | Analyzes `.sb3` limits (5 MB `project.json`, 10 MB per asset), detects orphan scripts, and removes unused assets. |
| [`js/i18n.js`](js/i18n.js) | Handles UK/EN/RU interface localization, palette tooltips and switching between the `/`, `/en/` and `/ru/` pages. |
| [`js/messages.js`](js/messages.js) | UK/EN/RU message catalog for the core modules: compiler diagnostics, block tree labels, generated code comments and `.sb3` bridge errors (`tr('key', { params })` inside the modules). |
| [`js/app.js`](js/app.js) | Browser IDE controller wiring target tabs, syntax highlighting, error/cursor telemetry, templates (`SNIPPETS` + per-language `SNIPPET_L10N`), autosave, on-stage monitors, API reference (`API_DOCS`), block tree navigation, and `.sb3` file I/O (with [`index.html`](index.html) and [`style.css`](style.css)). |
| [`vendor/jszip.min.js`](vendor/jszip.min.js) | Bundled JSZip (`v3.10.1`) providing offline `.sb3` compression/decompression in both the browser and Node.js. |
| [`test/test_roundtrip.js`](test/test_roundtrip.js) | Automated 16-part Node.js test suite verifying MD5 hashing, assets, DSL compilation, idempotent round-trip decompilation, block labels, `.sb3` ZIP I/O, headless `StagePreview` execution, error diagnostics, reliability regressions, the Stage 5 blocks, runtime parity and UX, and the uk/en/ru message catalog. |

---

## 4-Step Workflow for Adding a Scratch 3.0 Block or Feature

Looking for something to work on? Pick any unchecked `[ ]` item from [`TODO.md`](TODO.md) and follow these four steps:

1. **Add Compilation Support (`js/compiler.js`)**
   - Implement statement, reporter, or hat-decorator parsing and compilation (`compileStmt`, `compileCallStmt`, `compileReporter`, or `compileToScratch`).
   - Emit exact Scratch 3.0 `opcode`, `inputs`, `fields`, shadow blocks/menus, and `mutation` metadata (plus any required `extensions` entries).

2. **Add Decompilation & Block Label (`js/decompiler.js`, `js/messages.js`)**
   - Reconstruct the Python DSL construct in `decompileTarget` (e.g., `decompileChain` / `decompileReporter`) so that compiling and decompiling any supported script is **100% round-trip idempotent**.
   - Add an inspector label for the opcode in `formatBlockUk` as `tr('blk_…', { … })` and put the text for **all three languages** (`uk`, `en`, `ru`) into [`js/messages.js`](js/messages.js). New compiler errors work the same way (`tr('err_…')`). Never hard-code user-facing text in the core modules: test section 16 fails on Cyrillic strings in `compiler.js`, `decompiler.js` or `sb3Bridge.js` and on keys missing in any language.

3. **Add Runtime Simulation Behavior (`js/preview.js`)**
   - Implement the matching runtime behavior inside `StagePreview` so the 480×360 Canvas 2D stage simulator matches Scratch 3.0 semantics (including sprite/clone state, layering, rendering, audio, or sensing as needed).

4. **Add Tests & Update Docs (`test/test_roundtrip.js`, `docs/DSL_REFERENCE.md`, `TODO.md`)**
   - Add both round-trip (`Python -> .sb3 -> Python -> .sb3`) and `StagePreview` execution assertions to `test/test_roundtrip.js`.
   - Run the test suite and confirm all suites pass:
     ```bash
     npm test
     # or:
     node test/test_roundtrip.js
     ```
   - Document the new syntax, arguments, and opcode mapping in [`docs/DSL_REFERENCE.md`](docs/DSL_REFERENCE.md) and mark the implemented item(s) `[x]` in [`TODO.md`](TODO.md).

---

## Code Style & Invariants

- **Vanilla ES6+ only**: Write browser- and Node-compatible ES6+ JavaScript using the existing IIFE/UMD pattern—do not introduce build tools, TypeScript compilation steps, or external npm runtime dependencies.
- **2-space JavaScript indentation**: All `.js` files (`js/*.js`, `test/*.js`) use 2 spaces per indentation level.
- **4-space Python DSL indentation**: Generated DSL output (`js/decompiler.js`), templates (`js/app.js`), tests, and documentation examples must use 4 spaces per indentation level.
- **Three languages, always**: every user-facing string exists in `uk`, `en` and `ru` — interface text in [`js/i18n.js`](js/i18n.js), core-module messages in [`js/messages.js`](js/messages.js), lesson template comments and phrases in `SNIPPET_L10N` ([`js/app.js`](js/app.js)). Keep placeholders (`{line}`, `{name}`) identical across languages.
- **Lossless round-trip invariant**: Every supported Python DSL program compiled with `compileToScratch`, saved/loaded via `.sb3`, and decompiled with `decompileTarget` must produce valid Python DSL that re-compiles cleanly with identical Scratch semantics.
- **UI & Scratch 3.0 Style Guide**: All visual changes to [`index.html`](index.html) or [`style.css`](style.css) must follow [`docs/STYLE_GUIDE.md`](docs/STYLE_GUIDE.md) (1:1 Scratch 3.0 color tokens, light `#E5F0FF`/`#F9F9F9` workspace, `#855CD6` topbar, and legacy `--wp-*` alias invariants).

---

## Versioning Policy (Mandatory for Every Update)

To make builds easy to track across lessons, student links, and exported `.sb3` files, **every update must bump the version**:

- **Format**: Semantic Versioning (`MAJOR.MINOR.PATCH`), e.g. `1.1.0`:
  - `PATCH` (`1.1.X`): bug fixes, reliability improvements, documentation or test updates.
  - `MINOR` (`1.X.0`): new Scratch 3.0 blocks, runtime features, snippets, or UI capabilities.
  - `MAJOR` (`X.0.0`): breaking changes to Python DSL syntax or `.sb3` project structure.
- **Where to update**:
  1. `version` in [`package.json`](package.json)
  2. `meta.agent` (`'pyScratch-<version>'`) in [`js/sb3Bridge.js`](js/sb3Bridge.js)
  3. A new dated section in [`CHANGELOG.md`](CHANGELOG.md)

---

## Pull Request Process

1. Fork the repository and create a branch from `main` (for example, `feat/glide-to-block`).
2. Keep changes focused and follow the 4-step workflow above.
3. Bump the version (`package.json`, `js/sb3Bridge.js`, and `CHANGELOG.md`).
4. Verify `npm test` (`node test/test_roundtrip.js`) exits with code `0`.
5. Open a Pull Request and complete the checklist in [`.github/PULL_REQUEST_TEMPLATE.md`](.github/PULL_REQUEST_TEMPLATE.md).
