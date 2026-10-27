<script setup lang="ts">
import { useQuery } from '@urql/vue'
import GuideCard from '../components/GuideCard.vue'
import { GUIDES_QUERY, toGuide } from '../queries'
import { filterGuidesByTitle } from '../../lib/guides'
import { computed, ref } from 'vue'

const { data, fetching, error } = useQuery({ query: GUIDES_QUERY })
const guides = computed(() => (data.value?.guides ?? []).map(toGuide))
const search = ref('')
const filteredGuides = computed(() => filterGuidesByTitle(guides.value, search.value))
</script>

<template>
  <section class="main-section">
    <input class="search-input" v-model="search" placeholder="Sök på namn eller landskap" />
    <p v-if="!fetching && !error && filteredGuides.length > 0">
      ({{ filteredGuides.length }} / {{ guides.length }})
    </p>
    <div class="grid" v-if="!fetching && !error && filteredGuides.length > 0">
      <GuideCard v-for="guide in filteredGuides" :key="guide.id" :guide="guide" />
    </div>
    <p v-if="fetching">Loading...</p>
    <p v-if="!fetching && !error && guides.length === 0">No guides</p>
    <p v-if="error">{{ error.message }}</p>
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
