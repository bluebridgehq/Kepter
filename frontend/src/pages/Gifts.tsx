import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { parseCardLink, previewSettlement, type Card, type Merchant } from "@kepter/sdk";

import { Button, MessagePanel, Skeleton, StatusPill } from "../components/ui.tsx";
import { reader } from "../lib/config.ts";
import { dateLong, dateShort, daysLeftText, money, nowSeconds } from "../lib/format.ts";
import { ruleCopy } from "../lib/rules.ts";
import { shareLink } from "../lib/share.ts";
import { cardStatus, isUsable, type CardStatus } from "../lib/status.ts";
import { savedCards, type SavedCard } from "../lib/storage.ts";
import { useToast } from "../lib/toast-context.ts";
import { useTx } from "../lib/tx-context.ts";
import { useWallet } from "../lib/wallet-context.ts";

interface Gift {
  saved: SavedCard;
  id: bigint;
  to?: string;
  card?: Card;
  merchant?: Merchant;
  status?: CardStatus;
  /** For a card that can be settled: what goes back to the people who paid, and to the shop. */
  payout?: { toFunders: bigint; toShop: bigint };
  /** An amount the contract could not send to the connected wallet, waiting to be claimed. */
  owed?: bigint;
}

function recipient(saved: SavedCard): string | undefined {
  if (saved.kind === "chipin") return undefined;
  try {
    return parseCardLink(saved.link).to;
  } catch {
    return undefined;
  }
}

async function loadGifts(address: string | undefined): Promise<Gift[]> {
  const saved = savedCards();
  const ids = saved.map((s) => BigInt(s.cardId));
  const cards = await reader.getCards([...new Set(ids)]);
  const shops = [...new Set([...cards.values()].map((c) => c.merchant))];
  const merchants = new Map(
    await Promise.all(shops.map(async (a) => [a, await reader.getMerchant(a)] as const)),
  );
  const now = nowSeconds();

  return Promise.all(
    saved.map(async (s, i) => {
      const id = ids[i];
      const card = cards.get(id);
      const merchant = card ? merchants.get(card.merchant) : undefined;
      const gift: Gift = { saved: s, id, to: recipient(s), card, merchant };
      if (!card) return gift;
      gift.status = cardStatus(card, merchant, now);
      if ((gift.status === "expired" || gift.status === "closed") && card.balance > 0n) {
        const funders = await reader.getFunders(id, card.funder_count);
        const closedBeforeExpiry =
          merchant?.closed_at !== undefined && merchant.closed_at !== null && merchant.closed_at < card.expires_at;
        const preview = previewSettlement({
          balance: card.balance,
          expiryKeepBps: card.expiry_keep_bps,
          closedBeforeExpiry,
          paid: funders.map((f) => f.paid),
        });
        gift.payout = { toShop: preview.toShop, toFunders: preview.toFunders.reduce((a, b) => a + b, 0n) };
      }
      if (gift.status === "settled" && address) {
        gift.owed = await reader.getOwed(id, address);
      }
      return gift;
    }),
  );
}

function GiftRow({ gift, onSettle, onClaim }: { gift: Gift; onSettle: () => void; onClaim: () => void }) {
  const navigate = useNavigate();
  const toast = useToast();
  const { saved, card, merchant, status } = gift;
  const chipIn = saved.kind === "chipin";
  const shopName = merchant?.name ?? saved.shop;
  const usable = status !== undefined && isUsable(status);
  const linkPath = saved.link.replace(/^https?:\/\/[^/]+/, "");

  const share = async () => {
    const r = await shareLink(saved.link, `A gift card for ${shopName}`);
    if (r === "copied") toast(chipIn ? "Chip in link copied" : "Gift link copied");
  };

  return (
    <div className="flex flex-col gap-3.5 rounded-[18px] border border-line bg-surface p-[18px]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-lg leading-tight font-bold [overflow-wrap:anywhere]">{shopName}</span>
          <span className="text-[15px] text-ink-2">
            {chipIn
              ? `You chipped in ${money(BigInt(saved.amount))}`
              : `${gift.to ? `For ${gift.to} · ` : ""}Bought ${dateShort(BigInt(Math.floor(saved.savedAt / 1000)))}`}
          </span>
        </div>
        {status && <StatusPill status={status} />}
      </div>

      {card && status === "settled" ? (
        <span className="text-[15px] text-ink-2">
          Settled. What was left on the card has been paid out, following the shop's rule.
        </span>
      ) : card ? (
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
          <span className="tabular text-[28px] leading-none font-extrabold tracking-[-.02em]">
            {money(card.balance)}
            <span className="ml-1.5 text-[15px] font-semibold tracking-normal text-ink-2">
              left of {money(card.total_paid)}
            </span>
          </span>
          <span className="text-[15px] text-ink-2">
            {usable ? `Use by ${dateLong(card.expires_at)} · ${daysLeftText(card.expires_at)}` : ""}
          </span>
        </div>
      ) : (
        <span className="text-[15px] text-ink-2">This card could not be found on the network.</span>
      )}

      {gift.payout && (
        <div className="rounded-[14px] bg-surface-2 px-4 py-3 text-[15px]">
          {status === "closed" ? "The shop has closed." : "This card has expired."} Settling pays out the{" "}
          {money(card!.balance)} left: <strong>{money(gift.payout.toFunders)}</strong> back to the people who paid
          {gift.payout.toShop > 0n && (
            <>
              {" "}
              and <strong>{money(gift.payout.toShop)}</strong> to the shop ({ruleCopy(card!.expiry_keep_bps).title})
            </>
          )}
          .
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {usable && !chipIn && (
          <>
            <Button onClick={() => void share()} className="min-h-11 rounded-xl px-4 text-[15px]">
              Share again
            </Button>
            <Button variant="secondary" onClick={() => navigate(linkPath)} className="min-h-11 rounded-xl px-4 text-[15px]">
              Open card
            </Button>
          </>
        )}
        {usable && chipIn && (
          <Button variant="secondary" onClick={() => navigate(linkPath)} className="min-h-11 rounded-xl px-4 text-[15px]">
            Chip in again
          </Button>
        )}
        {gift.payout && (
          <Button onClick={onSettle} className="min-h-11 rounded-xl px-4 text-[15px]">
            Settle now
          </Button>
        )}
        {!!gift.owed && gift.owed > 0n && (
          <Button onClick={onClaim} className="min-h-11 rounded-xl px-4 text-[15px]">
            Claim {money(gift.owed)}
          </Button>
        )}
      </div>
    </div>
  );
}

export function Gifts() {
  const navigate = useNavigate();
  const toast = useToast();
  const { run } = useTx();
  const { address, connect, writer } = useWallet();
  const [gifts, setGifts] = useState<Gift[] | null>();

  const load = useCallback(() => {
    loadGifts(address).then(setGifts, () => setGifts(null));
  }, [address]);

  useEffect(load, [load]);

  const withWallet = async (action: (w: NonNullable<typeof writer>, account: string) => Promise<void>) => {
    if (!address || !writer) {
      if (await connect()) toast("Wallet connected. Tap again to continue.");
      return;
    }
    await action(writer, address);
  };

  const settle = (gift: Gift) =>
    withWallet(async (w) => {
      const done = await run({
        title: `Settle card #${gift.id}`,
        amount: `${money(gift.payout!.toFunders)} back to the people who paid`,
        build: () => w.settle(gift.id),
      });
      if (done === undefined) return;
      toast("Card settled");
      load();
    });

  const claim = (gift: Gift) =>
    withWallet(async (w, account) => {
      const done = await run({
        title: `Claim from card #${gift.id}`,
        amount: `${money(gift.owed!)} USDC`,
        build: () => w.claimOwed(gift.id, account),
      });
      if (done === undefined) return;
      toast("Claimed");
      load();
    });

  const open = gifts?.filter((g) => g.status && isUsable(g.status)) ?? [];
  const past = gifts?.filter((g) => !g.status || !isUsable(g.status)) ?? [];

  return (
    <div className="mx-auto flex max-w-[720px] flex-col gap-6 px-5 pt-3 pb-12">
      <div className="flex flex-col gap-2">
        <h1 className="m-0 text-[clamp(30px,5vw,40px)] font-extrabold tracking-[-.02em]">Your gifts</h1>
        <span className="text-lg text-ink-2">Gift cards you bought or chipped in to, and what is left on them.</span>
      </div>

      {gifts === undefined && (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-[150px] rounded-[18px]" />
          <Skeleton className="h-[150px] rounded-[18px]" />
        </div>
      )}

      {gifts === null && (
        <MessagePanel
          icon="!"
          title="Could not load your gifts."
          action={
            <Button variant="secondary" onClick={load} className="mt-2 min-h-[50px] rounded-[14px] px-[22px] text-base">
              Try again
            </Button>
          }
        >
          Check your connection and try again.
        </MessagePanel>
      )}

      {gifts && gifts.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border-[1.5px] border-dashed border-line p-8 text-center">
          <span className="text-lg font-bold">No gifts yet.</span>
          <span className="text-ink-2">Gift cards you buy or chip in to on this device show up here.</span>
          <Button variant="accent" onClick={() => navigate("/shops")} className="mt-1 min-h-[50px] rounded-[14px] px-6 text-base">
            Find a shop
          </Button>
        </div>
      )}

      {open.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="m-0 text-xl font-extrabold">Still to spend · {open.length}</h2>
          {open.map((g) => (
            <GiftRow key={`${g.saved.kind}-${g.id}`} gift={g} onSettle={() => void settle(g)} onClaim={() => void claim(g)} />
          ))}
        </div>
      )}

      {past.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="m-0 text-xl font-extrabold">Used or ended · {past.length}</h2>
          {past.map((g) => (
            <GiftRow key={`${g.saved.kind}-${g.id}`} gift={g} onSettle={() => void settle(g)} onClaim={() => void claim(g)} />
          ))}
        </div>
      )}

      {gifts && gifts.length > 0 && (
        <span className="text-sm text-ink-2">
          This list is kept in this browser. To see a gift on another device, open its link there.
        </span>
      )}
    </div>
  );
}
