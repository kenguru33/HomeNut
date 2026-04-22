import { getDb } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  const roomId = Number(getRouterParam(event, 'id'))
  const { refTemp, refHumidity } = await readBody<{ refTemp: number | null; refHumidity: number | null }>(event)

  if (!roomId) throw createError({ statusCode: 400, message: 'invalid id' })

  const db = getDb()
  if (refTemp === null && refHumidity === null) {
    db.prepare('DELETE FROM room_references WHERE room_id = ?').run(roomId)
  } else {
    db.prepare(`
      INSERT INTO room_references (room_id, ref_temp, ref_humidity)
      VALUES (?, ?, ?)
      ON CONFLICT(room_id) DO UPDATE SET ref_temp = excluded.ref_temp, ref_humidity = excluded.ref_humidity
    `).run(roomId, refTemp, refHumidity)
  }

  return { ok: true }
})
