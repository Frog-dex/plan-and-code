# Plan & Code — Blueprint AI Handoff Spec (v2)

This file is the contract between **blueprint.html** (the planning tool) and any AI model
asked to apply a blueprint. Read this fully before touching the target site. Follow it exactly.

## The system

| File | Role |
|---|---|
| `blueprint.html` | Planning tool. Loads the target page in a same-origin iframe, overlays existing/planned outlines, notes, animation specs, and freehand drawings. Persists to `localStorage`, exports the JSON below. |
| `demo/index.html` | Sample target page ("Aurora Coffee") used by default. |
| `plan.html` | Separate top-down floor-plan editor for 3D scenes (emits `models/layout.js`). Not part of the blueprint schema. |
| `docs/BLUEPRINT-README.md` | This spec. |

- The tool can plan ANY same-origin page: `blueprint.html?page=<your-page>.html`.
- Data is stored per target page under localStorage key `plan-and-code-blueprint-v2:<page>`.
- Local preview: `python3 -m http.server 8080` → http://localhost:8080/blueprint.html

## Blueprint JSON schema (v2)

```json
{
  "version": 2,
  "site": "./demo/index.html",
  "elements": {
    "<css-selector>": {
      "label": "human name (the designer may rename — refer to elements by this label)",
      "view": "default",
      "plan": { "x": 0, "y": 0, "w": 0, "h": 0 },
      "applied": null,
      "notes": ["free text, one instruction per entry"],
      "anims": [{
        "name": "spin-up",
        "trigger": "click|hover|power-on|power-off|always|scroll|drag",
        "dur": "2s",
        "ease": "ease-out | friction | cubic-bezier(...)",
        "desc": "prose description of the intended motion",
        "path": [[x, y], "..."]
      }]
    }
  },
  "drawings": {
    "<view>": [{ "tool": "pen|arrow", "color": "#hex", "points": [[x, y], "..."] }]
  }
}
```

## Reading rules

- All coordinates (`plan`, `path`, `points`) are **percent of the target-page viewport**
  (0–100, 1 decimal), captured at the viewport size noted in the handoff header.
- **EXISTING vs PLANNED (the core concept):** the handoff text lists two rects per element.
  `existing` = the element's current live geometry (cyan solid box in the tool).
  `PLANNED` = the target geometry the designer dragged/resized to (gold dashed box).
  **Apply rule:** make PLANNED real by editing the element's **own CSS system** — its normal
  stylesheet rule, its positioning scheme (absolute/flex/grid), its media queries. Use
  `left/top/width` in `%` for absolutely positioned elements; for flow elements, adjust the
  layout that produces the rect. Do NOT blindly force `position:absolute` on flow content.
- If `plan` is `null` or equals `existing`, the element is tracked for notes/animations only.
- `applied` is tool-internal (live-preview undo state — the original inline `style` attribute).
  Ignore it.
- `view` is the value of `<body data-view="...">` on the target page at capture time
  (`default` if unset). Multi-view pages store drawings and view tags per view; apply each
  element's changes inside the CSS scope for its view (e.g. `body[data-view="x"] .sel {...}`).
- `anims` are **specifications to implement**, not existing code. Implement with CSS
  animations or the Web Animations API, matching trigger/duration/easing/description.
  `ease: "friction"` means momentum decay (the tool previews it as
  `cubic-bezier(.17,.67,.36,.99)`). A `path` is the motion trajectory in viewport %;
  relative motion = subtract the first point from every point.
- `drawings` are the designer's freehand annotations (arrows = directional intent).
  Read them as design notes, not geometry to reproduce.
- `notes[]` lines are direct instructions from the designer. Honor every one.

## Apply procedure (checklist)

1. Back up the target page before editing.
2. For each element whose PLANNED differs from existing: locate its rule, update the geometry
   in its own CSS system. Keep `!important` where already present.
3. Implement each `anims[]` entry near the element's existing JS/CSS. Match names — the
   designer refers to animations by `name`.
4. Honor every `notes[]` line.
5. Verify in a real browser (`python3 -m http.server 8080`), same viewport as the handoff
   header. Screenshot before/after.
6. The `RAW JSON` block at the end of the handoff is authoritative; the prose above it is a
   readable summary of the same data.
