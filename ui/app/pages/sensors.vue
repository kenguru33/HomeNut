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

const editingSensor = ref<SensorRow | null>(null)
const editingLabel = ref('')

function openEdit(sensor: SensorRow) {
  if (sensor.id === null) return
  editingSensor.value = sensor
  editingLabel.value = sensor.label ?? ''
}

async function saveEdit() {
  const sensor = editingSensor.value
  if (!sensor?.id) return
  await $fetch(`/api/sensors/${sensor.id}`, { method: 'PATCH', body: { label: editingLabel.value.trim() || null } })
  editingSensor.value = null
  await refresh()
}
</script>

<template>
  <div class="page">
    <header class="page-header">
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
          <span class="sensor-name">{{ typeLabel[sensor.type] || sensor.type }}</span>
          <span v-if="sensor.label" class="sensor-label">{{ sensor.label }}</span>
          <span class="sensor-room" :class="{ unassigned: !sensor.roomName }">
            {{ sensor.roomName ?? 'Unassigned' }}
          </span>
          <span v-if="sensor.deviceId" class="device-id">{{ sensor.deviceId }}</span>
        </div>

        <div class="sensor-value">
          <span class="value">{{ formatValue(sensor) }}</span>
          <span class="age">{{ formatAge(sensor.lastRecordedAt) }}</span>
        </div>

        <div class="row-actions">
          <button v-if="sensor.id !== null" class="action-btn" title="Edit sensor" @click="openEdit(sensor)">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>
            </svg>
          </button>
          <button class="action-btn delete" title="Remove sensor" @click="pendingDelete = sensor">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>

  <ConfirmDialog
    v-if="pendingDelete"
    :message="`Delete sensor &quot;${pendingDelete.label || typeLabel[pendingDelete.type] || pendingDelete.type}&quot;?`"
    @confirm="confirmDelete"
    @cancel="pendingDelete = null"
  />

  <Teleport to="body">
    <div v-if="editingSensor" class="modal-overlay" @click.self="editingSensor = null">
      <div class="modal-card">
        <div class="modal-header">
          <span class="modal-icon">{{ typeIcon[editingSensor.type] ?? '?' }}</span>
          <div>
            <div class="modal-title">{{ typeLabel[editingSensor.type] || editingSensor.type }}</div>
            <div v-if="editingSensor.deviceId" class="modal-device-id">{{ editingSensor.deviceId }}</div>
          </div>
        </div>

        <label class="modal-field">
          <span>Label</span>
          <input
            v-model="editingLabel"
            class="modal-input"
            placeholder="Custom label…"
            maxlength="60"
            autofocus
            @keydown.enter="saveEdit"
            @keydown.escape="editingSensor = null"
          />
        </label>

        <div class="modal-actions">
          <button class="btn-cancel" @click="editingSensor = null">Cancel</button>
          <button class="btn-save" @click="saveEdit">Save</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: flex-end;
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


.empty {
  color: #475569;
  font-size: 0.95rem;
  padding: 60px 0;
  text-align: center;
}

.sensor-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 6px;
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
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.sensor-name {
  font-size: 0.9rem;
  font-weight: 600;
  color: #e2e8f0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sensor-label {
  font-size: 0.78rem;
  color: #64748b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sensor-room {
  font-size: 0.75rem;
  color: #64748b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sensor-room.unassigned {
  color: #475569;
  font-style: italic;
}

.device-id {
  font-size: 0.68rem;
  color: #475569;
  font-family: monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 1px;
}

.sensor-value {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  flex-shrink: 0;
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

.row-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.action-btn {
  background: none;
  border: 1px solid transparent;
  color: #334155;
  border-radius: 7px;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
}

.sensor-row:hover .action-btn {
  color: #475569;
  border-color: #2a2f45;
}

.action-btn:hover { color: #94a3b8 !important; border-color: #4a6fa5 !important; }
.action-btn.delete:hover { color: #f87171 !important; border-color: #ef4444 !important; }

/* ── Edit modal ──────────────────────────────────────────── */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  padding: 24px;
}

.modal-card {
  background: #1e2130;
  border: 1px solid #2a2f45;
  border-radius: 12px;
  padding: 24px;
  width: 100%;
  max-width: 360px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.modal-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.modal-icon { font-size: 1.6rem; }

.modal-title {
  font-size: 1rem;
  font-weight: 700;
  color: #e2e8f0;
}

.modal-device-id {
  font-size: 0.7rem;
  color: #475569;
  font-family: monospace;
  margin-top: 2px;
}

.modal-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 0.8rem;
  color: #94a3b8;
}

.modal-input {
  background: #0f1117;
  border: 1px solid #2a2f45;
  border-radius: 8px;
  padding: 9px 12px;
  color: #e2e8f0;
  font-size: 0.9rem;
  outline: none;
  transition: border-color 0.15s;
}

.modal-input:focus { border-color: #4a6fa5; }

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.btn-cancel {
  background: none;
  color: #64748b;
  border: 1px solid #2a2f45;
  border-radius: 8px;
  padding: 7px 16px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: color 0.15s;
}

.btn-cancel:hover { color: #94a3b8; }

.btn-save {
  background: #4a6fa5;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 7px 16px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-save:hover { background: #6b93c7; }

</style>
