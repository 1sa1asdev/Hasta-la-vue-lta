import { describe, expect, it } from 'vitest'
import { filterGuides } from './filterGuides.js'

const guides = [
  { id: 1, title: 'Vandring i Skåne' },
  { id: 2, title: 'Cykling i Dalarna' },
  { id: 3, title: 'Vandring i Lappland' },
]

describe('filterGuides', () => {
  it('visar alla guider när sökningen är tom', () => {
    expect(filterGuides(guides, '')).toEqual(guides)
  })

  it('hittar guider vars titel börjar med söktexten', () => {
    expect(filterGuides(guides, 'Vandring')).toHaveLength(2)
  })

  it('ignorerar stora och små bokstäver', () => {
    expect(filterGuides(guides, 'CYKLING')).toEqual([guides[1]])
  })

  it('ignorerar mellanslag runt söktexten', () => {
    expect(filterGuides(guides, '  vandring  ')).toHaveLength(2)
  })

  it('returnerar en tom lista när ingen guide matchar', () => {
    expect(filterGuides(guides, 'Simning')).toEqual([])
  })

  it('matchar inte ord som bara finns mitt i titeln', () => {
    expect(filterGuides(guides, 'Skåne')).toEqual([])
  })
})
