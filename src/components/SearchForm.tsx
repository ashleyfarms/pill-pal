import { useState } from 'react'
import type { FormEvent } from 'react'

type Props = {
  initial?: string
  loading?: boolean
  onSearch: (query: string) => void
}

export function SearchForm({ initial = '', loading, onSearch }: Props) {
  const [value, setValue] = useState(initial)

  function submit(e: FormEvent) {
    e.preventDefault()
    const q = value.trim()
    if (!q || loading) return
    onSearch(q)
  }

  return (
    <form className="search-form" onSubmit={submit}>
      <label htmlFor="med-query" className="search-label">
        Medication name
      </label>
      <div className="search-row">
        <input
          id="med-query"
          name="q"
          type="search"
          enterKeyHint="search"
          autoComplete="off"
          autoCapitalize="words"
          spellCheck={false}
          placeholder="e.g. ibuprofen, Lipitor, metformin"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={loading}
        />
        <button type="submit" disabled={loading || !value.trim()}>
          {loading ? 'Looking…' : 'Look up'}
        </button>
      </div>
      <p className="search-hint">Brand or generic — powered by RxNorm + openFDA.</p>
    </form>
  )
}
