import { getDb } from '../../../../utils/db'

export default defineEventHandler((event) => {
  const roomId = Number(getRouterParam(event, 'id'))
  const sensorId = Number(getRouterParam(event, 'sensorId'))
  if (!roomId || !sensorId) throw createError({ statusCode: 400, message: 'invalid id' })

  const result = getDb()
    .prepare('UPDATE sensors SET room_id = NULL WHERE id = ? AND room_id = ?')
    .run(sensorId, roomId)

  if (result.changes === 0) throw createError({ statusCode: 404, message: 'sensor not found in room' })

  return { ok: true }
})
