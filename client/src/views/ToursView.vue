<script setup lang="ts">
import { fetchTours } from '../queries'
import { toTourRow } from '../../lib/tours'
import type { TourListItem } from '../../lib/tours'
import { computed, onMounted, ref } from 'vue'

const tours = ref<TourListItem[]>([])
const loading = ref(true)
const error = ref<unknown>(null)
const rows = computed(() => tours.value.map(toTourRow))

onMounted(() => {
  fetchTours()
    .then((toursResponse) => {
      tours.value = toursResponse
    })
    .catch((e) => {
      console.log('Error', e)
      error.value = e
    })
    .finally(() => (loading.value = false))
})
</script>

<template>
  <h3>Turer</h3>
  <table v-if="loading === false && rows.length > 0" class="tours">
    <thead>
      <tr>
        <th>Tur</th>
        <th>Av</th>
        <th>Guide</th>
        <th>Längd</th>
        <th>Bilder</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="row in rows" :key="row.id">
        <td>
          <RouterLink :to="'/turer/' + row.id">{{ row.title }}</RouterLink>
        </td>
        <td>{{ row.author }}</td>
        <td>{{ row.guide }}</td>
        <td>{{ row.distanceKm }} km</td>
        <td>{{ row.photoCount }}</td>
      </tr>
    </tbody>
  </table>

  <p v-if="loading">Loading...</p>
  <p v-if="loading === false && error === null && rows.length === 0">No tours</p>
  <p v-if="error !== null">{{ error }}</p>
</template>
