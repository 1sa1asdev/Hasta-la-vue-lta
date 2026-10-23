import './assets/main.css'
import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { client } from './urql'
import urql from '@urql/vue'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(urql, client)
app.mount('#app')
