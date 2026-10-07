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

  it('filters the loaded guides through the search field', async () => {
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
          {
            id: 2,
            slug: 'sarek',
            title: 'Sarek',
            region: 'Lappland',
            difficulty: 'Svår',
            length_km: 8,
            body_html: 'Nationalpark',
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
    await wrapper.find('input.search-input').setValue('keb')

    expect(wrapper.text()).toContain('Kebnekaise')
    expect(wrapper.text()).not.toContain('Sarek')
    expect(wrapper.text()).toContain('(1 / 2)')

    vi.unstubAllGlobals()
  })
})
