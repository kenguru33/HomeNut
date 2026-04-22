import { getDb } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const { deviceId, type } = await readBody(event) as { deviceId: string; type: string }
  if (!deviceId || !type) throw createError({ statusCode: 400, message: 'deviceId and type required' })

  const db = getDb()
  // Cameras are announcement-based — blocking via blocked_sensors would prevent them
  // from reappearing when the device comes back online. Just remove the announcement.
  if (type !== 'camera') {
    db.prepare('INSERT OR IGNORE INTO blocked_sensors (device_id, type) VALUES (?, ?)').run(deviceId, type)
  }
  db.prepare('DELETE FROM sensor_announcements WHERE device_id = ? AND type = ?').run(deviceId, type)

  return { ok: true }
})
