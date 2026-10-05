import { afterEach, describe, expect, it, vi } from 'vitest'
import { API_URL, get, post } from './api'

// fetch() rejectar inte vid 404/500, så svaret måste kontrolleras av anroparen.
const response = (body: unknown, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('get', () => {
  it('hämtar från API-adressen och parsar svaret', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response([{ id: 1, slug: 'kebnekaise' }]))
    vi.stubGlobal('fetch', fetchMock)

    await expect(get('/guides')).resolves.toEqual([{ id: 1, slug: 'kebnekaise' }])
    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/guides`)
  })

  it('kastar fel med statuskoden när API:et svarar med ett fel', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ error: 'Hittades inte' }, 404)))

    await expect(get('/guides/999')).rejects.toThrow('API svarade 404')
  })
})

describe('post', () => {
  it('skickar brödtexten som JSON med rätt innehållstyp', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({ token: 'abc' }))
    vi.stubGlobal('fetch', fetchMock)

    const body = { email: 'anna@example.com', password: 'hemligt' }
    await expect(post('/auth/login', body)).resolves.toEqual({ token: 'abc' })

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(`${API_URL}/auth/login`)
    expect(init.method).toBe('POST')
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' })
    expect(JSON.parse(init.body)).toEqual(body)
  })

  // API:et svarar med JSON även vid 401, och inloggningen läser { error } ur svaret.
  it('returnerar felmeddelandet vid 401 i stället för att kasta', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(response({ error: 'Fel e-post eller lösenord' }, 401)),
    )

    await expect(post('/auth/login', {})).resolves.toEqual({ error: 'Fel e-post eller lösenord' })
  })
})
