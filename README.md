# DISCLAIMER: WIP - NOT PRODUCTION READY - ANYTHING/EVERYTHING COULD/CAN/WILL CHANGE
# XCode - Modern CI/CD Platform 

**A visual, user-friendly alternative to Jenkins** designed to make continuous integration and delivery accessible to everyone. Built with modern web technologies (Nuxt 3, Vue Flow), XCode eliminates the complexity and learning curve of traditional CI/CD tools while providing enterprise-grade automation capabilities.

## Why XCode?

Jenkins is powerful but complex. XCode reimagines CI/CD with three core principles:

**1. Visual-First Design** - Drag-and-drop workflow editor instead of XML/Groovy scripting
**2. Modern Architecture** - Real-time WebSocket updates, cloud-native agents, responsive UI
**3. Lower Learning Curve** - Intuitive interface that enables both developers and operations teams

## Key Features

### 🎨 Visual Workflow Editor
Design CI/CD pipelines visually with a node-based graph editor. No code required - connect nodes, configure properties, and execute. Supports parallel branches, matrix builds, conditional execution, and complex orchestration patterns.

### ⚡ Multi-Platform Build Agents
Lightweight, stateless agents for Windows, Linux, and macOS with automatic load balancing and real-time health monitoring. Deploy anywhere - on-premise servers, cloud VMs, or containers.

### 🔗 Universal Git Integration
Built-in webhook support for GitHub, GitLab, Bitbucket, and Azure DevOps with secure signature validation. Trigger builds automatically on push, pull request, or custom repository events.

### 🚀 Advanced Execution
- **Parallel Execution**: Run multiple jobs concurrently with fail-fast behavior
- **Matrix Builds**: Test across multiple language versions, OS platforms, or configurations
- **Multi-Language**: Execute Bash, PowerShell, Python, Node.js, and CMD scripts
- **Cron Scheduling**: Timezone-aware scheduling with quick presets

### 📊 Enterprise-Ready
- **Hierarchical Organization**: Organize projects in nested folders with path-based permissions
- **Audit Logging**: Complete change history with before/after snapshots for compliance
- **LDAP/Active Directory**: Enterprise SSO integration with role-based access control
- **Credential Vault**: Secure management of passwords, SSH keys, API tokens, and certificates
- **Build Retention**: Configurable policies for log storage and build history

### 📈 Real-Time Visibility
Live execution logs streamed via WebSocket, build performance analytics, success rate tracking, and agent status monitoring - all in a modern, responsive dashboard with dark mode support.

## How It's Different from Jenkins

| Feature | Jenkins | XCode |
|---------|---------|-------|
| **Pipeline Creation** | Groovy scripts or XML config | Visual drag-and-drop editor |
| **Real-time Updates** | Requires polling plugins | Native WebSocket streaming |
| **Agent Setup** | Complex plugin configuration | Single executable, auto-discovery |
| **Project Organization** | Flat list or folders plugin | Built-in hierarchical folders |
| **Audit Trail** | External audit plugins needed | Complete built-in versioning |
| **Git Webhooks** | Manual setup per provider | Auto-generated URLs with multi-provider support |
| **User Experience** | Power user focused | Accessible to all skill levels |

## Quick Start

### Server Setup
```bash
# Install dependencies
pnpm install

# Initialize database
npm run db:init

# Start the server
pnpm dev
```

Access the web interface at `http://localhost:3000`

### Build Agent Setup
```bash
cd build-agent
npm install
node agent --token YOUR_AGENT_TOKEN --server http://localhost:3000
```

Generate agent tokens from the Admin panel in the web interface.

## Architecture

**Frontend**: Nuxt 3, Vue 3, Vue Flow, Tailwind CSS, Socket.IO
**Backend**: Node.js, Nitro, Drizzle ORM
**Database**: SQLite (primary), PostgreSQL (supported)
**Agents**: Cross-platform Node.js executors with WebSocket communication

### Project Structure
```
├── components/          # Vue UI components & property panels
├── pages/              # Main views (editor, builds, admin, agents)
├── server/
│   ├── api/            # RESTful API endpoints
│   ├── utils/          # Core services (agentManager, jobManager, cronManager)
│   └── plugins/        # WebSocket server
├── build-agent/        # Standalone build agent executable
└── stores/             # Pinia state management
```

## Common Use Cases

**CI/CD Pipelines** - Build, test, and deploy applications with visual workflow design
**Scheduled Automation** - Run data processing, backups, or reports on cron schedules
**Infrastructure Management** - Automate server provisioning and configuration
**API Orchestration** - Coordinate complex multi-service workflows
**Event-Driven Workflows** - Trigger automation on git events or webhook calls

## Development

```bash
pnpm dev          # Start development server
pnpm build        # Build for production
pnpm typecheck    # Run type checking
pnpm lint         # Lint code
```

## Roadmap

- [ ] Workflow templates for common CI/CD patterns
- [ ] Plugin marketplace for community extensions
- [ ] Enhanced matrix builds with dynamic axes
- [ ] Docker container execution support
- [ ] Multi-tenant workspace isolation
- [ ] Advanced role-based permissions
- MUCH MUCH more 

## License

GNU General Public License v3.0 (GPL-3.0)

Free for personal, educational, and commercial use. Derivative works must remain open source under the same license.

---

**XCode** - Making CI/CD accessible to everyone through visual simplicity and modern architecture.
