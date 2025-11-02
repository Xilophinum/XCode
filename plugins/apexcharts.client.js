/**
 * ApexCharts Plugin
 * Client-side only plugin for Vue3-ApexCharts
 */

import VueApexCharts from 'vue3-apexcharts'

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.component('apexchart', VueApexCharts)
})
