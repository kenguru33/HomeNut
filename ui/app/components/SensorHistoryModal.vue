<script setup lang="ts">
import type { SensorView } from '../../shared/types'

const props = defineProps<{
  sensor: SensorView
  roomName: string
}>()

const emit = defineEmits<{ (e: 'close'): void }>()

interface Reading { time: number; value: number }

const { data, pending } = useFetch<{ readings: Reading[] }>(
  `/api/sensors/${props.sensor.id}/history`,
  { key: `sensor-history-${props.sensor.id}` }
)

const readings = computed(() => data.value?.readings ?? [])

// SVG chart constants
const W = 560, H = 200
const PL = 44, PR = 12, PT = 14, PB = 30
const plotW = W - PL - PR
const plotH = H - PT - PB

const now = Date.now()
const startTime = now - 24 * 60 * 60 * 1000

function xPos(time: number) {
  return PL + ((time - startTime) / (24 * 60 * 60 * 1000)) * plotW
}

const unit = computed(() => {
  if (props.sensor.type === 'temperature') return '°C'
  if (props.sensor.type === 'humidity') return '%'
  return ''
})

const lineColor = computed(() => {
  if (props.sensor.type === 'temperature') return '#ff9f5a'
  if (props.sensor.type === 'humidity') return '#4a9eff'
  return '#a78bfa'
})

const title = computed(() => {
  const icons: Record<string, string> = { temperature: '🌡️', humidity: '💧', motion: '🏃', camera: '📷' }
  const labels: Record<string, string> = { temperature: 'Temperature', humidity: 'Humidity', motion: 'Motion', camera: 'Camera' }
  return `${icons[props.sensor.type]} ${props.sensor.label ?? labels[props.sensor.type]}`
})

const xLabels = computed(() => {
  const labels = []
  for (let h = 0; h <= 24; h += 6) {
    const t = startTime + h * 60 * 60 * 1000
    const d = new Date(t)
    const hh = String(d.getHours()).padStart(2, '0')
    labels.push({ label: `${hh}:00`, x: xPos(t) })
  }
  return labels
})

const chart = computed(() => {
  const r = readings.value
  if (!r.length) return null

  const values = r.map(p => p.value)
  let minVal = Math.min(...values)
  let maxVal = Math.max(...values)

  const pad = Math.max((maxVal - minVal) * 0.12, 0.5)
  minVal -= pad
  maxVal += pad

  const range = maxVal - minVal

  function yPos(value: number) {
    return PT + plotH - ((value - minVal) / range) * plotH
  }

  const points = r.map(p => ({ x: xPos(p.time), y: yPos(p.value) }))
  const bottom = PT + plotH

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const areaPath = `${linePath} L${points.at(-1)!.x.toFixed(1)},${bottom} L${points[0].x.toFixed(1)},${bottom} Z`

  const yLabels = []
  for (let i = 0; i <= 4; i++) {
    const val = minVal + range * (i / 4)
    const y = PT + plotH - (plotH * i / 4)
    yLabels.push({ label: val.toFixed(1), y })
  }

  return { linePath, areaPath, yLabels }
})

const motionEvents = computed(() => {
  if (props.sensor.type !== 'motion') return []
  return readings.value
    .filter(p => p.value === 1)
    .map(p => xPos(p.time))
})
</script>

<template>
  <Teleport to="body">
    <div class="modal-backdrop" @click.self="emit('close')">
      <div class="modal">
        <div class="modal-header">
          <div class="modal-title-group">
            <span class="modal-title">{{ title }}</span>
            <span class="modal-subtitle">{{ roomName }} &mdash; last 24 hours</span>
          </div>
          <button class="close-btn" @click="emit('close')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div class="chart-area">
          <!-- Loading -->
          <div v-if="pending" class="state-msg">Loading…</div>

          <!-- No data -->
          <div v-else-if="!readings.length && sensor.type !== 'motion'" class="state-msg">
            No data in the last 24 hours
          </div>

          <!-- Motion: no events -->
          <div v-else-if="sensor.type === 'motion' && !motionEvents.length" class="state-msg">
            No motion detected in the last 24 hours
          </div>

          <!-- SVG chart (line / area) -->
          <svg v-else-if="sensor.type !== 'motion'" :viewBox="`0 0 ${W} ${H}`" class="chart-svg">
            <defs>
              <linearGradient :id="`grad-${sensor.id}`" x1="0" :y1="PT" x2="0" :y2="PT + plotH" gradientUnits="userSpaceOnUse">
                <stop offset="0%" :stop-color="lineColor" stop-opacity="0.25"/>
                <stop offset="100%" :stop-color="lineColor" stop-opacity="0.03"/>
              </linearGradient>
            </defs>

            <!-- Horizontal grid lines -->
            <g v-if="chart">
              <line
                v-for="label in chart.yLabels"
                :key="label.y"
                :x1="PL" :y1="label.y" :x2="W - PR" :y2="label.y"
                stroke="#2a2f45" stroke-width="1"
              />
            </g>

            <!-- Vertical grid lines at X labels -->
            <g>
              <line
                v-for="xl in xLabels"
                :key="xl.x"
                :x1="xl.x" :y1="PT" :x2="xl.x" :y2="PT + plotH"
                stroke="#2a2f45" stroke-width="1"
              />
            </g>

            <!-- Area fill -->
            <path
              v-if="chart"
              :d="chart.areaPath"
              :fill="`url(#grad-${sensor.id})`"
            />

            <!-- Line -->
            <path
              v-if="chart"
              :d="chart.linePath"
              fill="none"
              :stroke="lineColor"
              stroke-width="1.5"
              stroke-linejoin="round"
              stroke-linecap="round"
            />

            <!-- Y axis labels -->
            <g v-if="chart" font-size="9" fill="#475569" text-anchor="end">
              <text
                v-for="yl in chart.yLabels"
                :key="yl.y"
                :x="PL - 5"
                :y="yl.y + 3"
              >{{ yl.label }}{{ unit }}</text>
            </g>

            <!-- X axis labels -->
            <g font-size="9" fill="#475569" text-anchor="middle">
              <text
                v-for="xl in xLabels"
                :key="xl.x"
                :x="xl.x"
                :y="PT + plotH + 18"
              >{{ xl.label }}</text>
            </g>
          </svg>

          <!-- Motion timeline -->
          <svg v-else :viewBox="`0 0 ${W} 80`" class="chart-svg motion-svg">
            <!-- Track line -->
            <line :x1="PL" y1="40" :x2="W - PR" y2="40" stroke="#2a2f45" stroke-width="1"/>

            <!-- Event ticks -->
            <line
              v-for="(x, i) in motionEvents"
              :key="i"
              :x1="x" y1="20" :x2="x" y2="60"
              stroke="#f87171" stroke-width="2"
              stroke-linecap="round"
            />

            <!-- X axis labels -->
            <g font-size="9" fill="#475569" text-anchor="middle">
              <text
                v-for="xl in xLabels"
                :key="xl.x"
                :x="xl.x"
                y="74"
              >{{ xl.label }}</text>
            </g>
          </svg>
        </div>

        <!-- Summary row -->
        <div v-if="!pending && readings.length && sensor.type !== 'motion'" class="summary">
          <span>
            Min <strong>{{ Math.min(...readings.map(r => r.value)).toFixed(1) }}{{ unit }}</strong>
          </span>
          <span>
            Max <strong>{{ Math.max(...readings.map(r => r.value)).toFixed(1) }}{{ unit }}</strong>
          </span>
          <span>
            Latest <strong>{{ readings.at(-1)!.value.toFixed(1) }}{{ unit }}</strong>
          </span>
          <span>
            {{ readings.length }} readings
          </span>
        </div>
        <div v-else-if="!pending && sensor.type === 'motion' && motionEvents.length" class="summary">
          <span>{{ motionEvents.length }} event{{ motionEvents.length === 1 ? '' : 's' }} in the last 24 hours</span>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 24px;
}

.modal {
  background: #1e2130;
  border: 1px solid #2a2f45;
  border-radius: 16px;
  padding: 24px;
  width: 100%;
  max-width: 620px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.modal-title-group {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.modal-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: #e2e8f0;
}

.modal-subtitle {
  font-size: 0.78rem;
  color: #64748b;
}

.close-btn {
  background: none;
  border: 1px solid #2a2f45;
  color: #475569;
  border-radius: 7px;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: color 0.15s, border-color 0.15s;
}

.close-btn:hover { color: #94a3b8; border-color: #4a6fa5; }

.chart-area {
  background: #151825;
  border-radius: 10px;
  padding: 12px 8px 8px;
  min-height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.state-msg {
  color: #475569;
  font-size: 0.85rem;
}

.chart-svg {
  width: 100%;
  height: auto;
  display: block;
  overflow: visible;
}

.motion-svg {
  max-height: 90px;
}

.summary {
  display: flex;
  gap: 20px;
  font-size: 0.78rem;
  color: #64748b;
  flex-wrap: wrap;
}

.summary strong {
  color: #a0c4ff;
}
</style>
