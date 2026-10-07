import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/vue'
import { createRouter, createMemoryHistory } from 'vue-router'
import type { TourDetail, TourLog } from '@utpost/shared'
import TourDetailView from './TourDetailView.vue'
import { stubFetch, stubFetchNetworkError, stubFetchPending } from '../test/fetch'

const log = (id: number, elevation_m: number | null, recorded_at: string): TourLog => ({
  id,
  tour_id: 7,
  recorded_at,
  lat: 67.9,
  lon: 18.5,
  elevation_m,
  heart_rate: 120 + id,
  note: null,
})

const logs = [
  log(1, 100, '2026-06-01T08:00:00.000Z'),
  log(2, 150, '2026-06-01T08:30:00.000Z'),
  log(3, 120, '2026-06-01T09:00:00.000Z'),
  log(4, 180, '2026-06-01T09:30:00.000Z'),
]

const makeTour = (overrides: Partial<TourDetail> = {}): TourDetail => ({
  id: 7,
  user_id: 1,
  guide_id: null,
  title: 'Toppturen',
  started_at: '2026-06-01T08:00:00.000Z',
  distance_m: 12345,
  notes: 'Blåsigt på toppen',
  logs,
  photos: [],
  ...overrides,
})

// Vyn läser id:t ur URL:en, så den behöver en riktig router.
const renderView = async (path = '/turer/7') => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/turer/:id', component: TourDetailView }],
  })
  router.push(path)
  await router.isReady()
  return render(TourDetailView, { global: { plugins: [router] } })
}

describe('TourDetailView', () => {
  describe('when data arrives', () => {
    it('fetches the tour from the id in the URL', async () => {
      const fetchMock = stubFetch(makeTour({ id: 42 }))
      await renderView('/turer/42')

      await screen.findByRole('heading', { name: 'Toppturen' })
      expect(fetchMock).toHaveBeenCalledWith(expect.stringMatching(/\/tours\/42$/))
    })

    it('shows the tour title', async () => {
      stubFetch(makeTour())
      await renderView()

      expect(
        await screen.findByRole('heading', { level: 1, name: 'Toppturen' }),
      ).toBeInTheDocument()
    })

    it('summarises distance, number of points and elevation gain', async () => {
      stubFetch(makeTour())
      await renderView()

      // 100 → 150 (+50) → 120 → 180 (+60) = 110
      expect(await screen.findByText('12.3 km · 4 mätpunkter · 110 höjdmeter')).toBeInTheDocument()
    })

    it('skips points without elevation when counting the climb', async () => {
      stubFetch(
        makeTour({
          logs: [
            log(1, 100, '2026-06-01T08:00:00.000Z'),
            log(2, null, '2026-06-01T08:30:00.000Z'),
            log(3, 150, '2026-06-01T09:00:00.000Z'),
          ],
        }),
      )
      await renderView()

      expect(await screen.findByText(/3 mätpunkter · 50 höjdmeter/)).toBeInTheDocument()
    })

    it('shows the notes when the tour has any', async () => {
      stubFetch(makeTour())
      await renderView()

      expect(await screen.findByText('Blåsigt på toppen')).toBeInTheDocument()
    })

    it('lists every measurement point with time, elevation and heart rate', async () => {
      stubFetch(makeTour())
      await renderView()

      const list = await screen.findByRole('list')
      const items = within(list).getAllByRole('listitem')
      expect(items).toHaveLength(4)

      // Tiden formateras i maskinens tidszon – räkna fram den på samma sätt.
      const time = new Date(logs[0]!.recorded_at).toLocaleTimeString('sv-SE')
      expect(items[0]).toHaveTextContent(`${time} · 100 m · 121 slag/min`)
    })

    it('hides the loading text once the tour is shown', async () => {
      stubFetch(makeTour())
      await renderView()

      await screen.findByRole('heading', { name: 'Toppturen' })
      expect(screen.queryByText('Laddar…')).not.toBeInTheDocument()
    })
  })

  describe('while loading', () => {
    it('shows a loading text', async () => {
      stubFetchPending()
      await renderView()

      expect(screen.getByText('Laddar…')).toBeInTheDocument()
      expect(screen.queryByRole('heading')).not.toBeInTheDocument()
    })
  })

  describe('when the tour is empty', () => {
    it('shows zero points and zero climb when there are no logs', async () => {
      stubFetch(makeTour({ logs: [] }))
      await renderView()

      expect(await screen.findByText('12.3 km · 0 mätpunkter · 0 höjdmeter')).toBeInTheDocument()
      expect(screen.queryAllByRole('listitem')).toHaveLength(0)
    })

    it('leaves out the notes paragraph when there are no notes', async () => {
      stubFetch(makeTour({ notes: null }))
      await renderView()

      await screen.findByRole('heading', { name: 'Toppturen' })
      expect(screen.queryByText('Blåsigt på toppen')).not.toBeInTheDocument()
    })
  })

  describe('when the API fails', () => {
    it('shows an alert with the status when the tour is not found', async () => {
      stubFetch({ error: 'Not found' }, 404)
      await renderView()

      expect(await screen.findByRole('alert')).toHaveTextContent('API svarade 404')
      expect(screen.queryByText('Laddar…')).not.toBeInTheDocument()
      expect(screen.queryByRole('heading')).not.toBeInTheDocument()
    })

    it('shows an alert with the status on a server error', async () => {
      stubFetch({ error: 'Internal' }, 500)
      await renderView()

      expect(await screen.findByRole('alert')).toHaveTextContent('API svarade 500')
    })

    it('shows an alert when the API cannot be reached', async () => {
      stubFetchNetworkError()
      await renderView()

      expect(await screen.findByRole('alert')).toHaveTextContent('Failed to fetch')
    })
  })
})
