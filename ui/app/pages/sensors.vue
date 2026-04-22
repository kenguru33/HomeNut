<script setup lang="ts">
const { data: sensors, refresh } = useFetch('/api/sensors', { default: () => [] })

const onlyUnused = ref(false)
const visibleSensors = computed(() =>
  onlyUnused.value ? sensors.value.filter(s => !s.roomName) : sensors.value
)

const typeIcon: Record<string, string> = {
  temperature: '🌡️',
  humidity: '💧',
  camera: '📷',
  motion: '🏃',
}

const typeLabel: Record<string, string> = {
  temperature: 'Temperature',
  humidity: 'Humidity',
  camera: 'Camera',
  motion: 'Motion',
}

function formatValue(sensor: { type: string; latestValue: number | null }) {
  if (sensor.latestValue === null) return '—'
  if (sensor.type === 'temperature') return `${sensor.latestValue}°C`
  if (sensor.type === 'humidity') return `${sensor.latestValue}%`
  if (sensor.type === 'motion') return sensor.latestValue === 1 ? 'Detected' : 'Clear'
  return '—'
}

function formatAge(ms: number | null) {
  if (!ms) return 'Never'
  const diff = Math.round((Date.now() - ms) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`
  return `${Math.round(diff / 86400)}d ago`
}

type SensorRow = { id: number | null; deviceId: string | null; type: string; label: string | null }

const pendingDelete = ref<SensorRow | null>(null)

async function confirmDelete() {
  const sensor = pendingDelete.value
  if (!sensor) return
  if (sensor.id !== null) {
    await $fetch(`/api/sensors/${sensor.id}`, { method: 'DELETE' })
  } else if (sensor.deviceId) {
    await $fetch('/api/sensors/block', { method: 'DELETE', body: { deviceId: sensor.deviceId, type: sensor.type } })
  }
  pendingDelete.value = null
  await refresh()
}
</script>

<template>
  <div class="page">
    <header class="page-header">
      <div>
        <NuxtLink to="/" class="back-link">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
          Dashboard
        </NuxtLink>
        <h1 class="page-title">Sensors</h1>
      </div>
      <label class="toggle-label">
        <input type="checkbox" v-model="onlyUnused" class="toggle-input" />
        <span class="toggle-track"><span class="toggle-thumb" /></span>
        Only show unused
      </label>
    </header>

    <div v-if="visibleSensors.length === 0" class="empty">
      {{ onlyUnused ? 'No unused sensors.' : 'No sensors registered.' }}
    </div>

    <div v-else class="sensor-list">
      <div v-for="(sensor, i) in visibleSensors" :key="sensor.id ?? `${sensor.deviceId}:${sensor.type}:${i}`" class="sensor-row">
        <span class="sensor-icon">{{ typeIcon[sensor.type] ?? '?' }}</span>

        <div class="sensor-info">
          <span class="sensor-name">{{ sensor.label || typeLabel[sensor.type] || sensor.type }}</span>
          <span class="sensor-room" :class="{ unassigned: !sensor.roomName }">
            {{ sensor.roomName ?? 'Unassigned' }}
          </span>
        </div>

        <div class="sensor-meta">
          <span v-if="sensor.deviceId" class="device-id">{{ sensor.deviceId }}</span>
        </div>

        <div class="sensor-value">
          <span class="value">{{ formatValue(sensor) }}</span>
          <span class="age">{{ formatAge(sensor.lastRecordedAt) }}</span>
        </div>

        <button class="delete-btn" title="Remove sensor" @click="pendingDelete = sensor">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
          </svg>
        </button>
      </div>
    </div>
  </div>

  <ConfirmDialog
    v-if="pendingDelete"
    :message="`Delete sensor &quot;${pendingDelete.label || typeLabel[pendingDelete.type] || pendingDelete.type}&quot;?`"
    @confirm="confirmDelete"
    @cancel="pendingDelete = null"
  />
</template>

<style scoped>
.page {
  max-width: 800px;
  margin: 0 auto;
  padding: 40px 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.page-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 8px;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8rem;
  color: #64748b;
  cursor: pointer;
  user-select: none;
  padding-bottom: 4px;
}

.toggle-input { display: none; }

.toggle-track {
  width: 32px;
  height: 18px;
  background: #2a2f45;
  border-radius: 9px;
  position: relative;
  transition: background 0.2s;
  flex-shrink: 0;
}

.toggle-input:checked + .toggle-track { background: #4a6fa5; }

.toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #475569;
  transition: left 0.2s, background 0.2s;
}

.toggle-input:checked + .toggle-track .toggle-thumb {
  left: 16px;
  background: #fff;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  color: #475569;
  text-decoration: none;
  transition: color 0.15s;
}

.back-link:hover { color: #94a3b8; }

.page-title {
  font-size: 1.6rem;
  font-weight: 800;
  color: #f1f5f9;
  margin-top: 6px;
}

.empty {
  color: #475569;
  font-size: 0.95rem;
  padding: 60px 0;
  text-align: center;
}

.sensor-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sensor-row {
  display: flex;
  align-items: center;
  gap: 14px;
  background: #1e2130;
  border: 1px solid #2a2f45;
  border-radius: 10px;
  padding: 14px 16px;
  transition: border-color 0.15s;
}

.sensor-row:hover {
  border-color: #4a6fa5;
}

.sensor-icon {
  font-size: 1.2rem;
  flex-shrink: 0;
}

.sensor-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 120px;
}

.sensor-name {
  font-size: 0.9rem;
  font-weight: 600;
  color: #e2e8f0;
}

.sensor-room {
  font-size: 0.75rem;
  color: #64748b;
}

.sensor-room.unassigned {
  color: #475569;
  font-style: italic;
}

.sensor-meta {
  flex: 1;
}

.device-id {
  font-size: 0.72rem;
  color: #475569;
  font-family: monospace;
  background: #151825;
  border-radius: 4px;
  padding: 2px 6px;
}

.sensor-value {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  min-width: 70px;
}

.value {
  font-size: 0.9rem;
  font-weight: 600;
  color: #a0c4ff;
}

.age {
  font-size: 0.7rem;
  color: #475569;
}

.delete-btn {
  background: none;
  border: 1px solid transparent;
  color: #334155;
  border-radius: 7px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: color 0.15s, border-color 0.15s;
}

.sensor-row:hover .delete-btn {
  color: #475569;
  border-color: #2a2f45;
}

.delete-btn:hover {
  color: #f87171 !important;
  border-color: #ef4444 !important;
}
</style>
