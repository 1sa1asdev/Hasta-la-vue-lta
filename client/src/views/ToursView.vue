<script setup lang="ts">
import { get } from '../api.js'
import { onMounted, ref } from 'vue'
import type { TourWithRelations } from '@utpost/shared'

const tours = ref<TourWithRelations[]>([])
const loading = ref(true)
const error = ref<unknown>(null)

onMounted(() => {
  get<TourWithRelations[]>('/tours')
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
  <table v-if="loading === false && tours.length > 0" class="tours">
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
      <tr v-for="tour in tours" :key="tour.id">
        <td>
          <RouterLink :to="'/turer/' + tour.id">{{ tour.title }}</RouterLink>
        </td>
        <td>{{ tour.user?.display_name }}</td>
        <td>{{ tour.guide ? tour.guide.title : '-' }}</td>
        <td>{{ Math.round(tour.distance_m / 100) / 10 }} km</td>
        <td>{{ tour.photos.length }}</td>
      </tr>
    </tbody>
  </table>

  <p v-if="loading">Loading...</p>
  <p v-if="error !== null">{{ error }}</p>
</template>
