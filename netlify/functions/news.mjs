/**
 * Google News RSS → JSON proxy for Med Pal.
 * GET /.netlify/functions/news?q=ibuprofen
 */

function parseItems(xml) {
  const items = []
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi
  let match
  while ((match = itemRegex.exec(xml)) !== null && items.length < 8) {
    const block = match[1]
    const title = decode(
      (block.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/i) ||
        block.match(/<title>([\s\S]*?)<\/title>/i) ||
        [])[1] || '',
    )
    const link = decode(
      (block.match(/<link>([\s\S]*?)<\/link>/i) || [])[1] || '',
    ).trim()
    const source = decode(
      (block.match(/<source[^>]*>([\s\S]*?)<\/source>/i) || [])[1] || 'Google News',
    )
    const published = decode(
      (block.match(/<pubDate>([\s\S]*?)<\/pubDate>/i) || [])[1] || '',
    )
    if (title && link) {
      items.push({ title, link, source, published: published || undefined })
    }
  }
  return items
}

function decode(text) {
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

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' }
  }

  const q = (event.queryStringParameters?.q || '').trim()
  if (!q) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Missing q parameter', items: [] }),
    }
  }

  const rssUrl =
    'https://news.google.com/rss/search?q=' +
    encodeURIComponent(q + ' medication OR drug OR medicine') +
    '&hl=en-US&gl=US&ceid=US:en'

  try {
    const res = await fetch(rssUrl, {
      headers: {
        'User-Agent': 'MedPal/1.0 (educational; +https://help-pal.app)',
        Accept: 'application/rss+xml, application/xml, text/xml, */*',
      },
    })
    if (!res.ok) {
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({
          error: `Upstream news fetch failed (${res.status})`,
          items: [],
        }),
      }
    }
    const xml = await res.text()
    const items = parseItems(xml)
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ query: q, items }),
    }
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: err instanceof Error ? err.message : 'News proxy error',
        items: [],
      }),
    }
  }
}
