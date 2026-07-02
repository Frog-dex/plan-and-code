# PROMPT — Recreate "Plan & Code" from scratch

> Paste everything below this line into an AI coding agent to rebuild this toolkit.

---

Build **Plan & Code**: a zero-dependency, no-build visual planning toolkit made of plain HTML files. Its headline feature is the **AI HANDOFF export** — a designer plans layout changes *on top of their real, running site*, and the tool emits a self-contained text spec (existing vs planned geometry, notes, animation specs with hand-drawn motion paths, plus authoritative raw JSON) that an AI coding agent can read and apply to the codebase. The human plans visually; the AI writes the code.

Deliver exactly these files:

```
blueprint.html            # 2D site blueprint overlay tool (the main tool)
plan.html                 # top-down floor-plan editor for 3D scenes
demo/index.html           # sample target page so blueprint.html works out of the box
models/layout.js          # sample floor-plan data consumed by plan.html
docs/BLUEPRINT-README.md  # the AI handoff spec (schema + apply rules)
```

Everything runs from `python3 -m http.server` — no frameworks, no npm, no build step. Vanilla JS, inline `<style>` and `<script>` in each HTML file. Shared visual language: dark navy blueprint aesthetic (`#071427`/`#0c1a29` backgrounds, cyan `#7fdfff` accents, gold `#f0dca0` for "planned/camera", mint `#a8f5cf` for success/animation, monospace `'Courier New'` UI), right-hand control panel ~310–335px wide, main stage filling the rest.

---

## 1. blueprint.html — the site blueprint tool

### Concept
Load the user's actual page in a same-origin `<iframe>` and float a full-viewport `<svg>` overlay above it. Every tracked element gets **two rectangles**: cyan solid = EXISTING (where the element really is right now), gold dashed = PLANNED (where the designer wants it). The gap between the two is the design intent that gets exported.

### Stage
- `<iframe id="site">` fills the stage; target page comes from `?page=<url>` query param, defaulting to `./demo/index.html`. Must be same-origin (the tool reads `iframe.contentDocument`; wrap access in try/catch and no-op if blocked).
- `<svg id="overlay">` absolutely positioned over the iframe, `touch-action:none`.
- **Blueprint look** (toggle button, on by default): a `bp` class on `<body>` applies `filter: saturate(.25) brightness(.75) hue-rotate(190deg)` to the iframe and shows a drafting-grid layer built from four stacked `linear-gradient` backgrounds (minor lines every 2%, brighter major lines every 10%). This makes any site look like a blueprint without touching it.

### Modes (button row)
`Browse · Plan · Notes · Animate · Draw`
- **Browse**: overlay gets `pointer-events:none` so the real site is fully interactive underneath (planned boxes can still be dragged when pointer events return in other modes).
- **Plan/Notes/Animate**: overlay intercepts the pointer. Show a green dashed hover outline over whatever live element is under the cursor. Click = track + select that element.
- **Draw**: freehand layer with three tools — pen, arrow (arrowhead computed from the last two points with `atan2`), erase (removes any stroke with a point within 3% of the click).

### Element picking (key trick)
The overlay and iframe share the same box, but the iframe document has its own coordinate space. On pointer events: take overlay-relative coords, scale by `(iframeDoc.clientWidth / overlayRect.width)` (same for Y), then call `iframeDoc.elementFromPoint(x, y)`. Ignore hits on `<body>`/`<html>`.

### Selector generation (key trick)
Generate a stable CSS path for any picked element, in priority order:
1. `#id` if the element has one.
2. A `KNOWN` map of selector → friendly label (hardcoded for the demo page, e.g. `'#hero':'hero'`, `'#cta':'cta-button'`) — if the element matches a known selector, use it.
3. `tag.class1.class2` (first two classes, `CSS.escape`d) **only if** `querySelectorAll` proves it unique in the document.
4. Fallback: recursive `parent > tag:nth-child(n)` path.

### Data model (single localStorage JSON, key `plan-and-code-blueprint-v2:<page>` — per target page)
```js
{ version: 2, site: "<page>",
  elements: { "<selector>": {
      label,            // renamable friendly name
      view,             // iframe's <body data-view> at capture time, 'default' if unset
      plan,             // {x,y,w,h} in viewport % (1 decimal) or null
      notes: [],        // strings, one instruction each
      anims: [],        // animation specs, see below
      applied           // original inline style attr, saved before live-preview; null otherwise
  }},
  drawings: { "<view>": [ { tool:'pen'|'arrow', color, points:[[x,y],…] } ] } }
```
**All coordinates are percent of the iframe viewport (0–100, 1 decimal)** — resize-proof. Save to localStorage on every mutation.

### Geometry
- `liveRect(selector)`: query the iframe doc, skip `display:none`/`visibility:hidden`/sub-2px elements, return `getBoundingClientRect()` normalized to viewport %.
- A **400 ms `setInterval` redraw loop** re-reads live rects every tick, so cyan boxes stay glued to the real layout even as the site changes; a slower 700 ms tick refreshes the selected element's geometry readout in the panel.
- `redraw()` clears and rebuilds the whole SVG each tick: freehand strokes for the current view, then per element — cyan existing rect, gold dashed planned rect (with a translucent gold fill when selected), a dashed gold connector line between the two centers when the plan has moved > 0.15%, a name tag above the box (dark backing rect + text) with note ✎N and animation ◉N count badges, a 14×14 gold SE resize grip when selected, and any animation paths as dashed mint polylines.

### Interaction
- Drag the gold planned box to move it; drag the grip to resize. Snap both to 0.5%. Use `data-*` attributes on the SVG nodes (`data-sel`, `data-plan`, `data-grip`) + `e.target.closest()` to route pointerdown. Use `setPointerCapture` for all drags/strokes.
- Panel edit box when selected: rename field, numeric X/Y/W/H % inputs (live-wired both directions), a monospace geometry readout showing existing + planned + "(plan is APPLIED to live)" flag, and:
  - **plan = existing** button (reset plan to the current live rect — implemented by nulling `plan`; `planOf()` falls back to the live rect when plan is null).
  - **apply plan to live**: mutate the actual element in the iframe for instant preview. Save its original `style` attribute into `applied` first. If the element is `absolute`/`fixed`, set `left/top/width/height` in px computed from % (subtracting the `offsetParent` rect for absolute). Otherwise append a `translate(dx,dy)` transform (replacing any previous translate) + width. **revert live** restores the saved style attribute.
- Notes box: a textarea, split on newlines into the `notes` array.
- Tracked-element list: chips with ●/○ (in current view or not), plan/notes/anims badges, click to select, × to untrack.

### Animation specs (Animate mode)
Per selected element, a form: name, trigger dropdown (`click / hover / power-on / power-off / always / scroll / drag`), duration, easing (free text; `friction` is a house keyword meaning momentum decay), prose description, and a **✏ draw motion path** button — it arms path capture so the next freehand stroke on the stage (drawn in mint) is stored as the spec's `path` (array of viewport-% points) instead of a drawing. List existing specs with a **▶ preview** button: animate the real iframe element with the Web Animations API — if there's a path, build keyframes translating along it relative to the first point (convert % → px); map `friction` to `cubic-bezier(.17,.67,.36,.99)`; no path = a small scale pulse. These are *specifications for the AI to implement*, not code.

### Exports (the point of the tool)
- **⧉ Copy AI HANDOFF spec** (primary button): plain-text spec, copied to clipboard —
  header (`# SITE BLUEPRINT — AI HANDOFF (v2)`, pointer to docs/BLUEPRINT-README.md, site + viewport size, one-line explanation of EXISTING vs PLANNED), then per element: `## label (selector) · view:x`, existing rect, PLANNED rect, `- NOTE:` lines, `- ANIMATION "name": trigger= duration= easing= — desc` with motion path JSON, then a drawings summary, then `## RAW JSON (authoritative)` with the full DB serialized.
- **⇓ JSON**: download the DB as `blueprint-data.json` via Blob URL.
- **⧉ CSS**: emit `selector{left:X%;top:Y%;width:W%}` per planned element, prefixed with `body[data-view="…"] ` for non-default views.
- **✕ wipe** (confirm dialog): reset the DB for this page.
- On iframe load (1.2 s delay for layout settle), if the DB is empty and the target is the demo page, pre-track a few demo elements so the tool never opens blank.

### docs/BLUEPRINT-README.md
Write the contract an AI agent reads before applying an export: the file table, the JSON schema above, the reading rules (coords are viewport %; EXISTING vs PLANNED and the apply rule — realize PLANNED inside the element's own CSS system, never blindly absolute-position flow content; `applied` is tool-internal; `anims` are specs to implement; `path` motion is relative to its first point; drawings are design notes) and a numbered apply checklist (back up, edit geometry in the element's own rules, implement anims by name, honor every note, verify in a browser at the handoff's viewport, RAW JSON is authoritative).

---

## 2. plan.html — top-down floor-plan editor

For 3D scenes (three.js etc.) whose object placement lives in a data module. Architect's view: X = left↔right, Z = depth, back wall at the top.

- `import { ROOM, ITEMS } from './models/layout.js'` (ES module — this is why a local server is required). Work on copies; never mutate the module.
- **ViewBox trick**: set the SVG `viewBox` to the room's own coordinate system (`ROOM.minX/maxX/minZ/maxZ` plus ~90 units padding), so scene units are drawing units and there is zero manual scaling. Convert pointer events to scene units with `svg.createSVGPoint()` + `matrixTransform(svg.getScreenCTM().inverse())`.
- Static backdrop: dark fill, 100-unit grid (axis lines brighter), thick cyan room outline, "BACK WALL" label, a small compass of concentric circles.
- Items: rotated `<g translate rotate>` containing a rounded footprint rect (`foot:[w,d]`, centered), a facing arrow sticking out the front, and a counter-rotated label group (id text stays upright) plus a mount-plane initial in the corner. Color code: floor cyan `#7fdfff`, table mint `#8fe6b0`, ceiling purple `#c9a0ff`, `spin:true` orange `#ffb060`, `hero:true` red-orange `#ff7f6a` (hero > spin > mount). Selected = gold stroke, brighter fill, and an `x, z · rot° · mount` caption.
- Camera: a draggable gold dot with a dashed translucent view-cone polygon toward the back wall and a CAMERA label. Selecting it shows only X/Z in the panel.
- Dragging: pointerdown stores the grab offset (`item.x - pointer.x`), pointermove applies it with **snap to 5 units**, panel fields update live. `setPointerCapture` on the SVG.
- Panel: selection name, X / Z number inputs, rotation slider (0–359, step 5, live degree readout), height input, mount-plane select, spin checkbox, color legend.
- **Live code output**: a `fmt()` function regenerates the exact `layout.js` source (`// camera → camX:…, camZ:…` comment + `export const ITEMS = [ … ]`, one object per line, omitting falsy spin/hero) into a bottom textarea on every change, with a "⧉ Copy layout code" button. Also expose `window.getLayout`, `window.getCam`, `window.layoutCode` for console use.

### models/layout.js (sample data)
`ROOM` = wall extents, floor/ceiling Y, camera position + gaze. `ITEMS` = ~9 objects of an observatory study room (desk, monitor on table with spin, clock, lamp, books, signalscope, telescope, globe, and a `hero:true` lizard), each `{ id, model:'*.glb', on:'floor|table|ceiling', x, z, rot, h, foot:[w,d], spin?, hero? }`. Comment the file heavily: it's the single source of truth both the 3D scene and plan.html read; the .glb files are not bundled.

---

## 3. demo/index.html — sample target page

A small fake storefront ("Aurora Coffee", warm cream/brown palette, Georgia serif — deliberately contrasting the blueprint UI): sticky-ish top bar with logo + nav, a fixed-position `#badge` pill, `#hero` with `#heroTitle`, tagline and `#cta` button, a `#gallery` flex row of two cards (`#card-1`, `#card-2`) with tiny inline SVG artwork, and a `#foot`. Give everything the ids the blueprint's `KNOWN` map expects. Self-deprecating copy ("a fake little storefront that exists only so you can plan its redesign").

---

## Acceptance checklist

1. `python3 -m http.server 8080` → blueprint.html shows the demo page tinted blueprint-blue under a grid, with several elements pre-tracked.
2. Plan mode: click the hero → cyan box + panel; drag the gold box → dashed connector appears; numbers, grip, and drag all stay in sync; refresh the page → everything persists.
3. "apply plan to live" visibly moves the real element; "revert live" restores it.
4. Animate mode: draw a motion path, add the spec, ▶ preview moves the real element along the drawn path.
5. Draw mode: pen and arrow strokes persist per view; erase removes them.
6. AI HANDOFF export contains existing + PLANNED rects, notes, animations with path JSON, and the raw DB, and lands on the clipboard.
7. plan.html: drag the telescope → textarea code updates with snapped coords; rotate via slider; drag the camera dot; copy button yields valid `layout.js` that the page itself can re-import.
8. `blueprint.html?page=demo/index.html` and any other same-origin page both work, with separate saved state.
