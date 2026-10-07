import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import type { Guide } from '@utpost/shared'
import GuidesView from './GuidesView.vue'
import { silenceConsole, stubFetch, stubFetchNetworkError, stubFetchPending } from '../test/fetch'

const makeGuide = (overrides: Partial<Guide> = {}): Guide => ({
  id: 1,
  slug: 'kebnekaise',
  title: 'Kebnekaise',
  region: 'Lappland',
  difficulty: 'medel',
  length_km: 12,
  body_html: '<p>Sveriges tak</p>',
  hero_image: null,
  published: true,
  author_id: 1,
  updated_at: '2026-01-01T00:00:00.000Z',
  ...overrides,
})

const guides = [
  makeGuide(),
  makeGuide({
    id: 2,
    slug: 'kungsleden',
    title: 'Kungsleden',
    region: 'Norrbotten',
    difficulty: 'lätt',
    length_km: 30,
  }),
  makeGuide({
    id: 3,
    slug: 'sarek',
    title: 'Sarek',
    region: 'Lappland',
    difficulty: 'svår',
    length_km: 45,
  }),
]

const renderView = () =>
  render(GuidesView, {
    global: {
      stubs: { RouterLink: { props: ['to'], template: '<a :href="to"><slot /></a>' } },
    },
  })

const searchBox = () => screen.getByPlaceholderText('Sök på namn eller landskap')

const visibleTitles = () => screen.queryAllByRole('link').map((link) => link.textContent)

describe('GuidesView', () => {
  describe('when data arrives', () => {
    it('shows a card per guide, linking to the guide page', async () => {
      stubFetch(guides)
      renderView()

      const link = await screen.findByRole('link', { name: 'Kebnekaise' })
      expect(link).toHaveAttribute('href', '/guider/kebnekaise')
      expect(visibleTitles()).toEqual(['Kebnekaise', 'Kungsleden', 'Sarek'])
    })

    it('shows region, difficulty and length on each card', async () => {
      stubFetch([makeGuide()])
      renderView()

      expect(await screen.findByText('Lappland · medel · 12 km')).toBeInTheDocument()
    })

    it('shows the start of the guide text', async () => {
      stubFetch([makeGuide()])
      renderView()

      expect(await screen.findByText('Sveriges tak')).toBeInTheDocument()
    })

    it('shows how many guides are visible out of the total', async () => {
      stubFetch(guides)
      renderView()

      expect(await screen.findByText('(3 / 3)')).toBeInTheDocument()
    })

    it('hides the loading text once the guides are shown', async () => {
      stubFetch(guides)
      renderView()

      await screen.findByRole('link', { name: 'Kebnekaise' })
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    })
  })

  describe('while loading', () => {
    it('shows a loading text and no guides', () => {
      stubFetchPending()
      renderView()

      expect(screen.getByText('Loading...')).toBeInTheDocument()
      expect(screen.queryAllByRole('link')).toHaveLength(0)
    })
  })

  describe('when there are no guides', () => {
    it('shows the search box but no cards, counter, loading text or error', async () => {
      stubFetch([])
      renderView()

      await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument())

      expect(searchBox()).toBeInTheDocument()
      expect(screen.queryAllByRole('link')).toHaveLength(0)
      expect(screen.queryByText(/\(\d+ \/ \d+\)/)).not.toBeInTheDocument()
      expect(screen.queryByText(/Error/)).not.toBeInTheDocument()
    })
  })

  describe('when the API fails', () => {
    it('shows the status code when the API answers with an error', async () => {
      silenceConsole()
      stubFetch({ error: 'Internal' }, 500)
      renderView()

      expect(await screen.findByText('Error: API svarade 500')).toBeInTheDocument()
      expect(screen.queryAllByRole('link')).toHaveLength(0)
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    })

    it('shows the network error when the API cannot be reached', async () => {
      silenceConsole()
      stubFetchNetworkError()
      renderView()

      expect(await screen.findByText('TypeError: Failed to fetch')).toBeInTheDocument()
      expect(screen.queryAllByRole('link')).toHaveLength(0)
    })
  })

  describe('when the user searches', () => {
    it('only shows guides whose name starts with the search text', async () => {
      stubFetch(guides)
      renderView()
      await screen.findByRole('link', { name: 'Kebnekaise' })

      await userEvent.type(searchBox(), 'Ku')

      expect(visibleTitles()).toEqual(['Kungsleden'])
      expect(screen.getByText('(1 / 3)')).toBeInTheDocument()
    })

    it('ignores upper and lower case', async () => {
      stubFetch(guides)
      renderView()
      await screen.findByRole('link', { name: 'Kebnekaise' })

      await userEvent.type(searchBox(), 'sAREK')

      expect(visibleTitles()).toEqual(['Sarek'])
    })

    it('ignores spaces around the search text', async () => {
      stubFetch(guides)
      renderView()
      await screen.findByRole('link', { name: 'Kebnekaise' })

      await userEvent.type(searchBox(), '  keb  ')

      expect(visibleTitles()).toEqual(['Kebnekaise'])
    })

    it('does not match text in the middle of a name', async () => {
      stubFetch(guides)
      renderView()
      await screen.findByRole('link', { name: 'Kebnekaise' })

      await userEvent.type(searchBox(), 'nekaise')

      expect(visibleTitles()).toEqual([])
    })

    it('shows no cards and no counter when nothing matches', async () => {
      stubFetch(guides)
      renderView()
      await screen.findByRole('link', { name: 'Kebnekaise' })

      await userEvent.type(searchBox(), 'Finns inte')

      expect(screen.queryAllByRole('link')).toHaveLength(0)
      expect(screen.queryByText(/\(\d+ \/ \d+\)/)).not.toBeInTheDocument()
    })

    it('shows all guides again when the search is cleared', async () => {
      stubFetch(guides)
      renderView()
      await screen.findByRole('link', { name: 'Kebnekaise' })

      await userEvent.type(searchBox(), 'Sarek')
      await userEvent.clear(searchBox())

      expect(visibleTitles()).toEqual(['Kebnekaise', 'Kungsleden', 'Sarek'])
      expect(screen.getByText('(3 / 3)')).toBeInTheDocument()
    })

    it.todo('finds guides by region, as the search placeholder promises')
  })
})
