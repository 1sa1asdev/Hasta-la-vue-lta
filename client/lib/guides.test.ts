import { describe, it, expect } from 'vitest'
import type { Guide } from '@utpost/shared'
import { excerpt, filterGuidesByTitle } from './guides'

const guide = (id: number, title: string): Guide => ({
  id,
  slug: title.toLowerCase(),
  title,
  region: 'Lappland',
  difficulty: 'medel',
  length_km: 12,
  body_html: '<p>Beskrivning</p>',
  hero_image: null,
  published: true,
  author_id: null,
  updated_at: '2026-09-01T08:00:00.000Z',
})

const guides = [guide(1, 'Kebnekaise'), guide(2, 'Sarek'), guide(3, 'Stora Sjöfallet')]

describe('filterGuidesByTitle', () => {
  it('visar alla guider när sökordet är tomt', () => {
    expect(filterGuidesByTitle(guides, '')).toHaveLength(3)
  })

  it('ignorerar blanksteg runt sökordet', () => {
    expect(filterGuidesByTitle(guides, '  sarek ')).toEqual([guides[1]])
  })

  it('matchar oberoende av stora och små bokstäver', () => {
    expect(filterGuidesByTitle(guides, 'kEbNe')).toEqual([guides[0]])
  })

  it('ger en tom lista när inget matchar', () => {
    expect(filterGuidesByTitle(guides, 'blåfjällen')).toEqual([])
  })
})

describe('excerpt', () => {
  it('kortar ned lång text till 180 tecken', () => {
    expect(excerpt('x'.repeat(300))).toBe('x'.repeat(180))
  })

  it('lämnar kort text oförändrad', () => {
    expect(excerpt('<p>Kort text</p>')).toBe('<p>Kort text</p>')
  })
})
