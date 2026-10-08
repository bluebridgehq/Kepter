import { test } from "node:test";
import assert from "node:assert/strict";

import {
  buildCardLink,
  buildChipInLink,
  cardKeyFromSecret,
  createCardKey,
  MAX_MESSAGE_LENGTH,
  parseCardLink,
} from "../src/cardLink.ts";

test("a new card key has a secret and a 32 byte public key", () => {
  const key = createCardKey();
  assert.match(key.secret, /^S[A-Z2-7]{55}$/);
  assert.equal(key.publicKey.length, 32);
  assert.deepEqual(cardKeyFromSecret(key.secret).publicKey, key.publicKey);
});

test("a card link keeps the secret after # and round trips", () => {
  const { secret } = createCardKey();
  const url = buildCardLink("https://kepter.app/", {
    cardId: 42n,
    secret,
    to: "Bisi",
    from: "Ade & cousins",
    message: "Happy birthday! Dinner is on us.",
  });
  const [beforeHash] = url.split("#");
  assert.equal(beforeHash, "https://kepter.app/c/42");
  assert.ok(!beforeHash.includes(secret));

  const parsed = parseCardLink(url);
  assert.equal(parsed.cardId, 42n);
  assert.equal(parsed.secret, secret);
  assert.equal(parsed.to, "Bisi");
  assert.equal(parsed.from, "Ade & cousins");
  assert.equal(parsed.message, "Happy birthday! Dinner is on us.");
});

test("optional fields can be left out", () => {
  const { secret } = createCardKey();
  const parsed = parseCardLink(buildCardLink("https://kepter.app", { cardId: 7n, secret }));
  assert.equal(parsed.to, undefined);
  assert.equal(parsed.message, undefined);
});

test("bad card links are rejected", () => {
  assert.throws(() => parseCardLink("https://kepter.app/s/GABC"), /not a Kepter card link/);
  assert.throws(() => parseCardLink("https://kepter.app/c/1"), /missing its key/);
  assert.throws(() => parseCardLink("https://kepter.app/c/1#k=SNOTAKEY"));
});

test("long messages are refused", () => {
  const { secret } = createCardKey();
  assert.throws(
    () =>
      buildCardLink("https://kepter.app", {
        cardId: 1n,
        secret,
        message: "x".repeat(MAX_MESSAGE_LENGTH + 1),
      }),
    RangeError,
  );
});

test("the chip in link never carries a secret", () => {
  assert.equal(buildChipInLink("https://kepter.app/", 42n), "https://kepter.app/g/42");
});
