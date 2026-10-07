<script setup lang="ts">
import type { Guide } from '@utpost/shared'
import { excerpt } from '../../lib/guides'

const { guide } = defineProps<{
  guide: Guide
}>()
</script>

<template>
  <div class="card">
    <RouterLink :to="'/guider/' + guide.slug">{{ guide.title }}</RouterLink>
    <p class="muted">{{ guide.region }} · {{ guide.difficulty }} · {{ guide.length_km }} km</p>
    <div class="excerpt" v-html="excerpt(guide.body_html)" />
  </div>
</template>

<style scoped>
.card {
  border: 1px solid #ddd;
  padding: 1em;
  border-radius: 1em;
  background-color: rgba(128, 128, 128, 0.148);
}
</style>
