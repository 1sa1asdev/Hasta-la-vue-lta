import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/vue'
import GuidesView from './GuidesView.vue'
import { RouterLinkStub } from '../test/routerLink'
import { guideFixture, stubFetch } from '../test/fixtures'

const twoGuides = () => [
  guideFixture({ id: 1, slug: 'kebnekaise', title: 'Kebnekaise' }),
  guideFixture({ id: 2, slug: 'sarek', title: 'Sarek' }),
]

const renderView = () => render(GuidesView, { global: { stubs: { RouterLink: RouterLinkStub } } })
const searchField = () => screen.getByPlaceholderText('Sök på namn eller landskap')

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('GuidesView', () => {
  it('visar guiderna från API:et med länk och antal', async () => {
    stubFetch(twoGuides())
    renderView()

    expect(await screen.findByRole('link', { name: 'Kebnekaise' })).toHaveAttribute(
      'href',
      '/guider/kebnekaise',
    )
    expect(screen.getByRole('link', { name: 'Sarek' })).toBeInTheDocument()
    expect(screen.getByText('(2 / 2)')).toBeInTheDocument()
  })

  it('filtrerar listan medan man skriver i sökfältet', async () => {
    stubFetch(twoGuides())
    renderView()
    await screen.findByText('(2 / 2)')

    await fireEvent.update(searchField(), 'keb')

    expect(screen.getByRole('link', { name: 'Kebnekaise' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Sarek' })).not.toBeInTheDocument()
    expect(screen.getByText('(1 / 2)')).toBeInTheDocument()
  })

  it('visar hela listan igen när sökfältet töms', async () => {
    stubFetch(twoGuides())
    renderView()
    await screen.findByText('(2 / 2)')

    await fireEvent.update(searchField(), 'keb')
    await fireEvent.update(searchField(), '')

    expect(screen.getByRole('link', { name: 'Sarek' })).toBeInTheDocument()
    expect(screen.getByText('(2 / 2)')).toBeInTheDocument()
  })

  it('visar felmeddelandet när guiderna inte kan hämtas', async () => {
    stubFetch({ error: 'Serverfel' }, 500)
    renderView()

    expect(await screen.findByText(/API svarade 500/)).toBeInTheDocument()
  })
})
