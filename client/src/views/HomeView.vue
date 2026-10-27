<script setup lang="ts">
import { useQuery } from '@urql/vue'
import { graphql } from '../gql'
import { computed } from 'vue'

const HomeDocument = graphql(/* GraphQL */ `
  query Home {
    guides {
      slug
      title
      region
      difficulty
      lengthKm
    }
    tours(limit: 5) {
      id
      title
      distanceM
    }
  }
`)

const { data, fetching, error } = useQuery({ query: HomeDocument })
const popularGuides = computed(() => data.value?.guides.slice(0, 6) ?? [])
const regionCount = computed(
  () => new Set(data.value?.guides.map((guide) => guide.region) ?? []).size,
)
</script>

<template>
  <p v-if="error" role="alert">Kunde inte hämta startsidan: {{ error.message }}</p>
  <p v-else-if="fetching || !data">Laddar…</p>
  <div v-else>
    <section class="hero">
      <h1>Hitta din nästa tur</h1>
      <p>{{ data.guides.length }} guider i {{ regionCount }} landskap.</p>
    </section>

    <h2>Populärast just nu</h2>
    <ul class="list">
      <li v-for="g in popularGuides" :key="g.slug">
        <RouterLink :to="`/guider/${g.slug}`">{{ g.title }}</RouterLink>
        <span class="muted"> {{ g.region }}</span>
      </li>
    </ul>

    <h2>Senaste turerna</h2>
    <ul class="list">
      <li v-for="t in data.tours" :key="t.id">
        <RouterLink :to="`/turer/${t.id}`">{{ t.title }}</RouterLink>
        <span class="muted"> {{ Math.round(t.distanceM / 100) / 10 }} km</span>
      </li>
    </ul>

    <h2>Alla guider</h2>
    <ul class="list">
      <li v-for="g in data.guides" :key="g.slug">
        <RouterLink :to="`/guider/${g.slug}`">{{ g.title }}</RouterLink>
        <span class="muted"> {{ g.region }} · {{ g.difficulty }} · {{ g.lengthKm }} km</span>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.hero {
  padding: 24px 0;
}
.list {
  padding-left: 18px;
}
.muted {
  color: #777;
  font-size: 14px;
}
</style>
