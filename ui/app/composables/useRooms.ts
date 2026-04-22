import type { RoomWithSensors, RoomReference, SensorType, SensorView } from '../../shared/types'

export function useRooms() {
  const { data, refresh } = useFetch<RoomWithSensors[]>('/api/rooms', { default: () => [] })
  const rooms = data as Ref<RoomWithSensors[]>

  const lastUpdated = ref(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))

  async function poll() {
    await refresh()
    lastUpdated.value = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  onMounted(() => {
    const intervalId = setInterval(poll, 5000)
    onUnmounted(() => clearInterval(intervalId))
  })

  async function addRoom(name: string) {
    await $fetch('/api/rooms', { method: 'POST', body: { name } })
    await refresh()
    lastUpdated.value = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  async function removeRoom(id: number) {
    await $fetch(`/api/rooms/${id}`, { method: 'DELETE' })
    await poll()
  }

  async function renameRoom(id: number, name: string) {
    const room = rooms.value.find(r => r.id === id)
    const prev = room?.name
    if (room) room.name = name
    try {
      await $fetch(`/api/rooms/${id}`, { method: 'PATCH', body: { name } })
    } catch {
      if (room && prev !== undefined) room.name = prev
    }
  }

  async function saveReference(roomId: number, ref: RoomReference) {
    await $fetch(`/api/rooms/${roomId}/reference`, { method: 'PUT', body: ref })
    const room = rooms.value.find(r => r.id === roomId)
    if (room) {
      room.reference = (ref.refTemp === null && ref.refHumidity === null) ? null : ref
    }
  }

  async function clearReference(roomId: number) {
    const room = rooms.value.find(r => r.id === roomId)
    const prev = room?.reference ?? null
    if (room) room.reference = null
    try {
      await $fetch(`/api/rooms/${roomId}/reference`, { method: 'DELETE' })
    } catch {
      if (room) room.reference = prev
    }
  }

  async function addSensor(payload: {
    roomId: number
    type: SensorType
    sensorId?: number
    deviceId?: string
    label?: string
    streamUrl?: string
    snapshotUrl?: string
  }) {
    await $fetch('/api/sensors', { method: 'POST', body: payload })
    await poll()
  }

  async function removeSensor(sensorId: number) {
    const room = rooms.value.find(r => r.sensors.some(s => s.id === sensorId))
    rooms.value = rooms.value.map(r => ({
      ...r,
      sensors: r.sensors.filter(s => s.id !== sensorId),
    }))
    try {
      if (room) {
        await $fetch(`/api/rooms/${room.id}/sensors/${sensorId}`, { method: 'DELETE' })
      }
    } catch {
      await refresh()
    }
  }

  // Live stream modal state
  const activeSensorId = ref<number | null>(null)

  const activeCameraContext = computed<{ sensor: SensorView; roomName: string } | null>(() => {
    if (activeSensorId.value === null) return null
    for (const room of rooms.value) {
      const sensor = room.sensors.find(s => s.id === activeSensorId.value)
      if (sensor) return { sensor, roomName: room.name }
    }
    return null
  })

  return {
    rooms,
    lastUpdated,
    addRoom,
    removeRoom,
    renameRoom,
    saveReference,
    clearReference,
    addSensor,
    removeSensor,
    activeSensorId,
    activeCameraContext,
    refresh,
  }
}
