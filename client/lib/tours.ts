import type { TourLog } from '@utpost/shared'

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
