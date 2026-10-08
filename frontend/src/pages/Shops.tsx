import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { CATEGORIES, RULES, categoryName, type ShopEntry } from "@kepter/sdk";

import { Button, MessagePanel, Skeleton } from "../components/ui.tsx";
import { reader } from "../lib/config.ts";
import { ruleCopy } from "../lib/rules.ts";

function matches(entry: ShopEntry, query: string): boolean {
  if (!query) return true;
  const text = `${entry.merchant.name} ${entry.merchant.city}`.toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .every((word) => text.includes(word));
}

function ShopTile({ entry }: { entry: ShopEntry }) {
  const { merchant } = entry;
  const rule = ruleCopy(merchant.expiry_keep_bps);
  const protectedRule = merchant.expiry_keep_bps === RULES.buyerProtected;
  return (
    <Link
      to={`/s/${entry.address}`}
      className="flex flex-col gap-3 rounded-[18px] border border-line bg-surface p-[18px] text-ink no-underline transition-colors hover:border-brand hover:text-ink"
    >
      <div className="flex flex-col gap-1">
        <span className="text-lg leading-tight font-bold [overflow-wrap:anywhere]">{merchant.name}</span>
        <span className="text-[15px] text-ink-2 [overflow-wrap:anywhere]">
          {categoryName(merchant.category)} · {merchant.city}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span
          className={`rounded-full px-2.5 py-1 font-semibold ${protectedRule ? "bg-ok-bg text-ok" : "bg-muted-bg text-muted"}`}
        >
          {rule.title}
        </span>
        <span className="text-ink-2">
          {merchant.card_count === 0
            ? "New on Kepter"
            : `${merchant.card_count} ${merchant.card_count === 1 ? "card" : "cards"} sold`}
        </span>
      </div>
    </Link>
  );
}

export function Shops() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [shops, setShops] = useState<ShopEntry[] | null | undefined>();

  const query = params.get("q") ?? "";
  const categoryParam = params.get("c");
  const category = categoryParam === null ? null : Number(categoryParam);

  const load = useCallback(() => {
    setShops(undefined);
    reader.listShops().then(
      (all) => setShops(all.filter((s) => s.merchant.closed_at === undefined || s.merchant.closed_at === null)),
      () => setShops(null),
    );
  }, []);

  useEffect(load, [load]);

  const update = (patch: { q?: string; c?: number | null }) => {
    const next = new URLSearchParams(params);
    if (patch.q !== undefined) {
      if (patch.q) next.set("q", patch.q);
      else next.delete("q");
    }
    if (patch.c !== undefined) {
      if (patch.c === null) next.delete("c");
      else next.set("c", String(patch.c));
    }
    setParams(next, { replace: true });
  };

  const counts = useMemo(() => {
    const map = new Map<number, number>();
    for (const s of shops ?? []) map.set(s.merchant.category, (map.get(s.merchant.category) ?? 0) + 1);
    return map;
  }, [shops]);

  const visible = useMemo(
    () =>
      (shops ?? [])
        .filter((s) => (category === null || s.merchant.category === category) && matches(s, query.trim()))
        .sort((a, b) => b.merchant.card_count - a.merchant.card_count || Number(b.merchant.created_at - a.merchant.created_at)),
    [shops, category, query],
  );

  const chips: Array<{ id: number | null; label: string }> = [
    { id: null, label: "All" },
    ...CATEGORIES.filter((c) => counts.has(c.id)).map((c) => ({ id: c.id, label: c.name })),
  ];

  return (
    <div className="mx-auto flex max-w-[1000px] flex-col gap-6 px-5 pt-3 pb-12">
      <div className="flex flex-col gap-2">
        <h1 className="m-0 text-[clamp(30px,5vw,40px)] font-extrabold tracking-[-.02em]">Find a shop</h1>
        <span className="text-lg text-ink-2">Pick a shop near the person you are gifting.</span>
      </div>

      <div className="flex flex-col gap-3">
        <label htmlFor="shop-search" className="sr-only">
          Search shops
        </label>
        <input
          id="shop-search"
          type="search"
          value={query}
          onChange={(e) => update({ q: e.target.value })}
          placeholder="Search by shop name or city"
          autoComplete="off"
          className="min-h-[54px] rounded-[14px] border-[1.5px] border-line bg-surface px-4 text-[17px] text-ink outline-none focus:border-brand"
        />
        {shops && shops.length > 0 && (
          <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
            {chips.map((chip) => {
              const on = chip.id === category;
              return (
                <button
                  key={chip.label}
                  onClick={() => update({ c: chip.id })}
                  aria-pressed={on}
                  className={`min-h-11 flex-none cursor-pointer rounded-full border-[1.5px] px-4 text-[15px] font-bold whitespace-nowrap ${
                    on ? "border-brand bg-brand text-brand-ink" : "border-line bg-surface text-ink"
                  }`}
                >
                  {chip.label}
                  {chip.id !== null && <span className="ml-1.5 opacity-70">{counts.get(chip.id)}</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {shops === undefined && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,280px),1fr))] gap-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[124px] rounded-[18px]" />
          ))}
        </div>
      )}

      {shops === null && (
        <MessagePanel
          icon="!"
          title="Could not load shops."
          action={
            <Button variant="secondary" onClick={load} className="mt-2 min-h-[50px] rounded-[14px] px-[22px] text-base">
              Try again
            </Button>
          }
        >
          Check your connection and try again.
        </MessagePanel>
      )}

      {shops && visible.length > 0 && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,280px),1fr))] gap-3">
          {visible.map((entry) => (
            <ShopTile key={entry.address} entry={entry} />
          ))}
        </div>
      )}

      {shops && visible.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border-[1.5px] border-dashed border-line p-8 text-center">
          <span className="text-lg font-bold">
            {shops.length === 0 ? "No shops yet." : "No shops match."}
          </span>
          <span className="text-ink-2">
            {shops.length === 0
              ? "Be the first to open one."
              : "Try another city or category. If you know the shop, ask them for their Kepter link."}
          </span>
          {shops.length > 0 && (
            <Button
              variant="secondary"
              onClick={() => setParams(new URLSearchParams(), { replace: true })}
              className="min-h-[46px] rounded-xl px-5 text-[15px]"
            >
              Show all shops
            </Button>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] bg-surface-2 p-[18px]">
        <span className="font-semibold">Own a shop? Sell gift cards on Kepter.</span>
        <Button variant="accent" onClick={() => navigate("/open")} className="min-h-[46px] rounded-xl px-5 text-[15px]">
          Open your shop
        </Button>
      </div>
    </div>
  );
}
