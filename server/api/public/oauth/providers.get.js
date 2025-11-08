/**
 * Public endpoint to check which OAuth providers are configured
 * Returns which providers have client IDs configured
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  
  return {
    github: !!config.oauth?.github?.clientId,
    google: !!config.oauth?.google?.clientId,
    microsoft: !!config.oauth?.microsoft?.clientId
  }
})
