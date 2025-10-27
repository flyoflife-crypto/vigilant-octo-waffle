#!/usr/bin/env node

const fs = require('node:fs')
const path = require('node:path')

const projectRoot = path.resolve(__dirname, '..')
const binDir = path.join(projectRoot, 'node_modules', '.bin')
const shimPath = path.join(projectRoot, 'scripts', 'next-shim.cjs')

if (!fs.existsSync(binDir)) {
  process.exit(0)
}

const unixTarget = path.join(binDir, 'next')
const cmdTarget = path.join(binDir, 'next.cmd')
const psTarget = path.join(binDir, 'next.ps1')

const unixContent = `#!/usr/bin/env node\nrequire(${JSON.stringify(shimPath)});\n`
const cmdContent = `@ECHO OFF\r\n"${process.execPath}" "${shimPath.replace(/\\/g, '\\\\')}" %*\r\n`
const psContent = `#!/usr/bin/env pwsh\n& "${process.execPath}" "${shimPath.replace(/\\/g, '\\\\')}" $args\n`

fs.writeFileSync(unixTarget, unixContent, { mode: 0o755 })
if (process.platform === 'win32') {
  fs.writeFileSync(cmdTarget, cmdContent, { mode: 0o755 })
  fs.writeFileSync(psTarget, psContent, { mode: 0o755 })
} else {
  if (fs.existsSync(cmdTarget)) fs.writeFileSync(cmdTarget, cmdContent, { mode: 0o755 })
  if (fs.existsSync(psTarget)) fs.writeFileSync(psTarget, psContent, { mode: 0o755 })
}
