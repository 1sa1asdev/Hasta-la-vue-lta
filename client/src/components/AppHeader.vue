<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useSessionStore } from '../stores/session'

const router = useRouter()
const session = useSessionStore()

function logout() {
  session.logout()
  router.push('/login')
}
</script>

<template>
  <header class="topbar">
    <RouterLink to="/" class="logo">Utpost</RouterLink>

    <nav>
      <RouterLink to="/guides">Guides</RouterLink>
      <RouterLink to="/tours">Tours</RouterLink>

      <template v-if="session.isLoggedIn">
        <span class="username">{{ session.user?.display_name }}</span>
        <button class="button-logout" @click="logout">Log out</button>
      </template>

      <RouterLink v-else to="/login">Log in</RouterLink>
    </nav>
  </header>
</template>
