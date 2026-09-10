import type { SearchResult } from '../lib/types'
import { Disclaimer } from './Disclaimer'

type Props = {
  result: SearchResult
  onRetrySuggestion: (name: string) => void
}

function truncate(text: string, max = 900): string {
  if (text.length <= max) return text
  return text.slice(0, max).trimEnd() + '…'
}

export function Results({ result, onRetrySuggestion }: Props) {
  const { identity, label, news, suggestions } = result
  const hasLabel = Boolean(label)
  const hasUseful =
    hasLabel ||
    identity.brandNames.length > 0 ||
    identity.genericNames.length > 0 ||
    (suggestions && suggestions.length > 0)

  if (!hasUseful) {
    return (
      <section className="panel not-found">
        <h2>We couldn’t find that medication</h2>
        <p>
          Try a different spelling, a brand name, or the generic name. Examples:
          <button type="button" className="chip" onClick={() => onRetrySuggestion('ibuprofen')}>
            ibuprofen
          </button>
          <button type="button" className="chip" onClick={() => onRetrySuggestion('metformin')}>
            metformin
          </button>
          <button type="button" className="chip" onClick={() => onRetrySuggestion('Lipitor')}>
            Lipitor
          </button>
        </p>
        <Disclaimer />
      </section>
    )
  }

  return (
    <div className="results">
      <section className="panel identity">
        <p className="eyebrow">Results for</p>
        <h2>{identity.displayName}</h2>
        <div className="meta-tags">
          {identity.genericNames.slice(0, 3).map((n) => (
            <span key={`g-${n}`} className="tag">
              Generic: {n}
            </span>
          ))}
          {identity.brandNames.slice(0, 4).map((n) => (
            <span key={`b-${n}`} className="tag tag-brand">
              Brand: {n}
            </span>
          ))}
          {identity.rxcui && <span className="tag muted">RxCUI {identity.rxcui}</span>}
        </div>
        {label?.manufacturer && (
          <p className="subtle">Manufacturer (label): {label.manufacturer}</p>
        )}
      </section>

      <Disclaimer compact />

      <section className="panel">
        <h3>What it’s for</h3>
        {label?.indications ? (
          <p className="body-copy">{truncate(label.indications)}</p>
        ) : (
          <p className="empty">
            No indication text turned up in openFDA for this name. Try a brand or
            generic alternative below.
          </p>
        )}
        {label?.purpose && label.purpose !== label.indications && (
          <>
            <h4 className="subhead">Purpose (OTC)</h4>
            <p className="body-copy">{truncate(label.purpose, 500)}</p>
          </>
        )}
      </section>

      <section className="panel">
        <h3>Known side effects</h3>
        <p className="subtle">
          Summarized from FDA labeling (adverse reactions / warnings). Not a complete
          list — ask a pharmacist or clinician about your situation.
        </p>
        {label ? (
          <div className="effects-grid">
            <div>
              <h4 className="subhead common">More commonly noted</h4>
              {label.sideEffects.common.length ? (
                <ul>
                  {label.sideEffects.common.map((s, i) => (
                    <li key={`c-${i}`}>{s}</li>
                  ))}
                </ul>
              ) : (
                <p className="empty">No common adverse-reaction snippets found.</p>
              )}
            </div>
            <div>
              <h4 className="subhead serious">Serious / warnings</h4>
              {label.sideEffects.serious.length ? (
                <ul>
                  {label.sideEffects.serious.map((s, i) => (
                    <li key={`s-${i}`}>{s}</li>
                  ))}
                </ul>
              ) : (
                <p className="empty">No boxed warning / serious snippets found.</p>
              )}
            </div>
          </div>
        ) : (
          <p className="empty">Label data unavailable for side effects.</p>
        )}
      </section>

      <section className="panel">
        <h3>Related news</h3>
        {news.length ? (
          <ul className="news-list">
            {news.map((item) => (
              <li key={item.link}>
                <a href={item.link} target="_blank" rel="noopener noreferrer">
                  {item.title}
                </a>
                <span className="news-meta">
                  {item.source}
                  {item.published ? ` · ${item.published}` : ''}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty">
            No headlines right now (news loads via the Netlify function on deploy).
            Try again after the site is live, or search Google News for “
            {identity.displayName}”.
          </p>
        )}
        <p className="cite">Headlines via Google News RSS. Links open the publisher.</p>
      </section>

      {suggestions && suggestions.length > 0 && (
        <section className="panel">
          <h3>Related names</h3>
          <div className="chips">
            {suggestions.slice(0, 6).map((s) => (
              <button
                key={s}
                type="button"
                className="chip"
                onClick={() => onRetrySuggestion(s.split(/[,\[]/)[0].trim())}
              >
                {s}
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="panel sources">
        <h3>Sources & citations</h3>
        <ul>
          {(label?.sources ?? [
            { name: 'openFDA Drug Labeling', url: 'https://open.fda.gov/apis/drug/label/' },
            { name: 'RxNorm (NLM)', url: 'https://www.nlm.nih.gov/research/umls/rxnorm/' },
            { name: 'DailyMed', url: 'https://dailymed.nlm.nih.gov/dailymed/' },
          ]).map((s) => (
            <li key={s.url}>
              <a href={s.url} target="_blank" rel="noopener noreferrer">
                {s.name}
              </a>
            </li>
          ))}
          <li>
            <a
              href="https://news.google.com/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Google News RSS
            </a>
          </li>
        </ul>
        {identity.dailyMedUrl && (
          <p>
            <a
              className="btn-secondary"
              href={identity.dailyMedUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open full DailyMed label
            </a>
          </p>
        )}
      </section>

      <Disclaimer />
    </div>
  )
}
