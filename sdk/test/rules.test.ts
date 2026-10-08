import { test } from "node:test";
import assert from "node:assert/strict";

import { UNIT } from "../src/amounts.ts";
import { describeRule, previewSettlement, RULES } from "../src/rules.ts";

const usdc = (n: number) => BigInt(n) * UNIT;

test("each preset has plain wording for buyers", () => {
  assert.equal(describeRule(RULES.buyerProtected).title, "Buyer protected");
  assert.equal(describeRule(RULES.shared).title, "Shared");
  assert.equal(describeRule(RULES.shopKeeps).title, "Shop keeps it");
  assert.match(describeRule(2_500).forBuyers, /25%/);
});

test("shared splits with the shop and funders in proportion", () => {
  const result = previewSettlement({
    balance: usdc(40),
    expiryKeepBps: RULES.shared,
    closedBeforeExpiry: false,
    paid: [usdc(20), usdc(10), usdc(10)],
  });
  assert.equal(result.toShop, usdc(20));
  assert.deepEqual(result.toFunders, [usdc(10), usdc(5), usdc(5)]);
});

test("funders get everything when the shop closed before expiry", () => {
  const result = previewSettlement({
    balance: usdc(33),
    expiryKeepBps: RULES.shopKeeps,
    closedBeforeExpiry: true,
    paid: [usdc(20), usdc(10), usdc(10)],
  });
  assert.equal(result.toShop, 0n);
  assert.deepEqual(result.toFunders, [165_000_000n, 82_500_000n, 82_500_000n]);
});

test("the rounding remainder goes to the first funder", () => {
  const result = previewSettlement({
    balance: 10n,
    expiryKeepBps: RULES.buyerProtected,
    closedBeforeExpiry: false,
    paid: [1n, 1n, 1n],
  });
  assert.deepEqual(result.toFunders, [4n, 3n, 3n]);
});

test("shares always add up to the balance", () => {
  const balance = usdc(3) + 11n;
  for (const bps of [0, 1, 3_333, 5_000, 9_999, 10_000]) {
    const result = previewSettlement({
      balance,
      expiryKeepBps: bps,
      closedBeforeExpiry: false,
      paid: [usdc(1) + 1n, usdc(1) + 3n, usdc(1) + 7n],
    });
    const total = result.toShop + result.toFunders.reduce((a, b) => a + b, 0n);
    assert.equal(total, balance, `rule ${bps}`);
  }
});
