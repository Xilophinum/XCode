<template>
  <UDropdownMenu :items="languageItems">
    <UButton variant="ghost" size="sm" icon="i-lucide-globe">
      {{ currentLocale.name }}
    </UButton>
  </UDropdownMenu>
</template>

<script setup>
const { locale, locales } = useI18n()
const localeStore = useLocaleStore()

const currentLocale = computed(() => {
  return locales.value.find(l => l.code === locale.value) || locales.value[0]
})

const languageItems = computed(() => [
  locales.value.map(l => ({
    label: l.name,
    click: () => localeStore.changeLocale(l.code)
  }))
])
</script>