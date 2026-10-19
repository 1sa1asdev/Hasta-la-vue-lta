import { describe, expect, it, vi } from 'vitest'
import { GRAPHQL_URL, graphql } from './graphql'

const response = (body: unknown, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
})

describe('graphql', () => {
  it('posts the query and returns data', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({ data: { guides: [{ id: '1' }] } }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(graphql('query { guides { id } }')).resolves.toEqual({ guides: [{ id: '1' }] })

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(GRAPHQL_URL)
    expect(init.method).toBe('POST')
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' })
    expect(JSON.parse(init.body)).toEqual({ query: 'query { guides { id } }' })
  })

  it('sends variables when the caller provides them', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({ data: { tours: [] } }))
    vi.stubGlobal('fetch', fetchMock)

    await graphql('query Tours($limit: Int) { tours(limit: $limit) { id } }', { limit: 50 })

    expect(JSON.parse(fetchMock.mock.calls[0][1].body).variables).toEqual({ limit: 50 })
  })

  it('sends the session token as a bearer token', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({ data: { ok: true } }))
    vi.stubGlobal('fetch', fetchMock)

    await graphql('mutation { createTour { id } }', undefined, 'secret-token')

    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer secret-token')
  })

  it('throws the GraphQL error messages', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        response({
          data: null,
          errors: [{ message: 'Guides are unavailable' }, { message: 'Timed out' }],
        }),
      ),
    )

    await expect(graphql('query { guides { id } }')).rejects.toThrow(
      'Guides are unavailable; Timed out',
    )
  })

  it('throws when the response has no data', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ data: null })))

    await expect(graphql('query { guides { id } }')).rejects.toThrow('API svarade utan data')
  })

  it('throws with the status code when the server answers with an HTTP error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ error: 'nope' }, 500)))

    await expect(graphql('query { guides { id } }')).rejects.toThrow('API svarade 500')
  })

  it('lets network failures reject', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    await expect(graphql('query { guides { id } }')).rejects.toThrow('Failed to fetch')
  })
})
