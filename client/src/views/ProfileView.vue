<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import type { Tour } from '@utpost/shared'
import { get } from '../api'
import { useSessionStore } from '../stores/session'

const router = useRouter()
const session = useSessionStore()
const tours = ref<Tour[]>([])
const error = ref<string | null>(null)

// Same approach as the old React page: fetch all tours and keep the user's own (debt item 10).
onMounted(async () => {
  if (!session.user) return
  try {
    const all = await get<Tour[]>('/tours')
    tours.value = all.filter((t) => t.user_id === session.user?.id)
  } catch (err) {
    error.value = (err as Error).message
  }
})

function logout() {
  session.logout()
  router.push('/')
}
</script>

<template>
  <p v-if="!session.user">Du är inte inloggad.</p>
  <div v-else>
    <h1>{{ session.user.display_name }}</h1>
    <p class="muted">{{ session.user.email }} · {{ session.user.role }}</p>
    <h2>Mina turer ({{ tours.length }})</h2>
    <p v-if="error" role="alert">{{ error }}</p>
    <ul>
      <li v-for="t in tours" :key="t.id">
        <RouterLink :to="`/turer/${t.id}`">{{ t.title }}</RouterLink>
      </li>
    </ul>
    <button class="button-logout" @click="logout">Logga ut</button>
  </div>
</template>

<style scoped>
.muted {
  color: #777;
  font-size: 14px;
}
</style>
