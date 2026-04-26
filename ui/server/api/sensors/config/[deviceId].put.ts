import { getDb } from '../../../utils/db'

interface ConfigBody {
  refTemp?: number | null
  heaterOnOffset?: number
  heaterOffOffset?: number
  fanThreshold?: number
  pollInterval?: number
  configFetchInterval?: number
}

export default defineEventHandler(async (event) => {
  const deviceId = getRouterParam(event, 'deviceId')
  if (!deviceId) throw createError({ statusCode: 400, message: 'deviceId is required' })

  const body = await readBody<ConfigBody>(event)

  const db = getDb()
  const now = new Date().toISOString()

  db.prepare(`
    INSERT INTO sensor_config
      (device_id, ref_temp, heater_on_offset, heater_off_offset, fan_threshold,
       poll_interval, config_fetch_interval, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(device_id) DO UPDATE SET
      ref_temp              = excluded.ref_temp,
      heater_on_offset      = excluded.heater_on_offset,
      heater_off_offset     = excluded.heater_off_offset,
      fan_threshold         = excluded.fan_threshold,
      poll_interval         = excluded.poll_interval,
      config_fetch_interval = excluded.config_fetch_interval,
      updated_at            = excluded.updated_at
  `).run(
    deviceId,
    body.refTemp ?? null,
    body.heaterOnOffset ?? 2.0,
    body.heaterOffOffset ?? 2.0,
    body.fanThreshold ?? 10.0,
    body.pollInterval ?? 5,
    body.configFetchInterval ?? 60,
    now,
  )

  return { ok: true }
})
