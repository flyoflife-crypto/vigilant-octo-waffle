# Windows build status and troubleshooting

This project builds the web assets with `next build` and then packages the
Electron application with `electron-builder`.

## Current status

* `npm run build:web` — ✅ successfully produces the static `out/` directory.
* `npm run dist:win` — ❌ fails while `electron-builder` tries to download the
  Windows Electron runtime `electron-v30.5.1-win32-x64.zip` from GitHub
  Releases. The request is rejected with HTTP 403 in this environment, so the
  Windows installer/portable ZIP is not generated.

## How to unblock the packaging step

Because the failure happens when downloading the Electron binary, you can fix
it by providing credentials or an alternate mirror before running
`npm run dist:win`:

1. **GitHub token** (recommended):
   ```bash
   export GH_TOKEN="<personal access token>"
   npm run dist:win
   ```
   Electron Builder will reuse the token for authenticated downloads.

2. **Mirror downloads** (if GitHub is blocked):
   ```bash
   export ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"
   export ELECTRON_BUILDER_BINARIES_MIRROR="https://npmmirror.com/mirrors/electron-builder-binaries/"
   npm run dist:win
   ```

3. **Pre-download the runtime** (works together with the options above):
   ```bash
   npx electron-builder install-app-deps --platform=win32 --arch=x64
   npm run dist:win
   ```

After the Electron binary is cached locally, the packaging step completes and
creates artifacts under `dist/` (for example, `dist/win-unpacked/` and
`dist/*.zip`).
