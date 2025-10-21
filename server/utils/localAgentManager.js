import { randomBytes } from 'crypto'
import XCodeBuildAgent from '../../build-agent/agent.js'
import { getDataService } from './dataService.js'

class LocalAgentManager {
  constructor() {
    this.localAgent = null
    this.localAgentToken = null
    this.isStarted = false
  }

  async start(serverUrl = 'ws://localhost:3000') {
    if (this.isStarted) {
      console.log('🔧 Local agent already started')
      return
    }

    try {
      console.log('🚀 Starting local build agent...')
      
      // Generate or retrieve local agent token
      await this.ensureLocalAgentToken()
      
      // Create local agent instance
      this.localAgent = new XCodeBuildAgent({
        token: this.localAgentToken,
        serverUrl: serverUrl
      })

      // Start the agent (non-blocking)
      this.localAgent.start().catch(error => {
        console.error('❌ Local agent startup error:', error.message)
      })
      
      this.isStarted = true
      console.log('✅ Local build agent started successfully')
      
    } catch (error) {
      console.error('❌ Failed to start local agent:', error.message)
      throw error
    }
  }

  async ensureLocalAgentToken() {
    try {
      const dataService = await getDataService()
      
      // Check if local agent already exists
      const existingAgent = await dataService.getAgentByName('Local Agent')
      
      if (existingAgent) {
        this.localAgentToken = existingAgent.token
        console.log('🔧 Using existing local agent token')
        return
      }

      // Create new local agent
      const token = this.generateToken()
      const agentData = {
        name: 'Local Agent',
        token: token,
        description: 'Built-in local execution agent',
        status: 'offline',
        isLocal: true
      }

      const createdAgent = await dataService.createAgent(agentData)
      this.localAgentToken = token
      
      console.log('✅ Created new local agent with token')
      
    } catch (error) {
      console.error('❌ Error ensuring local agent token:', error)
      throw error
    }
  }

  generateToken() {
    return randomBytes(32).toString('hex')
  }

  async stop() {
    if (this.localAgent) {
      console.log('🛑 Stopping local build agent...')
      this.localAgent.shutdown()
      this.localAgent = null
      this.isStarted = false
      console.log('✅ Local build agent stopped')
    }
  }

  isRunning() {
    return this.isStarted && this.localAgent !== null
  }
}

// Singleton instance
let localAgentManager = null

export async function getLocalAgentManager() {
  if (!localAgentManager) {
    localAgentManager = new LocalAgentManager()
  }
  return localAgentManager
}

export { LocalAgentManager }