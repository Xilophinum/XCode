# XCode Universal Build Agent

A standalone Node.js build agent that connects to XCode CI/CD platform to execute distributed build jobs.

## Features

- **Token-based Authentication**: Secure authentication using agent tokens
- **Platform Detection**: Automatically detects system capabilities and available tools
- **WebSocket Communication**: Real-time connection with XCode server
- **Job Execution**: Execute shell commands and build scripts
- **Heartbeat Monitoring**: Regular status updates to the server
- **Auto-reconnection**: Automatic reconnection with exponential backoff
- **Graceful Shutdown**: Clean shutdown handling for running jobs

## Installation

No installation required! This is a single-file agent that only uses Node.js built-in modules and the `ws` WebSocket library.

```bash
# Install WebSocket dependency
npm install ws

# Or if using in a different location
npm install ws --global
```

## Usage

### Command Line Arguments

```bash
# Basic usage
node agent.js --token <your-token> --server <server-url>

# Example with local server
node agent.js --token abc123def456 --server ws://localhost:3001

# Example with HTTPS server (auto-converts to WSS)
node agent.js --token abc123def456 --server https://your-xcode-server.com

# Show help
node agent.js --help
```

### Environment Variables

```bash
# Set environment variables
export XCODE_AGENT_TOKEN="your-agent-token"
export XCODE_SERVER_URL="ws://localhost:3001"

# Run agent
node agent.js
```

### Windows Usage

```cmd
# Command Prompt
set XCODE_AGENT_TOKEN=your-agent-token
set XCODE_SERVER_URL=ws://localhost:3001
node agent.js

# PowerShell
$env:XCODE_AGENT_TOKEN="your-agent-token"
$env:XCODE_SERVER_URL="ws://localhost:3001"
node agent.js
```

## Configuration

The agent automatically detects:

- **Platform**: Windows, macOS, Linux
- **Architecture**: x64, arm64, etc.
- **Available Tools**: git, node, npm, python, docker, etc.
- **System Information**: CPU, memory, hostname

### Supported Tools Detection

The agent automatically checks for:
- Git
- Node.js & npm/yarn/pnpm
- Python 2/3 & pip
- Docker & docker-compose
- Shell environments (bash, cmd, PowerShell)

## Server Integration

### Getting an Agent Token

1. Open your XCode web interface
2. Navigate to "Agents" page
3. Click "Add Agent"
4. Enter agent name and copy the generated token

### WebSocket Protocol

The agent communicates with the server using these events:

- `agent:authenticate` - Initial authentication with token
- `agent:register` - Register agent capabilities
- `agent:heartbeat` - Regular status updates
- `agent:execute_job` - Receive and execute build jobs
- `agent:job_status` - Report job progress and results

## Job Execution

The agent can execute:

- Shell commands and scripts
- Build processes (npm, maven, gradle, etc.)
- Tests and deployments
- Custom workflows

### Job Format

```json
{
  "jobId": "job-123",
  "commands": [
    "git clone https://github.com/user/repo.git",
    "cd repo",
    "npm install",
    "npm run build"
  ],
  "environment": {
    "NODE_ENV": "production",
    "API_KEY": "secret"
  },
  "workingDirectory": "/tmp/build",
  "timeout": 300000
}
```

## Monitoring

The agent provides real-time status updates:

- **Online**: Ready to accept jobs
- **Busy**: Currently executing jobs
- **Offline**: Disconnected from server

### Logs

The agent outputs detailed logs including:
- Connection status
- Job execution progress
- Error messages
- System information

## Security

- **Token Authentication**: All communication secured with agent tokens
- **Environment Isolation**: Jobs run in isolated processes
- **Timeout Protection**: Jobs automatically timeout to prevent hanging
- **Graceful Shutdown**: Clean termination of running processes

## Deployment

### Systemd Service (Linux)

Create `/etc/systemd/system/xcode-agent.service`:

```ini
[Unit]
Description=XCode Build Agent
After=network.target

[Service]
Type=simple
User=xcode-agent
WorkingDirectory=/opt/xcode-agent
Environment=XCODE_AGENT_TOKEN=your-token
Environment=XCODE_SERVER_URL=ws://your-server:3001
ExecStart=/usr/bin/node agent.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### Windows Service

Use `node-windows` or similar service manager:

```bash
npm install -g node-windows
node-windows-service install --name "XCode Agent" --script agent.js
```

### Docker Container

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY agent.js .
RUN npm install ws
CMD ["node", "agent.js"]
```

## Troubleshooting

### Connection Issues

1. **Check token**: Ensure the token is valid and not expired
2. **Check URL**: Verify the server URL is correct and accessible
3. **Firewall**: Ensure WebSocket connections are allowed
4. **SSL/TLS**: For HTTPS servers, ensure certificates are valid

### Job Execution Issues

1. **Permissions**: Ensure the agent has necessary file/directory permissions
2. **Dependencies**: Verify required tools are installed and in PATH
3. **Timeouts**: Adjust timeout values for long-running builds
4. **Environment**: Check environment variables and working directory

### Log Analysis

Enable verbose logging by setting:
```bash
export DEBUG=xcode-agent
node agent.js
```

## Contributing

This is a single-file agent designed for simplicity and portability. When making changes:

1. Keep dependencies minimal (only Node.js built-ins + ws)
2. Maintain cross-platform compatibility
3. Add proper error handling and logging
4. Test on multiple operating systems

## License

Part of the XCode CI/CD Platform