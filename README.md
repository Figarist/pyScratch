# pyScratch

> **Live Online Browser IDE:** [**https://figarist.github.io/pyScratch/**](https://figarist.github.io/pyScratch/)
>
> Open `.sb3` files (via file picker or Drag-and-Drop), write or edit Python DSL / Scratch 3.0 scripts, run them live on the 480x360 Canvas 2D stage, manage sprites/costumes/sounds, and download the updated `.sb3` project directly in your browser — **zero installation or PC download required**.

**pyScratch** is a zero-build, browser-based bidirectional converter and educational IDE between a Python-inspired DSL and native Scratch 3.0 (`.sb3`) project archives. It combines a real-time 480x360 Canvas 2D stage simulator, a Ukrainian-localized Scratch block tree inspector, an interactive Sprite & Asset Manager, and a lossless round-trip decompiler—all running locally in the browser with no external runtime dependencies.

## Key Features

- **Bidirectional Compilation & Lossless Round-Trip Decompilation** ([`js/compiler.js`](js/compiler.js) ↔ [`js/decompiler.js`](js/decompiler.js))
  - Tokenizes, parses into an AST, and compiles Python-like scripts directly into Scratch 3.0 `project.json` block graphs, global/sprite-local variables & lists, broadcasts, custom procedures (`My Blocks` including `@warp` run-without-screen-refresh), and extensions.
  - Decompiles existing `.sb3` `target.blocks` back into clean, 4-space-indented Python DSL code (`decompileTarget(target, stageTarget)`) with idempotent round-trip stability, distinguishing Stage-global variables/lists from sprite-local `self.var` / `local_list_*` state.
  - Supports Scratch 3.0 parity blocks across Motion (`glide_to`), Looks (`switch_backdrop_and_wait`, `go_to_layer`, `change_layer`), Sound (`set_sound_effect`, `change_sound_effect`, `clear_sound_effects`), Events (`@when_greater_than`), Sensing (`attribute_of`, `touching_color`, `color_is_touching_color`, `set_drag_mode`, `current_time`, `days_since_2000`, `username`, `loudness`), Data (`list_index_of`, `show_variable`/`hide_variable`, `show_list`/`hide_list`), and Math (`tan`, `asin`, `acos`, `atan`, `ln`, `log`, `exp`, `pow10`, `len`).
  - Preserves negative numeric literals directly (`-150` instead of `0 - 150`), reconstructs `elif` chains and `!=` / `<=` / `>=` comparisons, allows dynamic reporter expressions in menu slots, and reports friendly Ukrainian `CompileError` diagnostics with exact line numbers.
- **Full `.sb3` ZIP Packaging, Asset Management & Drag-and-Drop** ([`js/sb3Bridge.js`](js/sb3Bridge.js) + [`vendor/jszip.min.js`](vendor/jszip.min.js))
  - Opens and exports Scratch 3.0 `.sb3` archives (`loadSb3`, `saveSb3`) powered by a bundled local copy of JSZip (`v3.10.1`), including browser-wide **Drag-and-Drop `.sb3`** import (`#drop-overlay`).
  - Includes a standalone RFC 1321 MD5 implementation (`md5`) supporting UTF-8 strings and binary `Uint8Array` assets to compute Scratch `assetId` / `md5ext` hashes.
  - Provides sprite & asset management helpers (`renameSprite`, `deleteSprite`, `updateSpriteProps`, `addCostumeAsset` for `.svg`/`.png`/`.jpg`, and `addSoundAsset` for `.wav`/`.mp3` with WAV header parsing), plus built-in vector SVG backdrops (`space_bg`, `level_2`, `grid_bg`), sprite costumes (`costume1`, `costume2`, `star`), and procedural PCM `.wav` sound effects (`pop`, `laser`).
- **Live 480x360 Canvas 2D Stage Simulator** ([`js/preview.js`](js/preview.js))
  - Executes multi-sprite projects directly from compiled ASTs with Scratch coordinates (`x: -240..240`, `y: -180..180`) and `layerOrder` sorting.
  - Supports clones (`@when_cloned`, `create_clone`, `delete_this_clone`) up to Scratch's 300-clone cap with deep-copied clone-local `self.var` / `local_list_*` state, custom procedures (`def` and synchronous `@warp`), `for i in range(n):` loop counter `i`, broadcasts with restart semantics, `stop("other scripts in sprite")` per-actor cancellation, Pen extension drawing/stamping with HSV + transparency parameters, graphic effects (`color`, `ghost`, `brightness`, `pixelate`, `mosaic`), Web Audio `.wav`/`.mp3` decoding with `volume` / `pitch` / `pan` routing (plus synth fallback and mute toggle), live stage dragging (`set_drag_mode("draggable")`), interactive `ask()`/`answer()` overlays, pixel-color sensing, and live stage telemetry.
- **Educational Browser IDE & Shareable URLs** ([`index.html`](index.html), [`js/app.js`](js/app.js), [`style.css`](style.css))
  - Dark workbench layout with live syntax highlighting, line-number error/selection markers, 4-space `Tab` and `:` auto-indentation, `Ctrl+Enter` / `Cmd+Enter` execution shortcut, and a **Share (`Поділитися`)** button that encodes the active script into a shareable `?code=<base64url>` link.
  - Interactive **Sprite & Asset Manager** UI in the `Асети (.sb3)` tab to rename/delete sprites, edit initial `x`, `y`, `size`, `direction`, `rotationStyle`, `visible`, and `draggable` properties, and upload `.svg`/`.png`/`.jpg` costumes/backdrops or `.wav`/`.mp3` sounds.
  - Multi-target tab switcher (`Stage`, `Sprite1`, and `+ Спрайт` creation), clickable quick command palette, interactive Ukrainian block tree inspector (`formatBlockUk`) that jumps to the corresponding source line, built-in API reference tab, and 6 interactive learning templates:
    - `hexagon` — Geometry & Pen Extension drawing + backdrop transition
    - `functions` — Custom procedures (`def polygon(sides, step):`)
    - `arrows` — Arrow-key movement, edge bouncing, and stamping
    - `clones` — Clones and firework-style particle bursts
    - `quiz` — Interactive `ask()`/`answer()` dialog, `elif` branching, and lists
    - `levels` — Multi-level backdrop switching and `broadcast()` events

## Quick Start

### 1. Use Online or Run Locally in the Browser

- **Online (No Setup)**: Open [**https://figarist.github.io/pyScratch/**](https://figarist.github.io/pyScratch/) in any modern browser.
- **Direct local open**: Open [`index.html`](index.html) directly in a modern web browser.
- **Local static server**:

  ```bash
  python3 -m http.server 8000
  ```

  Then navigate to `http://localhost:8000/`.

### URL Query Parameters (Embed & Sharing)

The browser IDE accepts URL query parameters for lesson embeds and shareable links:

| Parameter | Example | Behavior |
| --- | --- | --- |
| `?embed=1` | `?embed=1` (or `true`) | Enables compact `embed-mode` layout (hides template subbar, quick palette, brand subtitle, and reset button) for iframes. |
| `?snippet=<name>` | `?snippet=clones` | Preloads one of the 6 built-in templates (`hexagon`, `functions`, `arrows`, `clones`, `quiz`, `levels`). |
| `?code=<base64url>` | `?code=QGd...` | Decodes a UTF-8 Base64URL-encoded Python DSL script into the active sprite editor (generated automatically by the **Поділитися / Share** button). Overrides `?snippet`. |
| `?autorun=1` | `?embed=1&snippet=clones&autorun=1` | Automatically compiles and runs the project on the stage when the page loads (unless `?code=` decoding failed). |

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
| [`index.html`](index.html) | Workbench UI layout: target tabs, template selector, code editor, quick palette, 480x360 stage canvas, telemetry grid, block/asset/API tabs, `.sb3` drag-and-drop overlay, and asset upload inputs. |
| [`style.css`](style.css) | Scratch 3.0 1:1 light theme ([`docs/STYLE_GUIDE.md`](docs/STYLE_GUIDE.md)), split-pane responsive grid, category-mapped syntax tokens, Scratch block colors, sprite/asset manager forms, drag-and-drop overlay, and `?embed=1` compact layout. |
| [`js/compiler.js`](js/compiler.js) | Lexer (`tokenize`), recursive-descent AST parser (`parse`), Ukrainian `CompileError` diagnostics, and Scratch 3.0 block generator (`compileToScratch`) with `self.var`/`local_list_*`, `@warp`, and dynamic menu expressions. |
| [`js/decompiler.js`](js/decompiler.js) | Scratch 3.0-to-Python DSL decompiler (`decompileTarget`) with local/global scoping, `elif`/operator/negative-literal reconstruction, and Ukrainian block inspector formatter (`formatBlockUk`). |
| [`js/preview.js`](js/preview.js) | `StagePreview` 480x360 Canvas 2D execution engine supporting multi-sprite ASTs, clone-local state isolation (up to 300 clones), `@warp` procedures, `layerOrder`, Pen HSV/alpha, graphic effects, Web Audio `.wav`/`.mp3` playback, input/color sensing, dragging, and telemetry. |
| [`js/sb3Bridge.js`](js/sb3Bridge.js) | `.sb3` ZIP pack/unpack bridge (`loadSb3`, `saveSb3`), RFC 1321 `md5` hasher, procedural `.wav` generator, default project/sprite builders, and sprite/asset management APIs (`renameSprite`, `deleteSprite`, `updateSpriteProps`, `addCostumeAsset`, `addSoundAsset`). |
| [`js/app.js`](js/app.js) | Browser IDE controller wiring editor highlighting, cursor telemetry, 6 learning templates (`SNIPPETS`), built-in `API_DOCS`, block tree navigation, Sprite & Asset Manager UI, Drag-and-Drop `.sb3`, URL parameters (`?embed=1`, `?snippet=`, `?code=`, `?autorun=1`), and Share button. |
| [`vendor/jszip.min.js`](vendor/jszip.min.js) | Bundled JSZip v3.10.1 library enabling offline ZIP compression/decompression in both browser and Node.js tests. |
| [`test/test_roundtrip.js`](test/test_roundtrip.js) | 9-part Node.js verification suite covering MD5, assets, compilation, idempotent round-trips, `formatBlockUk`, `.sb3` ZIP I/O, `StagePreview`, error diagnostics, and full 1:1 Scratch 3.0 parity integration. |

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
