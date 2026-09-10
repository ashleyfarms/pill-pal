/** Gift / tester unlock for Albert, Ashley & David (same pattern as Scale Pal / Townline / GigKeep). */

export const GIFT_KEY = 'pill-pal-gift-v1'
export const NICKNAME_KEY = 'pill-pal-nickname-v1'
const IDB_NAME = 'pill-pal-kv'

const GIFT_CODES: Record<string, string> = {
  albert: 'Albert',
  ashley: 'Ashley',
  david: 'David',
}

export type GiftState = {
  unlocked: true
  gift: true
  giftFor: string
  nickname: string
  at: number
  source: 'gift'
}

export function resolveGiftCode(raw: string | null | undefined): string | null {
  const code = String(raw || '')
    .trim()
    .toLowerCase()
  return GIFT_CODES[code] || null
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

function parseGift(raw: string | null): GiftState | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<GiftState>
    if (!parsed || parsed.unlocked !== true || parsed.gift !== true) return null
    const who = String(parsed.giftFor || parsed.nickname || '').trim()
    if (!who) return null
    return {
      unlocked: true,
      gift: true,
      giftFor: who,
      nickname: String(parsed.nickname || who).trim() || who,
      at: typeof parsed.at === 'number' ? parsed.at : Date.now(),
      source: 'gift',
    }
  } catch {
    return null
  }
}

export function readGift(): GiftState | null {
  if (typeof window === 'undefined') return null
  try {
    return parseGift(window.localStorage.getItem(GIFT_KEY))
  } catch {
    return null
  }
}

export function readNickname(): string {
  if (typeof window === 'undefined') return ''
  try {
    const fromNick = window.localStorage.getItem(NICKNAME_KEY)
    if (fromNick && fromNick.trim()) return fromNick.trim()
  } catch {
    /* ignore */
  }
  return readGift()?.nickname || ''
}

function writeNickname(name: string) {
  if (typeof window === 'undefined') return
  const nick = name.trim()
  if (!nick) return
  try {
    window.localStorage.setItem(NICKNAME_KEY, nick)
  } catch {
    /* ignore */
  }
  idbSet(NICKNAME_KEY, nick)
}

/** Persist gift/tester unlock + IndexedDB backup (iPhone PWA quirk). Prefills nickname if empty. */
export function unlockGift(who: string): GiftState {
  const existing = readGift()
  const currentNick = readNickname()
  const nickname = currentNick || who
  const next: GiftState = {
    unlocked: true,
    gift: true,
    giftFor: who,
    nickname,
    at: existing?.at || Date.now(),
    source: 'gift',
  }
  const raw = JSON.stringify(next)
  try {
    window.localStorage.setItem(GIFT_KEY, raw)
  } catch {
    /* IndexedDB backup still helps on flaky iPhone storage */
  }
  idbSet(GIFT_KEY, raw)
  if (!currentNick) writeNickname(who)
  return next
}

/**
 * iPhone home-screen apps sometimes start with empty localStorage.
 * Pull gift + nickname back from IndexedDB when needed.
 */
export async function hydrateGiftFromIdb(): Promise<GiftState | null> {
  if (typeof window === 'undefined') return null
  try {
    const nickRaw = await idbGet(NICKNAME_KEY)
    if (nickRaw?.trim()) {
      try {
        if (!window.localStorage.getItem(NICKNAME_KEY)) {
          window.localStorage.setItem(NICKNAME_KEY, nickRaw.trim())
        }
      } catch {
        /* ignore */
      }
    }

    const fromLs = readGift()
    if (fromLs) return fromLs

    const raw = await idbGet(GIFT_KEY)
    const parsed = parseGift(raw)
    if (!parsed) return null
    try {
      window.localStorage.setItem(GIFT_KEY, JSON.stringify(parsed))
    } catch {
      /* ignore */
    }
    if (!readNickname()) writeNickname(parsed.nickname || parsed.giftFor)
    return parsed
  } catch {
    return null
  }
}

/** True when a gift/tester unlock is active (future paywall can treat as pro). */
export function isGiftUnlocked(state: GiftState | null = readGift()): boolean {
  return Boolean(state?.unlocked && state?.gift)
}
