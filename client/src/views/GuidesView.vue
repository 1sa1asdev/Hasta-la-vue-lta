<script setup lang="ts">
import GuideCard from '../components/GuideCard.vue'
import { get } from '../api.js'
import { filterGuidesByTitle } from '../../lib/guides'
import { onMounted, ref, watch } from 'vue'
import type { Guide } from '@utpost/shared'

const guides = ref<Guide[]>([])
const loading = ref(true)
const error = ref<unknown>(null)
const search = ref('')
const filteredGuides = ref<Guide[]>([])

onMounted(() => {
  get<Guide[]>('/guides')
    .then((guidesResponse) => (guides.value = guidesResponse))
    .then(() => (filteredGuides.value = filterGuidesByTitle(guides.value, search.value)))
    .catch((e) => {
      console.log('Error', e)
      error.value = e
    })
    .finally(() => (loading.value = false))
})

watch(search, () => {
  filteredGuides.value = filterGuidesByTitle(guides.value, search.value)
})
</script>

<template>
  <section class="main-section">
    <input class="search-input" v-model="search" placeholder="Sök på namn eller landskap" />
    <p v-if="loading === false && filteredGuides.length > 0">
      ({{ filteredGuides.length }} / {{ guides.length }})
    </p>
    <div class="grid" v-if="loading === false && filteredGuides.length > 0">
      <GuideCard v-for="guide in filteredGuides" :key="guide.id" :guide="guide" />
    </div>
    <p v-if="loading">Loading...</p>
    <p v-if="loading === false && error === null && guides.length === 0">No guides</p>
    <p v-if="error !== null">{{ error }}</p>
  </section>
</template>

<style scoped>
@import '../style.css';

.main-section {
  width: 100%;
}

.search-input {
  flex: 1;
  padding: 10px;
  border: 1px solid #c9c4b5;
  border-radius: 3px;
  font-size: 15px;
  width: 100%;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 18px;
  margin-top: 0.5em;
}
</style>
