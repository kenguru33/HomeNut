import { timingSafeEqual } from 'node:crypto'

function safeEqual(a: string, b: string) {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

export default defineEventHandler(async (event) => {
  const { username, password } = await readBody<{ username?: string; password?: string }>(event) ?? {}
  const config = useRuntimeConfig(event)

  if (!config.authUsername || !config.authPassword) {
    throw createError({ statusCode: 500, statusMessage: 'Auth is not configured on the server' })
  }

  const ok =
    typeof username === 'string' &&
    typeof password === 'string' &&
    safeEqual(username, config.authUsername) &&
    safeEqual(password, config.authPassword)

  if (!ok) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid credentials' })
  }

  await setUserSession(event, { user: { name: config.authUsername } })
  return { ok: true }
})
