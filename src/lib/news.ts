import type { NewsItem } from './types'

export async function fetchNews(medication: string): Promise<NewsItem[]> {
  const q = medication.trim()
  if (!q) return []

  const endpoint = `/api/news?q=${encodeURIComponent(q)}`
  try {
    const res = await fetch(endpoint)
    if (!res.ok) {
      // Dev fallback: try client-side RSS via allorigins-style is blocked; return empty
      return []
    }
    const data = (await res.json()) as { items?: NewsItem[] }
    return data.items ?? []
  } catch {
    return []
  }
}
