# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability in Hymn, please report it responsibly:

1. **Do not** open a public GitHub issue
2. Email the maintainers directly with details
3. Include steps to reproduce if possible
4. Allow reasonable time for a fix before public disclosure

We take security seriously and will respond promptly to legitimate reports.

## Security Considerations

### Electron Security

Hymn follows Electron security best practices:

- **Context Isolation**: Enabled to separate preload scripts from renderer
- **Node Integration**: Disabled in renderer process
- **IPC Whitelisting**: Only specific, validated IPC channels are exposed
- **No Remote Module**: The remote module is not used

### File System Access

- All file operations are performed in the main process
- Path validation prevents directory traversal
- Operations are limited to Hytale and Hymn data directories

### Mod Handling

- Mods are not executed by Hymn itself
- Archive extraction uses safe libraries with path validation
- Manifest files are parsed but not evaluated as code

## User Security Best Practices

- Only install mods from trusted sources
- Back up your Hytale installation regularly
- Keep Hymn updated to the latest version
- Review mod contents before installation when possible
