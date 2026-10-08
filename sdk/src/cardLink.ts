import { Keypair } from "@stellar/stellar-sdk";

export const MAX_MESSAGE_LENGTH = 280;

export interface CardKey {
  /** The `S...` secret that goes in the card link. Whoever holds it can spend the card. */
  secret: string;
  /** The 32 byte public key stored in the contract. */
  publicKey: Uint8Array;
}

export interface CardLink {
  cardId: bigint;
  secret: string;
  to?: string;
  from?: string;
  message?: string;
}

/** Creates a fresh key pair for a new card. */
export function createCardKey(): CardKey {
  return cardKeyFromSecret(Keypair.random().secret());
}

export function cardKeyFromSecret(secret: string): CardKey {
  const keypair = Keypair.fromSecret(secret);
  return { secret: keypair.secret(), publicKey: new Uint8Array(keypair.rawPublicKey()) };
}

/**
 * Builds the link sent to the recipient. Everything after `#` stays in the
 * browser and is never sent to a server, so the secret only lives in the link.
 */
export function buildCardLink(baseUrl: string, link: CardLink): string {
  if (link.message && link.message.length > MAX_MESSAGE_LENGTH) {
    throw new RangeError(`Messages can be at most ${MAX_MESSAGE_LENGTH} characters`);
  }
  const fragment = new URLSearchParams({ k: link.secret });
  if (link.to) fragment.set("to", link.to);
  if (link.from) fragment.set("from", link.from);
  if (link.message) fragment.set("m", link.message);
  return `${trimSlash(baseUrl)}/c/${link.cardId}#${fragment.toString()}`;
}

export function parseCardLink(url: string): CardLink {
  const parsed = new URL(url);
  const match = /\/c\/(\d+)\/?$/.exec(parsed.pathname);
  if (!match) {
    throw new Error("This is not a Kepter card link");
  }
  const fragment = new URLSearchParams(parsed.hash.replace(/^#/, ""));
  const secret = fragment.get("k");
  if (!secret) {
    throw new Error("This card link is missing its key");
  }
  cardKeyFromSecret(secret);
  return {
    cardId: BigInt(match[1]),
    secret,
    to: fragment.get("to") ?? undefined,
    from: fragment.get("from") ?? undefined,
    message: fragment.get("m") ?? undefined,
  };
}

/** The link friends use to chip in. It never contains the card secret. */
export function buildChipInLink(baseUrl: string, cardId: bigint): string {
  return `${trimSlash(baseUrl)}/g/${cardId}`;
}

function trimSlash(url: string): string {
  return url.replace(/\/+$/, "");
}
