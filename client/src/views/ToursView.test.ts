import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/vue'
import type { Guide, TourWithRelations, User } from '@utpost/shared'
import ToursView from './ToursView.vue'
import { silenceConsole, stubFetch, stubFetchNetworkError, stubFetchPending } from '../test/fetch'

const user: User = {
  id: 1,
  email: 'anna@test.com',
  display_name: 'Anna',
  role: 'user',
  created_at: '2026-01-01T00:00:00.000Z',
}

const guide: Guide = {
  id: 3,
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
}

const makeTour = (overrides: Partial<TourWithRelations> = {}): TourWithRelations => ({
  id: 7,
  user_id: user.id,
  guide_id: guide.id,
  title: 'Toppturen',
  started_at: '2026-06-01T08:00:00.000Z',
  distance_m: 12345,
  notes: null,
  user,
  guide,
  photos: [],
  logs: [],
  ...overrides,
})

const photo = (id: number) => ({
  id,
  tour_id: 7,
  filename: `${id}.jpg`,
  width: 800,
  height: 600,
  created_at: '2026-06-01T09:00:00.000Z',
})

const renderView = () =>
  render(ToursView, {
    global: {
      stubs: { RouterLink: { props: ['to'], template: '<a :href="to"><slot /></a>' } },
    },
  })

describe('ToursView', () => {
  describe('when data arrives', () => {
    it('shows a table row per tour', async () => {
      stubFetch([makeTour(), makeTour({ id: 8, title: 'Kvällsturen' })])
      renderView()

      expect(await screen.findByRole('table')).toBeInTheDocument()
      // 1 rubrikrad + 2 turer
      expect(screen.getAllByRole('row')).toHaveLength(3)
    })

    it('links each tour title to its detail page', async () => {
      stubFetch([makeTour()])
      renderView()

      const link = await screen.findByRole('link', { name: 'Toppturen' })
      expect(link).toHaveAttribute('href', '/turer/7')
    })

    it('shows who did the tour and which guide it followed', async () => {
      stubFetch([makeTour()])
      renderView()

      expect(await screen.findByRole('cell', { name: 'Anna' })).toBeInTheDocument()
      expect(screen.getByRole('cell', { name: 'Kebnekaise' })).toBeInTheDocument()
    })

    it('shows a dash when the tour has no guide', async () => {
      stubFetch([makeTour({ guide: null, guide_id: null })])
      renderView()

      expect(await screen.findByRole('cell', { name: '-' })).toBeInTheDocument()
    })

    it('shows the distance in km rounded to one decimal', async () => {
      stubFetch([makeTour({ distance_m: 12345 })])
      renderView()

      expect(await screen.findByRole('cell', { name: '12.3 km' })).toBeInTheDocument()
    })

    it('shows the number of photos', async () => {
      stubFetch([makeTour({ photos: [photo(1), photo(2), photo(3)] })])
      renderView()

      expect(await screen.findByRole('cell', { name: '3' })).toBeInTheDocument()
    })

    it('hides the loading text once the tours are shown', async () => {
      stubFetch([makeTour()])
      renderView()

      await screen.findByRole('table')
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    })
  })

  describe('while loading', () => {
    it('shows a loading text and no table', () => {
      stubFetchPending()
      renderView()

      expect(screen.getByText('Loading...')).toBeInTheDocument()
      expect(screen.queryByRole('table')).not.toBeInTheDocument()
    })
  })

  describe('when there are no tours', () => {
    it('shows the heading but no table, loading text or error', async () => {
      stubFetch([])
      renderView()

      await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument())

      expect(screen.getByRole('heading', { name: 'Turer' })).toBeInTheDocument()
      expect(screen.queryByRole('table')).not.toBeInTheDocument()
      expect(screen.queryByText(/Error/)).not.toBeInTheDocument()
    })
  })

  describe('when the API fails', () => {
    it('shows the status code when the API answers with an error', async () => {
      silenceConsole()
      stubFetch({ error: 'Internal' }, 500)
      renderView()

      expect(await screen.findByText('Error: API svarade 500')).toBeInTheDocument()
      expect(screen.queryByRole('table')).not.toBeInTheDocument()
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    })

    it('shows the network error when the API cannot be reached', async () => {
      silenceConsole()
      stubFetchNetworkError()
      renderView()

      expect(await screen.findByText('TypeError: Failed to fetch')).toBeInTheDocument()
      expect(screen.queryByRole('table')).not.toBeInTheDocument()
    })
  })
})
