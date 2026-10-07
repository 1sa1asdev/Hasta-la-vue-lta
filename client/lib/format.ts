// Formatting shared by several views. It lives outside the components so it can be
// unit tested without rendering Vue.

/** Distance in meters is shown as kilometers with one decimal: 12500 → 12.5 */
export const distanceKm = (meters: number): number => Math.round(meters / 100) / 10

/** A timestamp from the API is shown as a Swedish 24-hour clock: 08:05:00 */
export const formatTime = (iso: string): string => new Date(iso).toLocaleTimeString('sv-SE')
