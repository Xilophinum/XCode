#!/usr/bin/env node

/**
 * Universal Build Agent for XCode CI/CD Platform
 * 
 * A standalone Node.js agent that connects to the XCode server via WebSocket
 * and executes build jobs on distributed machines.
 * 
 * Usage:
 *   node agent.js --token <agent-token> --server <server-url>
 *   node agent.js --token abc123 --server ws://localhost:3001
 * 
 * Environment Variables (alternative to CLI args):
 *   XCODE_AGENT_TOKEN=<token>
 *   XCODE_SERVER_URL=<url>
 */

import { spawn, execSync } from 'child_process'
import { io } from 'socket.io-client'
import os from 'os'
import fs from 'fs'
import path from 'path'

class XCodeBuildAgent {
  constructor(options = {}) {
    this.token = options.token || process.env.XCODE_AGENT_TOKEN;
    this.serverUrl = options.serverUrl || process.env.XCODE_SERVER_URL;
    this.agentId = null;
    this.socket = null;
    this.isConnected = false;
    this.currentJobs = new Map();
    this.heartbeatInterval = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 5000; // Start with 5 seconds
    this.reconnectTimeout = null;
    
    // Agent metadata
    this.agentInfo = {
      hostname: os.hostname(),
      platform: this.detectPlatform(),
      architecture: os.arch(),
      capabilities: this.detectCapabilities(),
      version: '1.0.0',
      systemInfo: this.getSystemInfo()
    };

    this.validateConfig();
  }

  validateConfig() {
    if (!this.token) {
      console.error('❌ Error: Agent token is required');
      console.log('Usage: node agent.js --token <token> --server <server-url>');
      console.log('Or set XCODE_AGENT_TOKEN environment variable');
      process.exit(1);
    }

    if (!this.serverUrl) {
      console.error('❌ Error: Server URL is required');
      console.log('Usage: node agent.js --token <token> --server <server-url>');
      console.log('Or set XCODE_SERVER_URL environment variable');
      process.exit(1);
    }

    // Ensure WebSocket URL format
    if (!this.serverUrl.startsWith('ws://') && !this.serverUrl.startsWith('wss://')) {
      // Convert HTTP/HTTPS to WebSocket URL
      const baseUrl = this.serverUrl.replace(/^https?:\/\//, '');
      const protocol = this.serverUrl.startsWith('https://') ? 'wss://' : 'ws://';
      this.serverUrl = `${protocol}${baseUrl}`;
    }
  }

  detectPlatform() {
    const platform = os.platform();
    switch (platform) {
      case 'win32': return 'windows';
      case 'darwin': return 'macos';
      case 'linux': return 'linux';
      default: return platform;
    }
  }

  detectCapabilities() {
    const capabilities = [];

    // Helper function to safely check command availability
    const hasCommand = (command) => {
      try {
        execSync(command, { stdio: 'ignore', timeout: 3000 });
        return true;
      } catch {
        return false;
      }
    };

    // Helper function to check file/directory existence
    const hasPath = (path) => {
      try {
        return fs.existsSync(path)
      } catch {
        return false
      }
    };

    // Platform-specific capabilities
    const platform = os.platform();
    
    // Basic shell capabilities
    if (platform === 'win32') {
      capabilities.push('windows', 'cmd', 'batch', 'powershell');
      
      // Check for Windows-specific tools
      if (hasCommand('wsl --version')) capabilities.push('wsl');
      if (hasCommand('choco --version')) capabilities.push('chocolatey');
      if (hasCommand('winget --version')) capabilities.push('winget');
      if (hasCommand('dotnet --version')) capabilities.push('dotnet');
      if (hasCommand('msbuild -version')) capabilities.push('msbuild');
      if (hasCommand('nuget')) capabilities.push('nuget');
      if (hasPath('C:\\Program Files\\Git\\bin\\git.exe')) capabilities.push('git-windows');
      
    } else {
      capabilities.push('unix', 'sh', 'bash');
      
      if (platform === 'darwin') {
        capabilities.push('macos');
        // macOS-specific tools
        if (hasCommand('xcode-select --version')) capabilities.push('xcode');
        if (hasCommand('xcrun --version')) capabilities.push('xcrun');
        if (hasCommand('brew --version')) capabilities.push('homebrew');
        if (hasCommand('swift --version')) capabilities.push('swift');
        if (hasPath('/Applications/Xcode.app')) capabilities.push('xcode-full');
        
      } else if (platform === 'linux') {
        capabilities.push('linux');
        
        // Check Linux distribution
        if (hasPath('/etc/debian_version')) capabilities.push('debian-based');
        if (hasPath('/etc/redhat-release')) capabilities.push('redhat-based');
        if (hasCommand('apt --version')) capabilities.push('apt');
        if (hasCommand('yum --version')) capabilities.push('yum');
        if (hasCommand('dnf --version')) capabilities.push('dnf');
        if (hasCommand('pacman --version')) capabilities.push('pacman');
        if (hasCommand('snap --version')) capabilities.push('snap');
        if (hasCommand('flatpak --version')) capabilities.push('flatpak');
      }
      
      // Unix-like system tools
      if (hasCommand('sudo -V')) capabilities.push('sudo');
      if (hasCommand('make --version')) capabilities.push('make');
      if (hasCommand('gcc --version')) capabilities.push('gcc');
      if (hasCommand('clang --version')) capabilities.push('clang');
    }

    // Cross-platform development tools
    const tools = [
      'git', 'node', 'npm', 'yarn', 'pnpm', 'bun',
      'python', 'python3', 'pip', 'pip3', 'poetry', 'conda',
      'java', 'javac', 'gradle', 'maven', 'ant',
      'go', 'rust', 'cargo', 'ruby', 'gem', 'bundler',
      'php', 'composer', 'perl', 'lua',
      'docker', 'docker-compose', 'podman', 'kubectl', 'helm',
      'terraform', 'ansible', 'vagrant',
      'cmake', 'ninja', 'bazel'
    ];

    tools.forEach(tool => {
      const versionCommands = {
        'git': 'git --version',
        'node': 'node --version',
        'npm': 'npm --version',
        'yarn': 'yarn --version',
        'pnpm': 'pnpm --version',
        'bun': 'bun --version',
        'python': 'python --version',
        'python3': 'python3 --version',
        'pip': 'pip --version',
        'pip3': 'pip3 --version',
        'poetry': 'poetry --version',
        'conda': 'conda --version',
        'java': 'java -version',
        'javac': 'javac -version',
        'gradle': 'gradle --version',
        'maven': 'mvn --version',
        'ant': 'ant -version',
        'go': 'go version',
        'rust': 'rustc --version',
        'cargo': 'cargo --version',
        'ruby': 'ruby --version',
        'gem': 'gem --version',
        'bundler': 'bundler --version',
        'php': 'php --version',
        'composer': 'composer --version',
        'perl': 'perl --version',
        'lua': 'lua -v',
        'docker': 'docker --version',
        'docker-compose': 'docker-compose --version',
        'podman': 'podman --version',
        'kubectl': 'kubectl version --client',
        'helm': 'helm version',
        'terraform': 'terraform --version',
        'ansible': 'ansible --version',
        'vagrant': 'vagrant --version',
        'cmake': 'cmake --version',
        'ninja': 'ninja --version',
        'bazel': 'bazel --version'
      };

      if (hasCommand(versionCommands[tool] || `${tool} --version`)) {
        capabilities.push(tool);
      }
    });

    // Environment capabilities
    if (process.env.CI) capabilities.push('ci-environment');
    if (process.env.GITHUB_ACTIONS) capabilities.push('github-actions');
    if (process.env.JENKINS_URL) capabilities.push('jenkins');
    if (process.env.GITLAB_CI) capabilities.push('gitlab-ci');
    if (process.env.AZURE_HTTP_USER_AGENT) capabilities.push('azure-devops');

    // System capabilities
    const cpuCount = os.cpus().length;
    const totalMemoryGB = Math.round(os.totalmem() / 1024 / 1024 / 1024);
    
    capabilities.push(`cpu-cores-${cpuCount}`);
    capabilities.push(`memory-${totalMemoryGB}gb`);
    
    if (cpuCount >= 8) capabilities.push('high-cpu');
    if (totalMemoryGB >= 16) capabilities.push('high-memory');
    if (totalMemoryGB >= 32) capabilities.push('very-high-memory');

    // Architecture capabilities
    const arch = os.arch();
    capabilities.push(`arch-${arch}`);
    if (arch === 'x64' || arch === 'x86_64') capabilities.push('x64-compatible');
    if (arch === 'arm64' || arch === 'aarch64') capabilities.push('arm64-compatible');

    // Network capabilities
    const networkInterfaces = os.networkInterfaces();
    const hasIPv4 = Object.values(networkInterfaces).flat().some(iface => 
      iface.family === 'IPv4' && !iface.internal
    );
    const hasIPv6 = Object.values(networkInterfaces).flat().some(iface => 
      iface.family === 'IPv6' && !iface.internal
    );
    
    if (hasIPv4) capabilities.push('ipv4');
    if (hasIPv6) capabilities.push('ipv6');

    // Check for virtualization
    if (hasPath('/proc/vz')) capabilities.push('openvz');
    if (hasPath('/proc/xen')) capabilities.push('xen');
    if (hasCommand('systemd-detect-virt')) {
      try {
        const virt = execSync('systemd-detect-virt', { encoding: 'utf8', timeout: 2000 }).trim();
        if (virt !== 'none') capabilities.push('virtualized', `virt-${virt}`);
      } catch {}
    }

    // Container detection
    if (hasPath('/.dockerenv')) capabilities.push('docker-container');
    if (process.env.KUBERNETES_SERVICE_HOST) capabilities.push('kubernetes-pod');

    return [...new Set(capabilities)]; // Remove duplicates
  }

  getSystemInfo() {
    return {
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      cpus: os.cpus().length,
      memory: Math.round(os.totalmem() / 1024 / 1024 / 1024) + 'GB',
      uptime: os.uptime(),
      nodeVersion: process.version,
      agentVersion: '1.0.0'
    };
  }

  async connect() {
    console.log(`🔌 Connecting to XCode server: ${this.serverUrl}`);
    console.log(`🎯 Agent Token: ${this.token.substring(0, 8)}...`);
    console.log(`💻 Platform: ${this.agentInfo.platform} (${this.agentInfo.architecture})`);
    console.log(`🏠 Hostname: ${this.agentInfo.hostname}`);

    try {
      this.socket = io(this.serverUrl);

      this.socket.on('connect', () => {
        console.log('✅ Connected to XCode server');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.reconnectDelay = 5000;
        this.authenticate();
      });

      this.socket.on('message', (data) => {
        this.handleMessage(data);
      });

      this.socket.on('close', () => {
        console.log('🔌 Connection closed');
        this.isConnected = false;
        this.stopHeartbeat();
        this.attemptReconnect();
      });

      this.socket.on('disconnect', () => {
        console.log('🔌 Connection disconnected');
        this.isConnected = false;
        this.stopHeartbeat();
        this.attemptReconnect();
      });

      this.socket.on('error', (error) => {
        console.error('❌ WebSocket error:', error.message);
        this.isConnected = false;
        this.stopHeartbeat();
        this.attemptReconnect();
      });

    } catch (error) {
      console.error('❌ Failed to connect:', error.message);
      this.attemptReconnect();
    }
  }

  authenticate() {
    console.log('🔐 Authenticating with server...');
    this.sendMessage('authenticate', { token: this.token });
  }

  async registerAgent() {
    console.log('📝 Registering agent with server...');
    this.sendMessage('register', this.agentInfo);
  }

  sendMessage(type, data) {
    this.socket.send({ type, ...data });
  }

  sendJobOutput(jobId, outputLine) {
    if (this.currentJobs.has(jobId)) {
      const job = this.currentJobs.get(jobId);
      job.outputBuffer.push(outputLine);
      
      this.sendMessage('job_output', {
        jobId,
        output: outputLine,
        timestamp: new Date().toISOString()
      });
    }
  }

  handleMessage(message) {
    try {
      switch (message.type) {
        case 'welcome':
          console.log('✅ Received welcome from server');
          break;

        case 'authenticated':
          console.log('✅ Authentication successful');
          this.agentId = message.agentId;
          this.registerAgent();
          break;

        case 'registered':
          console.log('✅ Agent registered successfully');
          this.startHeartbeat();
          break;

        case 'execute_job':
          this.handleJobExecution(message);
          break;

        case 'cancel_job':
          this.handleJobCancellation(message);
          break;

        case 'heartbeat_ack':
          // Heartbeat acknowledged
          break;

        case 'error':
          console.error('❌ Server error:', message.message);
          break;

        default:
          console.log('📨 Unknown message type:', message.type);
          break;
      }
    } catch (error) {
      console.error('❌ Failed to parse message:', error);
    }
  }

  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.sendMessage('heartbeat', {
        status: this.currentJobs.size > 0 ? 'busy' : 'online',
        currentJobs: this.currentJobs.size,
        timestamp: new Date().toISOString()
      });
    }, 30000); // Send heartbeat every 30 seconds
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  async handleJobExecution(jobData) {
    const { jobId, retryEnabled, maxRetries } = jobData;
    
    console.log(`🚀 Starting job: ${jobId}`);
    
    if (retryEnabled && maxRetries > 0) {
      console.log(`🔄 Retry policy enabled: ${maxRetries} retries`);
    }
    
    this.currentJobs.set(jobId, { 
      startTime: Date.now(), 
      status: 'running',
      process: null,
      outputBuffer: []
    });

    this.sendMessage('agent:job_status', {
        jobId,
        status: 'started',
        currentJobs: this.currentJobs.size,
        timestamp: new Date().toISOString()
    });

    // Start execution with retry logic (non-blocking)
    this.executeJobWithRetry(jobData, 0);
  }

  async executeJobWithRetry(jobData, attempt) {
    const { jobId, commands, environment = {}, workingDirectory, timeout, jobType, nodeType, retryEnabled, maxRetries, retryDelay } = jobData;
    const maxAttempts = (retryEnabled && maxRetries > 0) ? maxRetries + 1 : 1;
    
    try {
      if (attempt > 0) {
        console.log(`🔄 Retry attempt ${attempt}/${maxRetries} for job: ${jobId}`);
        this.sendJobOutput(jobId, {
          type: 'info',
          level: 'info',
          message: `🔄 Retry attempt ${attempt}/${maxRetries}`,
          timestamp: new Date().toISOString(),
          source: 'Agent'
        });
      }
      
      const executionType = jobType || nodeType;
      const effectiveTimeout = (timeout !== undefined && timeout !== null && timeout > 0) ? timeout : null;
      
      const result = await this.executeJob(commands, environment, workingDirectory, effectiveTimeout, executionType, jobId);
      
      // Success - complete the job
      const job = this.currentJobs.get(jobId);
      this.currentJobs.delete(jobId);
      console.log(`✅ Job completed: ${jobId}`);
      
      this.sendMessage('job_complete', {
          jobId,
          status: 'completed',
          output: result.output,
          outputLines: job?.outputBuffer || [],
          exitCode: result.exitCode,
          duration: Date.now() - (job?.startTime || Date.now()),
          currentJobs: this.currentJobs.size,
          message: `Job completed successfully (exit code: ${result.exitCode})`,
          timestamp: new Date().toISOString()
      });
      
      this.sendMessage('agent:heartbeat', {
          status: this.currentJobs.size > 0 ? 'busy' : 'online',
          currentJobs: this.currentJobs.size,
          timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      const wasCancelled = error.message.includes('cancelled') || error.code === 'CANCELLED';
      
      // Don't retry if cancelled or timeout
      if (wasCancelled || error.code === 'TIMEOUT') {
        this.failJob(jobId, error, wasCancelled ? 'cancelled' : 'failed');
        return;
      }
      
      attempt++;
      
      // Send job_failure message on EVERY failure (triggers failure handlers immediately)
      this.sendMessage('job_failure', {
        jobId,
        error: error.message,
        output: error.output || '',
        exitCode: error.exitCode || 1,
        isRetrying: attempt < maxAttempts,
        currentAttempt: attempt,
        maxAttempts: maxAttempts,
        timestamp: new Date().toISOString()
      });
      
      // If no more attempts, fail the job permanently
      if (attempt >= maxAttempts) {
        this.failJob(jobId, error, 'failed', `Job failed after ${attempt} attempts: ${error.message}`);
        return;
      }
      
      // Schedule retry (non-blocking)
      console.log(`⏳ Scheduling retry in ${retryDelay}s...`);
      this.sendJobOutput(jobId, {
        type: 'warning',
        level: 'warning',
        message: `❌ Attempt ${attempt} failed: ${error.message}. Retrying in ${retryDelay}s...`,
        timestamp: new Date().toISOString(),
        source: 'Agent'
      });
      
      setTimeout(() => {
        this.executeJobWithRetry(jobData, attempt);
      }, (retryDelay || 0) * 1000);
    }
  }

  failJob(jobId, error, status, customMessage = null) {
    const job = this.currentJobs.get(jobId);
    this.currentJobs.delete(jobId);
    
    console.error(`❌ Job ${status}: ${jobId}`, error.message);
    
    this.sendMessage('agent:job_status', {
        jobId,
        status,
        error: customMessage || error.message,
        output: error.output || '',
        outputLines: job?.outputBuffer || [],
        exitCode: error.exitCode || (status === 'cancelled' ? -1 : 1),
        currentJobs: this.currentJobs.size,
        timestamp: new Date().toISOString()
    });
    
    this.sendMessage('agent:heartbeat', {
        status: this.currentJobs.size > 0 ? 'busy' : 'online',
        currentJobs: this.currentJobs.size,
        timestamp: new Date().toISOString()
    });
  }

  async handleJobCancellation(cancellationData) {
    const { jobId } = cancellationData;
    
    console.log(`🛑 Received cancellation request for job: ${jobId}`);
    
    if (!this.currentJobs.has(jobId)) {
      console.warn(`⚠️ Cannot cancel job ${jobId}: Job not found or already completed`);
      this.sendMessage('agent:job_status', {
        jobId,
        status: 'cancel_failed',
        error: 'Job not found or already completed',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const job = this.currentJobs.get(jobId);
    
    if (!job.process) {
      console.warn(`⚠️ Cannot cancel job ${jobId}: No active process found`);
      this.sendMessage('agent:job_status', {
        jobId,
        status: 'cancel_failed', 
        error: 'No active process found',
        timestamp: new Date().toISOString()
      });
      return;
    }

    try {
      console.log(`🔪 Terminating job ${jobId} process (PID: ${job.process.pid})`);
      
      // First try graceful termination
      job.process.kill('SIGTERM');
      
      // Set a timeout to force kill if graceful termination doesn't work
      setTimeout(() => {
        if (job.process && !job.process.killed) {
          console.log(`🔪 Force killing job ${jobId} process (PID: ${job.process.pid})`);
          job.process.kill('SIGKILL');
        }
      }, 5000);

      this.sendMessage('agent:job_status', {
        jobId,
        status: 'cancelling',
        message: 'Job cancellation initiated',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error(`❌ Error cancelling job ${jobId}:`, error.message);
      this.sendMessage('agent:job_status', {
        jobId,
        status: 'cancel_failed',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  async executeJob(commands, environment, workingDirectory, timeout, jobType = null, jobId = null) {
    return new Promise((resolve, reject) => {
      const isWindows = this.agentInfo.platform === 'windows';
      
      // Determine executor based on job type or fallback to platform default
      const executorConfig = this.getExecutorConfig(jobType, isWindows);
      
      if (!executorConfig) {
        reject(new Error(`Unsupported job type: ${jobType} on platform: ${this.agentInfo.platform}`));
        return;
      }

      console.log(`🔧 Using executor: ${executorConfig.name} (${executorConfig.command})`);
      
      // Prepare script/commands based on executor type
      let script;
      if (executorConfig.type === 'interpreter') {
        // For interpreters like python/node, commands should be the script content
        script = Array.isArray(commands) ? commands.join('\n') : commands;
      } else {
        // For shells, combine commands with appropriate separator
        const separator = executorConfig.commandSeparator || (isWindows ? ' && ' : ' && ');
        script = Array.isArray(commands) ? commands.join(separator) : commands;
      }

      // Create temporary file for interpreters if needed
      let tempFile = null;
      let finalArgs = [...executorConfig.args];

      if (executorConfig.type === 'interpreter' && script) {
        const tempDir = os.tmpdir()
        
        tempFile = path.join(tempDir, `xcode_job_${Date.now()}${executorConfig.extension || '.tmp'}`);
        
        try {
          fs.writeFileSync(tempFile, script, 'utf8');
          finalArgs.push(tempFile);
        } catch (error) {
          reject(new Error(`Failed to create temporary script file: ${error.message}`));
          return;
        }
      } else if (executorConfig.type === 'shell') {
        finalArgs.push(script);
      }

      console.log(`📝 Executing: ${executorConfig.command} ${finalArgs.join(' ')}`);
      
      const child = spawn(executorConfig.command, finalArgs, {
        cwd: workingDirectory || process.cwd(),
        env: { ...process.env, ...environment },
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: executorConfig.useShell || false
      });

      // Store child process reference for cancellation
      if (jobId && this.currentJobs.has(jobId)) {
        this.currentJobs.get(jobId).process = child;
      }

      let output = '';
      let errorOutput = '';
      let timeoutId = null;

      child.stdout.on('data', (data) => {
        const chunk = data.toString();
        output += chunk;
        
        // Send real-time output to server for streaming to editor
        if (jobId && this.currentJobs.has(jobId)) {
          const job = this.currentJobs.get(jobId);
          const lines = chunk.split('\n').filter(line => line.trim());
          
          lines.forEach(line => {
            const outputLine = {
              type: 'info',
              level: 'info',
              message: line.trim(),
              timestamp: new Date().toISOString(),
              source: 'Agent'
            };
            
            job.outputBuffer.push(outputLine);
            
            // Send real-time output update
            this.sendMessage('job_output', {
              jobId,
              output: outputLine,
              timestamp: new Date().toISOString()
            });
          });
        }
        
        console.log(chunk.trim());
      });

      child.stderr.on('data', (data) => {
        const chunk = data.toString();
        errorOutput += chunk;
        
        // Send real-time error output to server for streaming to editor
        if (jobId && this.currentJobs.has(jobId)) {
          const job = this.currentJobs.get(jobId);
          const lines = chunk.split('\n').filter(line => line.trim());
          
          lines.forEach(line => {
            const outputLine = {
              type: 'error',
              level: 'error',
              message: line.trim(),
              timestamp: new Date().toISOString(),
              source: 'Agent'
            };
            
            job.outputBuffer.push(outputLine);
            
            // Send real-time error output update
            this.sendMessage('job_output', {
              jobId,
              output: outputLine,
              timestamp: new Date().toISOString()
            });
          });
        }
        
        console.error(chunk.trim());
      });

      // Only set timeout if explicitly provided
      if (timeout !== null && timeout !== undefined && timeout > 0) {
        timeoutId = setTimeout(() => {
          console.log(`⏱️ Job ${jobId} timed out after ${timeout}ms, terminating...`);
          child.kill('SIGTERM');
          
          // Force kill after 5 seconds if SIGTERM doesn't work
          setTimeout(() => {
            if (!child.killed) {
              console.log(`🔪 Force killing job ${jobId} process...`);
              child.kill('SIGKILL');
            }
          }, 5000);
          
          const error = new Error(`Job timed out after ${timeout}ms`);
          error.code = 'TIMEOUT';
          reject(error);
        }, timeout);
      }

      const cleanup = () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        
        // Remove process reference from currentJobs
        if (jobId && this.currentJobs.has(jobId)) {
          this.currentJobs.get(jobId).process = null;
        }
        
        // Clean up temporary file if created
        if (tempFile) {
          try {
            fs.unlinkSync(tempFile)
          } catch (error) {
            console.warn(`Failed to clean up temporary file: ${tempFile}`)
          }
        }
      };

      child.on('close', (exitCode, signal) => {
        cleanup();
        
        if (signal === 'SIGTERM' || signal === 'SIGKILL') {
          const error = new Error(`Job was cancelled (signal: ${signal})`);
          error.code = 'CANCELLED';
          error.output = output + errorOutput;
          error.exitCode = -1;
          reject(error);
        } else if (exitCode === 0) {
          resolve({
            output: output + errorOutput,
            exitCode,
            success: true
          });
        } else {
          const error = new Error(`Command failed with exit code ${exitCode}`);
          error.output = output + errorOutput;
          error.exitCode = exitCode;
          reject(error);
        }
      });

      child.on('error', (error) => {
        cleanup();
        error.output = output + errorOutput;
        reject(error);
      });
    });
  }

  getExecutorConfig(jobType, isWindows) {
    const executors = {
      // Shell executors
      'bash': {
        name: 'Bash',
        type: 'shell',
        command: isWindows ? 'bash' : '/bin/bash',
        args: ['-c'],
        commandSeparator: ' && ',
        capabilities: ['bash']
      },
      'sh': {
        name: 'Shell (POSIX)',
        type: 'shell',
        command: isWindows ? 'sh' : '/bin/sh',
        args: ['-c'],
        commandSeparator: ' && ',
        capabilities: ['sh', 'posix-shell']
      },
      'cmd': {
        name: 'Command Prompt',
        type: 'shell',
        command: 'cmd.exe',
        args: ['/c'],
        commandSeparator: ' && ',
        capabilities: ['cmd'],
        platforms: ['windows']
      },
      'powershell': {
        name: 'PowerShell',
        type: 'shell',
        command: isWindows ? 'powershell.exe' : 'pwsh',
        args: ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command'],
        commandSeparator: '; ',
        capabilities: ['powershell']
      },
      
      // Interpreter executors
      'python': {
        name: 'Python',
        type: 'interpreter',
        command: 'python',
        args: [],
        extension: '.py',
        capabilities: ['python']
      },
      'python3': {
        name: 'Python 3',
        type: 'interpreter',
        command: 'python3',
        args: [],
        extension: '.py',
        capabilities: ['python3']
      },
      'node': {
        name: 'Node.js',
        type: 'interpreter',
        command: 'node',
        args: [],
        extension: '.js',
        capabilities: ['node']
      },
      
      // Language-specific executors
      'go': {
        name: 'Go',
        type: 'interpreter',
        command: 'go',
        args: ['run'],
        extension: '.go',
        capabilities: ['go']
      },
      'rust': {
        name: 'Rust',
        type: 'shell',
        command: 'rustc',
        args: [],
        capabilities: ['rust']
      },
      'java': {
        name: 'Java',
        type: 'interpreter',
        command: 'java',
        args: [],
        extension: '.java',
        capabilities: ['java']
      },
      'php': {
        name: 'PHP',
        type: 'interpreter',
        command: 'php',
        args: [],
        extension: '.php',
        capabilities: ['php']
      },
      'ruby': {
        name: 'Ruby',
        type: 'interpreter',
        command: 'ruby',
        args: [],
        extension: '.rb',
        capabilities: ['ruby']
      },
      'perl': {
        name: 'Perl',
        type: 'interpreter',
        command: 'perl',
        args: [],
        extension: '.pl',
        capabilities: ['perl']
      }
    };

    // If no job type specified, use platform default
    if (!jobType) {
      return isWindows ? executors['cmd'] : executors['bash'];
    }

    const executor = executors[jobType];
    if (!executor) {
      return null;
    }

    // Check platform compatibility
    if (executor.platforms && !executor.platforms.includes(isWindows ? 'windows' : 'unix')) {
      return null;
    }

    // Check if agent has required capabilities
    if (executor.capabilities) {
      const hasCapability = executor.capabilities.some(cap => 
        this.agentInfo.capabilities.includes(cap)
      );
      if (!hasCapability) {
        console.warn(`⚠️ Agent missing required capability for ${jobType}: ${executor.capabilities.join(', ')}`);
        return null;
      }
    }

    return executor;
  }

  attemptReconnect() {
    // Prevent multiple simultaneous reconnection attempts
    if (this.reconnectTimeout) {
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached. Exiting.');
      process.exit(1);
    }

    this.reconnectAttempts++;
    console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${this.reconnectDelay / 1000}s...`);

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.connect();
    }, this.reconnectDelay);

    // Exponential backoff
    this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, 60000);
  }

  async start() {
    console.log('🚀 Starting XCode Build Agent...');
    console.log('════════════════════════════════════════');
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Received SIGINT, shutting down gracefully...');
      this.shutdown();
    });

    process.on('SIGTERM', () => {
      console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
      this.shutdown();
    });

    await this.connect();
  }

  shutdown() {
    console.log('🛑 Shutting down agent...');
    this.stopHeartbeat();
    
    // Clear reconnection timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.socket) {
      this.socket.close();
    }
    
    // Cancel any running jobs
    for (const [jobId] of this.currentJobs) {
      console.log(`🚫 Cancelling job: ${jobId}`);
    }
    
    console.log('👋 Agent stopped');
    process.exit(0);
  }
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};

  for (let i = 0; i < args.length; i += 2) {
    const key = args[i];
    const value = args[i + 1];

    switch (key) {
      case '--token':
      case '-t':
        options.token = value;
        break;
      case '--server':
      case '-s':
        options.serverUrl = value;
        break;
      case '--help':
      case '-h':
        console.log(`
XCode Build Agent v1.0.0

Usage:
  node agent.js --token <token> --server <server-url>

Options:
  --token, -t    Agent authentication token (required)
  --server, -s   XCode server WebSocket URL (required)
  --help, -h     Show this help message

Environment Variables:
  XCODE_AGENT_TOKEN    Agent token (alternative to --token)
  XCODE_SERVER_URL     Server URL (alternative to --server)

Examples:
  node agent.js --token abc123def --server ws://localhost:3001
  node agent.js --token abc123def --server http://localhost:3001
  XCODE_AGENT_TOKEN=abc123def XCODE_SERVER_URL=ws://localhost:3001 node agent.js
        `);
        process.exit(0);
        break;
    }
  }

  return options;
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const options = parseArgs()
  const agent = new XCodeBuildAgent(options)
  agent.start().catch(error => {
    console.error('❌ Failed to start agent:', error.message)
    process.exit(1)
  })
}

export default XCodeBuildAgent