import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { buildChipInLink, type Balances, type Card, type Merchant } from "@kepter/sdk";

import { GiftCard } from "../components/GiftCard.tsx";
import { RuleSheet } from "../components/InfoSheets.tsx";
import { Button, Chips, Skeleton } from "../components/ui.tsx";
import { SITE_URL, USDC_FAUCET_URL, reader } from "../lib/config.ts";
import { daysLeftText, dollars, money, nowSeconds } from "../lib/format.ts";
import { ruleCopy } from "../lib/rules.ts";
import { shareLink } from "../lib/share.ts";
import { cardStatus } from "../lib/status.ts";
import { useToast } from "../lib/toast-context.ts";
import { useTx } from "../lib/tx-context.ts";
import { useWallet } from "../lib/wallet-context.ts";

const AMOUNTS = [5, 10, 20, 50];
const MAX_BALANCE = dollars(1000);
const MAX_FUNDERS = 20;

interface Loaded {
  card: Card;
  merchant: Merchant;
}

function people(n: number): string {
  return n === 1 ? "1 person chipped in" : `${n} people chipped in`;
}

export function ChipIn() {
  const { cardId: idText = "" } = useParams();
  const toast = useToast();
  const { run } = useTx();
  const { address, connect, writer } = useWallet();

  const [data, setData] = useState<Loaded | null>();
  const [balances, setBalances] = useState<Balances>();
  const [pick, setPick] = useState(10);
  const [added, setAdded] = useState<bigint>();
  const [ruleOpen, setRuleOpen] = useState(false);

  const cardId = /^\d+$/.test(idText) ? BigInt(idText) : undefined;

  useEffect(() => {
    if (cardId === undefined) return setData(null);
    let live = true;
    (async () => {
      const card = await reader.getCard(cardId);
      if (!card) return live && setData(null);
      const merchant = await reader.getMerchant(card.merchant);
      if (live) setData(merchant ? { card, merchant } : null);
    })().catch(() => live && setData(null));
    return () => {
      live = false;
    };
  }, [cardId, added]);

  useEffect(() => {
    if (!address) return setBalances(undefined);
    reader.getBalances(address).then(setBalances, () => setBalances(undefined));
  }, [address, added]);

  if (data === undefined) {
    return (
      <div className="mx-auto flex max-w-[520px] flex-col gap-4 px-5 pt-2 pb-12">
        <Skeleton className="h-8 w-3/4 rounded-[10px]" />
        <Skeleton className="aspect-[1.586] rounded-[22px]" />
        <Skeleton className="h-14 rounded-[14px]" />
      </div>
    );
  }

  if (data === null) {
    return (
      <div className="mx-auto max-w-[520px] px-5 pt-2 pb-12">
        <div className="flex flex-col items-center gap-2 rounded-[22px] border border-line bg-surface p-6 text-center">
          <h1 className="m-0 text-[22px] font-extrabold text-balance">That card does not exist.</h1>
          <p className="m-0 text-ink-2">Check the link with the person who shared it.</p>
        </div>
      </div>
    );
  }

  const { card, merchant } = data;
  const status = cardStatus(card, merchant);
  const rule = ruleCopy(card.expiry_keep_bps);
  const amount = dollars(pick);

  let error: { t: string; d: string } | undefined;
  if (status === "settled") {
    error = { t: "This card has already been settled.", d: "This gift has ended and its money has been shared out." };
  } else if (status === "closed") {
    error = { t: "This shop has closed.", d: "Chipping in is closed. Everyone who paid gets their share back." };
  } else if (status === "expired") {
    error = { t: "This card has expired.", d: "It is too late to chip in to this gift." };
  } else if (card.balance >= MAX_BALANCE) {
    error = { t: "A card can hold at most 1,000 USDC.", d: "This gift is already full. Thanks for thinking of them." };
  } else if (card.funder_count >= MAX_FUNDERS && added === undefined) {
    error = {
      t: "A card can have at most 20 people paying into it.",
      d: "20 people have already chipped in to this gift.",
    };
  }

  const card_ = (
    <GiftCard
      shop={merchant.name}
      amount={money(card.total_paid)}
      label="Gift so far"
      tag="Group gift"
      footLeft={people(card.funder_count)}
      footRight={error ? "" : daysLeftText(card.expires_at, nowSeconds())}
    />
  );

  if (error) {
    return (
      <div className="mx-auto flex max-w-[520px] flex-col gap-[18px] px-5 pt-2 pb-12">
        <div className="opacity-55 grayscale">{card_}</div>
        <div className="flex flex-col items-center gap-2 rounded-[22px] border border-line bg-surface p-6 text-center">
          <h1 className="m-0 text-[22px] font-extrabold text-balance">{error.t}</h1>
          <p className="m-0 text-ink-2">{error.d}</p>
        </div>
      </div>
    );
  }

  const tooMuch = card.balance + amount > MAX_BALANCE;
  const noUsdc = !!balances && (balances.usdc === undefined || balances.usdc < amount);
  const link = buildChipInLink(SITE_URL, cardId!);

  const chipIn = async () => {
    if (!address) {
      if (await connect()) toast("Wallet connected");
      return;
    }
    if (!writer || cardId === undefined) return;
    const done = await run({
      title: `Chip in to card #${cardId}`,
      amount: `${money(amount)} USDC`,
      build: () => writer.topUp(address, cardId, amount),
    });
    if (done !== undefined) setAdded(amount);
  };

  return (
    <div className="mx-auto flex max-w-[520px] flex-col gap-[22px] px-5 pt-2 pb-12">
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold text-ink-2">You're invited to chip in</span>
        <h1 className="m-0 text-[30px] leading-[1.1] font-extrabold tracking-[-.02em] [overflow-wrap:anywhere]">
          A group gift at {merchant.name}
        </h1>
      </div>
      {card_}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[15px] text-ink-2">Shop rule:</span>
        <button
          onClick={() => setRuleOpen(true)}
          className="min-h-[34px] cursor-pointer rounded-full border border-line bg-surface px-3 py-[5px] text-sm font-bold text-ink"
        >
          {rule.title}
        </button>
        <span className="text-[15px] text-ink-2">{rule.buyer}</span>
      </div>

      {added === undefined ? (
        <div className="flex flex-col gap-3">
          <span className="text-[17px] font-bold">How much would you like to add?</span>
          <Chips
            options={AMOUNTS}
            value={pick}
            label={(v) => `$${v}`}
            onPick={setPick}
            className="grid-cols-4"
            chipClassName="min-h-[54px] text-lg"
          />
          {tooMuch && <span className="text-sm text-bad">A card can hold at most 1,000 USDC.</span>}
          <span className="text-sm text-ink-2">If the shop closes, you get your money back.</span>
          {noUsdc && balances && (
            <div className="rounded-[14px] bg-bad-bg px-4 py-3.5 text-[15px] text-bad">
              <strong>Your wallet has {money(balances.usdc ?? 0n).slice(1)} USDC.</strong> On the test network you can
              get free test USDC from{" "}
              <a href={USDC_FAUCET_URL} target="_blank" rel="noreferrer" className="font-extrabold text-bad">
                Circle's faucet
              </a>
              .
            </div>
          )}
          <Button
            variant="accent"
            disabled={!!address && (tooMuch || noUsdc)}
            onClick={() => void chipIn()}
            className="tabular min-h-[60px] rounded-2xl text-[19px] font-extrabold"
          >
            {address ? `Chip in ${money(amount)} USDC` : "Connect wallet to chip in"}
          </Button>
        </div>
      ) : (
        <>
          <div className="animate-[kup_.4s_ease-out] flex flex-col gap-1.5 rounded-[18px] bg-ok-bg p-5 text-center text-ok">
            <span className="tabular text-[22px] font-extrabold">You added {money(added)} to the gift.</span>
            <span className="text-[15px]">Thank you. The person you're gifting will see the new total.</span>
          </div>
          <Button
            variant="secondary"
            onClick={async () => {
              const r = await shareLink(link, `A group gift at ${merchant.name}`);
              if (r === "copied") toast("Chip in link copied");
            }}
            className="min-h-[52px] rounded-[14px] text-base"
          >
            Share with someone else
          </Button>
        </>
      )}
      {ruleOpen && <RuleSheet bps={card.expiry_keep_bps} onClose={() => setRuleOpen(false)} />}
    </div>
  );
}
