import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/vue'
import { ref } from 'vue'
import HomeView from './HomeView.vue'

const urqlMocks = vi.hoisted(() => ({
  useQuery: vi.fn(),
}))

vi.mock('@urql/vue', () => ({
  useQuery: urqlMocks.useQuery,
}))

const guides = [
  {
    slug: 'kebnekaise',
    title: 'Kebnekaise',
    region: 'Lappland',
    difficulty: 'medel',
    lengthKm: 12,
  },
  { slug: 'sarek', title: 'Sarek', region: 'Lappland', difficulty: 'svår', lengthKm: 45 },
]

describe('HomeView with mocked useQuery', () => {
  beforeEach(() => {
    urqlMocks.useQuery.mockReset()
  })

  it('passes the generated Home document to useQuery', async () => {
    urqlMocks.useQuery.mockReturnValue({
      data: ref({
        guides,
        tours: [{ id: '7', title: 'Toppturen', distanceM: 12345 }],
      }),
      fetching: ref(false),
      error: ref(null),
    })

    render(HomeView, {
      global: {
        stubs: { RouterLink: { props: ['to'], template: '<a :href="to"><slot /></a>' } },
      },
    })

    expect(await screen.findByText('2 guider i 1 landskap.')).toBeInTheDocument()
    expect(urqlMocks.useQuery).toHaveBeenCalledOnce()

    const args = urqlMocks.useQuery.mock.calls[0][0]
    expect(args.query.definitions[0].name.value).toBe('Home')
    expect(args.variables).toBeUndefined()
  })
})
