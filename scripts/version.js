#!/usr/bin/env node

/**
 * Version script - syncs git tag version to package.json
 *
 * Usage: node scripts/version.js
 *
 * This script:
 * 1. Gets the version from git tags using `git describe --tags`
 * 2. Cleans the version (removes 'v' prefix if present)
 * 3. Updates package.json with the version
 *
 * Git tag format expected: v1.0.0 or 1.0.0
 * Output format: 1.0.0 or 1.0.0-N-gHASH (if commits after tag)
 */

import { execSync } from 'child_process'
import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const packageJsonPath = join(__dirname, '..', 'package.json')

function getGitVersion() {
  try {
    // Get version from git describe
    // --tags: use any tag, not just annotated
    // --always: show commit hash if no tags exist
    const version = execSync('git describe --tags --always', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim()

    // Remove 'v' prefix if present (e.g., v1.0.0 -> 1.0.0)
    return version.replace(/^v/, '')
  } catch (error) {
    console.warn('Warning: Could not get git version, using 0.0.0-dev')
    return '0.0.0-dev'
  }
}

function updatePackageJson(version) {
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'))
  const oldVersion = packageJson.version

  if (oldVersion === version) {
    console.log(`Version unchanged: ${version}`)
    return false
  }

  packageJson.version = version
  writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n')
  console.log(`Updated version: ${oldVersion} -> ${version}`)
  return true
}

// Main
const version = getGitVersion()
updatePackageJson(version)
