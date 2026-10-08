import type { Backing, Merchant } from "@kepter/sdk";

import { money } from "./format.ts";

/** "37 cards, $412.00, fully backed" */
export function backingText(merchant: Merchant, backing?: Backing): string {
  const base = `${merchant.open_cards} ${merchant.open_cards === 1 ? "card" : "cards"}, ${money(merchant.outstanding)}`;
  if (!backing) return base;
  return backing.backed ? `${base}, fully backed` : `${base}, not fully backed`;
}
