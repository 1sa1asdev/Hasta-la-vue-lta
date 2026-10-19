import { describe, expect, it, vi } from 'vitest'
import { GRAPHQL_URL } from './graphql'
import { fetchGuides, fetchTours } from './queries'

const response = (body: unknown) => ({
  ok: true,
  status: 200,
  json: async () => body,
})

describe('fetchGuides', () => {
  it('maps a GraphQL guide onto the fields the cards already use', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      response({
        data: {
          guides: [
            {
              id: '1',
              slug: 'kebnekaise',
              title: 'Kebnekaise',
              region: 'Lappland',
              difficulty: 'medel',
              lengthKm: 12,
              bodyHtml: '<p>Sveriges tak</p>',
              heroImage: null,
              published: true,
              updatedAt: '2026-01-01T00:00:00.000Z',
            },
          ],
        },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchGuides()).resolves.toEqual([
      {
        id: 1,
        slug: 'kebnekaise',
        title: 'Kebnekaise',
        region: 'Lappland',
        difficulty: 'medel',
        length_km: 12,
        body_html: '<p>Sveriges tak</p>',
        hero_image: null,
        published: true,
        author_id: null,
        updated_at: '2026-01-01T00:00:00.000Z',
      },
    ])

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(GRAPHQL_URL)
    const body = JSON.parse(init.body)
    expect(body.query).toContain('lengthKm')
    expect(body.variables).toBeUndefined()
  })
})

describe('fetchTours', () => {
  it('maps tour, author, guide and photo count for the table', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      response({
        data: {
          tours: [
            {
              id: '7',
              title: 'Toppturen',
              distanceM: 12345,
              photoCount: 3,
              user: { displayName: 'Anna' },
              guide: null,
            },
          ],
        },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchTours()).resolves.toEqual([
      {
        id: 7,
        title: 'Toppturen',
        distance_m: 12345,
        user: { display_name: 'Anna' },
        guide: null,
        photoCount: 3,
      },
    ])

    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.variables).toEqual({ limit: 50 })
    expect(body.query).toContain('photoCount')
  })
})
