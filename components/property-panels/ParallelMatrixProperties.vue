<template>
  <div class="space-y-4">
    <!-- Array Parameter Instructions -->
    <UAlert color="primary" variant="soft" icon="i-lucide-list">
      <template #title>Array Parameter Input Required:</template>
      <template #description>
        <ol class="list-decimal list-inside space-y-1">
          <li>Create an <strong>Array Parameter</strong> node</li>
          <li>Connect it to this node's <code class="bg-primary-100 dark:bg-primary-900 px-1 rounded">Array Values</code> input socket</li>
          <li>The array values will be used to execute the connected job multiple times</li>
        </ol>
      </template>
    </UAlert>

    <!-- Execution Name Template -->
    <UFormField label="Execution Name Template">
      <template #label>
        <span>Execution Name Template <span class="text-xs font-normal text-neutral-500 dark:text-neutral-400">(optional)</span></span>
      </template>
      <UInput
        v-model="nodeData.data.nameTemplate"
        type="text"
        size="md"
        class="w-full font-mono"
        placeholder="Matrix-$INDEX"
      />
      <template #help>
        Template for naming each execution. Available: $INDEX, $ITEM_VALUE
      </template>
    </UFormField>

    <div class="text-xs">
      <div class="font-medium mb-1">Examples:</div>
      <div class="space-y-1 text-neutral-600 dark:text-neutral-400">
        <div><code class="bg-neutral-100 dark:bg-neutral-700 px-1 rounded">Build-$ITEM_VALUE</code> → Build-production</div>
        <div><code class="bg-neutral-100 dark:bg-neutral-700 px-1 rounded">Deploy-$INDEX-$ITEM_VALUE</code> → Deploy-1-us-east</div>
      </div>
    </div>

    <!-- Additional Parameters -->
    <UFormField label="Additional Parameters">
      <template #label>
        <span>Additional Parameters <span class="text-xs font-normal text-neutral-500 dark:text-neutral-400">(JSON object, optional)</span></span>
      </template>
      <ScriptEditor
        v-model="nodeData.data.additionalParams"
        :language="'json'"
        :langSelectionEnabled="false"
        class="w-full"
      />
      <template #help>
        Static parameters passed to all executions. Example: {"BUILD_TYPE": "Release", "ENABLE_CACHE": true}
      </template>
    </UFormField>

    <!-- Max Concurrency -->
    <UFormField label="Max Concurrent Executions">
      <UInput
        v-model.number="nodeData.data.maxConcurrency"
        type="number"
        :min="1"
        placeholder="Unlimited"
        size="md"
        class="w-full"
      />
      <template #help>
        Leave empty for unlimited parallel execution
      </template>
    </UFormField>

    <!-- Fail Fast -->
    <UFormField>
      <UCheckbox
        v-model="nodeData.data.failFast"
        label="Fail Fast"
        help="Stop all iterations if any iteration fails"
      />
    </UFormField>

    <!-- Continue on Error -->
    <UFormField>
      <UCheckbox
        v-model="nodeData.data.continueOnError"
        label="Continue on Error"
        help="Continue executing remaining items even if some fail"
      />
    </UFormField>

    <!-- Info Box -->
    <UAlert color="secondary" variant="soft" icon="i-lucide-info">
      <template #title>How it works:</template>
      <template #description>
        <ol class="list-decimal list-inside space-y-1">
          <li>Connect an Array Parameter node to the <code class="bg-secondary-100 dark:bg-secondary-900 px-1 rounded">Array Values</code> input socket</li>
          <li>Connect parallel execution node to the <code class="bg-secondary-100 dark:bg-secondary-900 px-1 rounded">For Each Item</code> execution socket</li>
          <li>Connect the <code class="bg-secondary-100 dark:bg-secondary-900 px-1 rounded">Iteration Value</code> output to execution node inputs to access current item</li>
          <li>Optionally connect <code class="bg-secondary-100 dark:bg-secondary-900 px-1 rounded">Additional Parameters</code> output for static parameters</li>
          <li>Results are aggregated in the output sockets after all iterations complete</li>
        </ol>
      </template>
    </UAlert>
  </div>
</template>

<script setup>
import ScriptEditor from '@/components/ScriptEditor.vue'
const props = defineProps({
  nodeData: { type: Object, required: true }
})
</script>
