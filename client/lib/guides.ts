import type { Guide } from '@utpost/shared'

/** Sökningen matchar början av titeln, skiftlägesoberoende och utan blanksteg runt ordet. */
export const filterGuidesByTitle = (guides: Guide[], query: string): Guide[] => {
  const needle = query.trim().toLowerCase()
  if (needle === '') return guides

  return guides.filter((guide) => guide.title.toLowerCase().startsWith(needle))
}

/** Guidekorten visar bara ett kort utdrag av HTML-innehållet. */
export const excerpt = (html: string, maxLength = 180): string => html.slice(0, maxLength)
