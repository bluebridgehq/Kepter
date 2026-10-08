import { useEffect, useState } from "react";
import type { Backing } from "@kepter/sdk";

import { CONTRACT_URL, reader } from "../lib/config.ts";
import { usdc } from "../lib/format.ts";
import { ruleCopy } from "../lib/rules.ts";
import { Sheet, SheetTitle } from "./Sheet.tsx";
import { Skeleton } from "./ui.tsx";

export function BackingSheet({ onClose }: { onClose: () => void }) {
  const [backing, setBacking] = useState<Backing>();

  useEffect(() => {
    reader.getBacking().then(setBacking, () => setBacking(undefined));
  }, []);

  return (
    <Sheet onClose={onClose}>
      <SheetTitle>{backing && !backing.backed ? "Not fully backed" : "Fully backed"}</SheetTitle>
      <p className="m-0 text-ink-2">
        Every dollar on these cards is held by the Kepter contract. Check it yourself.
      </p>
      <div className="tabular flex flex-col rounded-[14px] bg-surface-2">
        <div className="flex justify-between border-b border-line px-4 py-3.5">
          <span className="text-ink-2">Owed on open cards</span>
          {backing ? <strong>{usdc(backing.owed)} USDC</strong> : <Skeleton className="h-5 w-24 rounded-md" />}
        </div>
        <div className="flex justify-between px-4 py-3.5">
          <span className="text-ink-2">Held by the contract</span>
          {backing ? <strong>{usdc(backing.held)} USDC</strong> : <Skeleton className="h-5 w-24 rounded-md" />}
        </div>
      </div>
      <a href={CONTRACT_URL} target="_blank" rel="noreferrer" className="font-bold">
        View on Stellar Expert ↗
      </a>
    </Sheet>
  );
}

export function RuleSheet({ bps, onClose }: { bps: number; onClose: () => void }) {
  const rule = ruleCopy(bps);
  return (
    <Sheet onClose={onClose}>
      <SheetTitle>{rule.title}</SheetTitle>
      <p className="m-0 text-ink-2">
        {rule.buyer} This only matters if the card reaches its end date with money still on it.
      </p>
      <p className="m-0">If the shop closes, you get your money back.</p>
    </Sheet>
  );
}
