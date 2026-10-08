import { describeRule, RULES } from "@kepter/sdk";

export interface RuleCopy {
  bps: number;
  title: string;
  recommended: boolean;
  /** What the shop owner reads. */
  owner: string;
  /** What buyers and friends read. */
  buyer: string;
  /** What the gift's recipient reads. */
  recipient: string;
}

export const RULE_OPTIONS: RuleCopy[] = [
  {
    bps: RULES.buyerProtected,
    title: "Buyer protected",
    recommended: true,
    owner: "Unused money goes back to the buyer when a card expires.",
    buyer: "Unused money goes back to you.",
    recipient: "The unused money goes back to the people who gave you this gift.",
  },
  {
    bps: RULES.shared,
    title: "Shared",
    recommended: false,
    owner: "You keep half of unused money. The other half goes back to the buyer.",
    buyer: "Unused money is split between you and the shop.",
    recipient: "The unused money is split between the shop and the people who gave you this gift.",
  },
  {
    bps: RULES.shopKeeps,
    title: "Shop keeps it",
    recommended: false,
    owner: "You keep unused money, like a normal gift card.",
    buyer: "Unused money goes to the shop, like a normal gift card.",
    recipient: "The unused money goes to the shop, like a normal gift card.",
  },
];

export function ruleCopy(bps: number): RuleCopy {
  const preset = RULE_OPTIONS.find((r) => r.bps === bps);
  if (preset) return preset;
  const described = describeRule(bps);
  return {
    bps,
    title: described.title,
    recommended: false,
    owner: described.forBuyers,
    buyer: described.forBuyers,
    recipient: described.forBuyers,
  };
}

export function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}
