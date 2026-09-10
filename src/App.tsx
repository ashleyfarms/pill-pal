import { useCallback, useState } from 'react'
import { Disclaimer } from './components/Disclaimer'
import { Results } from './components/Results'
import { SearchForm } from './components/SearchForm'
import { searchMedication } from './lib/search'
import type { SearchResult } from './lib/types'
import './App.css'

export default function App() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<SearchResult | null>(null)
  const [lastQuery, setLastQuery] = useState('')

  const runSearch = useCallback(async (query: string) => {
    setLoading(true)
    setError(null)
    setLastQuery(query)
    try {
      const data = await searchMedication(query)
      setResult(data)
    } catch (err) {
      setResult(null)
      setError(err instanceof Error ? err.message : 'Something went wrong looking that up.')
    } finally {
      setLoading(false)
    }
  }, [])

  return (
    <div className="app">
      <div className="top-bar" aria-hidden="true" />
      <header className="site-header">
        <div className="brand">
          <span className="logo-mark" aria-hidden="true">
            +
          </span>
          <div>
            <p className="brand-kicker">Help-Pal</p>
            <h1>Med Pal</h1>
          </div>
        </div>
        <p className="tagline">
          Type a medication. See what it’s for, known side effects, and related
          headlines — with sources.
        </p>
      </header>

      <main>
        <SearchForm initial={lastQuery} loading={loading} onSearch={runSearch} />

        {loading && (
          <div className="panel loading" aria-live="polite">
            <div className="spinner" />
            <p>Checking RxNorm &amp; openFDA labels…</p>
          </div>
        )}

        {error && (
          <div className="panel error" role="alert">
            <h2>Lookup hiccup</h2>
            <p>{error}</p>
            <button type="button" onClick={() => lastQuery && runSearch(lastQuery)}>
              Try again
            </button>
          </div>
        )}

        {!loading && !error && result && (
          <Results result={result} onRetrySuggestion={runSearch} />
        )}

        {!loading && !result && !error && (
          <section className="panel welcome">
            <h2>Friendly medication facts</h2>
            <p>
              Search a brand or generic name to pull indications and side-effect
              language from FDA labeling, plus recent news headlines.
            </p>
            <ul className="welcome-list">
              <li>No accounts. No dosing advice.</li>
              <li>Citations to openFDA, DailyMed, RxNorm, and news publishers.</li>
              <li>Phone-first, calm Help-Pal styling.</li>
            </ul>
            <Disclaimer />
          </section>
        )}
      </main>

      <footer className="site-footer">
        <p>
          Med Pal is part of the Help-Pal family. Public educational tool —{' '}
          <strong>not medical advice</strong>.
        </p>
        <p className="footer-links">
          Data: openFDA · DailyMed · RxNorm · Google News RSS
        </p>
      </footer>
    </div>
  )
}
