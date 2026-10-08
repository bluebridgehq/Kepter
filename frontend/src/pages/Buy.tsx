import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  MAX_MESSAGE_LENGTH,
  buildCardLink,
  buildChipInLink,
  createCardKey,
  toUnits,
  type Backing,
  type Balances,
  type Merchant,
} from "@kepter/sdk";

import { GiftCard } from "../components/GiftCard.tsx";
import { BackingSheet, RuleSheet } from "../components/InfoSheets.tsx";
import { BackingBadge, Button, Chips, MessagePanel, QrImage, Skeleton, SuccessCheck } from "../components/ui.tsx";
import { backingText } from "../lib/backing.ts";
import { SITE_URL, USDC_FAUCET_URL, displayUrl, reader } from "../lib/config.ts";
import { dateLong, dateWithYear, dollars, money, nowSeconds, shortAddress } from "../lib/format.ts";
import { lowerFirst, ruleCopy } from "../lib/rules.ts";
import { copyText, downloadFile, shareLink, whatsappUrl } from "../lib/share.ts";
import { saveBoughtCard } from "../lib/storage.ts";
import { useToast } from "../lib/toast-context.ts";
import { useTx } from "../lib/tx-context.ts";
import { useWallet } from "../lib/wallet-context.ts";

const AMOUNTS = [10, 20, 50, 100];
const MONTHS = [1, 3, 6];
const DAYS: Record<number, number> = { 1: 30, 3: 90, 6: 180 };
/** Keeps the expiry inside the contract's limit even if the buyer's clock runs a little fast. */
const CLOCK_MARGIN = 600n;
const MIN_UNITS = dollars(1);
const MAX_UNITS = dollars(1000);

interface Bought {
  cardId: bigint;
  link: string;
  chipLink: string;
  amount: bigint;
}

function inputClass(extra = "") {
  return `min-h-[52px] rounded-[14px] border-[1.5px] border-line bg-surface px-3.5 text-[17px] font-medium text-ink outline-none focus:border-brand ${extra}`;
}

export function Buy() {
  const { shop = "" } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { run } = useTx();
  const { address, connect, writer } = useWallet();

  const [merchant, setMerchant] = useState<Merchant | null>();
  const [backing, setBacking] = useState<Backing>();
  const [balances, setBalances] = useState<Balances>();
  const [sheet, setSheet] = useState<"backing" | "rule" | null>(null);

  const [preset, setPreset] = useState<number | null>(20);
  const [custom, setCustom] = useState("");
  const [months, setMonths] = useState(3);
  const [to, setTo] = useState("");
  const [from, setFrom] = useState("");
  const [message, setMessage] = useState("");
  const [bought, setBought] = useState<Bought>();
  const [showCardQr, setShowCardQr] = useState(false);

  useEffect(() => {
    let live = true;
    setMerchant(undefined);
    reader
      .getMerchant(shop)
      .then((m) => live && setMerchant(m ?? null))
      .catch(() => live && setMerchant(null));
    reader.getBacking().then((b) => live && setBacking(b), () => undefined);
    return () => {
      live = false;
    };
  }, [shop]);

  useEffect(() => {
    if (!address) return setBalances(undefined);
    reader.getBalances(address).then(setBalances, () => setBalances(undefined));
  }, [address, bought]);

  if (merchant === undefined) {
    return (
      <div className="mx-auto flex max-w-[1040px] flex-col gap-3.5 px-5 pt-2 pb-12">
        <Skeleton className="h-[34px] w-3/5 rounded-[10px]" />
        <Skeleton className="h-[30px] w-2/5 rounded-full" />
        <Skeleton className="h-[220px] max-w-[420px] rounded-[22px]" />
        <Skeleton className="h-14 rounded-[14px]" />
      </div>
    );
  }

  const back = (
    <Button
      variant="secondary"
      onClick={() => navigate("/")}
      className="mt-2 min-h-[50px] rounded-[14px] px-[22px] text-base"
    >
      Back to Kepter
    </Button>
  );

  if (merchant === null) {
    return (
      <div className="mx-auto max-w-[1040px] px-5 pt-2 pb-12">
        <MessagePanel icon="!" title="That shop does not exist." action={back} className="mx-auto my-6 max-w-[520px]">
          Check the link with the shop, or scan the poster at their counter.
        </MessagePanel>
      </div>
    );
  }

  if (merchant.closed_at !== undefined) {
    return (
      <div className="mx-auto max-w-[1040px] px-5 pt-2 pb-12">
        <MessagePanel icon="!" title="This shop has closed." action={back} className="mx-auto my-6 max-w-[520px]">
          It is no longer selling gift cards. Everyone who bought a card gets their money back.
        </MessagePanel>
      </div>
    );
  }

  let amount: bigint | undefined;
  if (custom !== "") {
    try {
      amount = toUnits(custom);
    } catch {
      amount = undefined;
    }
  } else if (preset !== null) {
    amount = dollars(preset);
  }
  const amountBad = amount === undefined || amount < MIN_UNITS || amount > MAX_UNITS;
  const shown = amountBad ? 0n : amount!;

  const now = nowSeconds();
  const days = DAYS[months];
  const expiresAt = now + BigInt(days) * 86400n - CLOCK_MARGIN;
  const rule = ruleCopy(merchant.expiry_keep_bps);
  const ownShop = address === shop;
  const noUsdc = !!balances && (balances.usdc === undefined || (!amountBad && balances.usdc < shown));
  const messageTooLong = message.length > MAX_MESSAGE_LENGTH;
  const payDisabled = !!address && (amountBad || noUsdc || ownShop || messageTooLong);

  const pay = async () => {
    if (!address) {
      if (await connect()) toast("Wallet connected");
      return;
    }
    if (!writer || amountBad) return;
    const key = createCardKey();
    const cardId = await run({
      title: `Gift card at ${merchant.name}`,
      amount: `${money(shown)} USDC`,
      build: () =>
        writer.buyCard({ buyer: address, merchant: shop, amount: shown, cardKey: key.publicKey, expiresAt }),
    });
    if (cardId === undefined) return;
    const link = buildCardLink(SITE_URL, {
      cardId,
      secret: key.secret,
      to: to.trim() || undefined,
      from: from.trim() || undefined,
      message: message.trim() || undefined,
    });
    const chipLink = buildChipInLink(SITE_URL, cardId);
    saveBoughtCard({
      cardId: cardId.toString(),
      link,
      shop: merchant.name,
      amount: shown.toString(),
      savedAt: Date.now(),
    });
    setBought({ cardId, link, chipLink, amount: shown });
  };

  if (bought) {
    const giftText = `${to.trim() ? `Hi ${to.trim()}! ` : ""}You've got a gift card for ${merchant.name}. Open it here: ${bought.link}`;
    return (
      <div className="mx-auto flex max-w-[1040px] flex-col gap-6 px-5 pt-2 pb-12">
        <div className="animate-[kup_.4s_ease-out] mx-auto flex w-full max-w-[560px] flex-col gap-[18px]">
          <div className="flex flex-col items-center gap-2 text-center">
            <SuccessCheck size={60} icon={28} />
            <h1 className="m-0 text-[30px] font-extrabold tracking-[-.02em]">Your gift card is ready</h1>
            <span className="tabular text-ink-2">
              {money(bought.amount)} at {merchant.name} · Card #{String(bought.cardId)}
            </span>
          </div>

          <div className="flex flex-col gap-3.5 rounded-[22px] border-2 border-accent bg-surface p-5">
            <div className="flex flex-col gap-0.5">
              <span className="text-[13px] font-extrabold tracking-[.08em] text-ink-2 uppercase">Card link</span>
              <span className="text-[19px] font-extrabold">Send this to the person you are gifting.</span>
            </div>
            <div className="tabular rounded-xl bg-surface-2 px-3.5 py-3 font-semibold">
              {displayUrl(bought.link.split("#")[0])}#••••••••
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant="secondary"
                onClick={async () => toast((await copyText(bought.link)) ? "Card link copied" : "Could not copy")}
                className="min-h-[50px] rounded-xl text-[15px]"
              >
                Copy
              </Button>
              <a
                href={whatsappUrl(giftText)}
                target="_blank"
                rel="noreferrer"
                className="flex min-h-[50px] items-center justify-center rounded-xl bg-[#1F8E4A] text-[15px] font-bold text-white no-underline hover:text-white"
              >
                WhatsApp
              </a>
              <Button
                variant="secondary"
                onClick={() => setShowCardQr(!showCardQr)}
                className="min-h-[50px] rounded-xl text-[15px]"
              >
                {showCardQr ? "Hide QR" : "Show QR"}
              </Button>
            </div>
            {showCardQr && (
              <div className="flex justify-center">
                <div className="rounded-xl border border-line bg-white p-2.5">
                  <QrImage text={bought.link} size={180} label="QR of the card link" />
                </div>
              </div>
            )}
            <div className="rounded-xl bg-warn-bg px-3.5 py-3 text-[15px] font-bold text-warn">
              Anyone with this link can spend the card. Only send it to them.
            </div>
          </div>

          <div className="flex flex-col gap-3.5 rounded-[22px] border border-line bg-surface p-5">
            <div className="flex flex-col gap-0.5">
              <span className="text-[13px] font-extrabold tracking-[.08em] text-ink-2 uppercase">Chip in link</span>
              <span className="text-[19px] font-extrabold">Share this with people who want to chip in.</span>
            </div>
            <div className="rounded-xl bg-surface-2 px-3.5 py-3 font-semibold">{displayUrl(bought.chipLink)}</div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="secondary"
                onClick={async () => toast((await copyText(bought.chipLink)) ? "Chip in link copied" : "Could not copy")}
                className="min-h-[50px] rounded-xl text-[15px]"
              >
                Copy
              </Button>
              <Button
                variant="secondary"
                onClick={async () => {
                  const r = await shareLink(bought.chipLink, `A group gift at ${merchant.name}`);
                  if (r === "copied") toast("Chip in link copied");
                }}
                className="min-h-[50px] rounded-xl text-[15px]"
              >
                Share
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-[15px] text-ink-2">
            <span>The card link is also saved on this device.</span>
            <a
              href="#"
              className="font-bold"
              onClick={(e) => {
                e.preventDefault();
                downloadFile(
                  `kepter-card-${bought.cardId}.txt`,
                  [
                    `Kepter gift card #${bought.cardId}`,
                    `Shop: ${merchant.name}`,
                    `Amount: ${money(bought.amount)}`,
                    "",
                    "Card link (anyone with it can spend the card):",
                    bought.link,
                    "",
                    "Chip in link:",
                    bought.chipLink,
                  ].join("\n"),
                  "text/plain",
                );
                toast("Backup downloaded");
              }}
            >
              Download a backup
            </a>
          </div>
          <Button
            variant="ghost"
            onClick={() => {
              setBought(undefined);
              setShowCardQr(false);
              setTo("");
              setFrom("");
              setMessage("");
            }}
            className="min-h-11 text-base"
          >
            Buy another card
          </Button>
        </div>
      </div>
    );
  }

  const amountHint = amountBad
    ? amount !== undefined && amount > MAX_UNITS
      ? "A card can hold at most 1,000 USDC."
      : "That amount is not allowed. Cards and top ups start at 1 USDC."
    : "From $1 to $1,000.";

  return (
    <div className="mx-auto flex max-w-[1040px] flex-col gap-6 px-5 pt-2 pb-12">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2.5">
          <span className="text-sm font-semibold text-ink-2">Gift cards from</span>
          <h1 className="m-0 text-[clamp(30px,5vw,42px)] leading-[1.08] font-extrabold tracking-[-.025em] [overflow-wrap:anywhere]">
            {merchant.name}
          </h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <BackingBadge text={backingText(merchant, backing)} onClick={() => setSheet("backing")} />
            <span className="tabular text-sm text-ink-2">Shop account {shortAddress(shop)}</span>
          </div>
          <span className="text-sm text-ink-2">Get this link from the shop itself.</span>
        </div>

        {ownShop && (
          <div className="rounded-[14px] bg-brand-soft px-4 py-3.5 text-[15px] font-semibold text-brand-text">
            This is your shop. This is what buyers see.{" "}
            <a
              href="/shop"
              onClick={(e) => (e.preventDefault(), navigate("/shop"))}
              className="font-extrabold text-brand-text"
            >
              Go to your dashboard
            </a>
          </div>
        )}

        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,400px),1fr))] items-start gap-8">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2.5">
              <span className="text-[17px] font-bold">Amount</span>
              <Chips
                options={AMOUNTS}
                value={custom === "" ? preset : null}
                label={(v) => `$${v}`}
                onPick={(v) => {
                  setPreset(v);
                  setCustom("");
                }}
                className="grid-cols-4"
                chipClassName="min-h-[54px] text-lg"
              />
              <div
                className={`flex min-h-[54px] items-center gap-2 rounded-[14px] border-[1.5px] bg-surface px-4 ${
                  custom !== "" ? (amountBad ? "border-bad" : "border-brand") : "border-line"
                }`}
              >
                <span className="text-lg font-bold text-ink-2">$</span>
                <input
                  inputMode="decimal"
                  value={custom}
                  onChange={(e) => setCustom(e.target.value.replace(/[^0-9.]/g, ""))}
                  placeholder="Other amount"
                  aria-label="Other amount"
                  className="tabular min-w-0 flex-1 border-none bg-transparent text-lg font-semibold text-ink outline-none"
                />
                <span className="text-[13px] font-bold text-ink-2">USDC</span>
              </div>
              <span className={`text-sm ${amountBad ? "text-bad" : "text-ink-2"}`}>{amountHint}</span>
            </div>

            <div className="flex flex-col gap-2.5">
              <span className="text-[17px] font-bold">Valid for</span>
              <Chips
                options={MONTHS}
                value={months}
                label={(v) => (v === 1 ? "1 month" : `${v} months`)}
                onPick={setMonths}
                className="grid-cols-3"
                chipClassName="min-h-[50px] text-base"
              />
              <span className="text-sm text-ink-2">
                Use by {dateWithYear(expiresAt)} · {days} days
              </span>
            </div>

            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,160px),1fr))] gap-3">
              <label className="flex flex-col gap-1.5 font-bold">
                <span>
                  For <span className="text-sm font-medium text-ink-2">optional</span>
                </span>
                <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="Their name" maxLength={40} className={inputClass()} />
              </label>
              <label className="flex flex-col gap-1.5 font-bold">
                <span>
                  From <span className="text-sm font-medium text-ink-2">optional</span>
                </span>
                <input value={from} onChange={(e) => setFrom(e.target.value)} placeholder="Your name" maxLength={60} className={inputClass()} />
              </label>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="font-bold">
                Message <span className="text-sm font-medium text-ink-2">optional</span>
              </span>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                placeholder="Write something nice"
                className={`resize-y rounded-[14px] border-[1.5px] bg-surface px-3.5 py-3 text-[17px] leading-[1.45] text-ink outline-none focus:border-brand ${
                  messageTooLong ? "border-bad" : "border-line"
                }`}
              />
              <div className="flex justify-between gap-3 text-sm text-ink-2">
                <span>Names and message stay in the link. They are never stored publicly.</span>
                <span className={`tabular whitespace-nowrap ${messageTooLong ? "text-bad" : ""}`}>
                  {message.length} / {MAX_MESSAGE_LENGTH}
                </span>
              </div>
            </div>
          </div>

          <div className="sticky top-4 flex flex-col gap-4">
            <div className="w-full max-w-[440px]">
              <GiftCard
                shop={merchant.name}
                amount={money(shown)}
                label="Gift card"
                tag="Kepter gift"
                footLeft={to.trim() ? `For ${to.trim()}` : ""}
                footRight={`Use by ${dateLong(expiresAt)}`}
              />
            </div>
            {message.trim() && (
              <div className="flex max-w-[440px] flex-col gap-1 rounded-[4px_18px_18px_18px] border border-line bg-surface px-4 py-3.5">
                <span className="text-[13px] font-bold text-ink-2">
                  {from.trim() ? `From ${from.trim()}` : "A message for you"}
                </span>
                <span className="whitespace-pre-wrap [overflow-wrap:anywhere]">{message}</span>
              </div>
            )}
            <div className="flex max-w-[440px] flex-col gap-2 rounded-2xl bg-surface-2 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[13px] font-bold tracking-[.06em] text-ink-2 uppercase">Shop rule</span>
                <button
                  onClick={() => setSheet("rule")}
                  className="cursor-pointer rounded-full border border-line bg-surface px-2.5 py-[3px] text-[13px] font-bold text-ink"
                >
                  {rule.title}
                </button>
              </div>
              <span className="text-[15px]">
                <strong>If the card expires unused:</strong> {lowerFirst(rule.buyer)}
              </span>
              <span className="flex gap-2 text-[15px]">
                <span className="font-extrabold text-ok">✓</span>If the shop closes, you get your money back.
              </span>
            </div>
            {noUsdc && balances && (
              <div className="max-w-[440px] rounded-[14px] bg-bad-bg px-4 py-3.5 text-[15px] text-bad">
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
              disabled={payDisabled}
              onClick={() => void pay()}
              className="tabular min-h-[60px] max-w-[440px] rounded-2xl text-[19px] font-extrabold"
            >
              {address ? `Pay ${money(shown)} USDC` : "Connect wallet to pay"}
            </Button>
          </div>
        </div>
      </div>

      {sheet === "backing" && <BackingSheet onClose={() => setSheet(null)} />}
      {sheet === "rule" && <RuleSheet bps={merchant.expiry_keep_bps} onClose={() => setSheet(null)} />}
    </div>
  );
}
