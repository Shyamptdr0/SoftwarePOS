# Shreem POS Desktop Application

A complete Point of Sale solution built with Electron and Next.js.

## Development

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Setup
```bash
# Install dependencies
npm install

# Install web app dependencies
cd ../web && npm install && cd ../desktop
```

### Running the App
```bash
# Development mode (starts web app and electron)
npm run dev

# Production mode
npm start
```

## Building

### Build for Current Platform
```bash
npm run build
```

### Build for Specific Platforms
```bash
# Windows
npm run build:win

# macOS  
npm run build:mac

# Linux
npm run build:linux
```

### Build All Platforms
```bash
node build.js all
```

## Distribution

Build artifacts are created in the `dist/` directory:
- Windows: `.exe` installer and portable version
- macOS: `.dmg` disk image
- Linux: `.AppImage` and `.deb` package

## Auto-Updater

The app includes automatic update functionality:
- Checks for updates on startup
- Downloads updates in background
- Prompts user to restart and install

## Configuration

- `electron-builder.config.js` - Build configuration
- `main.js` - Main Electron process
- `preload.js` - Security bridge
- `assets/` - Application icons

## License

See LICENSE.txt for licensing information.
