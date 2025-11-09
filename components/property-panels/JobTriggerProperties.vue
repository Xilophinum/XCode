<template>
  <div>
    <UFormField label="Source Project">
      <USelectMenu
        v-model="nodeData.data.sourceProjectId"
        :items="projectOptions"
        placeholder="Select a project..."
        searchable
        size="md"
        class="w-full"
      />
      <template #help>
        Select which project's completion will trigger this workflow
      </template>
    </UFormField>

    <UFormField label="Trigger Condition" class="mt-3">
      <USelect
        v-model="nodeData.data.triggerOn"
        :items="triggerOptions"
        size="md"
        class="w-full"
      />
      <template #help>
        When should this workflow be triggered?
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

const triggerOptions = [
  { value: 'success', label: 'On Success' },
  { value: 'failure', label: 'On Failure' },
  { value: 'always', label: 'Always (Success or Failure)' }
]
</script>