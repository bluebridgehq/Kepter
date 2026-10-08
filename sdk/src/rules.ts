/** Shop's share of an unused balance at expiry, in basis points. */
export const RULES = {
  buyerProtected: 0,
  shared: 5_000,
  shopKeeps: 10_000,
} as const;

export const BPS_DENOMINATOR = 10_000;

export interface RuleDescription {
  title: string;
  /** Wording shown to buyers before they pay. */
  forBuyers: string;
}

export function describeRule(bps: number): RuleDescription {
  if (bps === RULES.buyerProtected) {
    return { title: "Buyer protected", forBuyers: "Unused money goes back to you." };
  }
  if (bps === RULES.shared) {
    return {
      title: "Shared",
      forBuyers: "Unused money is split between you and the shop.",
    };
  }
  if (bps === RULES.shopKeeps) {
    return {
      title: "Shop keeps it",
      forBuyers: "Unused money goes to the shop, like a normal gift card.",
    };
  }
  const percent = bps / 100;
  return {
    title: `Shop keeps ${percent}%`,
    forBuyers: `The shop keeps ${percent}% of unused money and the rest goes back to you.`,
  };
}

export interface SettlementInput {
  balance: bigint;
  expiryKeepBps: number;
  closedBeforeExpiry: boolean;
  /** What each funder paid, in funder order. The first funder is the buyer. */
  paid: bigint[];
}

export interface SettlementPreview {
  toShop: bigint;
  toFunders: bigint[];
}

/** Works out a settlement the same way the contract does. */
export function previewSettlement(input: SettlementInput): SettlementPreview {
  const { balance, expiryKeepBps, closedBeforeExpiry, paid } = input;
  const toShop = closedBeforeExpiry
    ? 0n
    : (balance * BigInt(expiryKeepBps)) / BigInt(BPS_DENOMINATOR);
  const pool = balance - toShop;
  const totalPaid = paid.reduce((sum, p) => sum + p, 0n);
  if (totalPaid === 0n) {
    return { toShop, toFunders: paid.map(() => 0n) };
  }
  const toFunders = paid.map((p) => (pool * p) / totalPaid);
  const assigned = toFunders.reduce((sum, s) => sum + s, 0n);
  toFunders[0] += pool - assigned;
  return { toShop, toFunders };
}
