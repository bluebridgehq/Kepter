import { UNIT } from "@kepter/sdk";

/** 125000000n -> "125.00" with thousands separators. Rounds down to cents. */
export function usdc(units: bigint): string {
  const cents = units / (UNIT / 100n);
  const whole = cents / 100n;
  const fraction = (cents % 100n).toString().padStart(2, "0");
  return `${whole.toLocaleString("en-US")}.${fraction}`;
}

/** 125000000n -> "$12.50" */
export function money(units: bigint): string {
  return `$${usdc(units)}`;
}

/** Whole dollars as base units, for presets like $20. */
export function dollars(amount: number): bigint {
  return BigInt(amount) * UNIT;
}

export function nowSeconds(): bigint {
  return BigInt(Math.floor(Date.now() / 1000));
}

function toDate(seconds: bigint): Date {
  return new Date(Number(seconds) * 1000);
}

/** "8 January" */
export function dateLong(seconds: bigint): string {
  return toDate(seconds).toLocaleDateString("en-GB", { day: "numeric", month: "long" });
}

/** "8 January 2027" */
export function dateWithYear(seconds: bigint): string {
  return toDate(seconds).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

/** "6 Jan" */
export function dateShort(seconds: bigint): string {
  return toDate(seconds).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function daysBetween(from: bigint, to: bigint): number {
  return Math.ceil(Number(to - from) / 86400);
}

export function daysLeftText(expiresAt: bigint, now = nowSeconds()): string {
  const days = daysBetween(now, expiresAt);
  return days === 1 ? "1 day left" : `${days} days left`;
}

export function shortAddress(address: string): string {
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

export function mmss(totalSeconds: number): string {
  const s = Math.max(0, totalSeconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function cardNo(id: bigint): string {
  return `#${id}`;
}
