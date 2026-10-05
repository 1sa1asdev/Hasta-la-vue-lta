import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import TourDetailView from './TourDetailView.vue'
import { logFixture, stubFetch, tourDetailFixture } from '../test/fixtures'

// Vyn läser :id från routen, så den behöver en riktig router.
const renderDetail = async (id = '7') => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/turer/:id', component: TourDetailView }],
  })
  await router.push(`/turer/${id}`)
  await router.isReady()

  return render(TourDetailView, { global: { plugins: [router] } })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('TourDetailView', () => {
  it('hämtar turen med id:t från adressen', async () => {
    const fetchMock = stubFetch(tourDetailFixture())
    await renderDetail('7')

    expect(await screen.findByRole('heading', { name: 'Kebnekaise runt' })).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:4000/api/tours/7')
  })

  it('visar sträcka, antal mätpunkter och höjdmeter', async () => {
    stubFetch(
      tourDetailFixture({
        distance_m: 12500,
        logs: [
          logFixture({ id: 1, elevation_m: 100 }),
          logFixture({ id: 2, elevation_m: null }),
          logFixture({ id: 3, elevation_m: 150 }),
        ],
      }),
    )
    await renderDetail()

    expect(await screen.findByText(/12\.5 km · 3 mätpunkter · 50 höjdmeter/)).toBeInTheDocument()
  })

  it('visar varje mätpunkt med tid, höjd och puls', async () => {
    stubFetch(
      tourDetailFixture({ logs: [logFixture({ id: 1, elevation_m: 500, heart_rate: 132 })] }),
    )
    await renderDetail()

    expect(await screen.findByText('08:05:00 · 500 m · 132 slag/min')).toBeInTheDocument()
  })

  it('visar felmeddelandet när turen inte kan hämtas', async () => {
    stubFetch({ error: 'Hittades inte' }, 404)
    await renderDetail('999')

    expect(await screen.findByRole('alert')).toHaveTextContent('API svarade 404')
  })
})
