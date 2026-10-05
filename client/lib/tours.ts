import type { TourLog, TourWithRelations } from '@utpost/shared'
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

/** Raderna i turlistan. En tur utan guide visas som '-' i tabellen. */
export const toTourRow = (tour: TourWithRelations): TourRow => ({
  id: tour.id,
  title: tour.title,
  author: tour.user?.display_name ?? '',
  guide: tour.guide ? tour.guide.title : '-',
  distanceKm: distanceKm(tour.distance_m),
  photoCount: tour.photos.length,
})
