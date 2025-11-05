/**
 * Update Service - Manages application updates from GitHub releases
 * Supports Windows and Linux platforms
 */

import { spawn } from 'child_process'
import { createWriteStream, promises as fs } from 'fs'
import { join, resolve, dirname } from 'path'
import https from 'https'
import logger from './logger.js'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

class UpdateService {
  constructor() {
    this.updateInProgress = false
    this.downloadProgress = 0
    this.currentVersion = null
    this.latestRelease = null
    this.lastCheck = null

    // GitHub repository configuration
    this.githubOwner = 'Xilophinum'
    this.githubRepo = 'FlowForge'

    // Paths
    this.rootDir = resolve(process.cwd())
    this.tempDir = join(this.rootDir, 'temp-update')
    this.dataDir = join(this.rootDir, 'data')

    // Files/directories to preserve during update
    this.preservePaths = [
      'data',           // Database and user data
      'node_modules',   // Dependencies (will be reinstalled if needed)
      '.env',           // Environment configuration
      'temp-update'     // Temporary update directory
    ]
  }

  /**
   * Get current application version from package.json
   */
  async getCurrentVersion() {
    if (this.currentVersion) return this.currentVersion

    try {
      const packagePath = join(this.rootDir, 'package.json')
      const packageJson = JSON.parse(await fs.readFile(packagePath, 'utf-8'))
      this.currentVersion = packageJson.version || '0.0.0'
      return this.currentVersion
    } catch (error) {
      logger.error('Failed to read current version:', error)
      return '0.0.0'
    }
  }

  /**
   * Check for updates from GitHub releases
   */
  async checkForUpdates() {
    try {
      logger.info('Checking for updates from GitHub...')

      const release = await this.fetchLatestRelease()
      const currentVersion = await this.getCurrentVersion()

      this.latestRelease = release
      this.lastCheck = new Date().toISOString()

      const updateAvailable = this.compareVersions(release.tag_name, currentVersion) > 0

      logger.info(`Current version: ${currentVersion}, Latest version: ${release.tag_name}, Update available: ${updateAvailable}`)

      return {
        currentVersion,
        latestVersion: release.tag_name,
        updateAvailable,
        releaseNotes: release.body,
        publishedAt: release.published_at,
        downloadUrl: this.getDownloadUrl(release),
        lastCheck: this.lastCheck
      }
    } catch (error) {
      logger.error('Failed to check for updates:', error)
      throw error
    }
  }

  /**
   * Fetch latest release from GitHub API
   */
  async fetchLatestRelease() {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.github.com',
        path: `/repos/${this.githubOwner}/${this.githubRepo}/releases/latest`,
        method: 'GET',
        headers: {
          'User-Agent': 'FlowForge-UpdateService',
          'Accept': 'application/vnd.github.v3+json'
        }
      }

      const req = https.request(options, (res) => {
        let data = ''

        res.on('data', (chunk) => {
          data += chunk
        })

        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              const release = JSON.parse(data)
              resolve(release)
            } catch (error) {
              reject(new Error('Failed to parse GitHub API response'))
            }
          } else if (res.statusCode === 404) {
            reject(new Error('No releases found for this repository'))
          } else {
            reject(new Error(`GitHub API returned status ${res.statusCode}`))
          }
        })
      })

      req.on('error', (error) => {
        reject(error)
      })

      req.setTimeout(30000, () => {
        req.destroy()
        reject(new Error('GitHub API request timed out'))
      })

      req.end()
    })
  }

  /**
   * Get appropriate download URL from release assets
   */
  getDownloadUrl(release) {
    // For now, use the zipball_url (source code archive)
    // In the future, you can build platform-specific binaries
    return release.zipball_url
  }

  /**
   * Download update package
   */
  async downloadUpdate(url, onProgress) {
    try {
      logger.info(`Downloading update from: ${url}`)

      // Create temp directory
      await fs.mkdir(this.tempDir, { recursive: true })

      const downloadPath = join(this.tempDir, 'update.zip')

      return new Promise((resolve, reject) => {
        const options = {
          headers: {
            'User-Agent': 'FlowForge-UpdateService',
            'Accept': 'application/zip'
          }
        }

        https.get(url, options, (response) => {
          // Handle redirects
          if (response.statusCode === 302 || response.statusCode === 301) {
            logger.info(`Following redirect to: ${response.headers.location}`)
            https.get(response.headers.location, (redirectResponse) => {
              this.handleDownloadResponse(redirectResponse, downloadPath, onProgress, resolve, reject)
            }).on('error', reject)
          } else {
            this.handleDownloadResponse(response, downloadPath, onProgress, resolve, reject)
          }
        }).on('error', reject)
      })
    } catch (error) {
      logger.error('Failed to download update:', error)
      throw error
    }
  }

  /**
   * Handle download response stream
   */
  handleDownloadResponse(response, downloadPath, onProgress, resolve, reject) {
    if (response.statusCode !== 200) {
      reject(new Error(`Download failed with status ${response.statusCode}`))
      return
    }

    const file = createWriteStream(downloadPath)
    const totalSize = parseInt(response.headers['content-length'], 10)
    let downloadedSize = 0

    response.on('data', (chunk) => {
      downloadedSize += chunk.length
      this.downloadProgress = Math.round((downloadedSize / totalSize) * 100)

      if (onProgress) {
        onProgress({
          downloaded: downloadedSize,
          total: totalSize,
          percentage: this.downloadProgress
        })
      }
    })

    response.pipe(file)

    file.on('finish', () => {
      file.close()
      logger.info(`Download completed: ${downloadPath}`)
      resolve(downloadPath)
    })

    file.on('error', (error) => {
      fs.unlink(downloadPath).catch(() => {})
      reject(error)
    })
  }

  /**
   * Extract downloaded update package
   */
  async extractUpdate(archivePath) {
    try {
      logger.info(`Extracting update from: ${archivePath}`)

      const extractDir = join(this.tempDir, 'extracted')
      await fs.mkdir(extractDir, { recursive: true })

      // Use platform-specific extraction
      if (process.platform === 'win32') {
        await this.extractZipWindows(archivePath, extractDir)
      } else {
        await this.extractZipUnix(archivePath, extractDir)
      }

      logger.info(`Extraction completed to: ${extractDir}`)
      return extractDir
    } catch (error) {
      logger.error('Failed to extract update:', error)
      throw error
    }
  }

  /**
   * Extract ZIP on Windows using PowerShell
   */
  async extractZipWindows(archivePath, extractDir) {
    return new Promise((resolve, reject) => {
      const psCommand = `Expand-Archive -Path "${archivePath}" -DestinationPath "${extractDir}" -Force`

      const child = spawn('powershell.exe', ['-Command', psCommand], {
        stdio: 'pipe'
      })

      let stderr = ''
      child.stderr.on('data', (data) => {
        stderr += data.toString()
      })

      child.on('close', (code) => {
        if (code === 0) {
          resolve()
        } else {
          reject(new Error(`Extraction failed: ${stderr}`))
        }
      })

      child.on('error', reject)
    })
  }

  /**
   * Extract ZIP on Unix/Linux using unzip
   */
  async extractZipUnix(archivePath, extractDir) {
    return new Promise((resolve, reject) => {
      const child = spawn('unzip', ['-o', archivePath, '-d', extractDir], {
        stdio: 'pipe'
      })

      let stderr = ''
      child.stderr.on('data', (data) => {
        stderr += data.toString()
      })

      child.on('close', (code) => {
        if (code === 0) {
          resolve()
        } else {
          reject(new Error(`Extraction failed: ${stderr}`))
        }
      })

      child.on('error', (error) => {
        // Try alternative: tar -xzf if unzip is not available
        if (error.code === 'ENOENT') {
          logger.warn('unzip not found, trying tar...')
          this.extractZipWithTar(archivePath, extractDir)
            .then(resolve)
            .catch(reject)
        } else {
          reject(error)
        }
      })
    })
  }

  /**
   * Fallback: extract with tar
   */
  async extractZipWithTar(archivePath, extractDir) {
    return new Promise((resolve, reject) => {
      const child = spawn('tar', ['-xzf', archivePath, '-C', extractDir], {
        stdio: 'pipe'
      })

      child.on('close', (code) => {
        if (code === 0) {
          resolve()
        } else {
          reject(new Error('Extraction failed with tar'))
        }
      })

      child.on('error', reject)
    })
  }

  /**
   * Trigger update process
   * This spawns the updater script and initiates graceful shutdown
   * Designed to work with PM2 process manager
   */
  async triggerUpdate(downloadedArchive, extractedDir) {
    try {
      logger.info('Triggering update process...')

      this.updateInProgress = true

      // Find the actual source directory (GitHub archives have a root folder)
      const extractedContents = await fs.readdir(extractedDir)
      const sourceDir = extractedContents.length === 1 && (await fs.stat(join(extractedDir, extractedContents[0]))).isDirectory()
        ? join(extractedDir, extractedContents[0])
        : extractedDir

      // Create updater script (PM2-aware)
      const updaterScript = await this.createUpdaterScript(sourceDir)

      // Spawn updater as detached process
      const updaterProcess = this.spawnUpdater(updaterScript)

      logger.info(`Updater spawned with PID: ${updaterProcess.pid}`)
      logger.info('PM2 will automatically restart the application after update completes')

      return {
        updaterPid: updaterProcess.pid,
        message: 'Update process initiated. PM2 will restart the server shortly.',
        isPM2Managed: this.isPM2Managed()
      }
    } catch (error) {
      this.updateInProgress = false
      logger.error('Failed to trigger update:', error)
      throw error
    }
  }

  /**
   * Check if running under PM2
   */
  isPM2Managed() {
    return !!(process.env.PM2_HOME || process.env.pm_id !== undefined)
  }

  /**
   * Create platform-specific updater script
   * PM2-aware: Will use PM2 restart if available, otherwise fallback to direct node execution
   */
  async createUpdaterScript(sourceDir) {
    const isWindows = process.platform === 'win32'
    const updaterPath = join(this.tempDir, isWindows ? 'updater.bat' : 'updater.sh')

    const mainPid = process.pid
    const isPM2 = this.isPM2Managed()
    const pm2AppName = process.env.pm2_name || process.env.name || 'FlowForge'

    let scriptContent

    if (isWindows) {
      scriptContent = this.generateWindowsUpdaterScript(mainPid, sourceDir, isPM2, pm2AppName)
    } else {
      scriptContent = this.generateUnixUpdaterScript(mainPid, sourceDir, isPM2, pm2AppName)
    }

    await fs.writeFile(updaterPath, scriptContent, { encoding: 'utf-8' })

    if (!isWindows) {
      // Make script executable on Unix
      await fs.chmod(updaterPath, 0o755)
    }

    logger.info(`Updater script created: ${updaterPath} (PM2: ${isPM2})`)
    return updaterPath
  }

  /**
   * Generate Windows batch updater script
   * PM2-aware version
   */
  generateWindowsUpdaterScript(mainPid, sourceDir, isPM2, pm2AppName) {
    return `@echo off
echo FlowForge Updater - Starting update process...
echo PM2 Managed: ${isPM2}

REM Wait for main process to exit
echo Waiting for main process (PID: ${mainPid}) to exit...
:wait_loop
tasklist /FI "PID eq ${mainPid}" 2>NUL | find /I /N "${mainPid}">NUL
if "%ERRORLEVEL%"=="0" (
    timeout /t 2 /nobreak >NUL
    goto wait_loop
)

echo Main process exited. Starting file replacement...

REM Backup preserved directories
echo Creating backups...
if exist "${this.rootDir}\\backup-temp" rmdir /s /q "${this.rootDir}\\backup-temp"
mkdir "${this.rootDir}\\backup-temp"
${this.preservePaths.map(path => `
if exist "${this.rootDir}\\${path}" (
    echo Backing up ${path}...
    xcopy /E /I /Y "${this.rootDir}\\${path}" "${this.rootDir}\\backup-temp\\${path}" >NUL
)`).join('')}

REM Delete old files (except preserved)
echo Removing old files...
for /d %%D in ("${this.rootDir}\\*") do (
    set "skip="
${this.preservePaths.map(path => `    if /i "%%~nxD"=="${path}" set "skip=1"`).join('\n')}
    if not defined skip (
        echo Deleting %%D
        rmdir /s /q "%%D"
    )
)

for %%F in ("${this.rootDir}\\*") do (
    set "skip="
    if /i "%%~nxF"==".env" set "skip=1"
    if /i "%%~nxF"=="ecosystem.config.cjs" set "skip=1"
    if not defined skip (
        echo Deleting %%F
        del /f /q "%%F"
    )
)

REM Copy new files
echo Copying new files...
xcopy /E /I /Y "${sourceDir}\\*" "${this.rootDir}" >NUL

REM Restore preserved directories
echo Restoring preserved data...
${this.preservePaths.map(path => `
if exist "${this.rootDir}\\backup-temp\\${path}" (
    echo Restoring ${path}...
    xcopy /E /I /Y "${this.rootDir}\\backup-temp\\${path}" "${this.rootDir}\\${path}" >NUL
)`).join('')}

REM Cleanup
echo Cleaning up...
rmdir /s /q "${this.rootDir}\\backup-temp"
rmdir /s /q "${this.tempDir}"

REM Install dependencies
echo Installing dependencies...
cd "${this.rootDir}"
if exist "package.json" (
    call pnpm install
    if errorlevel 1 (
        echo ERROR: pnpm install failed!
        exit /b 1
    )
)

${isPM2 ? `
REM Restart application via PM2
echo Restarting application via PM2...
call pm2 restart ${pm2AppName}
if errorlevel 1 (
    echo ERROR: PM2 restart failed, trying PM2 start...
    call pm2 start ecosystem.config.cjs
)
` : `
REM Restart application via PM2 (fallback)
echo Starting application via PM2...
call pm2 start ecosystem.config.cjs
if errorlevel 1 (
    echo ERROR: PM2 start failed, falling back to direct start...
    cd "${this.rootDir}"
    start "FlowForge Server" cmd /c "pnpm run start"
)
`}

echo Update completed successfully!
timeout /t 3
exit
`
  }

  /**
   * Generate Unix/Linux shell updater script
   * PM2-aware version
   */
  generateUnixUpdaterScript(mainPid, sourceDir, isPM2, pm2AppName) {
    return `#!/bin/bash
echo "FlowForge Updater - Starting update process..."
echo "PM2 Managed: ${isPM2}"

# Wait for main process to exit
echo "Waiting for main process (PID: ${mainPid}) to exit..."
while kill -0 ${mainPid} 2>/dev/null; do
    sleep 2
done

echo "Main process exited. Starting file replacement..."

# Backup preserved directories
echo "Creating backups..."
rm -rf "${this.rootDir}/backup-temp"
mkdir -p "${this.rootDir}/backup-temp"
${this.preservePaths.map(path => `
if [ -e "${this.rootDir}/${path}" ]; then
    echo "Backing up ${path}..."
    cp -r "${this.rootDir}/${path}" "${this.rootDir}/backup-temp/"
fi`).join('')}

# Delete old files (except preserved)
echo "Removing old files..."
cd "${this.rootDir}"
for item in *; do
    skip=0
${this.preservePaths.map(path => `    [ "$item" = "${path}" ] && skip=1`).join('\n')}
    [ "$item" = "backup-temp" ] && skip=1
    [ "$item" = ".env" ] && skip=1
    [ "$item" = "ecosystem.config.cjs" ] && skip=1

    if [ $skip -eq 0 ]; then
        echo "Deleting $item"
        rm -rf "$item"
    fi
done

# Copy new files
echo "Copying new files..."
cp -r "${sourceDir}"/* "${this.rootDir}/"

# Restore preserved directories
echo "Restoring preserved data..."
${this.preservePaths.map(path => `
if [ -e "${this.rootDir}/backup-temp/${path}" ]; then
    echo "Restoring ${path}..."
    cp -r "${this.rootDir}/backup-temp/${path}" "${this.rootDir}/"
fi`).join('')}

# Cleanup
echo "Cleaning up..."
rm -rf "${this.rootDir}/backup-temp"
rm -rf "${this.tempDir}"

# Install dependencies
echo "Installing dependencies..."
cd "${this.rootDir}"
if [ -f "package.json" ]; then
    pnpm install
    if [ $? -ne 0 ]; then
        echo "ERROR: pnpm install failed!"
        exit 1
    fi
fi

${isPM2 ? `
# Restart application via PM2
echo "Restarting application via PM2..."
pm2 restart ${pm2AppName}
if [ $? -ne 0 ]; then
    echo "ERROR: PM2 restart failed, trying PM2 start..."
    pm2 start ecosystem.config.cjs
fi
` : `
# Restart application via PM2 (fallback)
echo "Starting application via PM2..."
pm2 start ecosystem.config.cjs
if [ $? -ne 0 ]; then
    echo "ERROR: PM2 start failed, falling back to direct start..."
    cd "${this.rootDir}"
    nohup pnpm run start > /dev/null 2>&1 &
fi
`}

echo "Update completed successfully!"
sleep 3
exit 0
`
  }

  /**
   * Spawn updater script as detached process
   */
  spawnUpdater(scriptPath) {
    const isWindows = process.platform === 'win32'

    const child = spawn(
      isWindows ? 'cmd.exe' : 'bash',
      isWindows ? ['/c', scriptPath] : [scriptPath],
      {
        detached: true,
        stdio: 'ignore',
        cwd: this.tempDir
      }
    )

    child.unref()
    return child
  }

  /**
   * Compare semantic versions
   * Returns: 1 if v1 > v2, -1 if v1 < v2, 0 if equal
   */
  compareVersions(v1, v2) {
    // Remove 'v' prefix if present
    v1 = v1.replace(/^v/, '')
    v2 = v2.replace(/^v/, '')

    const parts1 = v1.split('.').map(Number)
    const parts2 = v2.split('.').map(Number)

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const part1 = parts1[i] || 0
      const part2 = parts2[i] || 0

      if (part1 > part2) return 1
      if (part1 < part2) return -1
    }

    return 0
  }

  /**
   * Clean up temporary files
   */
  async cleanup() {
    try {
      await fs.rm(this.tempDir, { recursive: true, force: true })
      logger.info('Update temporary files cleaned up')
    } catch (error) {
      logger.warn('Failed to cleanup temp directory:', error)
    }
  }

  /**
   * Get update status
   */
  getStatus() {
    return {
      updateInProgress: this.updateInProgress,
      downloadProgress: this.downloadProgress,
      currentVersion: this.currentVersion,
      latestRelease: this.latestRelease,
      lastCheck: this.lastCheck
    }
  }
}

// Singleton instance
let updateService = null

export function getUpdateService() {
  if (!updateService) {
    updateService = new UpdateService()
  }
  return updateService
}

export { UpdateService }
