<script setup>
    import { reactive, onMounted, ref, watch } from "vue"

    let tours = reactive([])
    const loading = ref(true)
    const error = ref(null)


    onMounted(() => {
        fetch('http://localhost:4000/api/tours')
        .then((response) => response.json())
        .then((toursResponse) => tours = toursResponse)
        .catch((e) => {
            console.log("Error", e)
            error.value = e
        })
        .finally(() => loading.value = false)
    })

</script>

<template>
    <h3>Turer</h3>
    <table v-if="loading === false && tours.length > 0" className="tours">
        <thead>
            <tr><th>Tur</th><th>Av</th><th>Guide</th><th>Längd</th><th>Bilder</th></tr>
        </thead>
        <tbody>
            <tr v-for="tour in tours">
                <td><RouterLink :to="'/turer/' + tour.id">{{ tour.title }}</RouterLink></td>
                <td>{{ tour.user?.display_name }}</td>
                <td>{{ tour.guide ? tour.guide.title : '-' }}</td>
                <td>{{ Math.round(tour.distance_m / 100) / 10 }} km</td>
                <td>{{ tour.photos.length }}</td>
            </tr>
        </tbody>
    </table>

    <p v-if="loading" >Loading...</p>
    <p v-if="error !== null" >{{ error }}</p>


</template>