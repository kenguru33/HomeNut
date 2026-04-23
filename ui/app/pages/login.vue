<script setup lang="ts">
const { fetch: fetchSession } = useUserSession()

const username = ref('')
const password = ref('')
const error = ref('')
const busy = ref(false)

async function submit() {
  error.value = ''
  busy.value = true
  try {
    await $fetch('/api/auth/login', {
      method: 'POST',
      body: { username: username.value, password: password.value },
    })
    await fetchSession()
    await navigateTo('/')
  } catch (e: any) {
    error.value = e?.statusCode === 401 ? 'Invalid credentials' : 'Login failed'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="login-wrap">
    <form class="card" @submit.prevent="submit">
      <h1 class="title">HomeNut</h1>
      <p class="subtitle">Sign in</p>

      <label class="field">
        <span>Username</span>
        <input v-model="username" type="text" autocomplete="username" autofocus required>
      </label>

      <label class="field">
        <span>Password</span>
        <input v-model="password" type="password" autocomplete="current-password" required>
      </label>

      <p v-if="error" class="error">{{ error }}</p>

      <button class="btn" type="submit" :disabled="busy">
        {{ busy ? 'Signing in…' : 'Sign in' }}
      </button>
    </form>
  </div>
</template>

<style scoped>
.login-wrap {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.card {
  width: 100%;
  max-width: 360px;
  background: #161a26;
  border: 1px solid #2a2f45;
  border-radius: 12px;
  padding: 28px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.title {
  font-size: 1.6rem;
  font-weight: 800;
  color: #f1f5f9;
}

.subtitle {
  font-size: 0.85rem;
  color: #64748b;
  margin-bottom: 8px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 0.8rem;
  color: #94a3b8;
}

.field input {
  background: #0f1117;
  border: 1px solid #2a2f45;
  border-radius: 8px;
  padding: 10px 12px;
  color: #e2e8f0;
  font-size: 0.95rem;
  outline: none;
  transition: border-color 0.15s;
}

.field input:focus { border-color: #4a6fa5; }

.error {
  color: #f87171;
  font-size: 0.85rem;
}

.btn {
  background: #4a6fa5;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 10px 16px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
  margin-top: 4px;
}

.btn:hover:not(:disabled) { background: #6b93c7; }
.btn:disabled { opacity: 0.6; cursor: not-allowed; }
</style>
