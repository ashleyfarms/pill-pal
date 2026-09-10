import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Disclaimer } from './components/Disclaimer'
import { Results } from './components/Results'
import { SearchForm } from './components/SearchForm'
import {
  hydrateGiftFromIdb,
  isGiftUnlocked,
  readGift,
  readNickname,
  resolveGiftCode,
  unlockGift,
  type GiftState,
} from './lib/gift'
import { searchMedication } from './lib/search'
import type { SearchResult } from './lib/types'
import './App.css'

function clearGiftQuery() {
  const url = new URL(window.location.href)
  if (!url.searchParams.has('gift')) return
  url.searchParams.delete('gift')
  window.history.replaceState({}, '', url.pathname + url.search + url.hash)
}

export default function App() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<SearchResult | null>(null)
  const [lastQuery, setLastQuery] = useState('')
  const [gift, setGift] = useState<GiftState | null>(() => readGift())
  const [nickname, setNickname] = useState(() => readNickname())
  const [toast, setToast] = useState('')
  const [giftCode, setGiftCode] = useState('')
  const [giftMsg, setGiftMsg] = useState('')

  function flash(msg: string) {
    setToast(msg)
    window.setTimeout(() => setToast(''), 3200)
  }

  const applyGift = useCallback((who: string, announce: boolean) => {
    const next = unlockGift(who)
    setGift(next)
    setNickname(next.nickname)
    if (announce) flash(`Gift pass unlocked for ${who}.`)
    return next
  }, [])

  useEffect(() => {
    let cancelled = false

    const fromUrl = resolveGiftCode(new URLSearchParams(window.location.search).get('gift'))
    if (fromUrl) {
      applyGift(fromUrl, true)
      clearGiftQuery()
    }

    // iPhone home-screen apps sometimes start with empty localStorage.
    void hydrateGiftFromIdb().then((fromIdb) => {
      if (cancelled || !fromIdb) return
      setGift((prev) => prev || fromIdb)
      setNickname((prev) => prev || fromIdb.nickname || fromIdb.giftFor)
    })

    return () => {
      cancelled = true
    }
  }, [applyGift])

  function redeemGiftCode(raw: string) {
    const who = resolveGiftCode(raw)
    if (!who) return false
    applyGift(who, true)
    setGiftCode('')
    setGiftMsg('')
    return true
  }

  function onGiftSubmit(e: FormEvent) {
    e.preventDefault()
    const ok = redeemGiftCode(giftCode)
    if (!ok) setGiftMsg('That code did not work. Check with the person who sent it.')
  }

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

  const giftOn = isGiftUnlocked(gift)

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
            <h1>Pill Pal</h1>
          </div>
        </div>
        <p className="tagline">
          Type a medication. See what it’s for, known side effects, and related
          headlines — with sources.
        </p>
        {giftOn && (
          <p className="gift-banner" role="status">
            Gift pass unlocked for {gift?.giftFor || nickname}
            {nickname ? ` · Hi, ${nickname}` : ''}
          </p>
        )}
      </header>

      <main>
        <SearchForm initial={lastQuery} loading={loading} onSearch={runSearch} />

        <form className="gift-form" onSubmit={onGiftSubmit}>
          <div className="gift-label">Have a gift code?</div>
          <div className="gift-row">
            <input
              value={giftCode}
              onChange={(e) => setGiftCode(e.target.value)}
              placeholder="Enter code"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              aria-label="Gift code"
            />
            <button type="submit">Unlock</button>
          </div>
          {giftMsg && (
            <p className="gift-error" role="alert">
              {giftMsg}
            </p>
          )}
        </form>

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
          Pill Pal is part of the Help-Pal family. Public educational tool —{' '}
          <strong>not medical advice</strong>.
        </p>
        <p className="footer-links">
          Data: openFDA · DailyMed · RxNorm · Google News RSS
        </p>
      </footer>

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  )
}
