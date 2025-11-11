import { defineStore } from 'pinia'

export const useLocaleStore = defineStore('locale', () => {
  const { locale, setLocale } = useI18n()
  
  const currentLocale = ref(locale.value)
  
  const changeLocale = async (newLocale) => {
    currentLocale.value = newLocale
    await setLocale(newLocale)
    
    // Save to localStorage
    if (process.client) {
      localStorage.setItem('preferred-locale', newLocale)
    }
  }
  
  const initializeLocale = () => {
    if (process.client) {
      const saved = localStorage.getItem('preferred-locale')
      if (saved && saved !== locale.value) {
        changeLocale(saved)
      }
    }
  }
  
  return {
    currentLocale: readonly(currentLocale),
    changeLocale,
    initializeLocale
  }
})