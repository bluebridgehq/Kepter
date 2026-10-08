import { hash, Keypair } from "@stellar/stellar-sdk";

/** Must match DOMAIN_TAG in contracts/kepter/src/redeem.rs. */
export const DOMAIN_TAG = "KEPTER_REDEEM_V1";
export const MESSAGE_LENGTH = 84;
/** The contract rejects QR codes valid for longer than this. */
export const MAX_QR_SECONDS = 15 * 60;

const QR_PREFIX = "kepter:r:";

export interface RedeemParams {
  networkPassphrase: string;
  cardId: bigint;
  amount: bigint;
  nonce: number;
  validUntil: bigint;
}

export interface RedeemQr {
  cardId: bigint;
  amount: bigint;
  validUntil: bigint;
  signature: Uint8Array;
}

/**
 * Builds the 84 byte message a card key signs: domain tag (16) | network id (32) |
 * card id (8) | amount (16) | nonce (4) | valid until (8), all big endian.
 */
export function redeemMessage(params: RedeemParams): Uint8Array {
  const { networkPassphrase, cardId, amount, nonce, validUntil } = params;
  if (amount < 0n || amount >= 1n << 127n) {
    throw new RangeError("Amount is out of range");
  }
  const message = new Uint8Array(MESSAGE_LENGTH);
  const view = new DataView(message.buffer);
  let offset = 0;

  message.set(new TextEncoder().encode(DOMAIN_TAG), offset);
  offset += DOMAIN_TAG.length;
  message.set(hash(new TextEncoder().encode(networkPassphrase) as Buffer), offset);
  offset += 32;
  view.setBigUint64(offset, cardId);
  offset += 8;
  view.setBigInt64(offset, amount >> 64n);
  view.setBigUint64(offset + 8, amount & 0xffff_ffff_ffff_ffffn);
  offset += 16;
  view.setUint32(offset, nonce);
  offset += 4;
  view.setBigUint64(offset, validUntil);
  return message;
}

/** Signs a redemption with the card's secret key (the `S...` value from the card link). */
export function signRedeem(cardSecret: string, params: RedeemParams): RedeemQr {
  const signature = Keypair.fromSecret(cardSecret).sign(redeemMessage(params) as Buffer);
  return {
    cardId: params.cardId,
    amount: params.amount,
    validUntil: params.validUntil,
    signature: new Uint8Array(signature),
  };
}

/** Encodes a signed redemption as the short text shown in the QR code. */
export function encodeRedeemQr(qr: RedeemQr): string {
  return `${QR_PREFIX}${qr.cardId}:${qr.amount}:${qr.validUntil}:${toBase64Url(qr.signature)}`;
}

export function decodeRedeemQr(text: string): RedeemQr {
  if (!text.startsWith(QR_PREFIX)) {
    throw new Error("This is not a Kepter QR code");
  }
  const parts = text.slice(QR_PREFIX.length).split(":");
  if (parts.length !== 4 || !parts.slice(0, 3).every((p) => /^\d+$/.test(p))) {
    throw new Error("This Kepter QR code is damaged");
  }
  const signature = fromBase64Url(parts[3]);
  if (signature.length !== 64) {
    throw new Error("This Kepter QR code is damaged");
  }
  return {
    cardId: BigInt(parts[0]),
    amount: BigInt(parts[1]),
    validUntil: BigInt(parts[2]),
    signature,
  };
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(text: string): Uint8Array {
  const base64 = text.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}
