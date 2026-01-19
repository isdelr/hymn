import { app } from 'electron'
import { pathToFileURL } from 'node:url'
import path from 'node:path'
import { createClient, type Client } from '@libsql/client'

const DB_FILENAME = 'hymn.sqlite'

export type DatabaseInstance = Client

let database: DatabaseInstance | null = null
let databaseInit: Promise<void> | null = null

export const SETTINGS_KEYS = {
  installPath: 'install_path_override',
  activeProfile: 'active_profile_id',
  serverJarPath: 'server_jar_path',
  profilesSeeded: 'profiles_seeded',
  selectedWorld: 'selected_world_id',
  theme: 'app_theme',
  modSortOrder: 'mod_sort_order',
  defaultExportPath: 'default_export_path',
  jdkPath: 'jdk_path',
  managedJdkPath: 'managed_jdk_path',
  gradleVersion: 'gradle_version',
} as const

export function getDatabasePath(): string {
  return path.join(app.getPath('userData'), DB_FILENAME)
}

async function initializeDatabase(db: DatabaseInstance): Promise<void> {
  await db.execute('PRAGMA journal_mode = WAL')
  await db.batch(
    [
      {
        sql: `
        create table if not exists app_settings (
          key text primary key,
          value text not null
        );
        `,
      },
      {
        sql: `
        create table if not exists profiles (
          id text primary key,
          name text not null,
          enabled_mods text not null,
          load_order text not null,
          notes text,
          readonly integer default 0
        );
        `,
      },
    ],
    'write',
  )

  // Migration: add readonly column if it doesn't exist
  try {
    await db.execute('ALTER TABLE profiles ADD COLUMN readonly integer default 0')
  } catch {
    // Column already exists, ignore error
  }
}

function openDatabase(): DatabaseInstance {
  const db = createClient({ url: pathToFileURL(getDatabasePath()).toString() })
  databaseInit = initializeDatabase(db)
  return db
}

export async function getDatabase(): Promise<DatabaseInstance> {
  if (!database) {
    database = openDatabase()
  }
  if (databaseInit) {
    await databaseInit
  }
  return database
}

export async function readSetting(key: string): Promise<string | null> {
  const db = await getDatabase()
  const result = await db.execute({
    sql: 'select value from app_settings where key = ?',
    args: [key],
  })
  const row = result.rows[0] as { value?: string } | undefined
  return typeof row?.value === 'string' ? row.value : null
}

export async function writeSetting(key: string, value: string | null): Promise<void> {
  const db = await getDatabase()
  if (value === null) {
    await db.execute({
      sql: 'delete from app_settings where key = ?',
      args: [key],
    })
    return
  }
  await db.execute({
    sql: 'insert into app_settings (key, value) values (?, ?) on conflict(key) do update set value = excluded.value',
    args: [key, value],
  })
}
