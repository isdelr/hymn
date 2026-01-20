#!/usr/bin/env node

/**
 * Release script - handles version bumping, committing, tagging, and pushing
 *
 * Usage: node scripts/release.js
 *
 * This script:
 * 1. Prompts for version bump type (major, minor, patch)
 * 2. Prompts for commit message
 * 3. Updates package.json with the new version
 * 4. Creates a git commit with the changes
 * 5. Creates a git tag for the release
 * 6. Pushes commits and tags to remote
 */

import { execSync } from 'child_process'
import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createInterface } from 'readline'

const __dirname = dirname(fileURLToPath(import.meta.url))
const packageJsonPath = join(__dirname, '..', 'package.json')

const rl = createInterface({
  input: process.stdin,
  output: process.stdout
})

function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim())
    })
  })
}

function getCurrentVersion() {
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'))
  return packageJson.version
}

function parseVersion(version) {
  const [major, minor, patch] = version.split('.').map(Number)
  return { major, minor, patch }
}

function formatVersion({ major, minor, patch }) {
  return `${major}.${minor}.${patch}`
}

function bumpVersion(version, type) {
  const parsed = parseVersion(version)

  switch (type) {
    case 'major':
      return formatVersion({ major: parsed.major + 1, minor: 0, patch: 0 })
    case 'minor':
      return formatVersion({ major: parsed.major, minor: parsed.minor + 1, patch: 0 })
    case 'patch':
      return formatVersion({ major: parsed.major, minor: parsed.minor, patch: parsed.patch + 1 })
    default:
      throw new Error(`Invalid version type: ${type}`)
  }
}

function updatePackageJson(version) {
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'))
  packageJson.version = version
  writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n')
}

function exec(command, options = {}) {
  console.log(`\n> ${command}`)
  try {
    const output = execSync(command, {
      encoding: 'utf8',
      stdio: options.silent ? ['pipe', 'pipe', 'pipe'] : 'inherit',
      ...options
    })
    return output
  } catch (error) {
    if (options.ignoreError) {
      return null
    }
    throw error
  }
}

function hasUncommittedChanges() {
  const status = execSync('git status --porcelain', { encoding: 'utf8' })
  return status.trim().length > 0
}

function getCurrentBranch() {
  return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim()
}

async function main() {
  console.log('\n========================================')
  console.log('           HYMN RELEASE SCRIPT          ')
  console.log('========================================\n')

  const currentVersion = getCurrentVersion()
  console.log(`Current version: ${currentVersion}`)

  // Check for uncommitted changes
  if (hasUncommittedChanges()) {
    console.log('\nWarning: You have uncommitted changes.')
    const proceed = await prompt('Include them in the release commit? (y/n): ')
    if (proceed.toLowerCase() !== 'y') {
      console.log('Aborting. Please commit or stash your changes first.')
      rl.close()
      process.exit(1)
    }
  }

  // Show version options
  console.log('\nVersion bump options:')
  console.log(`  1. patch  -> ${bumpVersion(currentVersion, 'patch')} (bug fixes)`)
  console.log(`  2. minor  -> ${bumpVersion(currentVersion, 'minor')} (new features)`)
  console.log(`  3. major  -> ${bumpVersion(currentVersion, 'major')} (breaking changes)`)

  // Get version type
  let versionType
  while (!versionType) {
    const choice = await prompt('\nSelect version bump (1/2/3 or patch/minor/major): ')
    const normalized = choice.toLowerCase()

    if (normalized === '1' || normalized === 'patch') {
      versionType = 'patch'
    } else if (normalized === '2' || normalized === 'minor') {
      versionType = 'minor'
    } else if (normalized === '3' || normalized === 'major') {
      versionType = 'major'
    } else {
      console.log('Invalid choice. Please enter 1, 2, 3, patch, minor, or major.')
    }
  }

  const newVersion = bumpVersion(currentVersion, versionType)
  console.log(`\nNew version will be: ${newVersion}`)

  // Get commit message
  let commitMessage
  while (!commitMessage) {
    commitMessage = await prompt('\nEnter commit message: ')
    if (!commitMessage) {
      console.log('Commit message cannot be empty.')
    }
  }

  // Confirm
  const branch = getCurrentBranch()
  console.log('\n----------------------------------------')
  console.log('Release Summary:')
  console.log(`  Version: ${currentVersion} -> ${newVersion}`)
  console.log(`  Branch: ${branch}`)
  console.log(`  Commit: ${commitMessage}`)
  console.log(`  Tag: v${newVersion}`)
  console.log('----------------------------------------')

  const confirm = await prompt('\nProceed with release? (y/n): ')
  if (confirm.toLowerCase() !== 'y') {
    console.log('Release cancelled.')
    rl.close()
    process.exit(0)
  }

  rl.close()

  // Execute release
  console.log('\nStarting release...\n')

  // Update package.json
  console.log('Updating package.json...')
  updatePackageJson(newVersion)

  // Stage all changes
  exec('git add -A')

  // Create commit
  exec(`git commit -m "${commitMessage}"`)

  // Create tag
  exec(`git tag -a v${newVersion} -m "Release v${newVersion}"`)

  // Push commits
  console.log('\nPushing to remote...')
  exec(`git push origin ${branch}`)

  // Push tags
  exec('git push --tags')

  console.log('\n========================================')
  console.log(`  Release v${newVersion} complete!`)
  console.log('========================================\n')
}

main().catch((error) => {
  console.error('\nRelease failed:', error.message)
  rl.close()
  process.exit(1)
})
