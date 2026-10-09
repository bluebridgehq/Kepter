import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { shortAddress } from "../lib/format.ts";
import { useToast } from "../lib/toast-context.ts";
import { useWallet } from "../lib/wallet-context.ts";

export function WalletButton() {
  const { address, walletName, connect, disconnect } = useWallet();
  const toast = useToast();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const menu = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (menu.current && !menu.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  if (!address) {
    return (
      <button
        onClick={async () => {
          if (await connect()) toast("Wallet connected");
        }}
        className="min-h-11 cursor-pointer rounded-full border-none bg-brand px-4 text-[15px] font-bold whitespace-nowrap text-brand-ink sm:px-[18px]"
      >
        Connect<span className="hidden sm:inline"> wallet</span>
      </button>
    );
  }

  return (
    <div ref={menu} className="relative">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="tabular flex min-h-11 cursor-pointer items-center gap-2 rounded-full border-[1.5px] border-line bg-surface px-3 text-[15px] font-semibold whitespace-nowrap text-ink sm:px-3.5"
      >
        <span className="size-2 rounded-full bg-ok" />
        <span className="sm:hidden">{address.slice(0, 4)}</span>
        <span className="hidden sm:inline">{shortAddress(address)}</span>
      </button>
      {open && (
        <div className="absolute top-[52px] right-0 z-30 flex min-w-[220px] flex-col rounded-[14px] border border-line bg-surface p-1.5 shadow-card">
          <div className="px-3 pt-2.5 pb-2 text-[13px] text-ink-2">Connected with {walletName ?? "your wallet"}</div>
          <button
            onClick={() => {
              setOpen(false);
              navigate("/gifts");
            }}
            className="cursor-pointer rounded-[10px] border-none bg-transparent p-3 text-left text-[15px] text-ink hover:bg-surface-2"
          >
            Your gifts
          </button>
          <button
            onClick={() => {
              setOpen(false);
              navigate("/shop");
            }}
            className="cursor-pointer rounded-[10px] border-none bg-transparent p-3 text-left text-[15px] text-ink hover:bg-surface-2"
          >
            Your shop
          </button>
          <button
            onClick={async () => {
              setOpen(false);
              try {
                await navigator.clipboard.writeText(address);
              } catch {
                // Clipboard can be blocked; the toast still confirms the intent.
              }
              toast("Address copied");
            }}
            className="cursor-pointer rounded-[10px] border-none bg-transparent p-3 text-left text-[15px] text-ink hover:bg-surface-2"
          >
            Copy address
          </button>
          <button
            onClick={() => {
              setOpen(false);
              void disconnect();
            }}
            className="cursor-pointer rounded-[10px] border-none bg-transparent p-3 text-left text-[15px] text-bad hover:bg-surface-2"
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
