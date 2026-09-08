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

## Three views

A tab switcher at the top toggles between them. The first two cover the Google Drive upload path; the third is a separate subject.

**Overview** — the thirteen-call request path at architecture level. This is the view described below.

**Deep dive** — the same path with the machinery underneath it. Fifteen components (adding **Zanzibar**, Google's authorization system, and **Fleet integrity**, the substrate everything runs on) across fourteen calls. Every stage marked `+` opens to reveal its real internals:

| Stage | Opens into |
| --- | --- |
| Google Front End | ECMP fanout → Maglev (L4, consistent hashing) → GFE reverse proxy (TLS 1.3 / HTTP-2 / QUIC) → DoS filtering, health-check draining |
| Identity | token validation, binding + short TTL, scope resolution, 2SV/passkey signals |
| Zanzibar | relation tuples, check evaluation, zookie consistency token, Spanner-backed store |
| Chunk + encrypt | chunker, per-chunk DEK, envelope encryption, integrity check |
| Keystore | key hierarchy, HSM-backed root, rotation schedule, unwrap authorization |
| Malware scanning | gVisor sandbox, signature + heuristics, Safe Browsing signals, verdict cache |
| Colossus | curator, D servers, erasure coding, background scrubbing |
| Metadata store | Spanner splits, TrueTime commits, chunk index, ACL pointer |
| Fleet integrity | Titan chip, verified boot, binary provenance, job isolation |

Opening a stage re-runs ELK rather than shuffling anything by hand — that is the whole reason this view is practical to build. Fully expanded it is 75 nodes and 56 internals.

Component names come from Google's published work: [Maglev](https://research.google/pubs/maglev-a-fast-and-reliable-software-network-load-balancer/) (NSDI 2016), [Zanzibar](https://www.usenix.org/system/files/atc19-pang.pdf) (ATC 2019), the [infrastructure security design overview](https://cloud.google.com/docs/security/infrastructure/design), and the Cloud encryption docs.

**PKI lifecycle** — *How a Certificate Earns Trust*. A separate subject: one certificate from key generation to revocation, across fifteen steps and six lifecycle phases, with **Web PKI and Enterprise PKI contrasted** on the same spine.

The interesting structure is the fork. A CSR is just a claim — anyone can write any name into one — so both worlds run the identical lifecycle and diverge at exactly one point: what the CA verifies before it signs, and whose root store already trusts it.

| | Web PKI (blue) | Enterprise PKI (violet) |
| --- | --- | --- |
| Validates | control of the domain name (ACME HTTP-01 / DNS-01) | an identity it already owns (directory, MDM enrolment) |
| Signs with | audited public intermediate, offline root | internal issuing CA, HSM-backed, offline root |
| Publicly logged | yes — CT is mandatory, browsers reject without it | no |
| Trusted because | the root ships in the browser/OS root store | the root was pushed to managed devices |

The flow loops: renewal returns to a fresh key pair and CSR, because PKI is a cycle rather than a setup step.

`PKI_DEEP` in `src/pkiData.js` is deliberately empty — the drill-down machinery is wired up, so adding deep-dive sections later (ACME challenge exchange, chain path building, CT log mechanics, key ceremony and HSM custody) is a data change rather than a code change.

### A layout lesson worth recording

The PKI zones were first modelled as **actors** (subject / Web PKI / Enterprise PKI / relying party). That failed structurally: ELK lays out by dependency layer, and the subject's nodes land in layers 0 through 6, so an actor-shaped container had to span the entire width and visually swallowed the others.

Zones are now **lifecycle phases**, which occupy contiguous layer ranges and nest cleanly, with actor identity carried by node colour instead. That also puts the public and private paths side by side inside each phase, which is where the contrast is easiest to read. The general rule: a container in a layered layout should group things that are adjacent *in the layering*, not things that share a label.

### Known limitation

Expanding a stage does **not** auto-zoom to it. The deep graph is far too wide to fit the viewport and stay legible, so it opens at a fixed readable zoom (0.8) anchored at the start of the request, and you pan to explore — the minimap and zoom controls are there for navigation. I tried five approaches to auto-frame the opened stage (`fitBounds`, explicit `setCenter`, deferring past layout, capturing the instance via `onInit`, and delaying past React Flow's own fit); each was either clamped by `maxZoom` or silently overridden by React Flow's internal fit pass. Rather than ship code that does nothing, that logic was removed.

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
