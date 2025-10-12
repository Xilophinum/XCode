# Build Statistics System

This system tracks build results and terminal logs for projects, providing visual feedback through color-coded project cards.

## Features

- **File-based Storage**: Build statistics are stored in JSON files to avoid database performance issues
- **Color-coded Projects**: Project cards change color based on their build success rate
- **Smart Menu Colors**: Dropdown menus adapt colors to maintain contrast with delete buttons
- **Terminal Log Integration**: Both build results and terminal logs affect project health status

## Color System

Projects are colored based on their success rate over the last 10 builds:

- **Green** (80%+ success): Healthy projects
- **Yellow** (60-79% success): Projects with warnings
- **Orange** (30-59% success): Projects with issues
- **Red** (<30% success): Critical projects

## API Usage

### Recording Build Results

```javascript
// Record a successful build
await $fetch('/api/projects/PROJECT_ID/build-stats', {
  method: 'POST',
  body: {
    type: 'build',
    status: 'success',
    message: 'Build completed successfully',
    logs: ['All tests passed'],
    duration: 2500
  }
})

// Record a failed build
await $fetch('/api/projects/PROJECT_ID/build-stats', {
  method: 'POST',
  body: {
    type: 'build',
    status: 'failure',
    message: 'Build failed with errors',
    logs: ['TypeScript error in main.ts'],
    duration: 1200
  }
})
```

### Recording Terminal Logs

```javascript
// Record terminal logs
await $fetch('/api/projects/PROJECT_ID/build-stats', {
  method: 'POST',
  body: {
    type: 'terminal',
    level: 'error',
    message: 'Runtime error occurred',
    command: 'npm start'
  }
})
```

## Composable Usage

```javascript
const buildStats = useBuildStats()

// Load project statistics
await buildStats.loadProjectStats('project-id')

// Record build results
await buildStats.recordBuildResult('project-id', 'success', 'Build completed')

// Record terminal logs
await buildStats.logError('project-id', 'Error message', 'command')
await buildStats.logInfo('project-id', 'Info message')
await buildStats.logWarning('project-id', 'Warning message')
await buildStats.logSuccess('project-id', 'Success message')

// Get project colors
const colors = buildStats.getProjectColors('project-id')
const menuColors = buildStats.getProjectMenuColors('project-id')

// Get health status
const status = buildStats.getHealthStatus('project-id') // 'Healthy', 'Warning', 'Issues', 'Critical'
```

## Demo/Testing

You can test the build stats system using the demo endpoint:

```
GET /api/demo/build/PROJECT_ID?action=success
GET /api/demo/build/PROJECT_ID?action=failure
GET /api/demo/build/PROJECT_ID?action=warning
GET /api/demo/build/PROJECT_ID?action=terminal-error
GET /api/demo/build/PROJECT_ID?action=terminal-info
GET /api/demo/build/PROJECT_ID (random result)
```

## Integration with Terminal System

When integrating with your terminal system, you can record logs like this:

```javascript
// When starting a process
buildStats.logInfo(projectId, 'Starting development server', 'npm run dev')

// When encountering errors
buildStats.logError(projectId, 'Failed to start server: Port already in use', 'npm run dev')

// When processes complete successfully
buildStats.logSuccess(projectId, 'Server started successfully on port 3000', 'npm run dev')
```

## File Structure

Build statistics are stored in `data/build-stats/` as JSON files:
- Each project has its own file: `{projectId}.json`
- Files contain build history, terminal logs, and calculated summaries
- Automatically maintains last 10 builds and last 50 terminal logs per project

## Data Structure

```json
{
  "lastBuilds": [
    {
      "id": "build_1234567890_abcdef123",
      "timestamp": "2025-10-10T12:00:00.000Z",
      "status": "success",
      "message": "Build completed successfully",
      "logs": ["All tests passed"],
      "duration": 2500,
      "type": "build"
    }
  ],
  "terminalLogs": [
    {
      "id": "term_1234567890_xyz789",
      "timestamp": "2025-10-10T12:00:00.000Z",
      "level": "info",
      "message": "Server started on port 3000",
      "command": "npm start",
      "type": "terminal"
    }
  ],
  "summary": {
    "successRate": 0.8,
    "lastStatus": "success",
    "source": "builds"
  }
}
```