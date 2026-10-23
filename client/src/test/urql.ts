import urql from '@urql/vue'
import { createUrqlClient } from '../urql'

export const createUrqlPlugins = () => {
  const client = createUrqlClient()
  return [[urql, client] as [typeof urql, typeof client]]
}
