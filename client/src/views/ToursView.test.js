import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/vue'
import ToursView from './ToursView.vue'
import { RouterLinkStub } from '../test/routerLink'
import { guideFixture, stubFetch, stubPendingFetch, tourFixture } from '../test/fixtures'

const renderView = () => render(ToursView, { global: { stubs: { RouterLink: RouterLinkStub } } })
const rowFor = (title) => screen.findByRole('row', { name: new RegExp(title) })

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('ToursView', () => {
  it('visar en rad per tur med avsändare, sträcka och antal bilder', async () => {
    stubFetch([
      tourFixture({
        id: 7,
        title: 'Kebnekaise runt',
        distance_m: 12500,
        photos: [{ id: 1 }, { id: 2 }],
      }),
    ])
    renderView()

    const row = await rowFor('Kebnekaise runt')
    expect(within(row).getByRole('link', { name: 'Kebnekaise runt' })).toHaveAttribute(
      'href',
      '/turer/7',
    )
    expect(within(row).getByText('Anna')).toBeInTheDocument()
    expect(within(row).getByText('12.5 km')).toBeInTheDocument()
    expect(within(row).getByText('2')).toBeInTheDocument()
  })

  it('visar "-" i guidekolumnen när turen saknar guide', async () => {
    stubFetch([tourFixture({ guide: null })])
    renderView()

    const row = await rowFor('Kebnekaise runt')
    expect(within(row).getByText('-')).toBeInTheDocument()
  })

  it('visar guidens titel i guidekolumnen när turen har en guide', async () => {
    stubFetch([tourFixture({ guide: guideFixture({ id: 3, title: 'Kebnekaise' }) })])
    renderView()

    const row = await rowFor('Kebnekaise runt')
    expect(within(row).getByText('Kebnekaise')).toBeInTheDocument()
  })

  it('visar "Loading..." tills svaret har kommit', async () => {
    const pending = stubPendingFetch()
    renderView()

    expect(screen.getByText('Loading...')).toBeInTheDocument()

    pending.respond([])
    await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument())
  })

  it('visar felmeddelandet när turerna inte kan hämtas', async () => {
    stubFetch({ error: 'Serverfel' }, 500)
    renderView()

    expect(await screen.findByText(/API svarade 500/)).toBeInTheDocument()
  })
})
