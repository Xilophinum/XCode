/**
 * Auto-resize directive for textareas
 * Usage: <textarea v-auto-resize v-model="content"></textarea>
 */
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.directive('auto-resize', {
    mounted(el) {
      // Store the current scroll container (properties panel)
      const scrollContainer = el.closest('.overflow-y-auto, .overflow-auto')

      const resize = () => {
        // Save scroll position before resize
        const scrollTop = scrollContainer ? scrollContainer.scrollTop : 0
        const scrollParent = scrollContainer || window

        // Save cursor position
        const start = el.selectionStart
        const end = el.selectionEnd

        // Temporarily disable transitions to prevent flickering
        const transition = el.style.transition
        el.style.transition = 'none'

        // Reset height to recalculate
        el.style.height = 'auto'

        // Set new height
        const newHeight = Math.max(el.scrollHeight + 2, 100) // +2 for border
        el.style.height = `${newHeight}px`

        // Restore transition
        requestAnimationFrame(() => {
          el.style.transition = transition
        })

        // Restore cursor position
        el.setSelectionRange(start, end)

        // Restore scroll position to prevent jumping
        if (scrollContainer) {
          scrollContainer.scrollTop = scrollTop
        }
      }

      // Initial resize
      requestAnimationFrame(() => resize())

      // Resize on input (use requestAnimationFrame to debounce)
      const handleInput = () => {
        requestAnimationFrame(() => resize())
      }

      el.addEventListener('input', handleInput)

      // Also handle focus to ensure proper sizing when textarea is selected
      el.addEventListener('focus', handleInput)

      // Store cleanup function
      el._autoResizeCleanup = () => {
        el.removeEventListener('input', handleInput)
        el.removeEventListener('focus', handleInput)
      }
    },

    updated(el) {
      // Resize when the element updates (e.g., v-model changes externally)
      const scrollContainer = el.closest('.overflow-y-auto, .overflow-auto')
      const scrollTop = scrollContainer ? scrollContainer.scrollTop : 0

      requestAnimationFrame(() => {
        el.style.height = 'auto'
        el.style.height = `${Math.max(el.scrollHeight + 2, 100)}px`

        // Restore scroll position
        if (scrollContainer) {
          scrollContainer.scrollTop = scrollTop
        }
      })
    },

    unmounted(el) {
      // Cleanup
      if (el._autoResizeCleanup) {
        el._autoResizeCleanup()
      }
    }
  })
})
