// Fetches the guide list and the tour table from GraphQL.
// Renames the fields so the Vue pages keep the data shape they already use.

import type { Guide } from '@utpost/shared'
import type { TourListItem } from '../lib/tours'
import { client } from './urql'

interface GraphQLGuide {
  id: string
  slug: string
  title: string
  region: string
  difficulty: string
  lengthKm: number
  bodyHtml: string
  heroImage: string | null
  published: boolean
  updatedAt: string
}

interface GraphQLTour {
  id: string
  title: string
  distanceM: number
  photoCount: number
  user: { displayName: string } | null
  guide: { title: string } | null
}

const GUIDES_QUERY = /* GraphQL */ `
  query Guides {
    guides {
      id
      slug
      title
      region
      difficulty
      lengthKm
      bodyHtml
      heroImage
      published
      updatedAt
    }
  }
`

const TOURS_QUERY = /* GraphQL */ `
  query Tours($limit: Int) {
    tours(limit: $limit) {
      id
      title
      distanceM
      photoCount
      user {
        displayName
      }
      guide {
        title
      }
    }
  }
`

const toGuide = (guide: GraphQLGuide): Guide => ({
  id: Number(guide.id),
  slug: guide.slug,
  title: guide.title,
  region: guide.region,
  difficulty: guide.difficulty,
  length_km: guide.lengthKm,
  body_html: guide.bodyHtml,
  hero_image: guide.heroImage,
  published: guide.published,
  author_id: null,
  updated_at: guide.updatedAt,
})

const toTourListItem = (tour: GraphQLTour): TourListItem => ({
  id: Number(tour.id),
  title: tour.title,
  distance_m: tour.distanceM,
  user: tour.user ? { display_name: tour.user.displayName } : null,
  guide: tour.guide ? { title: tour.guide.title } : null,
  photoCount: tour.photoCount,
})

/** The guide list. */
export const fetchGuides = async (): Promise<Guide[]> => {
  const result = await client.query(GUIDES_QUERY, {}, { requestPolicy: 'network-only' }).toPromise()

  if (result.error) {
    throw result.error
  }

  if (!result.data) {
    throw new Error('No data returned by Guides query')
  }

  return result.data.guides.map(toGuide)
}

/** The tour table. */
export const fetchTours = async (): Promise<TourListItem[]> => {
  const result = await client
    .query(TOURS_QUERY, { limit: 50 }, { requestPolicy: 'network-only' })
    .toPromise()

  if (result.error) {
    throw result.error
  }

  if (!result.data) {
    throw new Error('No data returned by Tours query')
  }

  return result.data.tours.map(toTourListItem)
}
