import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Keypair } from "@stellar/stellar-sdk";

import {
  decodeRedeemQr,
  encodeRedeemQr,
  MESSAGE_LENGTH,
  redeemMessage,
  signRedeem,
} from "../src/redeem.ts";

const vectors = JSON.parse(
  readFileSync(new URL("../../test-vectors/redeem.json", import.meta.url), "utf8"),
);

const hex = (bytes: Uint8Array) => Buffer.from(bytes).toString("hex");
const secret = Keypair.fromRawEd25519Seed(Buffer.from(vectors.secret_seed_hex, "hex")).secret();
const params = {
  networkPassphrase: vectors.network_passphrase,
  cardId: BigInt(vectors.card_id),
  amount: BigInt(vectors.amount),
  nonce: vectors.nonce,
  validUntil: BigInt(vectors.valid_until),
};

test("the message matches the shared test vector byte for byte", () => {
  const message = redeemMessage(params);
  assert.equal(message.length, MESSAGE_LENGTH);
  assert.equal(hex(message), vectors.message_hex);
});

test("the signature matches the shared test vector", () => {
  const qr = signRedeem(secret, params);
  assert.equal(hex(qr.signature), vectors.signature_hex);
  assert.equal(
    hex(Keypair.fromSecret(secret).rawPublicKey()),
    vectors.public_key_hex,
  );
});

test("a QR payload survives encoding and decoding", () => {
  const qr = signRedeem(secret, params);
  const text = encodeRedeemQr(qr);
  assert.match(text, /^kepter:r:42:125000000:1760000900:[A-Za-z0-9_-]+$/);
  const decoded = decodeRedeemQr(text);
  assert.equal(decoded.cardId, qr.cardId);
  assert.equal(decoded.amount, qr.amount);
  assert.equal(decoded.validUntil, qr.validUntil);
  assert.deepEqual(decoded.signature, qr.signature);
});

test("damaged or foreign QR codes are rejected", () => {
  assert.throws(() => decodeRedeemQr("https://example.com"), /not a Kepter QR code/);
  assert.throws(() => decodeRedeemQr("kepter:r:1:2:3"), /damaged/);
  assert.throws(() => decodeRedeemQr("kepter:r:1:x:3:AAAA"), /damaged/);
  assert.throws(() => decodeRedeemQr("kepter:r:1:2:3:AAAA"), /damaged/);
});

test("negative amounts cannot be signed", () => {
  assert.throws(() => redeemMessage({ ...params, amount: -1n }), RangeError);
});
