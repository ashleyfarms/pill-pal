/** Pill Pal is free + ads. Stripe Plus checkout is paused — helpers only clear legacy return URLs. */

export const STRIPE_PAYMENT_LINK = ''

export type PlusState = {
  status: 'trialing' | 'active' | 'free'
  trialStarted: string
  trialEnds: string
  checkoutCompletedAt?: string
  source: 'stripe-return' | 'manual' | 'free'
  sessionId?: string
}

const STORAGE_KEY = 'pill-pal.plus.v1'

export function isStripeLinkReady(): boolean {
  return false
}

export function checkoutUrl(_opts?: { nickname?: string }): string {
  return ''
}

export function checkoutReturnParams() {
  const q = new URLSearchParams(window.location.search)
  return {
    success:
      q.get('checkout') === 'success' ||
      q.get('plus') === '1' ||
      Boolean(q.get('session_id') || q.get('checkout_session_id')),
    sessionId: q.get('session_id') || q.get('checkout_session_id') || undefined,
  }
}

export function clearCheckoutQuery() {
  const url = new URL(window.location.href)
  let changed = false
  for (const key of ['checkout', 'plus', 'session_id', 'checkout_session_id']) {
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key)
      changed = true
    }
  }
  if (changed) window.history.replaceState({}, '', url.pathname + url.search + url.hash)
}

export function markCheckoutPending() {
  /* no-op — checkout retired */
}

export function readPlus(): PlusState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as PlusState
  } catch {
    return null
  }
}

export async function hydratePlusFromIdb(): Promise<PlusState | null> {
  return readPlus()
}

/** Always unlocked — Pill Pal is free with ads. */
export function isPlusUnlocked(_state?: PlusState | null): boolean {
  return true
}

export function plusBannerText(_state?: PlusState | null): string {
  return 'Free · ad supported'
}

export function unlockPlus(opts?: { sessionId?: string; source?: PlusState['source'] }): PlusState {
  const next: PlusState = {
    status: 'free',
    trialStarted: new Date().toISOString(),
    trialEnds: new Date().toISOString(),
    source: opts?.source || 'free',
    sessionId: opts?.sessionId,
    checkoutCompletedAt: new Date().toISOString(),
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    /* ignore */
  }
  return next
}
