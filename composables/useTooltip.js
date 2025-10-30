/**
 * Tooltip Composable
 *
 * Provides a reusable tooltip directive for displaying hover tooltips
 * across the application with consistent styling.
 *
 * This uses data attributes and CSS for a cleaner, simpler implementation
 * without DOM manipulation.
 *
 * Usage:
 * <div v-tooltip="'Your tooltip text here'">
 *   Hover over me
 * </div>
 *
 * With explicit positioning:
 * <div v-tooltip:bottom="'Tooltip below'">Bottom tooltip</div>
 * <div v-tooltip:top="'Tooltip above'">Top tooltip</div>
 * <div v-tooltip:left="'Tooltip left'">Left tooltip</div>
 * <div v-tooltip:right="'Tooltip right'">Right tooltip</div>
 *
 * With corner positioning:
 * <div v-tooltip:topleft="'Top-left corner'">Top-left tooltip</div>
 * <div v-tooltip:topright="'Top-right corner'">Top-right tooltip</div>
 * <div v-tooltip:bottomleft="'Bottom-left corner'">Bottom-left tooltip</div>
 * <div v-tooltip:bottomright="'Bottom-right corner'">Bottom-right tooltip</div>
 */

export const useTooltip = () => {
  return {
    directive: {
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
    }
  }
}

/**
 * Vue plugin version for global registration
 */
export default {
  install(app) {
    const { directive } = useTooltip()
    app.directive('tooltip', directive)
  }
}
