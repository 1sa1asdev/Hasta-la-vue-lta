// Reusable fetch helper for the GraphQL API.
// Posts one query and returns the data. Callers catch the thrown errors.

export const GRAPHQL_URL = 'http://localhost:4000/graphql'

interface GraphQLErrorBody {
  message: string
}

interface GraphQLResult<T> {
  data?: T | null
  errors?: GraphQLErrorBody[]
}

/**
 * Posts one GraphQL operation and returns its `data`.
 * `variables` fills placeholders such as `$limit`. Omit it when the query has none.
 * `token` is the logged-in user's JWT. Omit it for public queries such as guides and tours.
 * Network failures reject like `fetch`. HTTP errors and GraphQL errors throw.
 */
export const graphql = async <T>(
  query: string,
  variables?: Record<string, unknown>,
  token?: string | null,
): Promise<T> => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  // The API reads this header to know who is logged in. Public queries skip it.
  if (token) headers.Authorization = `Bearer ${token}`

  const response = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(variables === undefined ? { query } : { query, variables }),
  })

  // A status outside 200–299 means the server rejected the request.
  if (!response.ok) {
    throw new Error(`API svarade ${response.status}`)
  }

  const body = (await response.json()) as GraphQLResult<T>

  // GraphQL often answers with HTTP 200 and puts the failure in `errors`.
  if (body.errors?.length) {
    const message = body.errors
      .map((error) => error.message)
      .filter(Boolean)
      .join('; ')
    throw new Error(message || 'GraphQL-fel')
  }

  // A successful response always includes data. Null here means the query failed quietly.
  if (body.data == null) {
    throw new Error('API svarade utan data')
  }

  return body.data
}
