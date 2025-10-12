# XCode - Visual Workflow Automation Platform

**XCode** is a modern, web-based workflow automation platform that enables teams to create, manage, and execute complex automation workflows through an intuitive visual editor. Built with Nuxt 3, Vue Flow, and SQLite, it provides enterprise-grade automation capabilities with a focus on security, scalability, and ease of use.

## 🎯 What We're Building

### Core Vision
Create a comprehensive automation platform that bridges the gap between simple task scheduling and complex enterprise workflow management, making automation accessible to both technical and non-technical users.

### Key Achievements

#### 🎨 **Visual Workflow Designer**
- **Node-based Editor**: Drag-and-drop interface using Vue Flow for creating complex workflows
- **Real-time Validation**: Instant feedback on workflow configuration and execution requirements
- **Multi-language Support**: Execute scripts in Bash, PowerShell, Python, Node.js, and Windows CMD
- **Smart Connections**: Visual data flow between nodes with typed input/output sockets

#### 🚀 **Trigger System**
- **Cron Scheduling**: Advanced cron-based job scheduling with timezone support
- **Secure Webhooks**: POST-only webhooks with mandatory secret token authentication
- **Git Integration**: Trigger workflows on repository events (push, PR, branch changes)
- **API Triggers**: RESTful API endpoints for external system integration
- **Pipeline Chaining**: Workflows can trigger other workflows for complex automation chains

#### 🤖 **Distributed Agent Architecture**
- **Multi-Agent Execution**: Deploy build agents across multiple machines and platforms
- **Load Balancing**: Automatic job distribution based on agent availability and capabilities
- **Platform Support**: Windows, Linux, and macOS agent compatibility
- **Real-time Monitoring**: Live agent status tracking with WebSocket connectivity

#### 📊 **Enterprise Build Management**
- **Comprehensive Logging**: Detailed execution logs with real-time streaming
- **Build History**: Complete audit trail with filtering, pagination, and export capabilities
- **Performance Analytics**: Build duration tracking, success rates, and trend analysis
- **Resource Monitoring**: Agent utilization and job queue management

#### 🔒 **Security & Reliability**
- **Authentication System**: JWT-based user authentication with session management
- **Secret Management**: Secure storage and injection of sensitive configuration
- **Input Validation**: Comprehensive validation of workflow nodes and parameters
- **Error Handling**: Graceful failure handling with retry mechanisms

## 🏗️ Architecture Overview

### Frontend Stack
- **Nuxt 3**: Full-stack Vue.js framework with SSR capabilities
- **Vue Flow**: Professional node-based editor for workflow visualization
- **Tailwind CSS**: Utility-first CSS framework with dark mode support
- **WebSocket Integration**: Real-time updates for builds, agents, and executions

### Backend Infrastructure
- **SQLite Database**: Lightweight, embedded database for build history and project data
- **RESTful APIs**: Comprehensive API layer for all platform operations
- **WebSocket Server**: Real-time communication for live updates
- **Agent Communication**: Secure agent registration and job distribution

### Build Agent System
- **Cross-platform Agents**: Native executors for Windows, Linux, and macOS
- **Capability Discovery**: Automatic detection of available runtimes and tools
- **Heartbeat Monitoring**: Real-time agent health and availability tracking
- **Job Execution**: Secure, isolated script execution with timeout handling

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- pnpm (recommended) or npm
- SQLite (for database operations)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd XCode

# Install dependencies
pnpm install

# Initialize the database
npm run db:init

# Start development server
pnpm dev
```

### Setting Up Build Agents

```bash
# Navigate to build agent directory
cd build-agent

# Install agent dependencies
npm install

# Start an agent (replace with your server URL and token)
node agent --token YOUR_AGENT_TOKEN --server http://localhost:3000
```

## 🌟 Use Cases

### DevOps Automation
- **CI/CD Pipelines**: Automated testing, building, and deployment workflows
- **Infrastructure Management**: Server provisioning and configuration automation
- **Monitoring & Alerting**: Automated system health checks and notification workflows

### Business Process Automation
- **Data Processing**: Automated data transformation and integration workflows
- **Report Generation**: Scheduled business reporting and distribution
- **File Management**: Automated file processing and organization

### Integration Workflows
- **API Orchestration**: Complex multi-service API workflow coordination
- **Database Operations**: Automated data migration and synchronization
- **Third-party Integration**: Connecting disparate systems through custom workflows

## 🔮 Future Roadmap

- **Workflow Templates**: Pre-built templates for common automation scenarios
- **Advanced Scheduling**: More sophisticated scheduling options beyond cron
- **Workflow Versioning**: Version control for workflow definitions
- **Marketplace**: Community-driven node and template sharing
- **Enterprise SSO**: Integration with enterprise identity providers
- **Multi-tenant Support**: Isolated workspaces for organizations

## 🛠️ Development

### Project Structure
```
├── components/          # Vue components
├── pages/              # Nuxt pages and routing
├── server/             # API routes and middleware
├── build-agent/        # Distributed execution agents
├── database/           # Database schemas and migrations
└── docs/              # Documentation and guides
```

### Key Technologies
- **Frontend**: Nuxt 3, Vue 3, Vue Flow, Tailwind CSS
- **Backend**: Node.js, SQLite, WebSocket
- **Build System**: ESBuild, PostCSS
- **Development**: TypeScript, ESLint, Prettier

### Development Commands

```bash
# Start development server
pnpm dev

# Build for production
pnpm build

# Run type checking
pnpm typecheck

# Lint code
pnpm lint

# Database operations
pnpm run db:init      # Initialize database
pnpm run db:migrate   # Run migrations
pnpm run db:seed      # Seed test data
```

## 📄 License

This project is licensed under the GNU General Public License v3.0 (GPL-3.0) - see the LICENSE file for details.

**Key License Benefits:**
- ✅ **Free to use** - Personal, educational, and commercial use welcome
- ✅ **Modify and improve** - Create enhanced versions and contribute back
- ✅ **Share freely** - Distribute and redistribute with proper attribution
- ✅ **Commercial use** - Companies can use this in their business operations

**Protection Against Misuse:**
- 🔒 **Copyleft protection** - Derivative works must remain open source
- 🔒 **No proprietary theft** - Cannot sell your code as closed-source software
- 🔒 **Attribution required** - Must credit original authors
- 🔒 **Same license** - Modifications must use the same GPL-3.0 license

---

**XCode** - Empowering teams to automate anything, anywhere, with visual simplicity and enterprise reliability.
