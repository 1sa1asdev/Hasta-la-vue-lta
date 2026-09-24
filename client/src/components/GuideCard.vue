<script setup>
    const { guide } = defineProps(['guide'])
</script>

<template>
    <div class="card">
        <RouterLink :to="'/guider/' + guide.slug">{{ guide.title }}</RouterLink>
        <p className="muted">{{ guide.region }} · {{ guide.difficulty }} · {{ guide.length_km }} km</p>
        <div class="excerpt" v-html="guide.body_html.slice(0, 180)" />
    </div>

</template>

<style scoped>
    .card {
        border: 1px solid #ddd;
        padding: 1em;
        border-radius: 1em;
        background-color: rgba(128, 128, 128, 0.148)
    }
</style>