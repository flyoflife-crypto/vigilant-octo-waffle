## Quick context for AI agents

This repository is a Next.js (App Router, Next 14) static-export web app wired into an Electron shell. Key facts:

- Web app: `app/` (Next 14 app router). `next.config.js` sets `output: 'export'` and `trailingSlash: true` → build produces a static `out/` directory.
- Electron wrapper: `electron/main.js` is the main process entry. It registers an internal `app://` file protocol and resolves the web `out/` folder at runtime.
- Packaging: `electron-builder` is configured in `package.json` and outputs to `dist/`. `build` config includes `files: ["electron/**","out/**","package.json"]`.

## How to run and debug (concrete commands)

- Development (two terminals):
  - Terminal A: run the Next dev server
    - npm run dev:web
  - Terminal B: start Electron and point it to the dev URL
    - npm run dev:electron
    - (script already uses `cross-env ELECTRON_START_URL=http://localhost:3000`)

- Build and package:
  - Build only web: `npm run build:web` (produces files for static export)
  - Full build + dir packaging: `npm run build:all` (runs `build:web` then `pack:dir`)
  - Create distributable installer: `npm run pack` (uses electron-builder NSIS for Windows)

- Windows helper: run `components/ensure-deps-and-build.ps1` from PowerShell to auto-install baseline deps and run the web build (use `pwsh` on Windows).

## Important environment flags and debugging knobs

- ELECTRON_START_URL: used by `dev:electron` to point Electron at a running web server.
- DEBUG app-protocol logs: set environment variable `DEBUG_APP_PROTOCOL=1` to enable verbose logs inside `electron/main.js` related to `app://` handling.

## Project-specific conventions and patterns

- Static-first renderer: Next is exported as static files (out/). The Electron main process serves files via a custom `app://` protocol with SPA fallback — see `electron/main.js` (functions: `resolveOutDir`, `registerAppProtocol`, `safeJoin`). When changing routing/assets, check that `app://` logic handles `_next/` and common static extensions.
- UI and primitives: `ui/` contains the design system components; `components/` holds higher-level app features (gantt, mars, global). Use those patterns when adding components (composition + small props, TypeScript types are present in `types/`).
- Build helpers: `components/ensure-deps-and-build.ps1` parses an `imports_list.txt` (if present), installs missing packages and runs `npm run build:web`. Use it when setting up on Windows.

## Integration points worth noting

- IPC channels (main ↔ renderer): `save-png`, `export-fullpage-png` (see `electron/main.js`). Keep these names stable — frontend calls `window.electron` via the preload bridge.
- Deep links / file open: `onepager://` and `open-file` events are handled and sent to the renderer as `deep-link` and `open-file` events.
- Packaging expects `out/**` to exist and be included in the asar/unpacked files — ensure `npm run build:web` produces `out/` before packaging.

## Files to inspect for context/examples

- `package.json` — scripts and electron-builder config
- `next.config.js` — static export settings
- `electron/main.js` — app protocol, window lifecycle, IPC handlers
- `components/ensure-deps-and-build.ps1` — Windows developer setup and build helper
- `app/`, `ui/`, `components/` — sources for app structure and UI patterns

If anything here is unclear or you want more examples (e.g., typical renderer→main IPC call sites or how to add a new CLI build target), tell me which area to expand and I will iterate.
