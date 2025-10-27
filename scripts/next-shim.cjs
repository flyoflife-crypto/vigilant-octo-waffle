#!/usr/bin/env node

const { spawnSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

const args = process.argv.slice(2)
const projectRoot = path.resolve(__dirname, '..')

function resolveNextCli() {
  try {
    return require.resolve('next/dist/bin/next', { paths: [projectRoot] })
  } catch (error) {
    console.error('next shim: unable to resolve Next.js CLI. Did you install dependencies?')
    process.exit(1)
  }
}

function runNext(subArgs) {
  const nextCli = resolveNextCli()
  const result = spawnSync(process.execPath, [nextCli, ...subArgs], {
    stdio: 'inherit',
    env: process.env,
  })
  if (typeof result.status === 'number') {
    process.exit(result.status)
  }
  if (result.error) {
    throw result.error
  }
  process.exit(0)
}

if (args[0] === 'export') {
  let targetDir = 'out'
  const optionIndex = args.findIndex((arg) => arg === '-o' || arg === '--out' || arg === '--output' || arg === '--outdir')
  if (optionIndex !== -1 && args[optionIndex + 1] && !args[optionIndex + 1].startsWith('-')) {
    targetDir = args[optionIndex + 1]
  } else if (args[1] && !args[1].startsWith('-')) {
    targetDir = args[1]
  }

  const defaultOut = path.join(projectRoot, 'out')
  const resolvedTarget = path.resolve(projectRoot, targetDir)

  if (!fs.existsSync(defaultOut)) {
    console.warn('next export shim: out/ directory missing. Running `next build` to generate static output.')
    const nextCli = resolveNextCli()
    const buildResult = spawnSync(process.execPath, [nextCli, 'build'], {
      stdio: 'inherit',
      env: process.env,
    })
    if ((buildResult.status ?? 0) !== 0) {
      process.exit(buildResult.status ?? 1)
    }
  }

  if (!fs.existsSync(defaultOut)) {
    console.error('next export shim: static output not found after `next build`. Aborting.')
    process.exit(1)
  }

  if (resolvedTarget !== defaultOut) {
    fs.rmSync(resolvedTarget, { recursive: true, force: true })
    fs.mkdirSync(resolvedTarget, { recursive: true })
    fs.cpSync(defaultOut, resolvedTarget, { recursive: true })
  }

  process.exit(0)
}

runNext(args)
