import { getDb } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, message: 'invalid id' })

  const { name } = await readBody<{ name: string }>(event)
  if (!name?.trim()) throw createError({ statusCode: 400, message: 'name is required' })

  const db = getDb()
  const result = db.prepare('UPDATE rooms SET name = ? WHERE id = ?').run(name.trim(), id)
  if (result.changes === 0) throw createError({ statusCode: 404, message: 'room not found' })
  return { ok: true }
})
