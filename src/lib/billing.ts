/** Stripe billing for Pill Pal Plus ($1.99/mo after 14-day trial). Local receipt pattern like GigKeep / Scale Pal. */

export const STRIPE_PAYMENT_LINK =
  import.meta.env.VITE_STRIPE_PAYMENT_LINK || 'REPLACE_ME_STRIPE_LINK'

export const PLUS_KEY = 'pill-pal-plus-v1'
export const PENDING_KEY = 'pill-pal-checkout-pending-v1'
const IDB_NAME = 'pill-pal-kv'
const TRIAL_DAYS = 14

export type PlusState = {
  unlocked: true
  status: 'trialing' | 'active'
  trialStarted: string
  trialEnds: string
  checkoutCompletedAt: string
  source: 'stripe-return' | 'manual'
  sessionId?: string
}

function idbOpen(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null)
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(IDB_NAME, 1)
      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv')
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
}

function idbSet(key: string, value: string) {
  void idbOpen().then((db) => {
    if (!db) return
    try {
      const tx = db.transaction('kv', 'readwrite')
      tx.objectStore('kv').put(value, key)
    } catch {
      /* ignore */
    }
  })
}

function idbGet(key: string): Promise<string | null> {
  return idbOpen().then(
    (db) =>
      new Promise((resolve) => {
        if (!db) return resolve(null)
        try {
          const tx = db.transaction('kv', 'readonly')
          const req = tx.objectStore('kv').get(key)
          req.onsuccess = () =>
            resolve(typeof req.result === 'string' ? req.result : null)
          req.onerror = () => resolve(null)
        } catch {
          resolve(null)
        }
      }),
  )
}

function parsePlus(raw: string | null): PlusState | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<PlusState>
    if (!parsed || parsed.unlocked !== true) return null
    const started = parsed.trialStarted || parsed.checkoutCompletedAt
    if (!started) return null
    const ends =
      parsed.trialEnds ||
      new Date(new Date(started).getTime() + TRIAL_DAYS * 86400000).toISOString()
    const status: PlusState['status'] =
      parsed.status === 'active' || parsed.status === 'trialing'
        ? parsed.status
        : 'trialing'
    return {
      unlocked: true,
      status,
      trialStarted: String(started),
      trialEnds: String(ends),
      checkoutCompletedAt: String(parsed.checkoutCompletedAt || started),
      source: parsed.source === 'manual' ? 'manual' : 'stripe-return',
      sessionId: parsed.sessionId ? String(parsed.sessionId) : undefined,
    }
  } catch {
    return null
  }
}

export function isStripeLinkReady(): boolean {
  return /^https?:\/\//i.test(String(STRIPE_PAYMENT_LINK || ''))
}

/** Payment Link URL; attaches client_reference_id from gift nickname when present. */
export function checkoutUrl(opts: { nickname?: string; email?: string } = {}): string {
  const link = String(STRIPE_PAYMENT_LINK || '')
  if (!isStripeLinkReady()) return link
  const url = new URL(link)
  const nick = String(opts.nickname || '').trim()
  if (nick) url.searchParams.set('client_reference_id', nick.slice(0, 80))
  if (opts.email) url.searchParams.set('prefilled_email', opts.email)
  return url.toString()
}

export function readPlus(): PlusState | null {
  if (typeof window === 'undefined') return null
  try {
    return parsePlus(window.localStorage.getItem(PLUS_KEY))
  } catch {
    return null
  }
}

export function isPlusUnlocked(state: PlusState | null = readPlus()): boolean {
  return Boolean(state?.unlocked)
}

/** Display label — trial end date while in trial window; then simple Plus. Local unlock stays honored. */
export function plusBannerText(state: PlusState | null = readPlus()): string {
  if (!state?.unlocked) return ''
  const endMs = state.trialEnds ? new Date(state.trialEnds).getTime() : NaN
  if (Number.isFinite(endMs) && endMs > Date.now()) {
    return `Plus trial active until ${new Date(endMs).toLocaleDateString()}`
  }
  return 'Pill Pal Plus · unlocked on this device'
}

export function unlockPlus(opts?: {
  sessionId?: string
  source?: PlusState['source']
}): PlusState {
  const existing = readPlus()
  const started = new Date()
  const ends = new Date(started.getTime() + TRIAL_DAYS * 86400000)
  const next: PlusState = {
    unlocked: true,
    status: existing?.status === 'active' ? 'active' : 'trialing',
    trialStarted: existing?.trialStarted || started.toISOString(),
    trialEnds: existing?.trialEnds || ends.toISOString(),
    checkoutCompletedAt: started.toISOString(),
    source: opts?.source || 'stripe-return',
    sessionId: opts?.sessionId || existing?.sessionId,
  }
  // After the trial window, keep access and show as active for messaging.
  if (new Date(next.trialEnds).getTime() <= Date.now()) {
    next.status = 'active'
  }
  const raw = JSON.stringify(next)
  try {
    window.localStorage.setItem(PLUS_KEY, raw)
  } catch {
    /* IndexedDB backup still helps on flaky iPhone storage */
  }
  idbSet(PLUS_KEY, raw)
  clearCheckoutPending()
  return next
}

export async function hydratePlusFromIdb(): Promise<PlusState | null> {
  if (typeof window === 'undefined') return null
  try {
    const fromLs = readPlus()
    if (fromLs) return fromLs
    const raw = await idbGet(PLUS_KEY)
    const parsed = parsePlus(raw)
    if (!parsed) return null
    try {
      window.localStorage.setItem(PLUS_KEY, JSON.stringify(parsed))
    } catch {
      /* ignore */
    }
    return parsed
  } catch {
    return null
  }
}

export function markCheckoutPending() {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(PENDING_KEY, JSON.stringify({ at: Date.now() }))
  } catch {
    /* ignore */
  }
}

export function checkoutWasPending(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const raw = window.localStorage.getItem(PENDING_KEY)
    if (!raw) return false
    const parsed = JSON.parse(raw) as { at?: number }
    const at = Number(parsed.at)
    return Number.isFinite(at) && Date.now() - at < 2 * 60 * 60 * 1000
  } catch {
    return false
  }
}

export function clearCheckoutPending() {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(PENDING_KEY)
  } catch {
    /* ignore */
  }
}

export function checkoutReturnParams() {
  const q = new URLSearchParams(window.location.search)
  return {
    success: q.get('checkout') === 'success',
    sessionId: q.get('session_id') || q.get('checkout_session_id') || null,
  }
}

export function clearCheckoutQuery() {
  const url = new URL(window.location.href)
  ;['checkout', 'session_id', 'checkout_session_id'].forEach((k) =>
    url.searchParams.delete(k),
  )
  window.history.replaceState({}, '', url.pathname + url.search + url.hash)
}
