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
  /** The card link with its secret for a bought card, or the chip in link. */
  link: string;
  shop: string;
  /** What this device paid in, in base units. */
  amount: string;
  savedAt: number;
  /** Missing on cards saved before chip ins were saved too. */
  kind?: "bought" | "chipin";
}

const SAVED_CARDS = "kepter:cards";

export function savedCards(): SavedCard[] {
  return load<SavedCard[]>(SAVED_CARDS, []);
}

/** Gifts bought or chipped in to on this device, so the buyer can find them again. */
export function saveGift(card: SavedCard): void {
  const kind = card.kind ?? "bought";
  const cards = savedCards();
  const same = (c: SavedCard) => c.cardId === card.cardId && (c.kind ?? "bought") === kind;
  const previous = cards.find(same);
  const amount = kind === "chipin" && previous ? BigInt(previous.amount) + BigInt(card.amount) : BigInt(card.amount);
  save(SAVED_CARDS, [{ ...card, kind, amount: amount.toString() }, ...cards.filter((c) => !same(c))].slice(0, 100));
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
