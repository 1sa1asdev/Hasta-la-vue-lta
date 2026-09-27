import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import GuidesView from './GuidesView.vue'

describe('GuidesView', () => {
  it('renders the guides from the API', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: vi.fn().mockResolvedValue([
          {
            id: 1,
            slug: 'kebnekaise',
            title: 'Kebnekaise',
            region: 'Lappland',
            difficulty: 'Medel',
            length_km: 12,
            body_html: 'Sveriges tak',
          },
        ]),
      }),
    )

    const wrapper = mount(GuidesView, {
      global: {
        stubs: {
          RouterLink: { template: '<a><slot /></a>' },
        },
      },
    })

    await flushPromises()

    expect(wrapper.text()).toContain('Kebnekaise')
    expect(wrapper.text()).toContain('(1 / 1)')

    vi.unstubAllGlobals()
  })
})
