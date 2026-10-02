export const API_URL = 'http://localhost:4000/api'

export const get = async <T>(path: string): Promise<T> => {
  const response = await fetch(`${API_URL}${path}`)
  return response.json() as Promise<T>
}

export const post = async <T>(path: string, body: unknown): Promise<T> => {
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return response.json() as Promise<T>
}