import { vi } from 'vitest'

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
  const fetchMock = vi.fn().mockReturnValue(new Promise<Response>(() => {}))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

// Vyerna loggar fel med console.log – håll testutskriften ren.
export const silenceConsole = () => vi.spyOn(console, 'log').mockImplementation(() => {})
