import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  categoryName,
  previewSettlement,
  toUnits,
  type Backing,
  type CardEntry,
  type Merchant,
  type ShopDetails,
} from "@kepter/sdk";

import { GiftCard } from "../components/GiftCard.tsx";
import { ScanIcon } from "../components/icons.tsx";
import { BackingSheet } from "../components/InfoSheets.tsx";
import { Sheet, SheetTitle } from "../components/Sheet.tsx";
import { ShopDetailsForm } from "../components/ShopDetailsForm.tsx";
import { BackingBadge, Button, MessagePanel, NewBadge, Skeleton, StatusPill } from "../components/ui.tsx";
import { backingText } from "../lib/backing.ts";
import { reader, shopUrl } from "../lib/config.ts";
import { daysBetween, daysLeftText, money, nowSeconds, usdc } from "../lib/format.ts";
import { RULE_OPTIONS, ruleCopy } from "../lib/rules.ts";
import { shareLink } from "../lib/share.ts";
import { checkDraft, draftFrom } from "../lib/shopDetails.ts";
import { cardStatus, isUsable, type CardStatus } from "../lib/status.ts";
import { lastSeenCard, markCardsSeen } from "../lib/storage.ts";
import { useToast } from "../lib/toast-context.ts";
import { useTx } from "../lib/tx-context.ts";
import { useWallet } from "../lib/wallet-context.ts";

type Tab = "waiting" | "settle" | "history";
type SheetKind = "backing" | "credit" | "rule" | "details" | "close" | null;

interface Row {
  id: bigint;
  status: CardStatus;
  isNew: boolean;
  meta: string;
  amount: string;
  sub: string;
  preview?: string;
  balance: bigint;
}

interface Data {
  merchant: Merchant;
  cards: CardEntry[];
  backing?: Backing;
  previews: Map<bigint, string>;
  seen: bigint;
}

async function settlementPreview(entry: CardEntry, merchant: Merchant): Promise<string> {
  const funders = await reader.getFunders(entry.id, entry.card.funder_count);
  const closedBeforeExpiry = merchant.closed_at !== undefined && merchant.closed_at < entry.card.expires_at;
  const result = previewSettlement({
    balance: entry.card.balance,
    expiryKeepBps: entry.card.expiry_keep_bps,
    closedBeforeExpiry,
    paid: funders.map((f) => f.paid),
  });
  const toBuyers = result.toFunders.reduce((a, b) => a + b, 0n);
  const buyers = funders.length === 1 ? "Buyer gets" : "Buyers get";
  return `You get ${usdc(result.toShop)} · ${buyers} ${usdc(toBuyers)}`;
}

export function Dashboard() {
  const navigate = useNavigate();
  const toast = useToast();
  const { run } = useTx();
  const { address, connect, writer } = useWallet();

  const [data, setData] = useState<Data | null | undefined>();
  const [tab, setTab] = useState<Tab>("waiting");
  const [sheet, setSheet] = useState<SheetKind>(null);

  const load = useCallback(async () => {
    if (!address) return;
    const merchant = await reader.getMerchant(address);
    if (!merchant) {
      setData(null);
      return;
    }
    const [cards, backing] = await Promise.all([
      reader.listMerchantCards(address),
      reader.getBacking().catch(() => undefined),
    ]);
    const now = nowSeconds();
    const ready = cards.filter((c) => cardStatus(c.card, merchant, now) === "expired" || (cardStatus(c.card, merchant, now) === "closed"));
    const previews = new Map<bigint, string>();
    await Promise.all(
      ready.map(async (c) => previews.set(c.id, await settlementPreview(c, merchant).catch(() => ""))),
    );
    const seen = lastSeenCard(address);
    if (cards[0]) markCardsSeen(address, cards[0].id);
    setData({ merchant, cards, backing, previews, seen });
  }, [address]);

  useEffect(() => {
    setData(undefined);
    load().catch(() => setData(undefined));
  }, [load]);

  if (!address) {
    return (
      <div className="mx-auto flex max-w-[560px] flex-col gap-5 px-5 pt-3 pb-12">
        <h1 className="m-0 text-[32px] font-extrabold tracking-[-.02em]">Your shop</h1>
        <div className="flex flex-col gap-3.5 rounded-[22px] border border-line bg-surface p-6">
          <span className="text-lg font-bold">Connect the wallet your shop uses</span>
          <Button
            onClick={async () => {
              if (await connect()) toast("Wallet connected");
            }}
            className="min-h-[52px] rounded-[14px] text-[17px]"
          >
            Connect wallet
          </Button>
          <span className="text-sm text-ink-2">
            No shop yet? <a href="/open" onClick={(e) => (e.preventDefault(), navigate("/open"))}>Open one</a>.
          </span>
        </div>
      </div>
    );
  }

  if (data === null) {
    return (
      <div className="mx-auto max-w-[560px] px-5 pt-3 pb-12">
        <MessagePanel
          icon="i"
          tone="brand"
          title="This account has no shop yet."
          action={
            <Button onClick={() => navigate("/open")} className="mt-2 min-h-[52px] rounded-[14px] px-6 text-[17px]">
              Open your shop
            </Button>
          }
        >
          Open one in two minutes and start selling gift cards.
        </MessagePanel>
      </div>
    );
  }

  const merchant = data?.merchant;
  const closed = merchant?.closed_at !== undefined;
  const now = nowSeconds();
  const link = shopUrl(address);

  const rows: Record<Tab, Row[]> = { waiting: [], settle: [], history: [] };
  if (data && merchant) {
    for (const { id, card } of data.cards) {
      const status = cardStatus(card, merchant, now);
      const rule = ruleCopy(card.expiry_keep_bps).title;
      if (isUsable(status)) {
        rows.waiting.push({
          id,
          status,
          isNew: id > data.seen && data.seen > 0n,
          meta: `${daysLeftText(card.expires_at, now)} · ${rule}`,
          amount: usdc(card.balance),
          sub: `of ${usdc(card.total_paid)} USDC`,
          balance: card.balance,
        });
      } else if (status === "expired" || status === "closed") {
        const ago = daysBetween(card.expires_at, now);
        rows.settle.push({
          id,
          status,
          isNew: false,
          meta:
            status === "closed"
              ? `Shop closed · ${rule}`
              : `Expired ${ago <= 1 ? "today" : `${ago} days ago`} · ${rule}`,
          amount: usdc(card.balance),
          sub: "left on card",
          preview: data.previews.get(id),
          balance: card.balance,
        });
      } else {
        rows.history.push({
          id,
          status,
          isNew: false,
          meta: status === "spent" ? "Fully used" : "Settled",
          amount: "0.00",
          sub: `of ${usdc(card.total_paid)} USDC`,
          balance: 0n,
        });
      }
    }
    rows.waiting.sort((a, b) => {
      const ca = data.cards.find((c) => c.id === a.id)!.card.expires_at;
      const cb = data.cards.find((c) => c.id === b.id)!.card.expires_at;
      return ca < cb ? -1 : 1;
    });
  }

  const settle = async (row: Row) => {
    if (!writer) return;
    const done = await run({
      title: `Settle card #${row.id}`,
      amount: `${usdc(row.balance)} USDC`,
      build: () => writer.settle(row.id),
    });
    if (done !== undefined) {
      toast(`Card #${row.id} settled`);
      void load();
    }
  };

  const shareShop = async () => {
    const r = await shareLink(link, merchant ? `Gift cards from ${merchant.name}` : "Gift cards");
    if (r === "copied") toast("Shop link copied");
  };

  const tabs: Array<[Tab, string]> = [
    ["waiting", `Waiting to be spent · ${rows.waiting.length}`],
    ["settle", `Ready to settle · ${rows.settle.length}`],
    ["history", "History"],
  ];

  return (
    <div className="mx-auto flex max-w-[1000px] flex-col gap-6 px-5 pt-2 pb-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-2.5">
          <span className="text-sm font-semibold text-ink-2">Your shop</span>
          {merchant ? (
            <h1 className="m-0 text-[30px] font-extrabold tracking-[-.02em] [overflow-wrap:anywhere]">{merchant.name}</h1>
          ) : (
            <Skeleton className="h-9 w-56 rounded-[10px]" />
          )}
          {merchant && (
            <span className="text-[15px] text-ink-2">
              {categoryName(merchant.category)} · {merchant.city}
            </span>
          )}
          {merchant && <BackingBadge text={backingText(merchant, data?.backing)} onClick={() => setSheet("backing")} />}
        </div>
        {!closed && (
          <Button
            variant="accent"
            onClick={() => navigate("/shop/scan")}
            className="flex min-h-[60px] max-w-full flex-[1_1_240px] items-center justify-center gap-2.5 rounded-2xl px-7 text-[19px] font-extrabold"
          >
            <ScanIcon />
            Scan a card
          </Button>
        )}
      </div>

      {closed && (
        <div className="rounded-[14px] bg-muted-bg px-4 py-3.5 text-[15px] text-ink">
          Your shop is closed. Its open cards can be settled below, and the money goes back to the people who paid.
        </div>
      )}

      {!data && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] gap-3">
            <Skeleton className="h-28 rounded-[18px]" />
            <Skeleton className="h-28 rounded-[18px]" />
            <Skeleton className="h-28 rounded-[18px]" />
          </div>
          <Skeleton className="h-[76px] rounded-2xl" />
          <Skeleton className="h-[76px] rounded-2xl" />
          <Skeleton className="h-[76px] rounded-2xl" />
        </div>
      )}

      {data && merchant && (
        <div className="flex flex-col gap-7">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] gap-3">
            <div className="flex flex-col gap-1 rounded-[18px] border border-line bg-surface p-[18px]">
              <span className="text-sm font-semibold text-ink-2">Waiting to be spent</span>
              <span className="tabular text-[32px] font-extrabold tracking-[-.02em]">
                {usdc(merchant.outstanding)}{" "}
                <span className="text-sm font-bold tracking-normal text-ink-2">USDC</span>
              </span>
              <span className="text-sm text-ink-2">
                {merchant.open_cards === 0
                  ? "No open cards"
                  : `${merchant.open_cards} open ${merchant.open_cards === 1 ? "card" : "cards"}`}
              </span>
            </div>
            <div className="flex flex-col gap-1 rounded-[18px] border border-line bg-surface p-[18px]">
              <span className="text-sm font-semibold text-ink-2">Cards sold</span>
              <span className="tabular text-[32px] font-extrabold tracking-[-.02em]">{merchant.card_count}</span>
              <span className="text-sm text-ink-2">Since you opened</span>
            </div>
            <div className="flex flex-col gap-1 rounded-[18px] border-[1.5px] border-dashed border-line p-[18px]">
              <span className="text-sm font-semibold text-ink-2">Money received</span>
              <span className="text-[15px] text-ink-2">Coming soon</span>
            </div>
          </div>

          {merchant.card_count === 0 ? (
            <div className="flex flex-col items-center gap-3.5 rounded-[22px] border border-line bg-surface px-6 py-8 text-center">
              <div className="w-full max-w-[240px] opacity-90">
                <GiftCard shop={merchant.name} amount="$0.00" label="Your first card" tag="Gift card" />
              </div>
              <span className="text-xl font-bold">Share your link to sell your first card.</span>
              <div className="flex flex-wrap justify-center gap-2.5">
                <Button onClick={shareShop} className="min-h-[50px] rounded-[14px] px-5 text-base">
                  Share shop link
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => navigate("/shop/poster")}
                  className="min-h-[50px] rounded-[14px] px-5 text-base"
                >
                  Print poster
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3.5">
              <div className="flex gap-1 overflow-x-auto rounded-[14px] bg-surface-2 p-1">
                {tabs.map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setTab(key)}
                    aria-pressed={tab === key}
                    className={`min-h-11 flex-1 cursor-pointer rounded-[10px] border-none px-3.5 text-[15px] font-bold whitespace-nowrap text-ink ${
                      tab === key ? "bg-surface shadow-card" : "bg-transparent"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex flex-col gap-2">
                {rows[tab].map((row) => (
                  <div
                    key={String(row.id)}
                    className="flex flex-wrap items-center gap-x-4 gap-y-2.5 rounded-2xl border border-line bg-surface px-4 py-3.5"
                  >
                    <div className="flex min-w-0 flex-[1_1_160px] flex-col gap-[3px]">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="tabular font-bold">Card #{String(row.id)}</span>
                        <StatusPill status={row.status} />
                        {row.isNew && <NewBadge />}
                      </span>
                      <span className="text-sm text-ink-2">{row.meta}</span>
                    </div>
                    <div className="flex flex-col items-end gap-0.5">
                      <span className="tabular text-xl font-extrabold">{row.amount}</span>
                      <span className="tabular text-[13px] text-ink-2">{row.sub}</span>
                    </div>
                    {tab === "settle" && (
                      <div className="flex flex-[1_1_100%] flex-wrap items-center justify-between gap-2.5 border-t border-line pt-3">
                        <span className="tabular text-sm text-ink-2">{row.preview}</span>
                        <Button onClick={() => void settle(row)} className="min-h-11 rounded-xl px-[18px] text-[15px]">
                          Settle
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
                {rows[tab].length === 0 && (
                  <div className="rounded-2xl border-[1.5px] border-dashed border-line p-7 text-center text-ink-2">
                    Nothing here right now.
                  </div>
                )}
              </div>
            </div>
          )}

          {!closed && (
            <>
              <div className="flex flex-col gap-3">
                <h2 className="m-0 text-xl font-extrabold">Actions</h2>
                <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,210px),1fr))] gap-2.5">
                  {[
                    ["Give store credit", () => setSheet("credit")],
                    ["Change rule for new cards", () => setSheet("rule")],
                    ["Edit shop details", () => setSheet("details")],
                    ["Print poster", () => navigate("/shop/poster")],
                    ["Share shop link", shareShop],
                  ].map(([label, onClick]) => (
                    <button
                      key={label as string}
                      onClick={onClick as () => void}
                      className="min-h-16 cursor-pointer rounded-2xl border border-line bg-surface px-4 py-3.5 text-left text-base font-bold text-ink"
                    >
                      {label as string}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] border-[1.5px] border-bad-bg p-[18px]">
                <div className="flex max-w-[520px] flex-col gap-0.5">
                  <span className="font-bold text-bad">Close shop</span>
                  <span className="text-[15px] text-ink-2">
                    Stops new sales. Every open card becomes refundable to the people who paid for it.
                  </span>
                </div>
                <button
                  onClick={() => setSheet("close")}
                  className="min-h-[46px] cursor-pointer rounded-xl border-[1.5px] border-bad bg-transparent px-[18px] text-[15px] font-bold text-bad"
                >
                  Close shop…
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {sheet === "backing" && <BackingSheet onClose={() => setSheet(null)} />}
      {sheet === "credit" && merchant && (
        <CreditSheet
          merchant={merchant}
          shop={address}
          onClose={() => setSheet(null)}
          onDone={() => {
            toast("Store credit added");
            void load();
          }}
        />
      )}
      {sheet === "rule" && merchant && (
        <RuleChangeSheet
          current={merchant.expiry_keep_bps}
          onClose={() => setSheet(null)}
          onSave={async (bps) => {
            if (!writer) return;
            setSheet(null);
            const done = await run({
              title: "Change rule for new cards",
              amount: ruleCopy(bps).title,
              build: () => writer.setExpiryRule(address, bps),
            });
            if (done !== undefined) {
              toast("Rule updated for new cards");
              void load();
            }
          }}
        />
      )}
      {sheet === "details" && merchant && (
        <DetailsSheet
          merchant={merchant}
          onClose={() => setSheet(null)}
          onSave={async (details) => {
            if (!writer) return;
            setSheet(null);
            const done = await run({
              title: "Update shop details",
              amount: details.name,
              build: () => writer.updateShop(address, details),
            });
            if (done !== undefined) {
              toast("Shop details updated");
              void load();
            }
          }}
        />
      )}
      {sheet === "close" && merchant && (
        <CloseSheet
          merchant={merchant}
          onClose={() => setSheet(null)}
          onConfirm={async () => {
            if (!writer) return;
            setSheet(null);
            const done = await run({
              title: `Close ${merchant.name}`,
              amount: `${merchant.open_cards} ${merchant.open_cards === 1 ? "card becomes" : "cards become"} refundable`,
              build: () => writer.closeShop(address),
            });
            if (done !== undefined) {
              toast("Shop closed");
              setTab("settle");
              void load();
            }
          }}
        />
      )}
    </div>
  );
}

function CreditSheet({
  merchant,
  shop,
  onClose,
  onDone,
}: {
  merchant: Merchant;
  shop: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const { run } = useTx();
  const { writer } = useWallet();
  const [cardText, setCardText] = useState("");
  const [amountText, setAmountText] = useState("");
  const [error, setError] = useState<string>();

  let amount: bigint | undefined;
  try {
    amount = amountText ? toUnits(amountText) : undefined;
  } catch {
    amount = undefined;
  }
  const valid = /^\d+$/.test(cardText.replace(/^#/, "")) && amount !== undefined && amount > 0n;

  const give = async () => {
    if (!writer || amount === undefined) return;
    const cardId = BigInt(cardText.replace(/^#/, ""));
    const card = await reader.getCard(cardId);
    if (!card) return setError("That card does not exist.");
    if (card.merchant !== shop) return setError("That card is for a different shop.");
    if (!isUsable(cardStatus(card, merchant))) return setError("That card can no longer take store credit.");
    onClose();
    const done = await run({
      title: `Store credit to card #${cardId}`,
      amount: `${usdc(amount)} USDC`,
      build: () => writer.topUp(shop, cardId, amount),
    });
    if (done !== undefined) onDone();
  };

  return (
    <Sheet onClose={onClose}>
      <SheetTitle>Give store credit</SheetTitle>
      <p className="m-0 text-ink-2">Add money to a customer's existing card, for example instead of a cash refund.</p>
      <label className="flex flex-col gap-1.5 font-bold">
        Card number
        <input
          value={cardText}
          onChange={(e) => (setCardText(e.target.value.replace(/[^\d#]/g, "")), setError(undefined))}
          inputMode="numeric"
          className="min-h-[52px] rounded-[14px] border-[1.5px] border-line bg-bg px-3.5 text-[17px] font-medium text-ink"
        />
      </label>
      <label className="flex flex-col gap-1.5 font-bold">
        Amount (USDC)
        <input
          value={amountText}
          onChange={(e) => (setAmountText(e.target.value.replace(/[^\d.]/g, "")), setError(undefined))}
          inputMode="decimal"
          className="min-h-[52px] rounded-[14px] border-[1.5px] border-line bg-bg px-3.5 text-[17px] font-medium text-ink"
        />
      </label>
      {error && <span className="text-[15px] font-semibold text-bad">{error}</span>}
      <Button disabled={!valid} onClick={() => void give()} className="min-h-[54px] rounded-[14px] text-[17px]">
        Add {money(amount ?? 0n)} store credit
      </Button>
    </Sheet>
  );
}

function RuleChangeSheet({
  current,
  onClose,
  onSave,
}: {
  current: number;
  onClose: () => void;
  onSave: (bps: number) => void;
}) {
  const [picked, setPicked] = useState(current);
  return (
    <Sheet onClose={onClose}>
      <SheetTitle>Rule for new cards</SheetTitle>
      {RULE_OPTIONS.map((r) => (
        <button
          key={r.bps}
          onClick={() => setPicked(r.bps)}
          aria-pressed={picked === r.bps}
          className={`flex cursor-pointer flex-col gap-1 rounded-2xl border-2 bg-surface px-4 py-3.5 text-left text-ink ${
            picked === r.bps ? "border-brand" : "border-line"
          }`}
        >
          <span className="font-bold">{r.title}</span>
          <span className="text-[15px] text-ink-2">{r.owner}</span>
        </button>
      ))}
      <span className="text-sm text-ink-2">Cards already sold keep the rule they were bought with.</span>
      <Button
        disabled={picked === current}
        onClick={() => onSave(picked)}
        className="min-h-[54px] rounded-[14px] text-[17px]"
      >
        Save rule
      </Button>
    </Sheet>
  );
}

function DetailsSheet({
  merchant,
  onClose,
  onSave,
}: {
  merchant: Merchant;
  onClose: () => void;
  onSave: (details: ShopDetails) => void;
}) {
  const [draft, setDraft] = useState(() => draftFrom(merchant));
  const { details } = checkDraft(draft);
  const unchanged =
    !!details &&
    details.name === merchant.name &&
    details.category === merchant.category &&
    details.city === merchant.city &&
    details.contact === merchant.contact;
  return (
    <Sheet onClose={onClose}>
      <SheetTitle>Shop details</SheetTitle>
      <ShopDetailsForm draft={draft} onChange={setDraft} />
      <Button
        disabled={!details || unchanged}
        onClick={() => details && onSave(details)}
        className="min-h-[54px] rounded-[14px] text-[17px]"
      >
        Save details
      </Button>
    </Sheet>
  );
}

function CloseSheet({
  merchant,
  onClose,
  onConfirm,
}: {
  merchant: Merchant;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [text, setText] = useState("");
  const ok = text.trim() === merchant.name;
  const count = merchant.open_cards;
  return (
    <Sheet onClose={onClose}>
      <SheetTitle danger>Close {merchant.name}?</SheetTitle>
      <p className="m-0 text-ink-2">
        You will stop selling cards.{" "}
        {count > 0
          ? `The ${count} open ${count === 1 ? "card" : "cards"} (${usdc(merchant.outstanding)} USDC) become refundable to the people who paid for them. `
          : ""}
        This cannot be undone.
      </p>
      <label className="flex flex-col gap-1.5 font-bold">
        Type the shop name to confirm
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={merchant.name}
          className="min-h-[52px] rounded-[14px] border-[1.5px] border-line bg-bg px-3.5 text-[17px] font-medium text-ink"
        />
      </label>
      <Button variant="danger" disabled={!ok} onClick={onConfirm} className="min-h-[54px] rounded-[14px] text-[17px]">
        Close shop for good
      </Button>
    </Sheet>
  );
}
