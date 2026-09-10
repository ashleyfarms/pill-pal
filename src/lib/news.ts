import type { NewsItem } from './types'

function decode(text: string): string {
  return String(text)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .trim()
}

function parseRssItems(xml: string): NewsItem[] {
  const items: NewsItem[] = []
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi
  let match: RegExpExecArray | null
  while ((match = itemRegex.exec(xml)) !== null && items.length < 8) {
    const block = match[1]
    const title = decode(
      (block.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/i) ||
        block.match(/<title>([\s\S]*?)<\/title>/i) ||
        [])[1] || '',
    )
    const link = decode((block.match(/<link>([\s\S]*?)<\/link>/i) || [])[1] || '').trim()
    const source = decode(
      (block.match(/<source[^>]*>([\s\S]*?)<\/source>/i) || [])[1] || 'Google News',
    )
    const published = decode((block.match(/<pubDate>([\s\S]*?)<\/pubDate>/i) || [])[1] || '')
    if (title && link) {
      items.push({ title, link, source, published: published || undefined })
    }
  }
  return items
}

async function fetchNewsViaCorsProxy(medication: string): Promise<NewsItem[]> {
  const rssUrl =
    'https://news.google.com/rss/search?q=' +
    encodeURIComponent(medication + ' medication OR drug OR medicine') +
    '&hl=en-US&gl=US&ceid=US:en'

  // Public CORS proxy for static hosts (GitHub Pages) without a Netlify function
  const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(rssUrl)}`
  const res = await fetch(proxyUrl)
  if (!res.ok) return []
  const xml = await res.text()
  return parseRssItems(xml)
}

export async function fetchNews(medication: string): Promise<NewsItem[]> {
  const q = medication.trim()
  if (!q) return []

  // Prefer same-origin Netlify/API proxy when available
  const base = import.meta.env.BASE_URL || '/'
  const endpoints = [
    `/api/news?q=${encodeURIComponent(q)}`,
    `${base}api/news?q=${encodeURIComponent(q)}`.replace(/\/{2,}/g, '/'),
  ]

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint)
      if (!res.ok) continue
      const data = (await res.json()) as { items?: NewsItem[] }
      if (data.items && data.items.length) return data.items
    } catch {
      // try next / CORS fallback
    }
  }

  try {
    return await fetchNewsViaCorsProxy(q)
  } catch {
    return []
  }
}
