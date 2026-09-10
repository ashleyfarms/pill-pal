import { fetchLabel } from './openfda'
import { fetchNews } from './news'
import { resolveMedication } from './rxnorm'
import type { SearchResult } from './types'

export async function searchMedication(query: string): Promise<SearchResult> {
  const q = query.trim()
  const identityBase = await resolveMedication(q)

  const brandNames = identityBase?.brandNames ?? []
  const genericNames = identityBase?.genericNames ?? []
  const displayName = identityBase?.displayName ?? q
  const rxcui = identityBase?.rxcui
  const suggestions = identityBase?.suggestions ?? []

  const searchNames = [
    ...brandNames,
    ...genericNames,
    displayName,
    q,
  ].filter(Boolean)

  const [label, news] = await Promise.all([
    fetchLabel({
      brandNames: brandNames.length ? brandNames : [q],
      genericNames,
      fallbackQuery: displayName || q,
    }),
    fetchNews(searchNames[0] || q),
  ])

  const setId = label?.setId
  const dailyMedUrl = setId
    ? `https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=${encodeURIComponent(setId)}`
    : undefined

  return {
    identity: {
      query: q,
      displayName,
      brandNames,
      genericNames,
      rxcui,
      dailyMedUrl,
    },
    label,
    news,
    suggestions,
  }
}
