import { vi } from 'vitest'

let resolvePendingFetch: (() => void) | null = null

// API:et svarar med `body` och given status.
export const stubFetch = (body: unknown, status = 200) => {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

// Nätverket ligger nere – fetch själv rejectar.
export const stubFetchNetworkError = (message = 'Failed to fetch') => {
  const fetchMock = vi.fn().mockRejectedValue(new TypeError(message))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

// Svaret kommer aldrig – för att se laddningsläget.
export const stubFetchPending = () => {
  const fetchMock = vi.fn().mockImplementation(
    (_request, init) =>
      new Promise<Response>((resolve) => {
        resolvePendingFetch = () => {
          const body = JSON.parse(String(init?.body ?? '{}')) as { query?: unknown }
          const query = typeof body.query === 'string' ? body.query : ''
          const data = query.includes('query Tours') ? { tours: [] } : { guides: [] }
          resolve(
            new Response(JSON.stringify({ data }), {
              headers: { 'Content-Type': 'application/json' },
            }),
          )
        }
      }),
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

export const settlePendingFetch = async () => {
  if (!resolvePendingFetch) return

  const finish = resolvePendingFetch
  resolvePendingFetch = null
  finish()

  await new Promise((resolve) => setTimeout(resolve, 0))
}

// Vyerna loggar fel med console.log – håll testutskriften ren.
export const silenceConsole = () => vi.spyOn(console, 'log').mockImplementation(() => {})
