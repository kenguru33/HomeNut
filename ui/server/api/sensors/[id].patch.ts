import { getDb } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody<{ label?: string | null }>(event)

  const db = getDb()
  const result = db.prepare('UPDATE sensors SET label = ? WHERE id = ?').run(body.label ?? null, id)
  if (result.changes === 0) throw createError({ statusCode: 404, message: 'sensor not found' })
  return { ok: true }
})
