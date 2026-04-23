<script setup lang="ts">
const { loggedIn, user, clear } = useUserSession()

async function logout() {
  await $fetch('/api/auth/logout', { method: 'POST' })
  await clear()
  await navigateTo('/login')
}
</script>

<template>
  <div>
    <NuxtRouteAnnouncer />
    <div v-if="loggedIn" class="auth-bar">
      <span class="auth-user">{{ user?.name }}</span>
      <button class="auth-logout" @click="logout">Log out</button>
    </div>
    <NuxtPage />
  </div>
</template>

<style scoped>
.auth-bar {
  position: fixed;
  top: 12px;
  right: 16px;
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(22, 26, 38, 0.8);
  border: 1px solid #2a2f45;
  border-radius: 8px;
  padding: 6px 10px;
  font-size: 0.8rem;
  color: #94a3b8;
  backdrop-filter: blur(6px);
  z-index: 100;
}

.auth-logout {
  background: none;
  color: #94a3b8;
  border: 1px solid #2a2f45;
  border-radius: 6px;
  padding: 4px 10px;
  font-size: 0.75rem;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
}

.auth-logout:hover { color: #e2e8f0; border-color: #4a6fa5; }
</style>
