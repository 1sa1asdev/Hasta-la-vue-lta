import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/vue'
import GuideCard from './GuideCard.vue'
import { RouterLinkStub } from '../test/routerLink'
import { guideFixture } from '../test/fixtures'

const renderCard = (guide) =>
  render(GuideCard, { props: { guide }, global: { stubs: { RouterLink: RouterLinkStub } } })

describe('GuideCard', () => {
  it('länkar till guidens slug', () => {
    renderCard(guideFixture({ slug: 'kebnekaise', title: 'Kebnekaise' }))

    expect(screen.getByRole('link', { name: 'Kebnekaise' })).toHaveAttribute(
      'href',
      '/guider/kebnekaise',
    )
  })

  it('visar landskap, svårighetsgrad och längd', () => {
    renderCard(guideFixture({ region: 'Jämtland', difficulty: 'svår', length_km: 19 }))

    expect(screen.getByText('Jämtland · svår · 19 km')).toBeInTheDocument()
  })

  it('kortar ned lång brödtext till ett utdrag', () => {
    renderCard(guideFixture({ body_html: 'x'.repeat(300) }))

    expect(screen.getByText('x'.repeat(180))).toBeInTheDocument()
    expect(screen.queryByText('x'.repeat(300))).not.toBeInTheDocument()
  })
})
