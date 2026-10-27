<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useSessionStore } from '../stores/session'

const email = ref('')
const password = ref('')
const error = ref<string | null>(null)

const router = useRouter()
const session = useSessionStore()

async function submit(e: Event) {
  e.preventDefault()
  error.value = null

  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.value, password: password.value }),
  })

  const data = await res.json()

  if (!res.ok) {
    error.value = data.error ?? 'Something went wrong'
    return
  }

  session.login(data.user, data.token)
  router.push('/')
}
</script>

<template>
  <form class="login" @submit="submit">
    <h1>Log in</h1>

    <input v-model="email" type="email" placeholder="Email" required />
    <input v-model="password" type="password" placeholder="Password" required />

    <p v-if="error" class="error">{{ error }}</p>

    <button type="submit" class="button-blue">Log in</button>
  </form>
</template>
