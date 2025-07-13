<img width="128" height="128" alt="Icon-macOS-Dark-128x128@2x" src="https://github.com/user-attachments/assets/8ad56c15-b98f-4d87-b68a-cd02286320e0" />

# mesSQL

A modern PostgreSQL client for macOS built with Electron, React, and TypeScript.

<img width="1204" height="804" alt="Screenshot 2025-07-14 at 0 35 23" src="https://github.com/user-attachments/assets/030a2641-55f9-425f-b8a3-e4482a0b91f2" />

## Features

- **Clean Minimalistic Design**: Modern, clean interface with subtle colors and excellent typography
- **Multi-tab interface**: Work with multiple queries simultaneously with scrollable tab overflow
- **Rich query editor**: CodeMirror 6-based editor with PostgreSQL syntax highlighting and persistent focus
- **Keyboard shortcuts**: Execute queries with ⌘+Enter (Cmd+Enter) or Ctrl+Enter
- **Schema-aware autocomplete**: Intelligent autocomplete for tables, columns, and SQL keywords
- **Schema explorer**: Navigate database schemas and tables with search functionality
- **Secure password storage**: Passwords are safely stored in the macOS keychain
- **Persistent connections**: Database connections are saved and restored between sessions
- **Resizable columns**: Drag column borders to resize table columns in query results
- **Export functionality**: Export query results to CSV or JSON formats with keyboard shortcuts
- **Scrollable results**: Properly scrollable query results with sticky headers
- **Responsive layout**: Flexible sidebar and main content areas that adapt to window size
- **Native macOS integration**: Seamless title bar, traffic light controls, and native menu bar

## Development

### Prerequisites

- Node.js (v16 or later)
- npm
- macOS development environment

### Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

### Development Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Run TypeScript type checking
npm run typecheck

# Run ESLint
npm run lint

# Start the Electron app
npm start
```

### Project Structure

```
src/
├── main/              # Electron main process
│   ├── main.ts        # Main application entry point
│   ├── preload.ts     # Preload script for renderer process
│   └── services/      # Backend services (database, keychain)
└── renderer/          # React renderer process
    ├── components/    # React components
    ├── hooks/         # Custom React hooks
    ├── services/      # Frontend services (autocomplete)
    ├── styles/        # CSS styles
    └── types/         # TypeScript type definitions
```

## Usage

1. **Create a Connection**: Click "New Connection" to add a PostgreSQL database connection
2. **Browse Schema**: Use the sidebar to explore schemas and tables
3. **Create Queries**: Use ⌘+T to create new query tabs
4. **Execute Queries**: Use ⌘+Enter to execute queries in the editor
5. **View Results**: Results are displayed in a clean table format below the editor

## Security

- Database passwords are securely stored in the macOS keychain using the `keytar` library
- Connections are managed securely within the Electron main process
- No sensitive data is stored in plain text

## Technologies Used

- **Electron**: Cross-platform desktop application framework
- **React**: UI component library
- **TypeScript**: Type-safe JavaScript
- **CodeMirror 6**: Modern code editor
- **PostgreSQL**: Database connectivity via `pg` library
- **Keytar**: macOS keychain integration

## License

MIT
