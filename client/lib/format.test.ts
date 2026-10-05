import { describe, it, expect } from 'vitest'
import { distanceKm, formatTime } from './format'

describe('distanceKm', () => {
  it('shows the distance in kilometers with one decimal', () => {
    expect(distanceKm(12345)).toBe(12.3)
  })

  it('rounds to the nearest hundred meters', () => {
    expect(distanceKm(1249)).toBe(1.2)
    expect(distanceKm(1250)).toBe(1.3)
  })

  it('returns 0 for a tour with no recorded distance', () => {
    expect(distanceKm(0)).toBe(0)
  })
})

describe('formatTime', () => {
  it('formats the time as a Swedish 24-hour clock', () => {
    expect(formatTime('2026-09-01T08:05:00')).toBe('08:05:00')
  })

  it('does not switch to a 12-hour clock in the evening', () => {
    expect(formatTime('2026-09-01T23:59:59')).toBe('23:59:59')
  })
})
