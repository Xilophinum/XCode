<template>
  <div class="space-y-4">
    <!-- Array Parameter Instructions -->
    <UAlert color="primary" variant="soft" icon="i-lucide-list">
      <template #title>{{ $t('parallelMatrixProperties.arrayParameterInputRequired') }}</template>
      <template #description>
        <ol class="list-decimal list-inside space-y-1">
          <li>{{ $t('parallelMatrixProperties.createArrayParameter') }}</li>
          <li>{{ $t('parallelMatrixProperties.connectToArrayValues') }}</li>
          <li>{{ $t('parallelMatrixProperties.arrayValuesUsage') }}</li>
        </ol>
      </template>
    </UAlert>

    <!-- Execution Name Template -->
    <UFormField :label="$t('parallelMatrixProperties.executionNameTemplate')">
      <template #label>
        <span>{{ $t('parallelMatrixProperties.executionNameTemplate') }} <span class="text-xs font-normal text-neutral-500 dark:text-neutral-400">{{ $t('parallelMatrixProperties.optional') }}</span></span>
      </template>
      <UInput
        v-model="nodeData.data.nameTemplate"
        type="text"
        size="md"
        class="w-full font-mono"
        :placeholder="$t('parallelMatrixProperties.nameTemplatePlaceholder')"
      />
      <template #help>
        {{ $t('parallelMatrixProperties.nameTemplateHelp') }}
      </template>
    </UFormField>

    <div class="text-xs">
      <div class="font-medium mb-1">{{ $t('parallelMatrixProperties.examples') }}</div>
      <div class="space-y-1 text-neutral-600 dark:text-neutral-400">
        <div><code class="bg-neutral-100 dark:bg-neutral-700 px-1 rounded">Build-$ITEM_VALUE</code> → Build-production</div>
        <div><code class="bg-neutral-100 dark:bg-neutral-700 px-1 rounded">Deploy-$INDEX-$ITEM_VALUE</code> → Deploy-1-us-east</div>
      </div>
    </div>

    <!-- Additional Parameters -->
    <UFormField :label="$t('parallelMatrixProperties.additionalParameters')">
      <template #label>
        <span>{{ $t('parallelMatrixProperties.additionalParameters') }} <span class="text-xs font-normal text-neutral-500 dark:text-neutral-400">{{ $t('parallelMatrixProperties.jsonObjectOptional') }}</span></span>
      </template>
      <ScriptEditor
        v-model="nodeData.data.additionalParams"
        :language="'json'"
        :langSelectionEnabled="false"
        class="w-full"
      />
      <template #help>
        {{ $t('parallelMatrixProperties.additionalParamsHelp') }} {"BUILD_TYPE": "Release", "ENABLE_CACHE": true}
      </template>
    </UFormField>

    <!-- Max Concurrency -->
    <UFormField :label="$t('parallelMatrixProperties.maxConcurrentExecutions')">
      <UInput
        v-model.number="nodeData.data.maxConcurrency"
        type="number"
        :min="1"
        :placeholder="$t('parallelMatrixProperties.unlimitedPlaceholder')"
        size="md"
        class="w-full"
      />
      <template #help>
        {{ $t('parallelMatrixProperties.maxConcurrencyHelp') }}
      </template>
    </UFormField>

    <!-- Fail Fast -->
    <UFormField>
      <UCheckbox
        v-model="nodeData.data.failFast"
        :label="$t('parallelMatrixProperties.failFast')"
        :help="$t('parallelMatrixProperties.failFastHelp')"
      />
    </UFormField>

    <!-- Continue on Error -->
    <UFormField>
      <UCheckbox
        v-model="nodeData.data.continueOnError"
        :label="$t('parallelMatrixProperties.continueOnError')"
        :help="$t('parallelMatrixProperties.continueOnErrorHelp')"
      />
    </UFormField>

    <!-- Info Box -->
    <UAlert color="secondary" variant="soft" icon="i-lucide-info">
      <template #title>{{ $t('parallelMatrixProperties.howItWorks') }}</template>
      <template #description>
        <ol class="list-decimal list-inside space-y-1">
          <li>{{ $t('parallelMatrixProperties.step1') }}</li>
          <li>{{ $t('parallelMatrixProperties.step2') }}</li>
          <li>{{ $t('parallelMatrixProperties.step3') }}</li>
          <li>{{ $t('parallelMatrixProperties.step4') }}</li>
          <li>{{ $t('parallelMatrixProperties.step5') }}</li>
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
