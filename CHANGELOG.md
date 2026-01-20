# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/isaiahaiasi/hymn/compare/v0.1.4...HEAD
[0.1.4]: https://github.com/isaiahaiasi/hymn/compare/v0.1.3...v0.1.4
[0.1.3]: https://github.com/isaiahaiasi/hymn/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/isaiahaiasi/hymn/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/isaiahaiasi/hymn/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/isaiahaiasi/hymn/releases/tag/v0.1.0
