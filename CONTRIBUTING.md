# Contributing to Hymn

Thank you for your interest in contributing to Hymn! This document provides guidelines and instructions for contributing.

## Development Setup

### Prerequisites

- Node.js 20 or higher
- [Bun](https://bun.sh) package manager
- Git

### Getting Started

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/hymn.git
   cd hymn
   ```
3. Install dependencies:
   ```bash
   bun install
   ```
4. Start the development server:
   ```bash
   bun run dev
   ```

## Development Scripts

| Script | Description |
|--------|-------------|
| `bun run dev` | Start development server with hot reload |
| `bun run build` | Build for production |
| `bun run build:compile` | Build without packaging |
| `bun run lint` | Run ESLint |
| `bun run lint:fix` | Run ESLint with auto-fix |
| `bun run typecheck` | Run TypeScript type checking |
| `bun run test` | Run tests |
| `bun run test:watch` | Run tests in watch mode |

## Project Structure

```
hymn/
├── electron/           # Electron main process
│   ├── main.ts        # Main entry point
│   └── preload.ts     # Preload script (IPC bridge)
├── src/
│   ├── components/    # React components
│   │   └── ui/        # shadcn/ui components
│   ├── lib/           # Utilities and helpers
│   ├── routes/        # TanStack Router pages
│   └── stores/        # Zustand state stores
├── public/            # Static assets
└── tests/             # Test files
```

## Branch Naming

Use descriptive branch names with prefixes:

- `feature/` - New features (e.g., `feature/mod-search`)
- `fix/` - Bug fixes (e.g., `fix/profile-loading`)
- `docs/` - Documentation changes (e.g., `docs/api-reference`)
- `refactor/` - Code refactoring (e.g., `refactor/scanner-module`)

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description

[optional body]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Examples:
- `feat(mods): add search functionality`
- `fix(profiles): resolve load order bug`
- `docs(readme): update installation instructions`

## Code Style

- TypeScript strict mode is enabled
- ESLint is configured for the project
- Run `bun run lint` before committing
- Use meaningful variable and function names
- Keep components focused and composable

## Pull Request Process

1. Create a feature branch from `master`
2. Make your changes with clear commits
3. Run lint and tests:
   ```bash
   bun run lint
   bun run typecheck
   bun run test
   ```
4. Push to your fork and open a PR
5. Fill out the PR template
6. Wait for review and address feedback

## Architecture Notes

Hymn uses an Electron architecture with strict process separation:

- **Main Process**: File system operations, mod scanning, IPC handlers
- **Preload**: Secure bridge via `contextBridge`
- **Renderer**: React UI with no direct Node.js access

All file operations must go through IPC. Never expose Node.js APIs directly to the renderer.

## Questions?

Feel free to open a [Discussion](https://github.com/isdelr/hymn/discussions) for questions or ideas.
