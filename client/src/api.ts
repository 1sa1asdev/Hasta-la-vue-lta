export const API_URL = 'http://localhost:4000/api'

// Generisk: anroparen säger vilken typ svaret har – `get<Guide[]>('/guides')`.
// Typen kommer från @utpost/shared, samma fil som API:et använder.
export const get = async <T>(path: string): Promise<T> => {
  const res = await fetch(`${API_URL}${path}`)
  if (!res.ok) throw new Error(`API svarade ${res.status}`)
  return res.json() as Promise<T>
}

// Används av inloggningen (Pinia-storen). Svarar med JSON även vid 401 – API:et skickar
// { error: '...' } då, och storen läser det. Kastar bara när svaret inte är JSON alls.
export const post = async <T>(path: string, body: unknown): Promise<T> => {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.json() as Promise<T>
}
