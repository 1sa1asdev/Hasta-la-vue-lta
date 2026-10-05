import { describe, it, expect } from 'vitest'
import type { Guide, Photo, TourLog, TourWithRelations } from '@utpost/shared'
import { elevationGain, toTourRow } from './tours'

const log = (elevation_m: number | null, id = 0): TourLog => ({
  id, tour_id: 1, recorded_at: '2026-09-01T08:00:00.000Z', lat: 67.9, lon: 18.5,
  elevation_m, heart_rate: null, note: null,
})

describe('elevationGain', () => {
  it('adds up only the climbs, not the descents', () => {
    expect(elevationGain([log(100), log(150), log(120), log(180)])).toBe(110)
  })
  it('returns 0 for a tour without any logs', () => {
    expect(elevationGain([])).toBe(0)
  })
  // Regression test – debt from docs/debt.md: a log without elevation was read as sea level
  it('skips logs without elevation instead of treating them as zero', () => {
    expect(elevationGain([log(100), log(null), log(150)])).toBe(50)
  })
  it('does not count walking on flat ground as climbing', () => {
    expect(elevationGain([log(150), log(150)])).toBe(0)
  })
})

const photo = (id: number): Photo => ({
  id, tour_id: 7, filename: `photo-${id}.jpg`, width: 1200, height: 800,
  created_at: '2026-09-01T08:00:00.000Z',
})

const guide: Guide = {
  id: 3, slug: 'kebnekaise', title: 'Kebnekaise', region: 'Lappland',
  difficulty: 'svår', length_km: 19, body_html: '<p>Keb</p>', hero_image: null,
  published: true, author_id: null, updated_at: '2026-09-01T08:00:00.000Z',
}

const tour = (overrides: Partial<TourWithRelations> = {}): TourWithRelations => ({
  id: 7,
  user_id: 2,
  guide_id: null,
  title: 'Kebnekaise runt',
  started_at: '2026-09-01T08:00:00.000Z',
  distance_m: 12500,
  notes: null,
  user: {
    id: 2, email: 'anna@example.com', display_name: 'Anna', role: 'user',
    created_at: '2026-09-01T08:00:00.000Z',
  },
  guide: null,
  photos: [],
  logs: [],
  ...overrides,
})

describe('toTourRow', () => {
  it('shows "-" in the guide column when the tour has no guide', () => {
    expect(toTourRow(tour()).guide).toBe('-')
  })

  it('shows the guide title when the tour is linked to a guide', () => {
    expect(toTourRow(tour({ guide, guide_id: guide.id })).guide).toBe('Kebnekaise')
  })

  it('shows the display name of the author', () => {
    expect(toTourRow(tour()).author).toBe('Anna')
  })

  it('rounds the distance and counts the photos', () => {
    const row = toTourRow(tour({ distance_m: 18500, photos: [photo(1), photo(2)] }))
    expect(row.distanceKm).toBe(18.5)
    expect(row.photoCount).toBe(2)
  })
})
