import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import {
  categoryName,
  encodeRedeemQr,
  parseCardLink,
  signRedeem,
  toUnits,
  type Card,
  type CardLink,
  type Merchant,
} from "@kepter/sdk";

import { GiftCard } from "../components/GiftCard.tsx";
import { Button, QrImage, Skeleton, StatusPill } from "../components/ui.tsx";
import { QR_SECONDS, network, reader } from "../lib/config.ts";
import { contactKind, contactLabel, contactUrl } from "../lib/contact.ts";
import { dateLong, dateShort, daysLeftText, dollars, mmss, money, nowSeconds } from "../lib/format.ts";
import { ruleCopy } from "../lib/rules.ts";
import { calendarFile, copyText, downloadFile, isLikelyDesktop, whatsappUrl } from "../lib/share.ts";
import { cardStatus, isUsable, type CardStatus } from "../lib/status.ts";
import { cacheBalance, cachedBalance, giftOpened, markGiftOpened } from "../lib/storage.ts";
import { useToast } from "../lib/toast-context.ts";

type Step = "wrapped" | "view" | "amount" | "qr" | "online";
type Mode = "counter" | "online";

interface Loaded {
  card: Card;
  merchant: Merchant;
}

interface Code {
  text: string;
  amount: bigint;
  nonce: number;
  validUntil: number;
}

function parseLink(cardIdText: string): CardLink | undefined {
  try {
    const link = parseCardLink(window.location.href);
    return link.cardId.toString() === cardIdText ? link : undefined;
  } catch {
    return undefined;
  }
}

function endNote(status: CardStatus, card: Card): { t: string; d: string } | undefined {
  switch (status) {
    case "spent":
      return { t: "All used. Enjoy!", d: "This gift has been fully spent." };
    case "expired":
      return { t: `This card expired on ${dateLong(card.expires_at)}.`, d: ruleCopy(card.expiry_keep_bps).recipient };
    case "closed":
      return { t: "This shop has closed.", d: "The money goes back to the people who gave you this gift." };
    case "settled":
      return { t: "This gift has ended.", d: "The money left on it has been shared out by the shop's rule." };
    default:
      return undefined;
  }
}

export function GiftCardPage() {
  const { cardId: idText = "" } = useParams();
  const toast = useToast();
  const link = useMemo(() => parseLink(idText), [idText]);

  const [data, setData] = useState<Loaded | null>();
  const [offlineSince, setOfflineSince] = useState<number>();
  const [continued, setContinued] = useState(false);
  const [step, setStep] = useState<Step>(() => (link && !giftOpened(idText) ? "wrapped" : "view"));
  const [opening, setOpening] = useState(false);
  const [bill, setBill] = useState("");
  const [mode, setMode] = useState<Mode>("counter");
  const [code, setCode] = useState<Code>();
  const [now, setNow] = useState(() => Number(nowSeconds()));
  const [showRefresh, setShowRefresh] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const wakeLock = useRef<WakeLockSentinel | null>(null);

  const fetchCard = useCallback(async (): Promise<Loaded | null> => {
    if (!link) return null;
    const card = await reader.getCard(link.cardId);
    if (!card) return null;
    const merchant = await reader.getMerchant(card.merchant);
    if (!merchant) return null;
    cacheBalance(idText, card.balance);
    return { card, merchant };
  }, [link, idText]);

  useEffect(() => {
    if (!link) return setData(null);
    let live = true;
    fetchCard()
      .then((loaded) => {
        if (!live) return;
        setData(loaded);
        setOfflineSince(undefined);
      })
      .catch(() => {
        if (!live) return;
        setOfflineSince(cachedBalance(idText)?.at ?? Date.now());
        setData(null);
      });
    return () => {
      live = false;
    };
  }, [link, idText, fetchCard]);

  const showingCode = step === "qr" || step === "online";

  useEffect(() => {
    if (!showingCode) return;
    const tick = setInterval(() => setNow(Number(nowSeconds())), 1000);
    return () => clearInterval(tick);
  }, [showingCode]);

  // While the code is on screen, watch for the shop completing the payment.
  useEffect(() => {
    if (!showingCode || !code) return;
    const poll = setInterval(async () => {
      try {
        const loaded = await fetchCard();
        if (loaded && loaded.card.nonce > code.nonce) {
          setData(loaded);
          setCode(undefined);
          setShowRefresh(false);
          setStep("view");
          toast(`Balance now ${money(loaded.card.balance)}`);
        }
      } catch {
        // Keep showing the code; the next poll may succeed.
      }
    }, 4000);
    return () => clearInterval(poll);
  }, [showingCode, code, fetchCard, toast]);

  useEffect(() => {
    if (step !== "qr") return;
    navigator.wakeLock
      ?.request("screen")
      .then((lock) => (wakeLock.current = lock))
      .catch(() => undefined);
    return () => {
      void wakeLock.current?.release().catch(() => undefined);
      wakeLock.current = null;
    };
  }, [step]);

  const makeCode = useCallback(
    async (amount: bigint, next: "qr" | "online") => {
      if (!link) return;
      let loaded = data;
      try {
        loaded = (await fetchCard()) ?? loaded;
        if (loaded) setData(loaded);
      } catch {
        // Offline: sign with the last known nonce.
      }
      if (!loaded) return;
      const validUntil = Math.floor(Date.now() / 1000) + QR_SECONDS;
      const qr = signRedeem(link.secret, {
        networkPassphrase: network.networkPassphrase,
        cardId: link.cardId,
        amount,
        nonce: loaded.card.nonce,
        validUntil: BigInt(validUntil),
      });
      setNow(Math.floor(Date.now() / 1000));
      setCode({ text: encodeRedeemQr(qr), amount, nonce: loaded.card.nonce, validUntil });
      setStep(next);
    },
    [link, data, fetchCard],
  );

  if (!link) {
    return (
      <div className="mx-auto flex max-w-[440px] flex-col gap-5 px-5 pt-1 pb-10">
        <div className="flex flex-col items-center gap-3 px-2 py-12 text-center">
          <span className="flex size-16 items-center justify-center rounded-full bg-muted-bg text-[28px] font-extrabold text-muted">
            ?
          </span>
          <h1 className="m-0 text-2xl font-extrabold text-balance">This link looks incomplete.</h1>
          <p className="m-0 text-[17px] text-ink-2">Ask the person who sent it to send it again.</p>
        </div>
      </div>
    );
  }

  if (!continued && isLikelyDesktop()) {
    return (
      <div className="mx-auto flex max-w-[440px] flex-col gap-5 px-5 pt-1 pb-10">
        <div className="flex flex-col items-center gap-3.5 py-6 text-center">
          <h1 className="m-0 text-[26px] font-extrabold tracking-[-.02em]">This gift works best on your phone</h1>
          <p className="m-0 text-ink-2">Scan this with your phone camera to open it there. You'll show a code at the counter.</p>
          <div className="rounded-2xl border border-line bg-white p-3.5">
            <QrImage text={window.location.href} size={200} label="QR code to open this gift on your phone" />
          </div>
          <Button
            variant="secondary"
            onClick={() => setContinued(true)}
            className="min-h-[50px] rounded-[14px] bg-transparent px-[22px] text-base"
          >
            Continue here anyway
          </Button>
        </div>
      </div>
    );
  }

  if (data === undefined) {
    return (
      <div className="mx-auto flex max-w-[440px] flex-col gap-3.5 px-5 pt-1 pb-10">
        <Skeleton className="aspect-[1.586] rounded-[22px]" />
        <Skeleton className="h-[22px] w-[55%] rounded-lg" />
        <Skeleton className="h-[60px] rounded-[14px]" />
        <span className="text-center text-ink-2">Opening your gift…</span>
      </div>
    );
  }

  const cached = cachedBalance(idText);
  if (data === null && !(offlineSince && cached)) {
    return (
      <div className="mx-auto flex max-w-[440px] flex-col gap-5 px-5 pt-1 pb-10">
        <div className="flex flex-col items-center gap-3 px-2 py-12 text-center">
          <span className="flex size-16 items-center justify-center rounded-full bg-muted-bg text-[28px] font-extrabold text-muted">
            ?
          </span>
          <h1 className="m-0 text-2xl font-extrabold text-balance">
            {offlineSince ? "You're offline." : "This link looks incomplete."}
          </h1>
          <p className="m-0 text-[17px] text-ink-2">
            {offlineSince ? "Connect to the internet to open your gift." : "Ask the person who sent it to send it again."}
          </p>
        </div>
      </div>
    );
  }

  const card = data?.card;
  const merchant = data?.merchant;
  const shopName = merchant?.name ?? "";
  const balance = card?.balance ?? BigInt(cached?.balance ?? "0");
  const status: CardStatus = card ? cardStatus(card, merchant) : "active";
  const ended = !isUsable(status);
  const note = card ? endNote(status, card) : undefined;
  const from = link.from;
  const forText = link.to ? `For ${link.to}` : "";
  const expires = card?.expires_at;

  if (step === "wrapped" && !ended) {
    const unwrap = () => {
      if (opening) return;
      setOpening(true);
      markGiftOpened(idText);
      setTimeout(() => setStep("view"), 900);
    };
    return (
      <div className="mx-auto flex max-w-[440px] flex-col gap-5 px-5 pt-1 pb-10">
        <div className="flex flex-col items-center gap-5 pt-3">
          <div
            className="flex flex-col gap-1 text-center transition-opacity duration-300"
            style={{ opacity: opening ? 0 : 1 }}
          >
            <span className="text-[15px] text-ink-2">You've got a gift</span>
            {from && <span className="text-[26px] font-extrabold tracking-[-.02em]">From {from}</span>}
          </div>
          <button
            onClick={unwrap}
            aria-label="Tap to open your gift"
            className="relative w-full cursor-pointer rounded-[22px] border-none bg-transparent p-0"
          >
            <div
              style={{
                transform: opening ? "scale(1.04)" : "scale(.96)",
                transition: "transform .5s cubic-bezier(.2,.9,.3,1.2)",
              }}
            >
              <GiftCard
                shop={shopName}
                amount={money(balance)}
                label="Balance"
                tag="Gift card"
                footLeft={forText}
                footRight={expires ? `Use by ${dateShort(expires)}` : ""}
              />
            </div>
            <div className="pointer-events-none absolute -inset-1.5 overflow-hidden rounded-[24px]">
              <div
                className="absolute top-0 bottom-0 left-0 w-[50.5%] bg-[#F2A33A] bg-[repeating-linear-gradient(45deg,rgba(255,255,255,.18)_0_10px,transparent_10px_20px)]"
                style={{
                  transform: opening ? "translateX(-105%) rotate(-8deg)" : "none",
                  transition: "transform .7s cubic-bezier(.6,0,.3,1)",
                }}
              />
              <div
                className="absolute top-0 right-0 bottom-0 w-[50.5%] bg-[#F2A33A] bg-[repeating-linear-gradient(-45deg,rgba(255,255,255,.18)_0_10px,transparent_10px_20px)]"
                style={{
                  transform: opening ? "translateX(105%) rotate(8deg)" : "none",
                  transition: "transform .7s cubic-bezier(.6,0,.3,1)",
                }}
              />
              <div
                className="absolute top-[calc(50%-14px)] right-0 left-0 h-7 bg-[#0F4C3A] transition-opacity duration-250"
                style={{ opacity: opening ? 0 : 1 }}
              />
              <div
                className="absolute top-0 bottom-0 left-[calc(50%-14px)] w-7 bg-[#0F4C3A] transition-opacity duration-250"
                style={{ opacity: opening ? 0 : 1 }}
              />
              <div
                className="absolute top-1/2 left-1/2 -mt-[38px] -ml-[38px] flex size-[76px] items-center justify-center rounded-full bg-white text-[15px] font-extrabold text-[#0F4C3A] shadow-[0_6px_20px_rgba(0,0,0,.2)] transition-opacity duration-250"
                style={{ opacity: opening ? 0 : 1 }}
              >
                Open
              </div>
            </div>
          </button>
          <span className="text-[15px] text-ink-2 transition-opacity" style={{ opacity: opening ? 0 : 1 }}>
            Tap the gift to open it
          </span>
          <button
            onClick={() => {
              markGiftOpened(idText);
              setStep("view");
            }}
            className="min-h-11 cursor-pointer border-none bg-transparent text-[15px] font-semibold text-ink-2 underline"
          >
            Skip
          </button>
        </div>
      </div>
    );
  }

  if (step === "amount") {
    let amount: bigint | undefined;
    try {
      amount = bill ? toUnits(bill) : undefined;
    } catch {
      amount = undefined;
    }
    const over = amount !== undefined && amount > balance;
    const billBad = amount === undefined || amount <= 0n || over;
    return (
      <div className="mx-auto flex max-w-[440px] flex-col gap-5 px-5 pt-1 pb-10">
        <div className="animate-kup flex flex-col gap-[18px]">
          <button
            onClick={() => setStep("view")}
            className="min-h-11 cursor-pointer self-start border-none bg-transparent p-0 text-base font-semibold text-ink"
          >
            ← Back
          </button>
          <h1 className="m-0 text-[28px] font-extrabold tracking-[-.02em]">
            {mode === "online" ? "How much is your order?" : "How much is the bill?"}
          </h1>
          <div
            className={`flex items-center gap-1.5 rounded-[22px] border-2 bg-surface px-5 py-[18px] ${
              billBad && bill !== "" ? "border-bad" : "border-line"
            }`}
          >
            <span className="text-[44px] font-extrabold text-ink-2">$</span>
            <input
              inputMode="decimal"
              value={bill}
              onChange={(e) => setBill(e.target.value.replace(/[^0-9.]/g, ""))}
              placeholder="0.00"
              aria-label="Bill amount"
              autoFocus
              className="tabular min-w-0 flex-1 border-none bg-transparent text-[52px] font-extrabold tracking-[-.02em] text-ink outline-none"
            />
          </div>
          <span className={`tabular text-[15px] ${over ? "text-bad" : "text-ink-2"}`}>
            {over ? "There is not enough left on this card." : `You have ${money(balance)} to spend.`}
          </span>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                ["Full balance", balance],
                ["$5", dollars(5)],
                ["$10", dollars(10)],
              ] as Array<[string, bigint]>
            ).map(([label, value]) => (
              <button
                key={label}
                onClick={() => setBill((Number(value) / 1e7).toString())}
                className="tabular min-h-[52px] cursor-pointer rounded-[14px] border-[1.5px] border-line bg-surface text-base font-bold text-ink"
              >
                {label}
              </button>
            ))}
          </div>
          <Button
            variant="accent"
            disabled={billBad}
            onClick={() => amount !== undefined && void makeCode(amount, mode === "online" ? "online" : "qr")}
            className="min-h-[62px] rounded-2xl text-[19px] font-extrabold"
          >
            {mode === "online" ? "Get my payment code" : "Show my code"}
          </Button>
        </div>
      </div>
    );
  }

  if (step === "qr" && code) {
    const left = code.validUntil - now;
    return (
      <div className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-3 overflow-auto bg-white p-6 text-center text-[#14211D]">
        <span className="text-[17px] font-bold">Show this to the cashier</span>
        <span className="tabular text-6xl leading-none font-extrabold tracking-[-.03em]">{money(code.amount)}</span>
        <span className="text-base text-[#4B5853]">at {shopName}</span>
        <div className="my-1.5 rounded-[20px] border-[3px] border-[#14211D] p-3.5" style={{ opacity: left > 0 ? 1 : 0.2 }}>
          <QrImage text={code.text} size="min(68vw, 280px)" label="Payment code" />
        </div>
        <span className={`tabular text-lg font-bold ${left > 0 ? "text-[#14211D]" : "text-[#B3261E]"}`}>
          {left > 0 ? `Code works for ${mmss(left)}` : "This code has expired. Make a new one."}
        </span>
        <div className="mt-2 flex w-full max-w-[340px] flex-col gap-2">
          <button
            onClick={() => void makeCode(code.amount, "qr")}
            className="min-h-[52px] cursor-pointer rounded-[14px] border-none bg-[#F4EEE4] text-base font-bold text-[#14211D]"
          >
            Make a new code
          </button>
          <button
            onClick={() => {
              setCode(undefined);
              setShowRefresh(true);
              setStep("view");
            }}
            className="min-h-[52px] cursor-pointer rounded-[14px] border-none bg-[#0F4C3A] text-base font-bold text-white"
          >
            Done
          </button>
        </div>
        <span className="max-w-[30ch] text-[13px] text-[#4B5853]">
          Code not working? Your phone's clock may be off. Make a new code.
        </span>
      </div>
    );
  }

  if (step === "online" && code) {
    const left = code.validUntil - now;
    const contact = merchant?.contact ?? "";
    const kind = contactKind(contact);
    const message = `Hi ${shopName}, I'd like to pay ${money(code.amount)} for my order with my Kepter gift card. Payment code: ${code.text}`;
    const finish = () => {
      setCode(undefined);
      setShowRefresh(true);
      setStep("view");
    };
    return (
      <div className="mx-auto flex max-w-[440px] flex-col gap-5 px-5 pt-1 pb-10">
        <div className="animate-kup flex flex-col gap-[18px]">
          <div className="flex flex-col gap-1">
            <span className="text-[15px] font-semibold text-ink-2">Your payment code for {shopName}</span>
            <span className="tabular text-5xl leading-none font-extrabold tracking-[-.03em]">{money(code.amount)}</span>
          </div>
          <div
            className={`tabular rounded-2xl border-[1.5px] border-line bg-surface-2 p-4 font-mono text-[15px] break-all select-all ${
              left > 0 ? "" : "opacity-40"
            }`}
          >
            {code.text}
          </div>
          <span className={`tabular text-[17px] font-bold ${left > 0 ? "text-ink" : "text-bad"}`}>
            {left > 0 ? `Works for ${mmss(left)}` : "This code has expired. Make a new one."}
          </span>
          {left > 0 && (
            <div className="flex flex-col gap-2.5">
              {kind === "whatsapp" ? (
                <a
                  href={contactUrl(contact, message)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex min-h-[58px] items-center justify-center rounded-2xl bg-accent text-[17px] font-extrabold text-accent-ink no-underline hover:text-accent-ink"
                >
                  Send to {shopName} on WhatsApp
                </a>
              ) : (
                <a
                  href={whatsappUrl(message)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex min-h-[58px] items-center justify-center rounded-2xl bg-accent text-[17px] font-extrabold text-accent-ink no-underline hover:text-accent-ink"
                >
                  Send with WhatsApp
                </a>
              )}
              <Button
                variant="secondary"
                onClick={async () => toast((await copyText(message)) ? "Code copied" : "Could not copy")}
                className="min-h-[52px] rounded-2xl text-base"
              >
                Copy code
              </Button>
              {kind === "website" && (
                <a
                  href={contactUrl(contact)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex min-h-[52px] items-center justify-center rounded-2xl border-[1.5px] border-line bg-surface text-base font-bold text-ink no-underline hover:text-ink"
                >
                  Open {contactLabel(contact)}
                </a>
              )}
            </div>
          )}
          <div className="flex flex-col gap-1.5 rounded-[18px] border border-line bg-surface p-[18px] text-[15px] text-ink-2">
            <span>Send this code to the shop with your order. They charge it, then you get your order.</span>
            <span>Only {shopName} can use it, and only for {money(code.amount)}. This page updates when they do.</span>
          </div>
          <div className="flex gap-2.5">
            <Button
              variant="secondary"
              onClick={() => void makeCode(code.amount, "online")}
              className="min-h-[52px] flex-1 rounded-2xl text-base"
            >
              New code
            </Button>
            <Button onClick={finish} className="min-h-[52px] flex-1 rounded-2xl text-base">
              Done
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const endedDate = merchant?.closed_at !== undefined && status === "closed" ? merchant.closed_at : expires;

  return (
    <div className="mx-auto flex max-w-[440px] flex-col gap-5 px-5 pt-1 pb-10">
      <div className="animate-kup-slow flex flex-col gap-[18px]">
        {offlineSince && cached && (
          <div className="rounded-[14px] bg-muted-bg px-3.5 py-3 text-[15px] text-ink">
            You're offline. This is your balance from{" "}
            {new Date(cached.at).toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit" })}. It may have
            changed.
          </div>
        )}
        <div style={{ filter: ended && status !== "spent" ? "grayscale(.85) opacity(.7)" : "none" }}>
          <GiftCard
            shop={shopName}
            amount={money(balance)}
            label="Balance"
            tag="Gift card"
            footLeft={forText}
            footRight={expires ? `Use by ${dateShort(expires)}` : ""}
          />
        </div>
        {card && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-col">
              <span className="text-[17px] font-bold">
                {ended && status !== "spent" && endedDate
                  ? `Ended ${dateLong(endedDate)}`
                  : `Use by ${dateLong(card.expires_at)}`}
              </span>
              <span className="text-[15px] text-ink-2">
                {ended ? (status === "spent" ? "Fully used" : "No longer usable") : daysLeftText(card.expires_at)}
              </span>
            </div>
            <StatusPill status={status} large />
          </div>
        )}

        {note && (
          <div className="flex flex-col gap-1.5 rounded-[18px] border border-line bg-surface p-5">
            <span className="text-xl font-extrabold">{note.t}</span>
            <span className="text-ink-2">{note.d}</span>
          </div>
        )}

        {link.message && (
          <div className="flex flex-col gap-1 rounded-[4px_20px_20px_20px] border border-line bg-surface px-[18px] py-4">
            <span className="text-[13px] font-bold text-ink-2">{from ? `From ${from}` : "A message for you"}</span>
            <span className="text-[17px] whitespace-pre-wrap [overflow-wrap:anywhere]">{link.message}</span>
          </div>
        )}

        {merchant && !ended && (
          <div className="flex flex-col gap-1 rounded-[18px] border border-line bg-surface px-[18px] py-4">
            <span className="text-[13px] font-bold text-ink-2">Where to use it</span>
            <span className="text-[17px] font-bold [overflow-wrap:anywhere]">{shopName}</span>
            <span className="text-[15px] text-ink-2 [overflow-wrap:anywhere]">
              {categoryName(merchant.category)} · {merchant.city}
            </span>
            {contactUrl(merchant.contact) && (
              <a href={contactUrl(merchant.contact)} target="_blank" rel="noreferrer" className="text-[15px] font-semibold">
                {contactLabel(merchant.contact)}
              </a>
            )}
          </div>
        )}

        {!ended && (
          <div className="flex flex-col gap-2.5">
            {showRefresh && (
              <div className="flex items-center justify-between gap-3 rounded-2xl bg-brand-soft px-4 py-3.5">
                <span className="text-[15px] text-ink">Paid already? Refresh to see your balance.</span>
                <Button
                  onClick={async () => {
                    setRefreshing(true);
                    try {
                      const loaded = await fetchCard();
                      if (loaded) {
                        setData(loaded);
                        toast(`Balance now ${money(loaded.card.balance)}`);
                      }
                      setShowRefresh(false);
                    } catch {
                      toast("Could not refresh. Check your connection.");
                    } finally {
                      setRefreshing(false);
                    }
                  }}
                  className="min-h-11 flex-none rounded-xl px-4"
                >
                  {refreshing ? "Checking…" : "Refresh"}
                </Button>
              </div>
            )}
            <Button
              variant="accent"
              disabled={!card || !!offlineSince}
              onClick={() => {
                setBill("");
                setMode("counter");
                setStep("amount");
              }}
              className="min-h-[62px] rounded-2xl text-[19px] font-extrabold"
            >
              Pay at the counter
            </Button>
            <Button
              variant="secondary"
              disabled={!card || !!offlineSince}
              onClick={() => {
                setBill("");
                setMode("online");
                setStep("amount");
              }}
              className="min-h-[56px] rounded-2xl text-[17px]"
            >
              Use online
            </Button>
            {card && (
              <Button
                variant="secondary"
                onClick={() => {
                  const ends = new Date(Number(card.expires_at) * 1000);
                  downloadFile(
                    "kepter-gift.ics",
                    calendarFile(
                      `Use your ${shopName} gift card`,
                      `Your Kepter gift card for ${shopName} ends today.`,
                      ends,
                    ),
                    "text/calendar",
                  );
                  toast(`Reminder added for ${dateLong(card.expires_at)}`);
                }}
                className="min-h-[52px] rounded-2xl text-base"
              >
                Add to calendar
              </Button>
            )}
          </div>
        )}
        <span className="text-center text-[13px] text-ink-2">Anyone with this link can use this card. Do not share it.</span>
      </div>
    </div>
  );
}
