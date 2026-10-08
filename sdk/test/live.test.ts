// Reads from the live testnet deployment. Skipped unless KEPTER_LIVE=1.
import { test } from "node:test";
import assert from "node:assert/strict";

import { Kepter } from "../src/client.ts";

const live = process.env.KEPTER_LIVE === "1";
const DEMO_SHOP = "GC22QLC7MX4UITYTPMXDK3FMULLOHLASVRJOJYXGI457WF3FVXZ3OKWG";

test("reads the demo shop from testnet", { skip: !live }, async () => {
  const kepter = new Kepter();
  const shop = await kepter.getMerchant(DEMO_SHOP);
  assert.ok(shop, "demo shop should exist");
  assert.equal(shop.name, "Tola's Kitchen");
  assert.equal(shop.closed_at, undefined);
});

test("a missing shop reads as undefined", { skip: !live }, async () => {
  const kepter = new Kepter();
  const missing = await kepter.getMerchant("GBHYICUWKEGL2DYTX3VZT3GRX5LJR3VSME6P4OWR5Q2ZSGWJ7R2NUWLB");
  assert.equal(missing, undefined);
});

test("lists cards and checks backing", { skip: !live }, async () => {
  const kepter = new Kepter();
  const cards = await kepter.listMerchantCards(DEMO_SHOP);
  assert.ok(Array.isArray(cards));
  const backing = await kepter.getBacking();
  assert.equal(typeof backing.owed, "bigint");
  assert.ok(backing.backed, "the contract must hold at least what it owes");
});
