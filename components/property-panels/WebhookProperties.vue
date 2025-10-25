<template>
    <div>
        <div class="mb-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <div class="flex items-center mb-2">
            <svg class="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
            </svg>
            <h4 class="text-sm font-semibold text-blue-800 dark:text-blue-200">Webhook Trigger Configuration</h4>
            </div>
            <p class="text-xs text-blue-700 dark:text-blue-300">
            Configure this webhook to allow external systems to trigger this workflow via HTTP requests.
            </p>
        </div>
        
        <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
            Custom Endpoint <span class="text-red-500">*</span>
        </label>
        <div class="flex items-center mb-2">
            <span class="text-sm text-neutral-500 dark:text-neutral-400 mr-2">/api/webhook/</span>
            <input
            v-model="nodeData.data.customEndpoint"
            type="text"
            class="flex-1 px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white font-mono"
            placeholder="deploy-prod"
            pattern="[a-zA-Z0-9-_]+"
            @input="validateEndpoint"
            />
        </div>
        <p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            Choose a unique endpoint name (letters, numbers, dashes, and underscores only). Examples: <code>deploy-prod</code>, <code>backup_db</code>, <code>notify-slack</code>
        </p>
        
        <div class="mt-3">
            <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
            Secret Token <span class="text-red-500">*</span>
            </label>
            <div class="flex items-center space-x-2">
            <input
                v-model="nodeData.data.secretToken"
                type="text"
                required
                class="flex-1 px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white font-mono"
                placeholder="Enter a secure secret token (required)"
                :class="{ 'border-red-500 dark:border-red-400': !nodeData.data.secretToken }"
            />
            <button
                @click="generateSecretToken"
                type="button"
                class="px-3 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors flex items-center space-x-1"
                title="Generate random secure token"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                <circle cx="12" cy="16" r="1"/>
                <path d="m7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <span class="hidden sm:inline">Generate</span>
            </button>
            </div>
            <p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            Required for security. Include this token in the 'X-Webhook-Token' header when calling the webhook. Use the Generate button for a cryptographically secure 64-character token.
            </p>
            <p v-if="!nodeData.data.secretToken" class="mt-1 text-xs text-red-500 dark:text-red-400">
            Secret token is required for webhook security
            </p>
        </div>
        
        <div class="mt-3">
            <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Description</label>
            <textarea
            v-model="nodeData.data.description"
            rows="2"
            class="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
            placeholder="Describe what this webhook does (optional)"
            ></textarea>
        </div>
        
        <div class="mt-3">
            <label class="flex items-center">
            <input
                v-model="nodeData.data.active"
                type="checkbox"
                class="w-4 h-4 text-blue-600 bg-white dark:bg-neutral-700 border-neutral-300 dark:border-neutral-600 rounded focus:ring-blue-500 focus:ring-2"
            />
            <span class="ml-2 text-sm text-neutral-700 dark:text-neutral-300">Active</span>
            </label>
            <p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            Uncheck to temporarily disable this webhook trigger
            </p>
        </div>
        
        <!-- Webhook URL Display -->
        <div v-if="nodeData.data.customEndpoint" class="mt-3 p-3 bg-blue-50 dark:bg-blue-950 rounded text-xs">
            <div class="font-medium text-blue-800 dark:text-blue-200 mb-2">🎣 Webhook URL:</div>
            <div class="text-blue-700 dark:text-blue-300 space-y-2">
            <div class="bg-white dark:bg-blue-900 p-2 rounded border border-blue-200 dark:border-blue-800 font-mono break-all">
                {{ webhookUrl }}
            </div>
            <div class="space-y-1">
                <div><strong>Method:</strong> POST</div>
                <div><strong>Auth:</strong> Required (secret token)</div>
                <div><strong>Status:</strong> {{ nodeData.data.active ? 'Active' : 'Inactive' }}</div>
            </div>
            <div class="text-xs opacity-75 mt-2">
                <div><strong>Example curl:</strong></div>
                <div class="bg-neutral-800 text-green-400 p-2 rounded mt-1 font-mono text-xs overflow-x-auto">
                curl -X POST {{ webhookUrl }} \<br/>&nbsp;&nbsp;-H "X-Webhook-Token: {{ nodeData.data.secretToken || 'YOUR_SECRET_TOKEN' }}" \<br/>&nbsp;&nbsp;-H "Content-Type: application/json" \<br/>&nbsp;&nbsp;-d '{"message": "Hello from webhook"}'
                </div>
            </div>
            </div>
        </div>
        
        <!-- Webhook Documentation -->
        <div class="mt-4 p-3 bg-green-50 dark:bg-green-950 rounded text-xs">
            <div class="font-medium text-green-800 dark:text-green-200 mb-2">📖 Authentication Methods:</div>
            <div class="text-green-700 dark:text-green-300 space-y-2">
            <div class="space-y-1">
                <div class="font-medium">Custom APIs & Services:</div>
                <div class="pl-2 text-xs opacity-90">Header: <span class="font-mono">X-Webhook-Token: your-secret-token</span></div>
                <div class="pl-2 text-xs opacity-90">Body: <span class="font-mono">&#123;"token": "your-secret-token"&#125;</span></div>
                <div class="pl-2 text-xs opacity-90">Query: <span class="font-mono">?token=your-secret-token</span></div>
            </div>
            <div class="space-y-1">
                <div class="font-medium">Git Platforms (Automatic):</div>
                <div class="pl-2 text-xs opacity-90">GitHub: X-Hub-Signature-256 (SHA256 HMAC)</div>
                <div class="pl-2 text-xs opacity-90">GitLab: X-Gitlab-Token header</div>
                <div class="pl-2 text-xs opacity-90">Bitbucket: X-Hub-Signature (SHA1 HMAC)</div>
                <div class="pl-2 text-xs opacity-90">Azure DevOps: Authorization header</div>
            </div>
            <div class="pt-1 border-t border-green-200 dark:border-green-800">
                <div class="font-medium">Security Note:</div>
                <div class="text-xs opacity-90">Always configure a secret token for production webhooks. Git platforms will automatically sign requests using your secret.</div>
            </div>
            </div>
        </div>
        
        <!-- Common Use Cases -->
        <div class="mt-3 p-3 bg-amber-50 dark:bg-amber-950 rounded text-xs">
            <div class="font-medium text-amber-800 dark:text-amber-200 mb-2">💡 Common Use Cases:</div>
            <div class="text-amber-700 dark:text-amber-300 space-y-1">
            <div>• <strong>CI/CD:</strong> Trigger deployments from GitHub, GitLab, or other platforms</div>
            <div>• <strong>Notifications:</strong> Respond to events from Slack, Discord, or monitoring tools</div>
            <div>• <strong>API Integration:</strong> Process data from external APIs or services</div>
            <div>• <strong>Automation:</strong> Execute workflows when specific events occur</div>
            </div>
        </div>

        <!-- Git Integration Examples -->
        <div class="mt-3 p-3 bg-green-50 dark:bg-green-950 rounded text-xs">
            <div class="font-medium text-green-800 dark:text-green-200 mb-2">Git Platform Setup:</div>
            <div class="text-green-700 dark:text-green-300 space-y-2">
            <div class="space-y-1">
                <div class="font-medium">GitHub:</div>
                <div class="pl-2 text-xs opacity-90">1. Settings → Webhooks → Add webhook</div>
                <div class="pl-2 text-xs opacity-90">2. Payload URL: <span class="font-mono">{{ webhookUrl }}</span></div>
                <div class="pl-2 text-xs opacity-90">3. Secret: <span class="font-mono">{{ nodeData.data.secretToken || 'your-secret-token' }}</span></div>
                <div class="pl-2 text-xs opacity-90">4. Content type: application/json</div>
            </div>
            <div class="space-y-1">
                <div class="font-medium">GitLab:</div>
                <div class="pl-2 text-xs opacity-90">1. Settings → Webhooks</div>
                <div class="pl-2 text-xs opacity-90">2. URL: <span class="font-mono">{{ webhookUrl }}</span></div>
                <div class="pl-2 text-xs opacity-90">3. Secret token: <span class="font-mono">{{ nodeData.data.secretToken || 'your-secret-token' }}</span></div>
            </div>
            <div class="space-y-1">
                <div class="font-medium">Bitbucket:</div>
                <div class="pl-2 text-xs opacity-90">1. Repository Settings → Webhooks → Add webhook</div>
                <div class="pl-2 text-xs opacity-90">2. URL: <span class="font-mono">{{ webhookUrl }}</span></div>
                <div class="pl-2 text-xs opacity-90">3. Secret: <span class="font-mono">{{ nodeData.data.secretToken || 'your-secret-token' }}</span></div>
            </div>
            <div class="space-y-1">
                <div class="font-medium">Azure DevOps:</div>
                <div class="pl-2 text-xs opacity-90">1. Project Settings → Service hooks</div>
                <div class="pl-2 text-xs opacity-90">2. Service: Web Hooks → URL: <span class="font-mono">{{ webhookUrl }}</span></div>
                <div class="pl-2 text-xs opacity-90">3. Basic auth: username=token, password=<span class="font-mono">{{ nodeData.data.secretToken || 'your-secret-token' }}</span></div>
            </div>
            </div>
        </div>

        <!-- Git Payload Examples -->
        <div class="mt-3 p-3 bg-blue-50 dark:bg-blue-950 rounded text-xs">
            <div class="font-medium text-blue-800 dark:text-blue-200 mb-2">� Complete Webhook Examples:</div>
            <div class="text-blue-700 dark:text-blue-300 space-y-3">
            <div>
                <div class="font-medium mb-1">GitHub Push Event:</div>
                <div class="pl-2 text-xs opacity-90 font-mono bg-blue-100 dark:bg-blue-900 p-2 rounded">
                Headers:<br/>
                X-Hub-Signature-256: sha256=abc123...<br/>
                X-GitHub-Event: push<br/><br/>
                Body:<br/>
                {<br/>
                &nbsp;&nbsp;"ref": "refs/heads/main",<br/>
                &nbsp;&nbsp;"repository": {"name": "my-repo"},<br/>
                &nbsp;&nbsp;"head_commit": {<br/>
                &nbsp;&nbsp;&nbsp;&nbsp;"message": "Fix critical bug",<br/>
                &nbsp;&nbsp;&nbsp;&nbsp;"author": {"name": "John Doe"}<br/>
                &nbsp;&nbsp;}<br/>
                }
                </div>
            </div>
            <div>
                <div class="font-medium mb-1">GitLab Push Event:</div>
                <div class="pl-2 text-xs opacity-90 font-mono bg-blue-100 dark:bg-blue-900 p-2 rounded">
                Headers:<br/>
                X-Gitlab-Token: {{ nodeData.data.secretToken || 'your-secret-token' }}<br/>
                X-Gitlab-Event: Push Hook<br/><br/>
                Body:<br/>
                {<br/>
                &nbsp;&nbsp;"ref": "refs/heads/main",<br/>
                &nbsp;&nbsp;"project": {"name": "my-repo"},<br/>
                &nbsp;&nbsp;"commits": [{<br/>
                &nbsp;&nbsp;&nbsp;&nbsp;"message": "Deploy to production",<br/>
                &nbsp;&nbsp;&nbsp;&nbsp;"author": {"name": "Jane Smith"}<br/>
                &nbsp;&nbsp;}]<br/>
                }
                </div>
            </div>
            <div>
                <div class="font-medium mb-1">Custom API Webhook:</div>
                <div class="pl-2 text-xs opacity-90 font-mono bg-blue-100 dark:bg-blue-900 p-2 rounded">
                Headers:<br/>
                X-Webhook-Token: {{ nodeData.data.secretToken || 'your-secret-token' }}<br/>
                Content-Type: application/json<br/><br/>
                Body:<br/>
                {<br/>
                &nbsp;&nbsp;"event": "deployment",<br/>
                &nbsp;&nbsp;"environment": "production",<br/>
                &nbsp;&nbsp;"status": "success",<br/>
                &nbsp;&nbsp;"timestamp": "2024-01-15T10:30:00Z"<br/>
                }
                </div>
            </div>
            </div>
        </div>

        <!-- Payload Parsing Guide -->
        <div class="mt-3 p-3 bg-purple-50 dark:bg-purple-950 rounded text-xs">
            <div class="font-medium text-purple-800 dark:text-purple-200 mb-2">Webhook Data Access:</div>
            <div class="text-purple-700 dark:text-purple-300 space-y-2">
            <div class="space-y-1">
                <div class="font-medium">Output Socket:</div>
                <div class="pl-2 text-xs bg-purple-100 dark:bg-purple-900 p-1 rounded">
                This webhook node provides <strong>1 output socket</strong> containing raw webhook data.
                </div>
            </div>
            <div class="space-y-1">
                <div class="font-medium">Available Data:</div>
                <div class="pl-2 text-xs bg-purple-100 dark:bg-purple-900 p-1 rounded space-y-1">
                <div>• <strong>body</strong> - Complete request payload</div>
                <div>• <strong>headers</strong> - HTTP headers object</div>
                <div>• <strong>query</strong> - URL query parameters</div>
                <div>• <strong>endpoint</strong> - Webhook endpoint path</div>
                <div>• <strong>timestamp</strong> - Request timestamp</div>
                </div>
            </div>
            <div class="space-y-1">
                <div class="font-medium">Usage Examples:</div>
                <div class="pl-2 text-xs bg-purple-100 dark:bg-purple-900 p-1 rounded font-mono space-y-1">
                <div># Access Git data from body</div>
                <div>echo "Branch: $INPUT_1.body.ref"</div>
                <div>echo "Commit: $INPUT_1.body.head_commit.id"</div>
                <div>echo "Author: $INPUT_1.body.head_commit.author.name"</div>
                <div>echo "Message: $INPUT_1.body.head_commit.message"</div>
                <div># Access headers</div>
                <div>echo "Event: $INPUT_1.headers.x-github-event"</div>
                <div># Access full payload as JSON</div>
                <div>echo '$INPUT_1.body' | jq .</div>
                </div>
            </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { computed } from 'vue'
const logger = useLogger()
const props = defineProps({
  nodeData: {
    type: Object,
    required: true
  }
})

// Webhook endpoint validation
const validateEndpoint = (event) => {
  const value = event.target.value
  // Remove invalid characters as user types
  const cleanValue = value.replace(/[^a-zA-Z0-9-_]/g, '')
  if (cleanValue !== value) {
    props.nodeData.data.customEndpoint = cleanValue
  }
}

// Generate secure random token for webhook
const generateSecretToken = () => {
  if (!props.nodeData) return
  // Generate a secure random token using crypto API if available, otherwise fallback
  let token = ''
  
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    // Use crypto.getRandomValues for secure random generation
    const array = new Uint8Array(32)
    window.crypto.getRandomValues(array)
    token = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
  } else {
    // Fallback for environments without crypto API
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    for (let i = 0; i < 64; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length))
    }
  }
  props.nodeData.data.secretToken = token
}

// Computed property for webhook URL
const webhookUrl = computed(() => {
  if (!props.nodeData.data?.customEndpoint) return ''
  if (typeof window === 'undefined') return `/api/webhook/${props.nodeData.data.customEndpoint}`
  return `${window.location.origin}/api/webhook/${props.nodeData.data.customEndpoint}`
})
</script>