# pyScratch UI & Style Guide (Scratch 3.0 1:1 Design System)

This document is the authoritative visual specification for **pyScratch**. Its goal is to keep Python as playful, bright, and approachable as **Scratch 3.0** (`https://scratch.mit.edu/projects/editor/`) and to prevent future AI agents or contributors from introducing dark/intimidating IDE themes, inconsistent colors, or broken UI invariants.

---

## 1. Design Philosophy

- **Playful, not intimidating:** pyScratch must look and feel like Scratch 3.0, not a dark developer terminal.
- **Light, airy surfaces:** The outer canvas is Scratch's soft sky-blue (`#E5F0FF`), workspace panels are crisp white (`#FFFFFF`) or off-white (`#F9F9F9`), and all primary text is Scratch's friendly slate (`#575E75`).
- **Color encodes meaning:** Python keywords, decorators, API calls, and quick-insert chips are color-coded using Scratch's exact block category palette so learners immediately connect Python syntax to Scratch blocks.

---

## 2. 1:1 Scratch 3.0 Color Tokens (`style.css` `:root`)

All colors live as CSS custom properties in [`style.css`](../style.css). **Never hardcode random hex values** when a `--sc-*` token exists.

### 2.1 Surfaces & Chrome
| Token | Value | Scratch 3.0 Source | Usage |
| :--- | :--- | :--- | :--- |
| `--sc-page-bg` | `#E5F0FF` | `hsla(215, 100%, 95%, 1)` (`.gui_body-wrapper`) | Page background & tab-bar backdrop |
| `--sc-workspace-bg` | `#F9F9F9` | `--colour-workspace` / `--colour-flyout` | Python code editor & block tree background |
| `--sc-surface` | `#FFFFFF` | `--colour-toolbox` | Panels, cards, active tabs, stage canvas |
| `--sc-tab-inactive` | `#D9E3F2` | `hsla(215, 50%, 90%, 1)` | Inactive folder tabs & snippet pills |
| `--sc-tab-hover` | `#E5F0FF` | `hsla(215, 100%, 95%, 1)` | Hover state for tabs & buttons |
| `--sc-sprite-pane-bg` | `#EBF2FC` | `hsla(215, 75%, 95%, 1)` | Variables/lists watch area & sprite selector |
| `--sc-grid-dot` | `#DDDDDD` | `blocklyGridPattern` | `27px x 27px` dot grid in code workspace |
| `--sc-scrollbar` | `#CECDCE` | `--colour-scrollbar` | Scrollbar thumb |

### 2.2 Brand & Action Colors
| Token | Value | Usage |
| :--- | :--- | :--- |
| `--sc-purple` | `#855CD6` | Topbar (`48px`), active tab text, selected sprite ring, focus rings |
| `--sc-purple-dark` | `#7146C7` | Purple hover/accent state |
| `--sc-orange` | `#FF8C1A` | Primary CTA (`Зберегти .sb3`), brand mark, variables |
| `--sc-teal` | `#0FBD8C` | `Поділитися` button, OK status accent, Pen blocks |
| `--sc-green-flag` | `#4CBF56` | `Запустити` (Green Flag) button |
| `--sc-stop-red` | `#EC5959` | `Стоп` (Stop Sign) button |

### 2.3 Typography & Borders
| Token | Value | Usage |
| :--- | :--- | :--- |
| `--sc-text` | `#575E75` | Primary UI & editor text (`--colour-toolboxText`) |
| `--sc-text-muted` | `rgba(87, 94, 117, 0.78)` | Secondary labels, inactive tab text, hints |
| `--sc-text-dim` | `rgba(87, 94, 117, 0.55)` | Line numbers, telemetry labels |
| `--sc-border` | `rgba(0, 0, 0, 0.15)` | Standard `1px` Scratch panel/button/input border |

### 2.4 Scratch 3.0 Block Category Palette
Every block, chip, and syntax highlight category maps to these exact Scratch 3.0 fill & border pairs:

| Category | Fill Token | Fill Hex | Border Token | Border Hex |
| :--- | :--- | :--- | :--- | :--- |
| **Motion** | `--sc-motion` | `#4C97FF` | `--sc-motion-border` | `#3373CC` |
| **Looks** | `--sc-looks` | `#9966FF` | `--sc-looks-border` | `#774DCB` |
| **Sound** | `--sc-sound` | `#CF63CF` | `--sc-sound-border` | `#BD42BD` |
| **Events** | `--sc-events` | `#FFBF00` | `--sc-events-border` | `#CC9900` |
| **Control** | `--sc-control` | `#FFAB19` | `--sc-control-border` | `#CF8B17` |
| **Sensing** | `--sc-sensing` | `#5CB1D6` | `--sc-sensing-border` | `#2E8EB8` |
| **Operators** | `--sc-operators` | `#59C059` | `--sc-operators-border` | `#389438` |
| **Variables** | `--sc-variables` | `#FF8C1A` | `--sc-variables-border` | `#DB6E00` |
| **Lists** | `--sc-list` | `#FF661A` | `--sc-list-border` | `#E64D00` |
| **My Blocks** | `--sc-myblocks` | `#FF6680` | `--sc-myblocks-border` | `#FF3355` |
| **Pen** | `--sc-pen` | `#0FBD8C` | `--sc-pen-border` | `#0B8E69` |

---

## 3. Typography, Radii & Shadows

- **UI Font (`--font-sans`):** `"Helvetica Neue", Helvetica, Arial, sans-serif` (bold `700` for buttons, tabs, and headers).
- **Code / Telemetry Font (`--font-mono`):** `"Fira Code", "JetBrains Mono", "SFMono-Regular", Consolas, monospace` with `font-variant-numeric: tabular-nums` for line numbers and telemetry.
- **Border Radii:**
  - `--sc-radius-sm`: `4px` (`0.25rem`) — buttons, command chips, variable pills, Scratch stack blocks.
  - `--sc-radius-md`: `8px` (`0.5rem`) — main panels, stage canvas, script stacks, telemetry cards.
  - `--sc-radius-lg`: `12px` (`0.75rem`) — modals / drag-and-drop overlay card.
  - `--sc-radius-tab`: `16px` (`1rem`) — top-left & top-right corners of overlapping folder tabs.
  - `--sc-radius-pill`: `32px` (`2rem`) — Scratch-style rounded inputs, badges, and snippet pills.
- **Focus Ring:** `border-color: var(--sc-purple); box-shadow: 0 0 0 3px var(--sc-purple-ring);`

---

## 4. Component Specifications

1. **Topbar (`.topbar`):** `48px` (`3rem`) height, `#855CD6` background, white text, translucent white buttons (`rgba(255, 255, 255, 0.16)`), orange `#FF8C1A` save button (`#btn-save`), teal `#0FBD8C` share button (`#btn-share`).
2. **Overlapping Folder Tabs (`.right-panel > .subbar`):** Sits on `#E5F0FF`. Inactive tabs are `#D9E3F2` (`35px` tall) with `-6px` horizontal overlap; active tab is `#FFFFFF` (`39px` tall) with `#855CD6` text and `z-index: 4`, merging seamlessly into `.right-content`.
3. **Python Code Workspace (`.editor-wrap`):** `#F9F9F9` background with a `27px x 27px` `#DDDDDD` radial dot grid. `#code-highlight` and `#code-editor` **must always share identical** `font-family`, `font-size`, `line-height`, `padding`, `tab-size`, and `white-space: pre` so the caret and syntax overlay stay pixel-aligned.
4. **Syntax Token Readability:** Because `#F9F9F9` is light, syntax tokens (`.tok-kw`, `.tok-dec`, `.tok-api`, `.tok-pen`, `.tok-str`, `.tok-num`, `.tok-com`) use darkened Scratch category hues (`#CF8B17`, `#B88600`, `#2B6CB0`, `#0B8E69`, `#389438`, `#DB6E00`, `#8B93A7`) to maintain clear contrast.
5. **Quick Command Chips (`.palette-bar`):** Styled like mini Scratch blocks (`#FFFFFF` text on category-colored fills with darker `1px` borders).
6. **Active Sprite Card (`.active-sprite-section`):** Uses Scratch's `2px solid var(--sc-purple)` border and `0 0 0 4px var(--sc-purple-ring)` outer halo.

---

## 5. Rules for Future AI Agents (Do Not Break!)

1. **NEVER revert to a dark theme.** Do not reintroduce `#0c1016`, `#121820`, or dark slate backgrounds in `style.css` or `<meta name="theme-color">`.
2. **NEVER remove legacy `--wp-*` CSS aliases** (`--wp-bg`, `--wp-surface`, `--wp-panel`, `--wp-border`, `--wp-text`, `--wp-muted`, `--wp-dim`, `--wp-accent`). Inline styles in `index.html` and template strings in `js/app.js` reference `--wp-muted` and `--wp-dim`.
3. **NEVER rename or remove DOM IDs or classes** (`#code-editor`, `#code-highlight`, `#line-numbers`, `#stage-canvas`, `#target-tabs`, `#vars-watch`, `#view-preview`, `#view-blocks`, `#view-assets`, `#view-docs`, `#drop-overlay`, `.hidden`).
4. **ALWAYS keep `#code-editor` and `#code-highlight` geometry identical.** Any change to padding, font-size, line-height, or font-family must apply to both `#code-highlight, #code-editor` together.
5. **ALWAYS preserve `?embed=1` (`body.embed-mode`) and mobile (`@media (max-width: 780px)`) rules** in `style.css`.
6. **ALWAYS ensure WCAG-readable text contrast** when adding new colored badges or syntax tokens on `#F9F9F9` or `#FFFFFF`.
7. **Run `npm test` after any edit** to verify no regressions in the compiler, decompiler, or stage preview.
