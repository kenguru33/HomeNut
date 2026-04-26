import { getDb } from '../../../utils/db'

const DEFAULTS = {
  refTemp: null as number | null,
  heaterOnOffset: 2.0,
  heaterOffOffset: 2.0,
  fanThreshold: 10.0,
  pollInterval: 5,
  configFetchInterval: 60,
}

export default defineEventHandler((event) => {
  const deviceId = getRouterParam(event, 'deviceId')
  if (!deviceId) throw createError({ statusCode: 400, message: 'deviceId is required' })

  const db = getDb()
  const now = new Date().toISOString()

  db.prepare(`
    INSERT INTO sensor_config (device_id, last_fetched_at)
    VALUES (?, ?)
    ON CONFLICT(device_id) DO UPDATE SET last_fetched_at = excluded.last_fetched_at
  `).run(deviceId, now)

  const row = db.prepare(`
    SELECT ref_temp, heater_on_offset, heater_off_offset, fan_threshold,
           poll_interval, config_fetch_interval, updated_at, last_fetched_at
    FROM sensor_config WHERE device_id = ?
  `).get(deviceId) as {
    ref_temp: number | null
    heater_on_offset: number
    heater_off_offset: number
    fan_threshold: number
    poll_interval: number
    config_fetch_interval: number
    updated_at: string | null
    last_fetched_at: string | null
  } | undefined

  if (!row) return { deviceId, ...DEFAULTS, updatedAt: null, lastFetchedAt: now }

  return {
    deviceId,
    refTemp: row.ref_temp ?? DEFAULTS.refTemp,
    heaterOnOffset: row.heater_on_offset ?? DEFAULTS.heaterOnOffset,
    heaterOffOffset: row.heater_off_offset ?? DEFAULTS.heaterOffOffset,
    fanThreshold: row.fan_threshold ?? DEFAULTS.fanThreshold,
    pollInterval: row.poll_interval ?? DEFAULTS.pollInterval,
    configFetchInterval: row.config_fetch_interval ?? DEFAULTS.configFetchInterval,
    updatedAt: row.updated_at,
    lastFetchedAt: now,
  }
})
