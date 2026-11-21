import { request } from './api'

export async function loadEventPhotoPage(eventId, page = 1, includeHidden = false) {
  const query = new URLSearchParams({ page: String(page) })
  if (includeHidden) query.set('include_hidden', 'true')
  const result = await request(`/events/${eventId}/photos/?${query}`)
  const results = Array.isArray(result) ? result : result?.results || []

  return {
    results,
    count: result?.count ?? results.length,
    totalPages: result?.total_pages || 1,
    currentPage: result?.current_page || page,
    contributors: result?.contributors || [],
  }
}

export async function loadEventPhotos(eventId, includeHidden = false) {
  const firstPage = await loadEventPhotoPage(eventId, 1, includeHidden)
  if (firstPage.totalPages <= 1) return firstPage.results

  const otherPages = []
  for (let firstPageNumber = 2; firstPageNumber <= firstPage.totalPages; firstPageNumber += 4) {
    const pageNumbers = Array.from(
      { length: Math.min(4, firstPage.totalPages - firstPageNumber + 1) },
      (_, index) => firstPageNumber + index,
    )
    const batch = await Promise.all(
      pageNumbers.map((pageNumber) => loadEventPhotoPage(eventId, pageNumber, includeHidden)),
    )
    otherPages.push(...batch)
  }

  return [...firstPage.results, ...otherPages.flatMap((page) => page.results)]
}
