import { createClient, cacheExchange, fetchExchange } from '@urql/vue'

export const client = createClient({
  url: '/graphql',
  exchanges: [cacheExchange, fetchExchange],
  preferGetMethod: false,
})
