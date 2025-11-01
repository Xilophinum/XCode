/**
 * Tooltip directive plugin
 * Usage: <span v-tooltip:top="'Tooltip text'">Hover me</span>
 * Positions: top, bottom, left, right, topleft, topright, bottomleft, bottomright
 */

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.directive('tooltip', {
    mounted(el, binding) {
      const tooltipText = binding.value
      if (!tooltipText) return

      // Store tooltip text in data attribute
      el.setAttribute('data-tooltip', tooltipText)

      // Add tooltip class
      el.classList.add('has-tooltip')

      // Handle position argument (top, bottom, left, right)
      const position = binding.arg || 'top' // default to top
      el.setAttribute('data-tooltip-position', position)
    },

    updated(el, binding) {
      const tooltipText = binding.value
      if (tooltipText) {
        el.setAttribute('data-tooltip', tooltipText)
        if (!el.classList.contains('has-tooltip')) {
          el.classList.add('has-tooltip')
        }

        // Update position if it changed
        const position = binding.arg || 'top'
        el.setAttribute('data-tooltip-position', position)
      } else {
        el.removeAttribute('data-tooltip')
        el.removeAttribute('data-tooltip-position')
        el.classList.remove('has-tooltip')
      }
    },

    unmounted(el) {
      el.removeAttribute('data-tooltip')
      el.removeAttribute('data-tooltip-position')
      el.classList.remove('has-tooltip')
    }
  })
})
