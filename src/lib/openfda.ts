import type { MedLabel, SideEffectGroup } from './types'

const OPENFDA = 'https://api.fda.gov/drug/label.json'

type OpenFdaResult = {
  set_id?: string
  id?: string
  indications_and_usage?: string[]
  purpose?: string[]
  adverse_reactions?: string[]
  boxed_warning?: string[]
  warnings?: string[]
  warnings_and_cautions?: string[]
  when_using?: string[]
  stop_use?: string[]
  ask_doctor?: string[]
  ask_doctor_or_pharmacist?: string[]
  openfda?: {
    brand_name?: string[]
    generic_name?: string[]
    manufacturer_name?: string[]
    product_type?: string[]
    spl_set_id?: string[]
  }
}

function firstText(arr?: string[]): string {
  if (!arr || !arr.length) return ''
  return arr.join('\n\n').trim()
}

function stripHtmlish(text: string): string {
  return text
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20)
}

function extractSideEffects(result: OpenFdaResult): SideEffectGroup {
  const boxed = firstText(result.boxed_warning)
  const adverse = firstText(result.adverse_reactions)
  const warnings = firstText(
    result.warnings_and_cautions?.length
      ? result.warnings_and_cautions
      : result.warnings,
  )
  const whenUsing = firstText(result.when_using)
  const stopUse = firstText(result.stop_use)
  const askDoctor = firstText(
    result.ask_doctor?.length
      ? result.ask_doctor
      : result.ask_doctor_or_pharmacist,
  )

  const serious: string[] = []
  const common: string[] = []

  if (boxed) {
    const cleaned = stripHtmlish(boxed)
    serious.push(...splitSentences(cleaned).slice(0, 4))
    if (!serious.length) serious.push(cleaned.slice(0, 280) + (cleaned.length > 280 ? '…' : ''))
  }

  // Heuristic: sentences mentioning serious/rare/warning → serious; rest → common from adverse
  const adverseClean = stripHtmlish(adverse)
  if (adverseClean) {
    const sentences = splitSentences(adverseClean)
    for (const s of sentences.slice(0, 12)) {
      const lower = s.toLowerCase()
      const isSerious =
        /serious|severe|fatal|death|hospital|emergency|anaphyla|life-threatening|boxed|warning|rare but/.test(
          lower,
        )
      if (isSerious) serious.push(s)
      else common.push(s)
    }
  }

  // OTC Drug Facts often put effects under when_using / warnings instead of adverse_reactions
  const whenClean = stripHtmlish(whenUsing)
  if (whenClean) {
    common.push(...splitSentences(whenClean).slice(0, 4))
    if (!common.length) common.push(whenClean.slice(0, 280) + (whenClean.length > 280 ? '…' : ''))
  }

  if (!common.length && adverseClean) {
    common.push(adverseClean.slice(0, 320) + (adverseClean.length > 320 ? '…' : ''))
  }

  const stopClean = stripHtmlish(stopUse)
  if (stopClean) {
    serious.push(...splitSentences(stopClean).slice(0, 3))
  }
  const askClean = stripHtmlish(askDoctor)
  if (askClean && serious.length < 3) {
    serious.push(...splitSentences(askClean).slice(0, 2))
  }

  if (!serious.length && warnings) {
    const cleaned = stripHtmlish(warnings)
    serious.push(...splitSentences(cleaned).slice(0, 3))
  }

  return {
    common: uniqKeep(common).slice(0, 6),
    serious: uniqKeep(serious).slice(0, 6),
    rawAdverse: adverseClean || whenClean || undefined,
    rawBoxed: boxed ? stripHtmlish(boxed) : undefined,
    rawWarnings: warnings ? stripHtmlish(warnings) : undefined,
  }
}

function uniqKeep(items: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const item of items) {
    const key = item.toLowerCase().slice(0, 80)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(item)
  }
  return out
}

async function queryLabel(search: string): Promise<OpenFdaResult | null> {
  const url = `${OPENFDA}?search=${encodeURIComponent(search)}&limit=1`
  try {
    const res = await fetch(url)
    if (res.status === 404) return null
    if (!res.ok) return null
    const data = (await res.json()) as { results?: OpenFdaResult[] }
    return data.results?.[0] ?? null
  } catch {
    return null
  }
}

function escapeTerm(term: string): string {
  return term.replace(/"/g, '').trim()
}

export async function fetchLabel(opts: {
  brandNames: string[]
  genericNames: string[]
  fallbackQuery: string
}): Promise<MedLabel | null> {
  const tries: string[] = []
  for (const b of opts.brandNames) {
    tries.push(`openfda.brand_name.exact:"${escapeTerm(b)}"`)
    tries.push(`openfda.brand_name:"${escapeTerm(b)}"`)
  }
  for (const g of opts.genericNames) {
    tries.push(`openfda.generic_name.exact:"${escapeTerm(g)}"`)
    tries.push(`openfda.generic_name:"${escapeTerm(g)}"`)
  }
  const q = escapeTerm(opts.fallbackQuery)
  if (q) {
    tries.push(`openfda.brand_name:"${q}"`)
    tries.push(`openfda.generic_name:"${q}"`)
    tries.push(`"${q}"`)
  }

  let result: OpenFdaResult | null = null
  for (const search of tries) {
    result = await queryLabel(search)
    if (result) break
  }
  if (!result) return null

  const setId = result.openfda?.spl_set_id?.[0] || result.set_id
  const indications =
    stripHtmlish(firstText(result.indications_and_usage)) ||
    stripHtmlish(firstText(result.purpose)) ||
    ''
  const purpose = stripHtmlish(firstText(result.purpose)) || undefined
  const manufacturer = result.openfda?.manufacturer_name?.[0]
  const productType = result.openfda?.product_type?.[0]

  const sources: { name: string; url: string }[] = [
    {
      name: 'openFDA Drug Labeling',
      url: 'https://open.fda.gov/apis/drug/label/',
    },
  ]
  if (setId) {
    sources.push({
      name: 'DailyMed',
      url: `https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=${encodeURIComponent(setId)}`,
    })
  }
  sources.push({
    name: 'RxNorm (NLM)',
    url: 'https://www.nlm.nih.gov/research/umls/rxnorm/',
  })

  return {
    setId,
    indications: indications || 'No indication text found in the openFDA label for this product.',
    purpose,
    sideEffects: extractSideEffects(result),
    manufacturer,
    productType,
    sources,
  }
}
