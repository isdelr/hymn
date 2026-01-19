# Hymn

A modern mod manager for Hytale built with Electron, React, and TypeScript.

[![CI](https://github.com/isdelr/hymn/actions/workflows/ci.yml/badge.svg)](https://github.com/isdelr/hymn/actions/workflows/ci.yml)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)

## Features

- **Mod Library Management** - Scan and manage Packs, Plugins, and Early Plugins
- **Profile System** - Create profiles with custom mod sets and load order
- **Safe Operations** - Automatic backups with one-click rollback
- **Mod Creation Tools** - Visual editors and integrated IDE for building mods
- **Cross-Platform** - Windows, macOS, and Linux support
- **Dark Mode UI** - Inspired by Mini Motorways and Hytale

## Installation

Download the latest release for your platform from the [Releases](https://github.com/isdelr/hymn/releases) page.

| Platform | Download |
|----------|----------|
| Windows | `.exe` installer |
| macOS | `.dmg` image |
| Linux | `.AppImage` / `.deb` |

**Requirements:** Hytale Early Access installed

## Key Paths

Hymn works with these Hytale directories:

| Type | Windows Path |
|------|--------------|
| Hytale Root | `%AppData%\Hytale` |
| Packs | `%AppData%\Hytale\UserData\Packs` |
| Plugins | `%AppData%\Hytale\UserData\Mods` |
| Early Plugins | `%AppData%\Hytale\earlyplugins` |
| Hymn Data | `%AppData%\Hymn` |

## Development

### Prerequisites

- Node.js 20+
- [Bun](https://bun.sh)

### Quick Start

```bash
# Install dependencies
bun install

# Start development server
bun run dev

# Build for production
bun run build
```

### Scripts

| Script | Description |
|--------|-------------|
| `bun run dev` | Development server with hot reload |
| `bun run build` | Production build with packaging |
| `bun run build:compile` | Build without packaging |
| `bun run lint` | Run ESLint |
| `bun run typecheck` | TypeScript type checking |
| `bun run test` | Run tests |

## Architecture

Hymn uses a secure Electron architecture:

```
Main Process          Preload           Renderer
─────────────────    ──────────────    ──────────────
File system ops      contextBridge     React UI
Mod scanning         IPC bridge        State (Zustand)
Profile management   Type-safe API     Routing
Backup engine                          Components
```

### Project Structure

```
hymn/
├── electron/          # Main process (file ops, IPC)
├── src/
│   ├── components/    # React components
│   │   └── ui/        # shadcn/ui components
│   ├── lib/           # Utilities
│   ├── routes/        # Pages (TanStack Router)
│   └── stores/        # Zustand stores
└── tests/
```

## Tech Stack

- **Framework:** Electron
- **UI:** React, Tailwind CSS, shadcn/ui
- **Build:** Vite, TypeScript
- **State:** Zustand, TanStack Query
- **Routing:** TanStack Router

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Security

For security concerns, see [SECURITY.md](SECURITY.md). Please report vulnerabilities privately rather than opening public issues.

## License

This project is licensed under the GPL-3.0 License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Hytale](https://hytale.com) - The game this tool supports
- [shadcn/ui](https://ui.shadcn.com) - UI components
- [Mini Motorways](https://dinopoloclub.com/minimotorways/) - UI design inspiration
