// Formatering som flera vyer delar. Ligger utanför komponenterna så att den kan
// enhetstestas utan att rendera Vue.

/** Avstånd i meter visas som kilometer med en decimal: 12500 → 12.5 */
export const distanceKm = (meters: number): number => Math.round(meters / 100) / 10

/** Tidsstämpel från API:et visas som svensk 24-timmarsklocka: 08:05:00 */
export const formatTime = (iso: string): string => new Date(iso).toLocaleTimeString('sv-SE')
