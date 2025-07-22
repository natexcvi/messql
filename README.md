<img width="128" height="128" alt="Icon-macOS-Dark-128x128@2x" src="https://github.com/user-attachments/assets/8ad56c15-b98f-4d87-b68a-cd02286320e0" />

# mesSQL

A clean PostgreSQL client for macOS. Fast, simple, and actually pleasant to use.

<img width="1383" height="912" alt="Screenshot 2025-07-22 at 22 23 00" src="https://github.com/user-attachments/assets/884f6263-fc38-4a7a-9e00-aec9a8ab1b05" />

## Features

**Smart Editor** - CodeMirror 6 with PostgreSQL syntax highlighting and schema-aware autocomplete  
**Multi-Tab Support** - Work with multiple queries at once  
**Native macOS** - Feels right at home on your Mac  
**Secure Storage** - Passwords stored safely in macOS keychain  
**Quick Export** - CSV/JSON export with ⌘+E  
**Keyboard First** - ⌘+Enter runs queries, ⌘+T opens new tabs

## Get Started

```bash
git clone [repo]
npm install && npm run build && npm run dist
```

Open the DMG, drag to Applications. Done.

## Development

```bash
npm install
npm run dev        # Start development
npm run build      # Build for production
npm run typecheck  # Check types
npm run lint       # Check code
```

**Architecture**: Electron main process handles database connections, React renderer handles UI.

## Stack

Electron + React + TypeScript + CodeMirror 6 + PostgreSQL.

## License

MIT
