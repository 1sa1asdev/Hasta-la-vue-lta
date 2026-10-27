import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/vue'
import { ref } from 'vue'
import ToursView from './ToursView.vue'

const urqlMocks = vi.hoisted(() => ({
  useQuery: vi.fn(),
}))

vi.mock('@urql/vue', () => ({
  useQuery: urqlMocks.useQuery,
}))

describe('ToursView with mocked useQuery', () => {
  beforeEach(() => {
    urqlMocks.useQuery.mockReset()
  })

  it('passes the generated Tours document and limit to useQuery', async () => {
    urqlMocks.useQuery.mockReturnValue({
      data: ref({
        tours: [
          {
            id: '7',
            title: 'Toppturen',
            distanceM: 12345,
            photoCount: 3,
            user: { displayName: 'Anna' },
            guide: null,
          },
        ],
      }),
      fetching: ref(false),
      error: ref(null),
    })

    render(ToursView, {
      global: {
        stubs: { RouterLink: { props: ['to'], template: '<a :href="to"><slot /></a>' } },
      },
    })

    expect(await screen.findByRole('table')).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: 'Anna' })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: '3' })).toBeInTheDocument()
    expect(urqlMocks.useQuery).toHaveBeenCalledOnce()

    const args = urqlMocks.useQuery.mock.calls[0][0]
    expect(args.query.definitions[0].name.value).toBe('Tours')
    expect(args.variables).toEqual({ limit: 50 })
  })
})
