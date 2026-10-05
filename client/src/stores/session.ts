import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { User } from '@utpost/shared'
import { computed } from 'vue'

export const useSessionStore = defineStore('session', () => {
  const user = ref<User | null>(null)
  const token = ref<string | null>(null)

  const isLoggedIn = computed(() => user.value !== null)

  function login(loggedInUser: User, authToken: string) {
    user.value = loggedInUser
    token.value = authToken
  }

  function logout() {
    user.value = null
    token.value = null
  }

  return { user, token, isLoggedIn, login, logout }
})
