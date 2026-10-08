/** localStorage that never throws (private mode, quota, disabled storage). */
export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function save(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage is a convenience only.
  }
}

export interface SavedCard {
  cardId: string;
  link: string;
  shop: string;
  amount: string;
  savedAt: number;
}

const SAVED_CARDS = "kepter:cards";

/** Card links bought on this device, so a buyer can find them again. */
export function saveBoughtCard(card: SavedCard): void {
  const cards = load<SavedCard[]>(SAVED_CARDS, []).filter((c) => c.cardId !== card.cardId);
  save(SAVED_CARDS, [card, ...cards].slice(0, 50));
}

export function giftOpened(cardId: string): boolean {
  return load(`kepter:opened:${cardId}`, false);
}

export function markGiftOpened(cardId: string): void {
  save(`kepter:opened:${cardId}`, true);
}

export interface CachedBalance {
  balance: string;
  at: number;
}

export function cachedBalance(cardId: string): CachedBalance | undefined {
  return load<CachedBalance | undefined>(`kepter:balance:${cardId}`, undefined);
}

export function cacheBalance(cardId: string, balance: bigint): void {
  save(`kepter:balance:${cardId}`, { balance: balance.toString(), at: Date.now() });
}

/** The newest card id a shop has already seen on its dashboard. */
export function lastSeenCard(shop: string): bigint {
  return BigInt(load(`kepter:seen:${shop}`, "0"));
}

export function markCardsSeen(shop: string, newest: bigint): void {
  save(`kepter:seen:${shop}`, newest.toString());
}
