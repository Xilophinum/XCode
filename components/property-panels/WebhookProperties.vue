<template>
    <div>
        <UAlert
            color="info"
            variant="soft"
            icon="i-lucide-send"
            :title="t('webhookProperties.webhookTriggerConfiguration')"
            class="mb-4"
        >
            <template #description>
                {{ t('webhookProperties.configureWebhookDescription') }}
            </template>
        </UAlert>
        
        <UFormField :label="t('webhookProperties.customEndpoint')" required class="mb-4">
            <div class="flex items-center gap-2">
                <span class="text-sm text-neutral-500 dark:text-neutral-400">/api/webhook/</span>
                <UInput
                    v-model="nodeData.data.customEndpoint"
                    placeholder="deploy-prod"
                    class="flex-1 font-mono"
                    @input="validateEndpoint"
                />
            </div>
            <template #help>
                {{ t('webhookProperties.customEndpointHelp') }} <code>deploy-prod</code>, <code>backup_db</code>, <code>notify-slack</code>
            </template>
        </UFormField>
        
        <UFormField :label="t('webhookProperties.secretToken')" required class="mb-4">
            <div class="flex items-center gap-2">
                <UInput
                    v-model="nodeData.data.secretToken"
                    :placeholder="t('webhookProperties.secretTokenPlaceholder')"
                    class="flex-1 font-mono"
                    :class="{ 'border-red-500 dark:border-red-400': !nodeData.data.secretToken }"
                />
                <UButton
                    @click="generateSecretToken"
                    icon="i-lucide-lock"
                    size="sm"
                >
                    {{ t('webhookProperties.generate') }}
                </UButton>
            </div>
            <template #help>
                <div class="space-y-1">
                    <p>{{ t('webhookProperties.secretTokenHelp') }}</p>
                    <p v-if="!nodeData.data.secretToken" class="text-red-500 dark:text-red-400">
                        {{ t('webhookProperties.secretTokenRequired') }}
                    </p>
                </div>
            </template>
        </UFormField>
        
        <UFormField :label="t('webhookProperties.description')" class="mb-4">
            <UTextarea
                v-model="nodeData.data.description"
                :placeholder="t('webhookProperties.descriptionPlaceholder')"
                :rows="3"
                class="w-full"
            />
        </UFormField>
        
        <div class="mb-4">
            <UCheckbox
                v-model="nodeData.data.active"
                :label="t('webhookProperties.active')"
            />
            <p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400 ml-6">
                {{ t('webhookProperties.activeHelp') }}
            </p>
        </div>
        
        <!-- Webhook URL Display -->
        <div v-if="nodeData.data.customEndpoint" class="mt-3 p-3 bg-blue-50 dark:bg-blue-950 rounded text-xs">
            <div class="font-medium text-blue-800 dark:text-blue-200 mb-2">🎣 {{ t('webhookProperties.webhookUrl') }}</div>
            <div class="text-blue-700 dark:text-blue-300 space-y-2">
            <div class="bg-white dark:bg-blue-900 p-2 rounded border border-blue-200 dark:border-blue-800 font-mono break-all">
                {{ webhookUrl }}
            </div>
            <div class="space-y-1">
                <div><strong>{{ t('webhookProperties.method') }}</strong> POST</div>
                <div><strong>{{ t('webhookProperties.auth') }}</strong> {{ t('webhookProperties.authRequired') }}</div>
                <div><strong>{{ t('webhookProperties.status') }}</strong> {{ nodeData.data.active ? t('webhookProperties.statusActive') : t('webhookProperties.statusInactive') }}</div>
            </div>
            <div class="text-xs opacity-75 mt-2">
                <div><strong>{{ t('webhookProperties.exampleCurl') }}</strong></div>
                <div class="bg-neutral-800 text-green-400 p-2 rounded mt-1 font-mono text-xs overflow-x-auto">
                curl -X POST {{ webhookUrl }} \<br/>&nbsp;&nbsp;-H "X-Webhook-Token: {{ nodeData.data.secretToken || 'YOUR_SECRET_TOKEN' }}" \<br/>&nbsp;&nbsp;-H "Content-Type: application/json" \<br/>&nbsp;&nbsp;-d '{"message": "Hello from webhook"}'
                </div>
            </div>
            </div>
        </div>
        
        <!-- Documentation Section Selector -->
        <UFormField :label="'📚 ' + t('webhookProperties.documentation')" class="mt-4">
            <USelect
                v-model="selectedDocSection"
                :items="docSectionOptions"
                size="md"
                class="w-full"
            />
        </UFormField>

        <!-- Authentication & Security -->
        <div v-if="selectedDocSection === 'auth'" class="mt-3 p-3 bg-green-50 dark:bg-green-950 rounded text-xs">
            <div class="font-medium text-green-800 dark:text-green-200 mb-2">📖 {{ t('webhookProperties.authenticationSecurity') }}</div>
            <div class="text-green-700 dark:text-green-300 space-y-2">
                <div class="space-y-1">
                    <div class="font-medium">{{ t('webhookProperties.customApisServices') }}</div>
                    <div class="pl-2 text-xs opacity-90">Header: <span class="font-mono">X-Webhook-Token: your-secret-token</span></div>
                    <div class="pl-2 text-xs opacity-90">Body: <span class="font-mono">&#123;"token": "your-secret-token"&#125;</span></div>
                    <div class="pl-2 text-xs opacity-90">Query: <span class="font-mono">?token=your-secret-token</span></div>
                </div>
                <div class="space-y-1">
                    <div class="font-medium">{{ t('webhookProperties.gitPlatformsAutomatic') }}</div>
                    <div class="pl-2 text-xs opacity-90">GitHub: X-Hub-Signature-256 (SHA256 HMAC)</div>
                    <div class="pl-2 text-xs opacity-90">GitLab: X-Gitlab-Token header</div>
                    <div class="pl-2 text-xs opacity-90">Bitbucket: X-Hub-Signature (SHA1 HMAC)</div>
                    <div class="pl-2 text-xs opacity-90">Azure DevOps: Authorization header</div>
                </div>
                <div class="pt-1 border-t border-green-200 dark:border-green-800">
                    <div class="font-medium">{{ t('webhookProperties.securityNote') }}</div>
                    <div class="text-xs opacity-90">{{ t('webhookProperties.securityNoteText') }}</div>
                </div>
                <div class="pt-1 border-t border-green-200 dark:border-green-800">
                    <div class="font-medium">💡 {{ t('webhookProperties.commonUseCases') }}</div>
                    <div class="space-y-1">
                        <div>• <strong>CI/CD:</strong> {{ t('webhookProperties.useCaseCicd') }}</div>
                        <div>• <strong>Notifications:</strong> {{ t('webhookProperties.useCaseNotifications') }}</div>
                        <div>• <strong>API Integration:</strong> {{ t('webhookProperties.useCaseApiIntegration') }}</div>
                        <div>• <strong>Automation:</strong> {{ t('webhookProperties.useCaseAutomation') }}</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Git Platform Setup -->
        <div v-if="selectedDocSection === 'git-setup'" class="mt-3 p-3 bg-green-50 dark:bg-green-950 rounded text-xs">
            <div class="font-medium text-green-800 dark:text-green-200 mb-2">{{ t('webhookProperties.gitPlatformSetup') }}</div>
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

        <!-- Webhook Examples -->
        <div v-if="selectedDocSection === 'examples'" class="mt-3 p-3 bg-blue-50 dark:bg-blue-950 rounded text-xs">
            <div class="font-medium text-blue-800 dark:text-blue-200 mb-2">📝 Complete Webhook Examples</div>
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

        <!-- Data Access Guide -->
        <div v-if="selectedDocSection === 'data-access'" class="mt-3 p-3 bg-purple-50 dark:bg-purple-950 rounded text-xs">
            <div class="font-medium text-purple-800 dark:text-purple-200 mb-2">🔌 Webhook Data Access</div>
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
import { computed, ref } from 'vue'

const { t } = useI18n()
const logger = useLogger()

const props = defineProps({
  nodeData: {
    type: Object,
    required: true
  }
})

// Documentation section selector
const selectedDocSection = ref('none')
const docSectionOptions = [
  { value: 'none', label: 'Select documentation to view...' },
  { value: 'auth', label: '🔐 Authentication & Security' },
  { value: 'git-setup', label: '🔧 Git Platform Setup' },
  { value: 'examples', label: '📝 Webhook Examples' },
  { value: 'data-access', label: '🔌 Data Access Guide' }
]

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