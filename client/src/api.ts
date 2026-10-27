export const API_URL = '/api'

// Generic: the caller says which type the response has – `get<Guide[]>('/guides')`.
// The type comes from @utpost/shared, the same file the API uses.
export const get = async <T>(path: string): Promise<T> => {
  const response = await fetch(`${API_URL}${path}`)
  if (!response.ok) throw new Error(`API svarade ${response.status}`)
  return response.json() as Promise<T>
}

// Used by the login (Pinia store). Answers with JSON even on 401 – the API sends
// { error: '...' } then, and the store reads it. Only throws when the response is not JSON at all.
export const post = async <T>(path: string, body: unknown): Promise<T> => {
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return response.json() as Promise<T>
}
