# Security Concept Visualizations

Two interactive, self-contained explainers for learning security concepts visually — built as single HTML files with no build step, no dependencies, and no server-side code.

| Page | What it is |
| --- | --- |
| [`trust-map.html`](trust-map.html) | **The Trust Map** — a radial concept map of network security |
| [`upload-anatomy.html`](upload-anatomy.html) | **Anatomy of an Upload** — a system-design map of a Google Drive upload |
| [`index.html`](index.html) | Landing page linking to both |

---

## Running it

Everything is plain HTML, CSS, and vanilla JavaScript. There is nothing to install or compile.

### Option 1 — just open the file

Double-click `index.html`, or open it in a browser:

```bash
start index.html
```

This works for everything on both pages. It's the fastest way to look at them.

### Option 2 — run a local server (recommended)

A few browsers apply stricter rules to pages opened over `file://`. Serving the folder avoids that entirely and is the closest match to how the pages are meant to run.

Using Python (already installed on most systems):

```bash
python -m http.server 8000
```

Then open <http://localhost:8000> in your browser.

If you'd rather use Node:

```bash
npx serve .
```

To stop either server, press `Ctrl+C` in the terminal.

### Requirements

- Any modern browser (Chrome, Edge, Firefox, or Safari).
- An internet connection is optional. It's only used to load the typefaces from Google Fonts — offline, the pages fall back to system fonts and every feature still works.

---

## The Trust Map

A radial map of network security. A central hub branches into five defense clusters — Finding Each Other, Encryption in Transit, Staying Online, Access Control, and How Data Travels. Four attacks sit on the outer ring, wired by dashed orange lines to the specific defenses that stop them.

**How to use it**

- Click a cluster's `+` badge to expand it into its individual concepts.
- Click any node to open a popover with a plain-English explanation and a real-world analogy.
- Chips inside each popover jump to whatever that concept connects to, so you can walk the graph by relationship.
- Selecting a node dims everything unrelated and lights only its connections.
- `Expand all` / `Collapse all`, zoom, `Fit`, and drag-to-pan are in the toolbar.

## Anatomy of an Upload

The security architecture behind a single Google Drive file upload, drawn as a real system-design diagram: thirteen numbered calls between components, crossing four trust boundaries.

**How to use it**

- **▶ Play request** walks the file through all thirteen calls, lighting each arrow and its endpoints in order.
- `←` and `→` step through manually. `Esc` resets.
- Click any component to see its role, the principles behind it, the threat it answers, and how it refuses.
- Three overlays can be toggled independently:
  - **Threats** — what each component is attacked with.
  - **Rejection paths** — where a request can be turned away.
  - **Data state** — what your file physically is on each wire (`TLS ciphertext` → `plaintext, staged` → `chunked + encrypted` → `encrypted at rest`).
- Dashed containers are trust boundaries. Every arrow crossing one carries a 🔒 badge naming what re-establishes trust — **TLS 1.3** into Google's edge, **ALTS** on every internal hop after it.

---

## Accuracy notes

`upload-anatomy.html` is built from Google's public security documentation:

- [Google Infrastructure Security Design Overview](https://cloud.google.com/docs/security/infrastructure/design)
- [Default Encryption at Rest](https://cloud.google.com/docs/security/encryption/default-encryption)
- [Application Layer Transport Security (ALTS)](https://cloud.google.com/docs/security/encryption-in-transit/application-layer-transport-security)
- [Google Workspace Security Whitepaper](https://workspace.google.com/learn-more/security/security-whitepaper/page-1/)

Two caveats worth keeping in mind:

- **Client-side encryption and DLP are Google Workspace enterprise features**, not consumer Drive. Both are marked as such on the diagram.
- **Google's exact internal call ordering is not public.** Component names reflect the published architecture, but the sequence is a faithful reading of the documentation rather than documented ground truth.

`trust-map.html` adapts the concept breakdown from [*Every Networking Concept Explained*](https://www.youtube.com/watch?v=bdeV_TjNfFA) by Tech With Diego, reframed around cybersecurity, with original explanations, analogies, and threat mapping.

---

## Project layout

```
.
├── index.html            landing page linking to both visualizations
├── trust-map.html        The Trust Map (concept map)
├── upload-anatomy.html   Anatomy of an Upload (system design map)
└── README.md
```

Each HTML file is fully standalone — you can open, move, or share any one of them on its own.
