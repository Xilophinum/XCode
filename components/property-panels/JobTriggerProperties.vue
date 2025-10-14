<template>
  <div>
    <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Source Project</label>
    <div class="relative">
      <input
        v-model="projectSearchQuery"
        @input="filterProjects"
        @focus="showProjectDropdown = true"
        type="text"
        placeholder="Search projects..."
        class="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
      >
      <div v-if="showProjectDropdown && filteredProjects.length > 0" class="absolute z-10 w-full mt-1 max-h-48 overflow-y-auto border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 shadow-lg">
        <button
          v-for="proj in filteredProjects.slice(0, 20)"
          :key="proj.id"
          @click="selectProject(proj)"
          :disabled="proj.id === currentProjectId"
          class="w-full text-left px-3 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-600 focus:outline-none focus:bg-neutral-100 dark:focus:bg-neutral-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ proj.name }} {{ proj.id === currentProjectId ? '(current project)' : '' }}
        </button>
      </div>
    </div>
    <p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
      Search and select which project's completion will trigger this workflow
    </p>

    <div class="mt-3">
      <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Trigger Condition</label>
      <select
        v-model="nodeData.data.triggerOn"
        class="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
      >
        <option value="success">On Success</option>
        <option value="failure">On Failure</option>
        <option value="always">Always (Success or Failure)</option>
      </select>
      <p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
        When should this workflow be triggered?
      </p>
    </div>
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

const projectSearchQuery = ref('')
const showProjectDropdown = ref(false)
const filteredProjects = ref([])

const filterProjects = () => {
  if (!projectSearchQuery.value.trim()) {
    filteredProjects.value = projectsStore.getAllProjects
    return
  }
  
  const search = projectSearchQuery.value.toLowerCase()
  filteredProjects.value = projectsStore.getAllProjects.filter(proj => 
    proj.name.toLowerCase().includes(search)
  )
}

const selectProject = (proj) => {
  if (proj.id !== props.currentProjectId) {
    props.nodeData.data.sourceProjectId = proj.id
    projectSearchQuery.value = proj.name
    showProjectDropdown.value = false
  }
}

const handleClickOutside = (event) => {
  if (!event.target.closest('.relative')) {
    showProjectDropdown.value = false
  }
}

onMounted(() => {
  // Initialize search with current selection
  const sourceProject = projectsStore.getAllProjects.find(p => p.id === props.nodeData.data.sourceProjectId)
  projectSearchQuery.value = sourceProject ? sourceProject.name : ''
  filteredProjects.value = projectsStore.getAllProjects
  
  // Add click outside listener
  if (typeof window !== 'undefined') {
    window.addEventListener('click', handleClickOutside)
  }
})

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('click', handleClickOutside)
  }
})
</script>