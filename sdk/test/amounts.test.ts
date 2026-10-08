import { test } from "node:test";
import assert from "node:assert/strict";

import { formatUnits, toUnits, UNIT } from "../src/amounts.ts";

test("decimal text converts to base units", () => {
  assert.equal(toUnits("1"), UNIT);
  assert.equal(toUnits("12.5"), 125_000_000n);
  assert.equal(toUnits("12.50"), 125_000_000n);
  assert.equal(toUnits(" 0.0000001 "), 1n);
  assert.equal(toUnits("1000"), 10_000_000_000n);
});

test("invalid amounts are rejected", () => {
  for (const text of ["", "-1", "1.", ".5", "1.00000001", "abc", "1,5"]) {
    assert.throws(() => toUnits(text), RangeError, text);
  }
});

test("base units format with at least two decimals", () => {
  assert.equal(formatUnits(125_000_000n), "12.50");
  assert.equal(formatUnits(UNIT), "1.00");
  assert.equal(formatUnits(0n), "0.00");
  assert.equal(formatUnits(1n), "0.0000001");
  assert.equal(formatUnits(82_500_000n), "8.25");
  assert.equal(formatUnits(-UNIT), "-1.00");
  assert.equal(formatUnits(125_000_000n, 0), "12.5");
});

test("formatting and parsing round trip", () => {
  for (const units of [1n, 99n, UNIT, 123_456_789n, 10_000_000_000n]) {
    assert.equal(toUnits(formatUnits(units)), units);
  }
});
