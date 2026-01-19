import { randomUUID } from 'node:crypto'
import { getDatabase, readSetting, writeSetting, SETTINGS_KEYS } from '../core/database'
import type { Profile, ProfilesState, ModEntry } from '../../src/shared/hymn-types'

// Module-level state
let activeProfileId: string | null = null
let profilesSeeded = false

/**
 * Load persisted profile settings from database.
 */
export async function loadProfileSettings(): Promise<void> {
  activeProfileId = await readSetting(SETTINGS_KEYS.activeProfile)
  profilesSeeded = (await readSetting(SETTINGS_KEYS.profilesSeeded)) === 'true'
}

/**
 * Get the current active profile ID.
 */
export function getActiveProfileId(): string | null {
  return activeProfileId
}

/**
 * Check if profiles have been seeded.
 */
export function isProfilesSeeded(): boolean {
  return profilesSeeded
}

function normalizeStringArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : []
  } catch {
    return []
  }
}

function serializeStringArray(values: string[]): string {
  return JSON.stringify(values)
}

function normalizeProfile(profile: Profile): Profile {
  return {
    ...profile,
    enabledMods: Array.isArray(profile.enabledMods)
      ? profile.enabledMods.filter((item) => typeof item === 'string')
      : [],
    readonly: profile.readonly === true,
  }
}

/**
 * Get all profiles from database.
 */
export async function getProfilesFromDatabase(): Promise<Profile[]> {
  const db = await getDatabase()
  const result = await db.execute(
    'select id, name, enabled_mods as enabledMods, readonly from profiles order by readonly desc, name',
  )

  return result.rows.map((row) => {
    const record = row as Record<string, unknown>
    const enabledMods = typeof record.enabledMods === 'string' ? record.enabledMods : '[]'

    return {
      id: typeof record.id === 'string' ? record.id : '',
      name: typeof record.name === 'string' ? record.name : '',
      enabledMods: normalizeStringArray(enabledMods),
      readonly: record.readonly === 1,
    }
  })
}

/**
 * Get the current profiles state (profiles list and active profile ID).
 */
export async function getProfilesState(): Promise<ProfilesState> {
  const profiles = await getProfilesFromDatabase()
  if (profiles.length === 0) {
    activeProfileId = null
    await writeSetting(SETTINGS_KEYS.activeProfile, null)
    return { activeProfileId, profiles }
  }
  if (!activeProfileId || !profiles.some((profile) => profile.id === activeProfileId)) {
    activeProfileId = profiles[0].id
    await writeSetting(SETTINGS_KEYS.activeProfile, activeProfileId)
  }
  return { activeProfileId, profiles }
}

/**
 * Save a profile to database.
 */
export async function saveProfile(profile: Profile): Promise<Profile> {
  const db = await getDatabase()
  const normalized = normalizeProfile(profile)
  await db.execute({
    sql: `
    insert into profiles (id, name, enabled_mods, load_order, readonly)
    values (?, ?, ?, ?, ?)
    on conflict(id) do update set
      name = excluded.name,
      enabled_mods = excluded.enabled_mods,
      load_order = excluded.load_order,
      readonly = excluded.readonly
    `,
    args: [
      normalized.id,
      normalized.name,
      serializeStringArray(normalized.enabledMods),
      '[]',
      normalized.readonly ? 1 : 0,
    ],
  })
  return normalized
}

/**
 * Check if a profile exists.
 */
export async function profileExists(id: string): Promise<boolean> {
  const db = await getDatabase()
  const result = await db.execute({
    sql: 'select id from profiles where id = ?',
    args: [id],
  })
  return result.rows.length > 0
}

function slugifyProfileId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

/**
 * Create a new profile.
 */
export async function createProfile(name: string): Promise<ProfilesState> {
  const trimmedName = name.trim()
  const profileName = trimmedName.length ? trimmedName : 'New Profile'
  const baseSlug = slugifyProfileId(profileName)
  const baseId = baseSlug.length ? baseSlug : `profile-${randomUUID().slice(0, 8)}`
  let id = baseId
  let suffix = 2
  while (await profileExists(id)) {
    id = `${baseId}-${suffix}`
    suffix += 1
  }
  const profile: Profile = {
    id,
    name: profileName,
    enabledMods: [],
    readonly: false,
  }
  await saveProfile(profile)
  activeProfileId = profile.id
  await writeSetting(SETTINGS_KEYS.activeProfile, activeProfileId)
  return getProfilesState()
}

/**
 * Update an existing profile.
 */
export async function updateProfile(profile: Profile): Promise<Profile> {
  // Prevent modifications to readonly profiles
  const existing = (await getProfilesFromDatabase()).find((p) => p.id === profile.id)
  if (existing?.readonly) {
    throw new Error('Cannot modify readonly profile')
  }
  return saveProfile(profile)
}

/**
 * Set the active profile.
 */
export async function setActiveProfile(profileId: string): Promise<ProfilesState> {
  const profiles = await getProfilesFromDatabase()
  const match = profiles.find((profile) => profile.id === profileId)
  if (match) {
    activeProfileId = match.id
    await writeSetting(SETTINGS_KEYS.activeProfile, activeProfileId)
  }
  return { activeProfileId, profiles }
}

/**
 * Ensure a default profile exists. Called during initialization.
 */
export async function ensureDefaultProfile(): Promise<void> {
  const profiles = await getProfilesFromDatabase()
  if (profiles.length > 0) {
    return
  }
  // Don't create default profile here - it will be created when scanning
  // with the actual mod state from the folders
}

/**
 * Seed profiles from initial mod scan.
 */
export async function seedProfilesFromScan(entries: ModEntry[]): Promise<void> {
  if (profilesSeeded) {
    return
  }

  const profiles = await getProfilesFromDatabase()
  const hasDefaultProfile = profiles.some((p) => p.id === 'default' && p.readonly)

  if (!hasDefaultProfile) {
    // Create readonly Default profile with current mod state
    const enabledMods = entries.filter((entry) => entry.enabled).map((entry) => entry.id)
    await saveProfile({
      id: 'default',
      name: 'Default',
      enabledMods,
      readonly: true,
    })
    activeProfileId = 'default'
    await writeSetting(SETTINGS_KEYS.activeProfile, activeProfileId)
  }

  profilesSeeded = true
  await writeSetting(SETTINGS_KEYS.profilesSeeded, 'true')
}

/**
 * Sync the default profile with the current mod state.
 */
export async function syncDefaultProfileFromScan(entries: ModEntry[]): Promise<void> {
  const profiles = await getProfilesFromDatabase()
  const defaultProfile = profiles.find((profile) => profile.id === 'default' && profile.readonly)
  if (!defaultProfile) return

  const enabledMods = entries.filter((entry) => entry.enabled).map((entry) => entry.id)
  const uniqueEnabled = Array.from(new Set(enabledMods))
  const current = defaultProfile.enabledMods
  const hasChanges =
    uniqueEnabled.length !== current.length || uniqueEnabled.some((id) => !current.includes(id))

  if (!hasChanges) return

  await saveProfile({
    ...defaultProfile,
    enabledMods: uniqueEnabled,
    readonly: true,
  })
}

/**
 * Delete a profile.
 */
export async function deleteProfile(profileId: string): Promise<ProfilesState> {
  const db = await getDatabase()
  await db.execute({
    sql: 'delete from profiles where id = ?',
    args: [profileId],
  })
  return getProfilesState()
}
