# Shreem POS - Windows Installation Guide

## Automatic Update System

Your Shreem POS application now includes automatic updates! When you push code changes to GitHub, the system will:

1. **Build & Release**: GitHub Actions automatically builds the Windows installer
2. **Create Release**: Publishes installer to GitHub Releases
3. **Auto-Update**: Installed apps detect and install updates automatically

## Windows Installation

### Method 1: Download from GitHub Releases (Recommended)

1. **Go to GitHub Releases**
   - Visit: https://github.com/Shyamptdr0/SoftwarePOS/releases
   - Download the latest `.exe` file (e.g., `Shreem-POS-Setup-1.0.0.exe`)

2. **Install the Application**
   - Double-click the downloaded `.exe` file
   - Follow the installation wizard
   - Choose installation directory (default: `C:\Program Files\Shreem POS`)
   - Create desktop shortcut (recommended)

3. **Launch the Application**
   - Double-click desktop shortcut
   - Or find in Start Menu → Shreem POS

### Method 2: Build from Source (Developers)

1. **Clone Repository**
   ```bash
   git clone https://github.com/Shyamptdr0/SoftwarePOS.git
   cd SoftwarePOS
   ```

2. **Install Dependencies**
   ```bash
   npm install
   cd apps/web && npm install && cd ../..
   cd apps/desktop && npm install && cd ../..
   ```

3. **Build Application**
   ```bash
   npm run build
   ```

4. **Run in Development**
   ```bash
   cd apps/desktop
   npm run dev
   ```

5. **Create Installer**
   ```bash
   cd apps/desktop
   npm run build:win
   ```

## Automatic Update Testing

### How Updates Work

1. **Startup Check**: App checks for updates when launched
2. **Update Notification**: Shows dialog when new version available
3. **Download Progress**: Shows download progress
4. **Install Prompt**: Asks to restart and install
5. **Automatic Install**: Restarts app with new version

### Testing Updates

1. **Install Current Version**
   - Download and install from GitHub Releases

2. **Make Code Changes**
   - Edit any file in the project
   - Commit and push to GitHub

3. **Wait for Build**
   - GitHub Actions builds new version (2-5 minutes)
   - New release created automatically

4. **Check for Updates**
   - Launch installed app
   - Should show update notification
   - Follow prompts to install

## Troubleshooting

### Update Issues

**Problem**: Updates not downloading
- **Solution**: Check internet connection and GitHub repository access

**Problem**: Update fails to install
- **Solution**: Run app as Administrator, check disk space

**Problem**: App crashes after update
- **Solution**: Reinstall from latest GitHub release

### Build Issues

**Problem**: GitHub Actions fails
- **Solution**: Check workflow logs in GitHub Actions tab

**Problem**: Large file error
- **Solution**: Ensure `dist/` folders are in `.gitignore`

## Configuration

### Update Server Settings

The auto-updater is configured in:
- `apps/desktop/main.js` - Auto-updater event handlers
- `apps/desktop/electron-builder.config.js` - Build and publish settings

### GitHub Repository Settings

- Repository: `Shyamptdr0/SoftwarePOS`
- Auto-update provider: GitHub Releases
- Build trigger: Push to main branch

## Version Management

### Semantic Versioning

Use version tags for releases:
- `v1.0.0` - Major release
- `v1.0.1` - Bug fix
- `v1.1.0` - New features
- `v2.0.0` - Major changes

### Automatic Versioning

When pushing to main branch without tags:
- Automatic version: `v1.0.0-YYYYMMDD-HHMM`
- Example: `v1.0.0-20231223-1430`

## Support

For issues with:
- **Installation**: Check this guide first
- **Updates**: Verify GitHub repository access
- **Build**: Check GitHub Actions logs
- **Application**: Check error logs in app directory
