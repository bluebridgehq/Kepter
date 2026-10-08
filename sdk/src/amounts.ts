/** USDC on Stellar has 7 decimal places. */
export const DECIMALS = 7;
export const UNIT = 10_000_000n;

const AMOUNT_PATTERN = /^(\d+)(?:\.(\d{1,7}))?$/;

/** Parses a decimal string such as "12.50" into base units. */
export function toUnits(text: string): bigint {
  const match = AMOUNT_PATTERN.exec(text.trim());
  if (!match) {
    throw new RangeError(`Not a valid amount: "${text}"`);
  }
  const whole = BigInt(match[1]);
  const fraction = BigInt((match[2] ?? "").padEnd(DECIMALS, "0"));
  return whole * UNIT + fraction;
}

/**
 * Formats base units as a decimal string, with at least `minDecimals`
 * places and no trailing zeros beyond that. 125000000n -> "12.50".
 */
export function formatUnits(units: bigint, minDecimals = 2): string {
  const negative = units < 0n;
  const abs = negative ? -units : units;
  const whole = abs / UNIT;
  let fraction = (abs % UNIT).toString().padStart(DECIMALS, "0");
  while (fraction.length > minDecimals && fraction.endsWith("0")) {
    fraction = fraction.slice(0, -1);
  }
  const text = fraction.length > 0 ? `${whole}.${fraction}` : `${whole}`;
  return negative ? `-${text}` : text;
}
