/**
 * Tooltip Plugin
 * Globally registers the v-tooltip directive
 */

import tooltipPlugin from '~/composables/useTooltip.js'

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.use(tooltipPlugin)
})
