<script setup>
    import GuideCard from "../components/GuideCard.vue"
    import { reactive, onMounted, ref, watch } from "vue"

    let guides = reactive([])
    const loading = ref(true)
    const error = ref(null)
    const search = ref("")
    let filteredGuides = reactive([])
    filteredGuides = guides;


    onMounted(() => {
        fetch('http://localhost:4000/api/guides')
        .then((response) => response.json())
        .then((guidesResponse) => guides = guidesResponse)
        .then(() => filteredGuides = guides)
        .catch((e) => {
            console.log("Error", e)
            error.value = e
        })
        .finally(() => loading.value = false)
    })

    watch(search, () => {
        if (search.value.trim() === "") {
            filteredGuides = guides;
            return
        }

        filteredGuides = guides.filter(guide => guide.title.toLowerCase().startsWith(search.value.toLowerCase().trim()))
    })
</script>

<template>
    <section class="main-section">

        <input class="search-input" v-model="search" placeholder="Sök på namn eller landskap"  />
        <p v-if="loading === false && filteredGuides.length > 0"> ({{ filteredGuides.length }} / {{ guides.length }})</p>
        <div  class="grid" v-if="loading === false && filteredGuides.length > 0">
            <GuideCard v-for="guide in filteredGuides"  :guide="guide"/>

        </div>
        <p v-if="loading" >Loading...</p>
        <p v-if="error !== null" >{{ error }}</p>
    </section>
</template>

<style scoped>
    @import '../style.css';

    .main-section {
        width: 100%
    }

    .search-input { flex: 1; padding: 10px; border: 1px solid #c9c4b5; border-radius: 3px; font-size: 15px; width: 100% }

    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 18px; margin-top: 0.5em; }
</style>