import { createClient, cacheExchange, fetchExchange } from '@urql/vue'

export const createUrqlClient = (url = '/graphql') =>
  createClient({
    url,
    exchanges: [cacheExchange, fetchExchange],
    preferGetMethod: false,
  })

export const client = createUrqlClient()
