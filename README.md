# St. Roch — Two journeys through the Northwest Passage

An interactive Leaflet map telling two parallel stories: the RCMP schooner
**St. Roch** crossing the Northwest Passage in both directions (1940–1944), and
the **Panikpakuttuk family**'s two-year journey home (1944–1946).

This was originally a single `index.html`. It has been split into separate
HTML / CSS / JS files for easier maintenance, with **no behavioural changes** —
the code is byte-for-byte the same, only relocated.

## Running it

It's a fully static site — no build step. Either:

- Open `index.html` directly in a browser (`file://`), or
- Serve the folder, e.g. `npx serve` or `python -m http.server`, then open the
  shown URL.

An internet connection is required: it loads Leaflet, web fonts, and map tiles
(Esri / CARTO) from CDNs.

## Project structure

```
.
├── index.html              # Markup + external resource / script references
├── css/
│   └── styles.css          # All styles (formerly the <style> block)
└── js/
    ├── voyage-data.js      # The VOYAGE dataset (stops, routes, family story)
    ├── core.js             # Globals (V/C), dual-screen sync, CSS vars, helpers
    ├── sidebar.js          # Header: title, stats, legend rendering
    ├── map.js              # Leaflet map, tile layers, controls, stops/markers, popups
    ├── timeline.js         # Sidebar voyage timeline (stop list)
    ├── logcard.js          # Readout banner + draggable log card
    ├── playback.js         # Ship animation engine + transport controls
    ├── ui-controls.js      # Year filter, nav drawer, modals, story, replay speed
    ├── route-editor.js     # Interactive route editing for the ship voyages
    ├── family.js           # Panikpakuttuk family experience + route overlay
    └── dual-screen.js      # Second-display detail window + Arctic tile prefetch
```

## How the JavaScript is wired

The scripts are **classic scripts** (not ES modules), loaded in order by
`index.html`. They share a single global scope, so each file can use the
variables and functions declared in the files loaded before it. **Load order in
`index.html` matters** — keep `voyage-data.js` first and `core.js` second.

Classic scripts are used (rather than `type="module"`) so the page keeps working
when opened straight from `file://`, which ES modules disallow.

### If you want to modernise it

A natural next step would be to convert these into ES modules with explicit
`import`/`export` and serve via a dev server / bundler (Vite, esbuild, etc.).
That would require adding exports, importing dependencies per file, and
switching the script tags to `type="module"`. The current file split already
maps cleanly onto that module boundary.

## Data

All voyage data lives in `js/voyage-data.js` as a single `VOYAGE` object
(metadata, colors, the two ship voyages with stops + route legs, and the
`family` overlay). The in-app route/point editors can export updated JSON for
this object via their "Copy" / "Download" buttons.
