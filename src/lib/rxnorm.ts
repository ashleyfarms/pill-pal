const RXNORM = 'https://rxnav.nlm.nih.gov/REST'

type ApproxCandidate = {
  rxcui?: string
  name?: string
  score?: string
  rank?: string
}

type ConceptProps = {
  rxcui?: string
  name?: string
  synonym?: string
  tty?: string
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

function uniq(items: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const item of items) {
    const key = item.trim().toLowerCase()
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(item.trim())
  }
  return out
}

export async function resolveMedication(query: string): Promise<{
  displayName: string
  brandNames: string[]
  genericNames: string[]
  rxcui?: string
  suggestions: string[]
} | null> {
  const term = query.trim()
  if (!term) return null

  const approx = await fetchJson<{
    approximateGroup?: { candidate?: ApproxCandidate | ApproxCandidate[] }
  }>(
    `${RXNORM}/approximateTerm.json?term=${encodeURIComponent(term)}&maxEntries=12&option=1`,
  )

  const candidatesRaw = approx?.approximateGroup?.candidate
  const candidates = Array.isArray(candidatesRaw)
    ? candidatesRaw
    : candidatesRaw
      ? [candidatesRaw]
      : []

  const drugs = await fetchJson<{
    drugGroup?: {
      conceptGroup?: Array<{
        tty?: string
        conceptProperties?: ConceptProps | ConceptProps[]
      }>
    }
  }>(`${RXNORM}/drugs.json?name=${encodeURIComponent(term)}`)

  const drugConcepts: ConceptProps[] = []
  for (const group of drugs?.drugGroup?.conceptGroup ?? []) {
    const props = group.conceptProperties
    if (!props) continue
    if (Array.isArray(props)) drugConcepts.push(...props)
    else drugConcepts.push(props)
  }

  let rxcui =
    candidates.find((c) => c.rxcui)?.rxcui ||
    drugConcepts.find((c) => c.rxcui)?.rxcui

  let props: ConceptProps | null = null
  if (rxcui) {
    const propRes = await fetchJson<{ properties?: ConceptProps }>(
      `${RXNORM}/rxcui/${rxcui}/properties.json`,
    )
    props = propRes?.properties ?? null
  }

  // Prefer ingredient / brand related names
  let brandNames: string[] = []
  let genericNames: string[] = []
  if (rxcui) {
    const related = await fetchJson<{
      relatedGroup?: {
        conceptGroup?: Array<{
          tty?: string
          conceptProperties?: ConceptProps | ConceptProps[]
        }>
      }
    }>(`${RXNORM}/rxcui/${rxcui}/related.json?tty=BN+IN+PIN+MIN+SBD+SCD`)

    for (const group of related?.relatedGroup?.conceptGroup ?? []) {
      const list = group.conceptProperties
      const items = Array.isArray(list) ? list : list ? [list] : []
      for (const item of items) {
        if (!item.name) continue
        if (group.tty === 'BN') brandNames.push(item.name)
        if (group.tty === 'IN' || group.tty === 'PIN' || group.tty === 'MIN') {
          genericNames.push(item.name)
        }
      }
    }
  }

  // Also harvest from drug concepts
  for (const c of drugConcepts) {
    if (!c.name) continue
    if (c.tty === 'BN' || /\[[^\]]+\]$/.test(c.name)) {
      const m = c.name.match(/\[([^\]]+)\]$/)
      if (m) brandNames.push(m[1])
      else if (c.tty === 'BN') brandNames.push(c.name)
    }
    if (c.tty === 'IN' || c.tty === 'PIN') genericNames.push(c.name)
  }

  const suggestions = uniq([
    ...candidates.map((c) => c.name).filter(Boolean) as string[],
    ...drugConcepts.map((c) => c.name).filter(Boolean) as string[],
  ]).slice(0, 8)

  brandNames = uniq(brandNames).slice(0, 8)
  genericNames = uniq(genericNames).slice(0, 8)

  const displayName =
    props?.name ||
    brandNames[0] ||
    genericNames[0] ||
    candidates[0]?.name ||
    drugConcepts[0]?.name ||
    term

  if (!rxcui && suggestions.length === 0 && drugConcepts.length === 0) {
    // Still try openFDA with raw query — return soft identity
    return {
      displayName: term,
      brandNames: [],
      genericNames: [],
      suggestions: [],
    }
  }

  return {
    displayName,
    brandNames,
    genericNames,
    rxcui,
    suggestions,
  }
}
