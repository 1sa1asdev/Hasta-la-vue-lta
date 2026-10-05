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
  it('shows the guides from the API with a link and a count', async () => {
    stubFetch(twoGuides())
    renderView()

    expect(await screen.findByRole('link', { name: 'Kebnekaise' })).toHaveAttribute(
      'href',
      '/guider/kebnekaise',
    )
    expect(screen.getByRole('link', { name: 'Sarek' })).toBeInTheDocument()
    expect(screen.getByText('(2 / 2)')).toBeInTheDocument()
  })

  it('filters the list while typing in the search field', async () => {
    stubFetch(twoGuides())
    renderView()
    await screen.findByText('(2 / 2)')

    await fireEvent.update(searchField(), 'keb')

    expect(screen.getByRole('link', { name: 'Kebnekaise' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Sarek' })).not.toBeInTheDocument()
    expect(screen.getByText('(1 / 2)')).toBeInTheDocument()
  })

  it('shows the full list again when the search field is cleared', async () => {
    stubFetch(twoGuides())
    renderView()
    await screen.findByText('(2 / 2)')

    await fireEvent.update(searchField(), 'keb')
    await fireEvent.update(searchField(), '')

    expect(screen.getByRole('link', { name: 'Sarek' })).toBeInTheDocument()
    expect(screen.getByText('(2 / 2)')).toBeInTheDocument()
  })

  it('shows the error message when the guides cannot be fetched', async () => {
    stubFetch({ error: 'Server error' }, 500)
    renderView()

    expect(await screen.findByText(/API svarade 500/)).toBeInTheDocument()
  })
})
