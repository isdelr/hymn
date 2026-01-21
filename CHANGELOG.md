# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.4.1] - 2026-01-20

### Fixed
- Resolve CI build failure on macOS due to JavaScript heap out of memory
- Reduce Monaco Editor bundle size by removing unused language workers (CSS, HTML, TypeScript)

### Changed
- Increase Node.js heap limit to 4GB for CI builds
- Disable source maps and optimize chunk splitting in Vite build

## [0.4.0] - 2026-01-20

### Fixed
- Resolve JAVA_HOME path correctly for macOS .jdk bundles (Contents/Home)
- Quote CLASSPATH in gradlew template to handle paths with spaces

## [0.3.0] - 2026-01-20

### Added
- Seamless one-click auto-updates (VS Code-like experience)
  - Single "Update" button downloads, installs silently, and restarts automatically
  - Silent NSIS installer on Windows (no wizard dialogs)
- Extended project templates for packs and plugins
- macOS ZIP target for auto-update support

### Changed
- Bundle Monaco Editor locally with Vite worker support for better performance
- Schema-driven properties panel for asset editor

### Fixed
- Use configured JDK path instead of system JAVA_HOME for builds
- Prevent Monaco Editor flicker on file save

## [0.2.2] - 2026-01-20

### Changed
- Centralize JDK path resolution with macOS bundle support

## [0.2.1] - 2026-01-20

### Changed
- Replace spawn with execa for improved process handling

### Added
- Form validation for settings inputs

## [0.2.0] - 2026-01-20

### Added
- Automatic update checking and installation

## [0.1.4] - 2026-01-20

### Added
- JDK version selector with support for JDK 21 (LTS), 23, and 25
- Dynamic JDK release fetching via Adoptium API instead of hardcoded URLs
- Automatic Gradle version configuration based on selected JDK version
  - JDK 21 → Gradle 8.5
  - JDK 23 → Gradle 8.12.0
  - JDK 25 → Gradle 9.3.0

### Fixed
- Router now uses hash-based history for proper Electron file:// compatibility

### Changed
- Gradle version is now auto-configured and shown as read-only in settings
- JDK download progress shows actual version being downloaded

## [0.1.3] - 2026-01-19

### Fixed
- Improved JDK download UX and app loading states

## [0.1.2] - 2026-01-19

### Added
- DevTools toggle shortcut (F12/Cmd+Option+I) in development builds

### Security
- Allow unsafe-inline scripts in development CSP for Vite hot reload
- Document CSP and security configuration choices

### Fixed
- Improved UX when Hytale is not installed

## [0.1.1] - 2026-01-18

### Changed
- Switch to native title bars for better platform integration
- Simplified application menu

### Fixed
- Redirect to settings when Hytale folder is not configured

## [0.1.0] - 2026-01-18

### Added
- Initial mod manager functionality
- Profile system with load order management
- Mod library scanning (Packs, Plugins, Early Plugins)
- Backup and rollback system
- Dark mode UI with Mini Motorways/Hytale-inspired design
- Cross-platform support (Windows, macOS, Linux)

### Security
- Context isolation enabled
- IPC whitelisting for secure main/renderer communication

[Unreleased]: https://github.com/isdelr/hymn/compare/v0.4.1...HEAD
[0.4.1]: https://github.com/isdelr/hymn/compare/v0.4.0...v0.4.1
[0.4.0]: https://github.com/isdelr/hymn/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/isdelr/hymn/compare/v0.2.2...v0.3.0
[0.2.2]: https://github.com/isdelr/hymn/compare/v0.2.1...v0.2.2
[0.2.1]: https://github.com/isdelr/hymn/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/isdelr/hymn/compare/v0.1.4...v0.2.0
[0.1.4]: https://github.com/isdelr/hymn/compare/v0.1.3...v0.1.4
[0.1.3]: https://github.com/isdelr/hymn/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/isdelr/hymn/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/isdelr/hymn/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/isdelr/hymn/releases/tag/v0.1.0
