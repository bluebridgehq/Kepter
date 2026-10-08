/** Plain wording for each contract error code. Codes match contracts/kepter/src/errors.rs. */
export const ERROR_MESSAGES: Record<number, string> = {
  1: "This account already has a shop.",
  2: "That shop does not exist.",
  3: "This shop has closed.",
  4: "The unused balance rule must be between 0% and 100%.",
  5: "Shop names must be 1 to 48 characters.",
  6: "That amount is not allowed. Cards and top ups start at 1 USDC.",
  7: "A card can hold at most 1,000 USDC.",
  8: "A card can have at most 20 people paying into it.",
  9: "Cards must last between 7 and 180 days.",
  10: "That card does not exist.",
  11: "This card has expired.",
  12: "This card has already been settled.",
  13: "There is not enough left on this card.",
  14: "This QR code has expired. Ask for a new one.",
  15: "This QR code is valid for too long. Make a new one.",
  16: "This card cannot be settled yet.",
  17: "There is nothing left on this card to settle.",
  18: "Nothing is owed to this account on this card.",
  19: "That funder does not exist.",
  20: "A calculation overflowed.",
  21: "Pick a category from the list.",
  22: "Add the shop's city or area, up to 48 characters.",
  23: "The contact can be at most 80 characters.",
};

/** Finds a Kepter contract error code in an error thrown by the Stellar SDK. */
export function contractErrorCode(error: unknown): number | undefined {
  const text = error instanceof Error ? error.message : String(error);
  const match = /Error\(Contract, #(\d+)\)/.exec(text);
  return match ? Number(match[1]) : undefined;
}

/** A message that is safe to show to people. */
export function explainError(error: unknown): string {
  const code = contractErrorCode(error);
  if (code !== undefined && ERROR_MESSAGES[code]) {
    return ERROR_MESSAGES[code];
  }
  const text = error instanceof Error ? error.message : String(error);
  if (/Error\(Crypto/.test(text)) {
    return "This QR code is not valid for this card.";
  }
  if (/User declined|rejected/i.test(text)) {
    return "The transaction was cancelled in the wallet.";
  }
  return "Something went wrong. Please try again.";
}
