# Anatomy of an Upload — React Flow + ELK

The same Google Drive upload topology as [`../upload-anatomy.html`](../upload-anatomy.html), rebuilt with [React Flow](https://reactflow.dev) for rendering and [ELK](https://github.com/kieler/elkjs) for automatic layout.

Unlike the vanilla version, **no coordinate in this project is hand-written.** `src/data.js` describes only *what connects to what*; ELK computes every x/y at runtime.

---

## Running it

Unlike the standalone HTML files in the parent folder, this one needs Node and a build step.

Install dependencies once:

```bash
npm install
```

Then start the dev server:

```bash
npm run dev
```

Open <http://localhost:5180>.

To produce a static build in `dist/`:

```bash
npm run build
```

And to preview that build:

```bash
npm run preview
```

### Requirements

- **Node.js 18 or newer** (developed against 24 LTS).
- If `npm install` fails on Windows with `EBUSY` or `EPERM` against `_cacache`, install with an isolated cache — this is a file-locking issue, usually antivirus holding handles on freshly-extracted files:

```bash
npm install --cache ./.npm-cache
```

---

## What it does

Thirteen numbered calls carry one file from a browser to encrypted chunks on disk, across four trust boundaries.

- **▶ Play request** steps through all thirteen calls, lighting each edge and its endpoints.
- `←` / `→` step manually, `Esc` resets.
- Click any component for its role, principles, the threat it answers, and how it refuses.
- Three independent overlays: **Threats**, **Rejection paths**, and **Data state**.
- Nodes are draggable and edges reroute as you drag — the practical payoff of a real graph library.
- **Trust boundaries are not fixed frames.** Children are deliberately not pinned with `extent: "parent"`; drag a component past its container's edge and the container regrows around it on release. Because child positions are parent-relative, growing leftward or upward also shifts the container origin and counter-shifts every sibling, so the zone expands without the contents appearing to jump.
- MiniMap and zoom controls for navigating the wide layout.

---

## How the layout works

`src/layout.js` builds an ELK graph and converts the result into React Flow nodes and edges.

```js
"elk.algorithm": "layered",
"elk.direction": "RIGHT",
"elk.hierarchyHandling": "INCLUDE_CHILDREN",
```

`hierarchyHandling: INCLUDE_CHILDREN` is the important one: it lets edges cross between trust-boundary containers while ELK still sizes each container around its own children. The four boundary boxes compute their own dimensions instead of being measured by hand.

ELK returns child coordinates relative to their parent, which is exactly what React Flow expects alongside `parentId` — so the conversion is a direct mapping rather than a translation.

### Two honest caveats

**Edge routing is React Flow's, not ELK's.** `src/edges.jsx` recomputes each path with `getSmoothStepPath` between handles, so ELK's routed bend points are discarded. The `edgeRouting` and edge-spacing options in `layout.js` therefore only influence node placement. Consuming ELK's bend points would give genuinely obstacle-aware routing, and is the main thing left on the table.

**Annotation spacing is indirect.** ELK spaces *nodes*; it knows nothing about the threat chips, rejection chips, and edge labels layered on top. Chip collisions are currently zero with all three overlays on, but that was reached by giving ELK generous `nodeNode` spacing and zone padding until the annotations happened to fit — not by laying the annotations out. Chips are z-ordered above edge labels with opaque backgrounds so that any future overlap stays legible. Auto-layout solved node placement; label placement is still tuned by hand.

---

## Compared to the vanilla version

|  | `../upload-anatomy.html` | this project |
| --- | --- | --- |
| Node positions | hand-written coordinates | computed by ELK |
| Adding a node | reposition neighbours by hand | add to `data.js`, re-layout |
| Edge/box collisions | found and fixed manually | structurally prevented |
| Draggable nodes | no | yes, edges reroute |
| Dependencies | none | React, React Flow, ELK, Vite |
| Build step | none — open the file | `npm install && npm run build` |
| Runs as a Claude Artifact | yes | no — CSP blocks the bundle |

Neither is strictly better. The vanilla file opens by double-click and will still work untouched in ten years; this one is far easier to extend and would scale to a much larger graph without the placement becoming unmanageable.

---

## Layout

```
├── index.html            Vite entry
├── vite.config.js
├── package.json
└── src/
    ├── data.js           topology as pure data — contains no coordinates
    ├── layout.js         ELK graph construction + React Flow conversion
    ├── nodes.jsx         zone + component nodes, NodeToolbar badges
    ├── edges.jsx         custom edge with EdgeLabelRenderer
    ├── icons.jsx         inline SVG icon set
    ├── App.jsx           state, stepping, overlays, panel
    └── styles.css
```

Accuracy notes about the architecture itself are in the [parent README](../README.md) — the same caveats apply, since both versions render the same content.
