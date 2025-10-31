/**
 * Composable for auto-resizing textareas to fit content
 */
export const useAutoResize = () => {
  const resizeTextarea = (textarea) => {
    if (!textarea) return

    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = 'auto'

    // Set height to scrollHeight plus a small buffer
    const newHeight = Math.max(textarea.scrollHeight, 100) // Minimum 100px
    textarea.style.height = `${newHeight}px`
  }

  const setupAutoResize = (textareaRef) => {
    if (!textareaRef || !textareaRef.value) return

    const textarea = textareaRef.value

    // Initial resize
    resizeTextarea(textarea)

    // Add event listener for input
    textarea.addEventListener('input', () => resizeTextarea(textarea))

    // Cleanup function
    return () => {
      textarea.removeEventListener('input', () => resizeTextarea(textarea))
    }
  }

  return {
    resizeTextarea,
    setupAutoResize
  }
}
