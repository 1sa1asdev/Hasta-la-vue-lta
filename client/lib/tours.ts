import type { TourLog } from '@utpost/shared'
import { distanceKm } from './format'

export const elevationGain = (logs: TourLog[]): number => {
  let gain = 0
  let last: number | null = null
  for (const { elevation_m } of logs) {
    if (elevation_m == null) continue
    if (last !== null && elevation_m > last) gain += elevation_m - last
    last = elevation_m
  }
  return gain
}

export interface TourRow {
  id: number
  title: string
  author: string
  guide: string
  distanceKm: number
  photoCount: number
}

/** What the tour table needs. GraphQL sends `photoCount` instead of photo rows. */
export interface TourListItem {
  id: number
  title: string
  distance_m: number
  user: { display_name: string } | null
  guide: { title: string } | null
  photos?: readonly unknown[]
  photoCount?: number
}

/** Rows for the tour list. A tour without a guide is shown as '-' in the table. */
export const toTourRow = (tour: TourListItem): TourRow => ({
  id: tour.id,
  title: tour.title,
  author: tour.user?.display_name ?? '',
  guide: tour.guide ? tour.guide.title : '-',
  distanceKm: distanceKm(tour.distance_m),
  photoCount: tour.photoCount ?? tour.photos?.length ?? 0,
})
