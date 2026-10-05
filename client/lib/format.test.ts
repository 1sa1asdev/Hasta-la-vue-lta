import { describe, it, expect } from 'vitest'
import { distanceKm, formatTime } from './format'

describe('distanceKm', () => {
  it('visar sträckan i kilometer med en decimal', () => {
    expect(distanceKm(12345)).toBe(12.3)
  })

  it('avrundar till närmaste hundra meter', () => {
    expect(distanceKm(1249)).toBe(1.2)
    expect(distanceKm(1250)).toBe(1.3)
  })

  it('ger 0 för en tur utan registrerad sträcka', () => {
    expect(distanceKm(0)).toBe(0)
  })
})

describe('formatTime', () => {
  it('formaterar tiden som svensk 24-timmarsklocka', () => {
    expect(formatTime('2026-09-01T08:05:00')).toBe('08:05:00')
  })

  it('växlar inte till 12-timmarsklocka på kvällen', () => {
    expect(formatTime('2026-09-01T23:59:59')).toBe('23:59:59')
  })
})
