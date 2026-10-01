export function filterGuides(guides, search) {
  const query = search.trim().toLowerCase()

  if (query === '') {
    return guides
  }

  return guides.filter((guide) => guide.title.toLowerCase().startsWith(query))
}
