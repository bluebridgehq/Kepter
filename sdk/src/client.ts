import { Buffer } from "buffer";
import { Address, nativeToScVal, rpc, scValToNative, xdr } from "@stellar/stellar-sdk";
import type { AssembledTransaction, ClientOptions } from "@stellar/stellar-sdk/contract";

import {
  Client as ContractClient,
  type Card,
  type FunderInfo,
  type Merchant,
  type Settlement,
} from "./generated/contract.ts";
import { TESTNET, type Network } from "./networks.ts";
import type { RedeemQr } from "./redeem.ts";

export type { Card, FunderInfo, Merchant, Settlement };

export interface KepterOptions {
  network?: Network;
  rpcUrl?: string;
  /** The connected account. Needed only to build transactions. */
  publicKey?: string;
  signTransaction?: ClientOptions["signTransaction"];
}

export interface CardEntry {
  id: bigint;
  card: Card;
}

export interface Backing {
  /** Everything the contract owes: open card balances plus unclaimed amounts. */
  owed: bigint;
  /** The contract's actual USDC balance. */
  held: bigint;
  backed: boolean;
}

/** getLedgerEntries accepts up to 200 keys per request. */
const BATCH_SIZE = 100;
const WRITE = { restore: true } as const;

export class Kepter {
  readonly network: Network;
  readonly server: rpc.Server;
  readonly contract: ContractClient;

  constructor(options: KepterOptions = {}) {
    this.network = options.network ?? TESTNET;
    const rpcUrl = options.rpcUrl ?? this.network.rpcUrl;
    this.server = new rpc.Server(rpcUrl);
    this.contract = new ContractClient({
      contractId: this.network.contractId,
      networkPassphrase: this.network.networkPassphrase,
      rpcUrl,
      publicKey: options.publicKey,
      signTransaction: options.signTransaction,
    });
  }

  // Reads. These need no wallet and read ledger entries directly.

  async getMerchant(address: string): Promise<Merchant | undefined> {
    const [merchant] = await this.read([dataKey("Merchant", addressVal(address))]);
    return merchant ? normalizeMerchant(merchant as Merchant) : undefined;
  }

  async getCard(cardId: bigint): Promise<Card | undefined> {
    return (await this.getCards([cardId])).get(cardId);
  }

  async getCards(cardIds: bigint[]): Promise<Map<bigint, Card>> {
    const values = await this.read(cardIds.map((id) => dataKey("Card", u64Val(id))));
    const cards = new Map<bigint, Card>();
    cardIds.forEach((id, i) => {
      if (values[i]) cards.set(id, values[i] as Card);
    });
    return cards;
  }

  /** A shop's cards, newest first. */
  async listMerchantCards(address: string): Promise<CardEntry[]> {
    const merchant = await this.getMerchant(address);
    if (!merchant || merchant.card_count === 0) return [];
    const indexes = Array.from({ length: merchant.card_count }, (_, i) => i);
    const ids = (
      await this.read(indexes.map((i) => dataKey("MerchantCard", addressVal(address), u32Val(i))))
    ).filter((id): id is bigint => typeof id === "bigint");
    const cards = await this.getCards(ids);
    return ids
      .filter((id) => cards.has(id))
      .map((id) => ({ id, card: cards.get(id)! }))
      .reverse();
  }

  async getFunders(cardId: bigint, funderCount: number): Promise<FunderInfo[]> {
    const indexes = Array.from({ length: funderCount }, (_, i) => i);
    const accounts = (
      await this.read(indexes.map((i) => dataKey("Funder", u64Val(cardId), u32Val(i))))
    ).filter((a): a is string => typeof a === "string");
    const paid = await this.read(
      accounts.map((a) => dataKey("Paid", u64Val(cardId), addressVal(a))),
    );
    return accounts.map((account, i) => ({ account, paid: (paid[i] as bigint) ?? 0n }));
  }

  async getOwed(cardId: bigint, account: string): Promise<bigint> {
    const [owed] = await this.read([dataKey("Owed", u64Val(cardId), addressVal(account))]);
    return (owed as bigint | undefined) ?? 0n;
  }

  /** Compares what the contract owes with the USDC it actually holds. */
  async getBacking(): Promise<Backing> {
    const [owedTx, balances] = await Promise.all([
      this.contract.total_owed(),
      this.read(
        [dataKey("Balance", addressVal(this.network.contractId))],
        this.network.usdcContractId,
      ),
    ]);
    const owed = owedTx.result;
    const held = (balances[0] as { amount?: bigint } | undefined)?.amount ?? 0n;
    return { owed, held, backed: held >= owed };
  }

  // Writes. Each returns a transaction to sign and send with `tx.signAndSend()`.

  openShop(merchant: string, name: string, expiryKeepBps: number) {
    return this.contract.register_merchant(
      { merchant, name, expiry_keep_bps: expiryKeepBps },
      WRITE,
    );
  }

  setExpiryRule(merchant: string, expiryKeepBps: number) {
    return this.contract.set_expiry_rule({ merchant, expiry_keep_bps: expiryKeepBps }, WRITE);
  }

  closeShop(merchant: string) {
    return this.contract.close_store({ merchant }, WRITE);
  }

  buyCard(args: {
    buyer: string;
    merchant: string;
    amount: bigint;
    cardKey: Uint8Array;
    expiresAt: bigint;
  }) {
    return this.contract.buy(
      {
        buyer: args.buyer,
        merchant: args.merchant,
        amount: args.amount,
        card_key: Buffer.from(args.cardKey),
        expires_at: args.expiresAt,
      },
      WRITE,
    );
  }

  topUp(funder: string, cardId: bigint, amount: bigint) {
    return this.contract.top_up({ funder, card_id: cardId, amount }, WRITE);
  }

  redeem(qr: RedeemQr) {
    return this.contract.redeem(
      {
        card_id: qr.cardId,
        amount: qr.amount,
        valid_until: qr.validUntil,
        signature: Buffer.from(qr.signature),
      },
      WRITE,
    );
  }

  settle(cardId: bigint): Promise<AssembledTransaction<unknown>> {
    return this.contract.settle({ card_id: cardId }, WRITE);
  }

  claimOwed(cardId: bigint, account: string) {
    return this.contract.claim_owed({ card_id: cardId, account }, WRITE);
  }

  /** Reads persistent entries in batches. Missing entries come back as undefined. */
  private async read(keys: xdr.ScVal[], contractId = this.network.contractId): Promise<unknown[]> {
    const contract = new Address(contractId).toScAddress();
    const ledgerKeys = keys.map((key) =>
      xdr.LedgerKey.contractData(
        new xdr.LedgerKeyContractData({
          contract,
          key,
          durability: xdr.ContractDataDurability.persistent,
        }),
      ),
    );
    const found = new Map<string, unknown>();
    for (let i = 0; i < ledgerKeys.length; i += BATCH_SIZE) {
      const batch = ledgerKeys.slice(i, i + BATCH_SIZE);
      const { entries } = await this.server.getLedgerEntries(...batch);
      for (const entry of entries) {
        if (entry.val.type !== "contractData") continue;
        found.set(entry.key.toXDR("base64"), scValToNative(entry.val.contractData.val));
      }
    }
    return ledgerKeys.map((k) => found.get(k.toXDR("base64")));
  }
}

function dataKey(variant: string, ...fields: xdr.ScVal[]): xdr.ScVal {
  return xdr.ScVal.scvVec([xdr.ScVal.scvSymbol(variant), ...fields]);
}

function addressVal(address: string): xdr.ScVal {
  return new Address(address).toScVal();
}

function u64Val(value: bigint): xdr.ScVal {
  return nativeToScVal(value, { type: "u64" });
}

function u32Val(value: number): xdr.ScVal {
  return nativeToScVal(value, { type: "u32" });
}

function normalizeMerchant(merchant: Merchant): Merchant {
  return { ...merchant, closed_at: merchant.closed_at ?? undefined };
}
