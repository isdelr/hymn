export const queryKeys = {
  installInfo: ['installInfo'] as const,

  worlds: {
    all: ['worlds'] as const,
    detail: (worldId: string) => ['worlds', worldId] as const,
  },

  mods: {
    all: ['mods'] as const,
    scan: (worldId: string | null) => ['mods', 'scan', worldId] as const,
  },

  profiles: {
    all: ['profiles'] as const,
    detail: (profileId: string) => ['profiles', profileId] as const,
  },

  projects: {
    all: ['projects'] as const,
    detail: (projectId: string) => ['projects', projectId] as const,
  },

  assets: {
    all: (projectPath: string) => ['assets', projectPath] as const,
    detail: (projectPath: string, assetPath: string) =>
      ['assets', projectPath, assetPath] as const,
  },

  javaSources: {
    all: (projectPath: string) => ['javaSources', projectPath] as const,
    file: (filePath: string) => ['javaSources', 'file', filePath] as const,
  },

  projectFiles: {
    all: (projectPath: string) => ['projectFiles', projectPath] as const,
  },

  settings: {
    all: ['settings'] as const,
    theme: ['settings', 'theme'] as const,
    modSortOrder: ['settings', 'modSortOrder'] as const,
    defaultExportPath: ['settings', 'defaultExportPath'] as const,
    jdkPath: ['settings', 'jdkPath'] as const,
    managedJdkPath: ['settings', 'managedJdkPath'] as const,
    serverJarPath: ['settings', 'serverJarPath'] as const,
    gradleVersion: ['settings', 'gradleVersion'] as const,
  },

  builds: {
    all: ['builds'] as const,
    artifacts: ['builds', 'artifacts'] as const,
    dependencies: ['builds', 'dependencies'] as const,
    installedMods: ['builds', 'installedMods'] as const,
  },

  deletedMods: {
    all: ['deletedMods'] as const,
  },
}
