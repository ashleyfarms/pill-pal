export type MedIdentity = {
  query: string
  displayName: string
  brandNames: string[]
  genericNames: string[]
  rxcui?: string
  dailyMedUrl?: string
}

export type SideEffectGroup = {
  common: string[]
  serious: string[]
  rawAdverse?: string
  rawBoxed?: string
  rawWarnings?: string
}

export type MedLabel = {
  setId?: string
  indications: string
  purpose?: string
  sideEffects: SideEffectGroup
  manufacturer?: string
  productType?: string
  sources: { name: string; url: string }[]
}

export type NewsItem = {
  title: string
  link: string
  source: string
  published?: string
}

export type SearchResult = {
  identity: MedIdentity
  label: MedLabel | null
  news: NewsItem[]
  suggestions?: string[]
}
