<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import DOMPurify from 'dompurify'
import type { Guide } from '@utpost/shared'
import { get } from '../api'

const route = useRoute()
const guide = ref<Guide | null>(null)
const error = ref<string | null>(null)

onMounted(async () => {
  try {
    guide.value = await get<Guide>(`/guides/${route.params.slug}`)
  } catch (err) {
    error.value = (err as Error).message
  }
})

// The guide body is HTML from the database (debt item 3), so it is sanitized before v-html.
const bodyHtml = computed(() => DOMPurify.sanitize(guide.value?.body_html ?? ''))
</script>

<template>
  <p v-if="error" role="alert">{{ error }}</p>
  <p v-else-if="!guide">Laddar…</p>
  <article v-else class="guide">
    <h1>{{ guide.title }}</h1>
    <p class="muted">{{ guide.region }} · {{ guide.difficulty }} · {{ guide.length_km }} km</p>
    <div v-html="bodyHtml" />
  </article>
</template>

<style scoped>
.muted {
  color: #777;
  font-size: 14px;
}
</style>
