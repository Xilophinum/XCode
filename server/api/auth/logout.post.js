export default defineEventHandler(async (event) => {
  // Clear the auth token cookie
  setCookie(event, 'auth-token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0 // Immediately expire
  })

  return { success: true }
})