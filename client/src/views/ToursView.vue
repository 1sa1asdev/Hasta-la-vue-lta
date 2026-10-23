<script setup lang="ts">
import { useQuery } from '@urql/vue'
import { TOURS_QUERY, toTourListItem } from '../queries'
import { toTourRow } from '../../lib/tours'
import { computed } from 'vue'

const { data, fetching, error } = useQuery({
  query: TOURS_QUERY,
  variables: { limit: 50 },
})

const rows = computed(() => (data.value?.tours ?? []).map(toTourListItem).map(toTourRow))
</script>

<template>
  <h3>Turer</h3>
  <table v-if="!fetching && !error && rows.length > 0" class="tours">
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

  <p v-if="fetching">Loading...</p>
  <p v-if="!fetching && !error && rows.length === 0">No tours</p>
  <p v-if="error">{{ error.message }}</p>
</template>
