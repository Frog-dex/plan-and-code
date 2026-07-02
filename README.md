# Plan & Code

Visual planning tools for handing design intent to AI coding agents — zero dependencies, zero build, plain HTML files.

You browse your real site, drag gold "planned" boxes where things *should* go, scribble notes and motion paths, then hit one button: **Copy AI HANDOFF spec**. The result is a self-contained text spec (existing vs planned geometry, notes, animation specs, raw JSON) that any AI coding agent can read and apply to your codebase. Plan visually, let the AI write the code.

## The tools

| File | What it does |
|---|---|
| `blueprint.html` | **2D site blueprint.** Loads any same-origin page in an iframe and overlays a drafting layer on top: track elements, drag planned layouts, attach notes, spec animations with hand-drawn motion paths, freehand sketch. Exports an AI handoff spec. |
| `plan.html` | **Top-down floor-plan editor** for 3D scenes. Drag objects and the camera on an architect-style plan; it emits the exact `models/layout.js` your three.js (or other) scene imports. |
| `demo/index.html` | Sample target page ("Aurora Coffee") so blueprint.html works out of the box. |
| `models/layout.js` | Sample floor-plan data (an observatory study room) read by plan.html. |
| `docs/BLUEPRINT-README.md` | The AI handoff spec — the contract an AI agent reads before applying an exported blueprint. |

## Features

### blueprint.html
- **Blueprint view** — the live site desaturates to blueprint blue under a 2%/10% drafting grid; toggle it off to see true colors.
- **Five modes** — Browse (site stays fully interactive), Plan (drag layouts), Notes, Animate, Draw.
- **Element tracking** — hover the live page, click to track. Selectors are auto-generated (id → known label → unique class combo → nth-child path) and renamable.
- **Existing vs planned** — cyan solid box = where the element is now; gold dashed box = where you want it. Drag to move (0.5% snap), grab the corner grip to resize, or type exact percentages.
- **Live preview** — "apply plan to live" pushes the planned rect onto the real element inside the iframe (respecting its positioning scheme); "revert live" undoes it.
- **Notes** — one instruction per line, attached to any tracked element.
- **Animation specs** — name, trigger (click/hover/power-on/power-off/always/scroll/drag), duration, easing (including `friction` momentum decay), prose description, and a **hand-drawn motion path** captured in viewport %. Preview any spec in-place via the Web Animations API.
- **Freehand drawing** — pen, arrow, erase; stored per view (`<body data-view="...">` on the target page).
- **Exports** — AI HANDOFF spec (clipboard), JSON download, planned-rect CSS.
- **Persistence** — everything autosaves to localStorage, keyed per target page.
- **Any page** — `blueprint.html?page=your-page.html` (must be same-origin).

### plan.html
- Architect-style top-down view: walls, grid, compass, footprint rectangles with heading arrows.
- Drag objects with 5-unit snap; rotate, set height, pick mount plane (floor / table top / ceiling), flag spin and hero objects — all color-coded.
- Drag the gold camera dot to reposition where the viewer ends up (with view cone).
- The output panel always shows the **exact `layout.js` code** for the current arrangement — copy, paste into `models/layout.js`, done. Also exposed on the console as `window.layoutCode()`.

## Quick Start

No install, no build. Just serve the folder (a server is required — the iframe and ES-module import don't work over `file://`):

```bash
git clone https://github.com/moomoomoo6969/plan-and-code.git
cd plan-and-code
python3 -m http.server 8080
```

Then open:

- http://localhost:8080/blueprint.html — blueprint the demo page
- http://localhost:8080/plan.html — the floor-plan editor

Try it in 60 seconds:

1. In blueprint.html, click **✥ Plan**, then click the hero on the demo page.
2. Drag the gold dashed box somewhere new; add a note in **✎ Notes**.
3. Click **◉ Animate**, hit **✏ draw motion path**, scribble an arc on the stage, then **+ add animation** and **▶ preview**.
4. Click **⧉ Copy AI HANDOFF spec** — paste that into your AI coding agent along with `docs/BLUEPRINT-README.md`.

To plan your own page, drop it next to blueprint.html and open:

```
http://localhost:8080/blueprint.html?page=my-page.html
```

## How it works

- **blueprint.html** loads the target page in a same-origin `<iframe>` and floats a full-size SVG overlay above it. In Browse mode the overlay is `pointer-events:none`, so the site behaves normally. In the other modes the overlay intercepts the pointer, converts overlay coordinates into iframe-document coordinates, and uses `elementFromPoint` on the iframe's document to pick real DOM elements. Element geometry is read with `getBoundingClientRect` and normalized to **viewport percentages**, so plans survive window resizes. A 400 ms redraw loop keeps outlines glued to the live layout. State is a single JSON object in localStorage; the AI HANDOFF export is a readable diff (existing vs planned, notes, animation specs) with the raw JSON appended as the authoritative payload. The full schema and apply rules live in [docs/BLUEPRINT-README.md](docs/BLUEPRINT-README.md).
- **plan.html** sets the SVG `viewBox` directly to the room's coordinate system, so scene units are drawing units — no manual scaling anywhere. Pointer events are mapped back to scene units via `getScreenCTM().inverse()`. It imports `ROOM` and `ITEMS` straight from `models/layout.js` and regenerates that file's source text live as you drag.

## Screenshots

No screenshots are bundled yet. The fastest tour is the Quick Start above — the demo page loads with a few elements pre-tracked so the blueprint view shows something immediately.

## Notes

- Everything is client-side; no data leaves your machine (localStorage only).
- The `.glb` model files referenced in `models/layout.js` are sample data, not bundled — swap in your own scene's objects.
- Works in any modern browser (uses Pointer Events, Web Animations API, ES modules).

## Publish

```bash
gh repo create moomoomoo6969/plan-and-code --public --source . --push
```

## License

MIT © 2026 Blu Inman
