<template>
  <div>
    <UFormField :label="$t('jobTriggerProperties.sourceProject')">
      <USelectMenu
        v-model="nodeData.data.sourceProjectId"
        :items="projectOptions"
        :placeholder="$t('jobTriggerProperties.selectProject')"
        searchable
        size="md"
        class="w-full"
      />
      <template #help>
        {{ $t('jobTriggerProperties.sourceProjectHelp') }}
      </template>
    </UFormField>

    <UFormField :label="$t('jobTriggerProperties.triggerCondition')" class="mt-3">
      <USelect
        v-model="nodeData.data.triggerOn"
        :items="triggerOptions"
        size="md"
        class="w-full"
      />
      <template #help>
        {{ $t('jobTriggerProperties.triggerConditionHelp') }}
      </template>
    </UFormField>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
const props = defineProps({
  nodeData: {
    type: Object,
    required: true
  },
  currentProjectId: {
    type: String,
    default: null
  }
})

const projectsStore = useProjectsStore()

const projectOptions = computed(() => {
  return projectsStore.getAllProjects
    .filter(proj => proj.id !== props.currentProjectId)
    .map(proj => ({
      value: proj.id,
      label: proj.name
    }))
})

const triggerOptions = computed(() => [
  { value: 'success', label: $t('jobTriggerProperties.onSuccess') },
  { value: 'failure', label: $t('jobTriggerProperties.onFailure') },
  { value: 'always', label: $t('jobTriggerProperties.always') }
])
</script>