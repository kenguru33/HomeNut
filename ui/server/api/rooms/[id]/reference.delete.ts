import { getDb } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  const roomId = Number(getRouterParam(event, 'id'))
  if (!roomId) throw createError({ statusCode: 400, message: 'invalid id' })

  getDb().prepare('DELETE FROM room_references WHERE room_id = ?').run(roomId)

  return { ok: true }
})
