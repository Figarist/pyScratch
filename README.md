# pyScratch

**pyScratch** is a zero-build, browser-based bidirectional converter and educational IDE between a Python-inspired DSL and native Scratch 3.0 (`.sb3`) project archives. It combines a real-time 480x360 Canvas 2D stage simulator, a Ukrainian-localized Scratch block tree inspector, a project asset viewer, and a lossless round-trip decompiler—all running locally in the browser with no external runtime dependencies.

## Key Features

- **Bidirectional Compilation & Lossless Round-Trip Decompilation** ([`js/compiler.js`](js/compiler.js) ↔ [`js/decompiler.js`](js/decompiler.js))
  - Tokenizes, parses into an AST, and compiles Python-like scripts directly into Scratch 3.0 `project.json` block graphs, variables, lists, broadcasts, custom procedures (`My Blocks`), and extensions.
  - Decompiles existing `.sb3` `target.blocks` back into clean, 4-space-indented Python DSL code with idempotent round-trip stability.
  - Preserves negative numeric literals directly (`-150` instead of `0 - 150`), reconstructs `elif` chains and `!=` / `<=` / `>=` comparisons, and reports friendly Ukrainian `CompileError` diagnostics with exact line numbers.
- **Full `.sb3` ZIP Packaging & Unpackaging** ([`js/sb3Bridge.js`](js/sb3Bridge.js) + [`vendor/jszip.min.js`](vendor/jszip.min.js))
  - Opens and exports Scratch 3.0 `.sb3` archives (`loadSb3`, `saveSb3`) powered by a bundled local copy of JSZip (`v3.10.1`).
  - Includes a standalone RFC 1321 MD5 implementation (`md5`) supporting UTF-8 strings and binary `Uint8Array` assets to compute Scratch `assetId` / `md5ext` hashes.
  - Generates built-in vector SVG backdrops (`space_bg`, `level_2`, `grid_bg`), sprite costumes (`costume1`, `costume2`, `star`), and procedural PCM `.wav` sound effects (`pop`, `laser`) out of the box.
- **Live 480x360 Canvas 2D Stage Simulator** ([`js/preview.js`](js/preview.js))
  - Executes multi-sprite projects directly from compiled ASTs with Scratch coordinates (`x: -240..240`, `y: -180..180`).
  - Supports clones (`@when_cloned`, `create_clone`, `delete_this_clone`), custom procedures (`def`) with lexical parameter scoping, broadcasts (`broadcast`, `broadcast_and_wait`), Pen extension drawing and stamping, interactive `ask()` / `answer()` overlays, keyboard and mouse sensing, Web Audio synthesized sound playback (with mute toggle), and live stage telemetry (coordinates, angle, size, mouse position, timer, backdrop, variables, and lists).
- **Educational Browser IDE** ([`index.html`](index.html), [`js/app.js`](js/app.js), [`style.css`](style.css))
  - Dark workbench layout with live syntax highlighting, line-number error/selection markers, 4-space `Tab` and `:` auto-indentation, and `Ctrl+Enter` / `Cmd+Enter` execution shortcut.
  - Multi-target tab switcher (`Stage`, `Sprite1`, and `+ Спрайт` creation), clickable quick command palette, interactive Ukrainian block tree inspector (`formatBlockUk`) that jumps to the corresponding source line, clickable `.sb3` asset inspector, built-in API reference tab, and 6 interactive learning templates:
    - `hexagon` — Geometry & Pen Extension drawing + backdrop transition
    - `functions` — Custom procedures (`def polygon(sides, step):`)
    - `arrows` — Arrow-key movement, edge bouncing, and stamping
    - `clones` — Clones and firework-style particle bursts
    - `quiz` — Interactive `ask()`/`answer()` dialog, `elif` branching, and lists
    - `levels` — Multi-level backdrop switching and `broadcast()` events

## Quick Start

### 1. Run in the Browser

No build step, bundler, or package installation is required to run the IDE:

- **Direct open**: Open [`index.html`](index.html) directly in a modern web browser.
- **Local static server** (recommended):

  ```bash
  python3 -m http.server 8000
  ```

  Then navigate to `http://localhost:8000/`.

### 2. Run the Automated Test Suite

Tests run in Node.js and verify MD5 hashing, `.sb3` asset integrity, full DSL compilation, idempotent round-trip decompilation, Ukrainian block labels, binary ZIP save/load, headless `StagePreview` execution, and compiler error diagnostics:

```bash
npm test
# or directly with Node.js:
node test/test_roundtrip.js
```

## Project Architecture

| File | Role & Responsibilities |
| --- | --- |
| [`index.html`](index.html) | Workbench UI layout: target tabs, template selector, code editor, quick palette, 480x360 stage canvas, telemetry grid, block/asset/API tabs. |
| [`style.css`](style.css) | Dark workbench theme, split-pane responsive grid, syntax highlighting token classes, Scratch category block colors, and telemetry styling. |
| [`js/compiler.js`](js/compiler.js) | Lexer (`tokenize`), recursive-descent AST parser (`parse`), Ukrainian `CompileError` diagnostics, and Scratch 3.0 block generator (`compileToScratch`). |
| [`js/decompiler.js`](js/decompiler.js) | Scratch 3.0-to-Python DSL decompiler (`decompileTarget`) with `elif`/operator/negative-literal reconstruction and Ukrainian block inspector formatter (`formatBlockUk`). |
| [`js/preview.js`](js/preview.js) | `StagePreview` 480x360 Canvas 2D execution engine supporting multi-sprite ASTs, clones, custom procedures, Pen canvas, Web Audio synthesis, input sensing, and telemetry. |
| [`js/sb3Bridge.js`](js/sb3Bridge.js) | `.sb3` ZIP pack/unpack bridge (`loadSb3`, `saveSb3`), RFC 1321 `md5` hasher, procedural `.wav` generator, and default SVG project/sprite builders. |
| [`js/app.js`](js/app.js) | Browser IDE controller wiring editor highlighting, cursor telemetry, 6 learning templates (`SNIPPETS`), built-in `API_DOCS`, block tree navigation, and `.sb3` file I/O. |
| [`vendor/jszip.min.js`](vendor/jszip.min.js) | Bundled JSZip v3.10.1 library enabling offline ZIP compression/decompression in both browser and Node.js tests. |
| [`test/test_roundtrip.js`](test/test_roundtrip.js) | 8-part Node.js verification suite covering MD5, assets, compilation, idempotent round-trips, `formatBlockUk`, `.sb3` ZIP I/O, `StagePreview`, and error diagnostics. |

## Documentation & Resources

- **[Python DSL Reference](docs/DSL_REFERENCE.md)** — Complete specification of supported Python DSL syntax, event decorators, custom procedures, Scratch 3.0 opcode mappings, and compiler/runtime behaviors.
- **[Roadmap & TODO](TODO.md)** — Planned features, improvements, and open items.
- **[Contributing Guide](CONTRIBUTING.md)** — Architecture overview, 4-step block workflow, and pull request guidelines.
- **[License](LICENSE)** — MIT License terms.

## Contributing & Open Source

Pull Requests are warmly welcome! Whether you want to implement a missing Scratch 3.0 block, improve Canvas 2D runtime parity, or expand tests and documentation:

- Read **[CONTRIBUTING.md](CONTRIBUTING.md)** for the zero-dependency architecture overview, 4-step workflow (`compiler.js` → `decompiler.js` → `preview.js` → `test_roundtrip.js`), and code conventions.
- Browse **[TODO.md](TODO.md)** and pick any unchecked `[ ]` Scratch 3.0 block, runtime behavior, or IDE enhancement to tackle.

## Educational Mission & Author

Created by **Figarist ([sivochka.com](https://sivochka.com))** as an open-source educational platform to help students smoothly transition from visual Scratch 3.0 blocks to text-based Python programming.
