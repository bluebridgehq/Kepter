import type { Card, Merchant } from "@kepter/sdk";

import { nowSeconds } from "./format.ts";

export type CardStatus = "active" | "partly" | "spent" | "expired" | "settled" | "closed";
export type Tone = "ok" | "warn" | "muted";

export const STATUS_LABEL: Record<CardStatus, string> = {
  active: "Active",
  partly: "Partly spent",
  spent: "Spent",
  expired: "Expired",
  settled: "Settled",
  closed: "Shop closed",
};

export const STATUS_TONE: Record<CardStatus, Tone> = {
  active: "ok",
  partly: "warn",
  spent: "muted",
  expired: "muted",
  settled: "muted",
  closed: "muted",
};

export function cardStatus(card: Card, merchant?: Merchant, now = nowSeconds()): CardStatus {
  if (card.settled) return "settled";
  if (card.balance === 0n) return "spent";
  if (merchant?.closed_at !== undefined && merchant.closed_at !== null) return "closed";
  if (now >= card.expires_at) return "expired";
  return card.balance < card.total_paid ? "partly" : "active";
}

/** Whether money can still be spent from the card or added to it. */
export function isUsable(status: CardStatus): boolean {
  return status === "active" || status === "partly";
}
