<script setup lang="ts">
withDefaults(defineProps<{ message: string; confirmLabel?: string }>(), { confirmLabel: 'Delete' })

const emit = defineEmits<{
  (e: 'confirm'): void
  (e: 'cancel'): void
}>()

function onBackdropClick(e: MouseEvent) {
  if (e.target === e.currentTarget) emit('cancel')
}
</script>

<template>
  <Teleport to="body">
    <div class="backdrop" @click="onBackdropClick">
      <div class="modal">
        <p class="message">{{ message }}</p>
        <div class="actions">
          <button class="btn-cancel" @click="emit('cancel')">Cancel</button>
          <button class="btn-delete" @click="emit('confirm')">{{ confirmLabel }}</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  padding: 24px;
}

.modal {
  background: #1e2130;
  border: 1px solid #2a2f45;
  border-radius: 16px;
  padding: 28px;
  width: 100%;
  max-width: 360px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.message {
  font-size: 0.95rem;
  color: #e2e8f0;
  line-height: 1.5;
}

.actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.btn-cancel,
.btn-delete {
  padding: 8px 18px;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: background 0.15s, color 0.15s;
}

.btn-cancel {
  background: #151825;
  color: #64748b;
}

.btn-cancel:hover { color: #94a3b8; }

.btn-delete {
  background: #7f1d1d;
  color: #fca5a5;
}

.btn-delete:hover { background: #991b1b; color: #fecaca; }
</style>
