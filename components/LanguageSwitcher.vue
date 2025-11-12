<template>
  <UDropdownMenu :items="languageItems">
    <UButton variant="ghost" size="sm" icon="i-lucide-globe">
      {{ locales.find(item => item.code === currentLocale)?.name }}
    </UButton>
  </UDropdownMenu>
</template>

<script setup>
const { locale, locales, setLocale } = useI18n()
const currentLocale = ref('en')

const languageItems = computed(() =>
  locales.value.map(l => ({
    label: l.name,
    onClick: () => changeLocale(l.code)
  }))
)

const changeLocale = async (newLocale) => {
  currentLocale.value = newLocale
  await setLocale(newLocale)
  // Save to localStorage
  if (import.meta.client) {
    localStorage.setItem('preferred-locale', newLocale)
  }
}

onMounted(() => {
  const saved = localStorage.getItem('preferred-locale')
  console.log(locales.value)
  if (saved && saved !== locale.value) {
    setLocale(saved)
    currentLocale.value = saved
  } else {
    currentLocale.value = locale.value
  }
})
</script>