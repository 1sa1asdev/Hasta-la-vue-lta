import type { Guide } from '@utpost/shared'

/** The search matches the start of the title, case-insensitively and trimmed. */
export const filterGuidesByTitle = (guides: Guide[], query: string): Guide[] => {
  const needle = query.trim().toLowerCase()
  if (needle === '') return guides

  return guides.filter((guide) => guide.title.toLowerCase().startsWith(needle))
}

/** The guide cards only show a short excerpt of the HTML body. */
export const excerpt = (html: string, maxLength = 180): string => html.slice(0, maxLength)
