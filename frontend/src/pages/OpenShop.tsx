import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { RULES, type Balances } from "@kepter/sdk";

import { Button, MessagePanel, QrImage, Skeleton, SuccessCheck } from "../components/ui.tsx";
import { MIN_XLM_TO_OPEN, XLM_FAUCET_URL, displayUrl, reader, shopUrl } from "../lib/config.ts";
import { shortAddress } from "../lib/format.ts";
import { RULE_OPTIONS, ruleCopy } from "../lib/rules.ts";
import { copyText, shareLink } from "../lib/share.ts";
import { useToast } from "../lib/toast-context.ts";
import { useTx } from "../lib/tx-context.ts";
import { useWallet } from "../lib/wallet-context.ts";

const MAX_NAME_BYTES = 48;
const TITLES = ["What is your shop called?", "Choose the unused balance rule", "Review and open"];

function byteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}

function formatXlm(stroops: bigint): string {
  return (Number(stroops) / 1e7).toFixed(2);
}

export function OpenShop() {
  const navigate = useNavigate();
  const toast = useToast();
  const { run } = useTx();
  const { address, connect, writer } = useWallet();

  const [hasShop, setHasShop] = useState<boolean>();
  const [balances, setBalances] = useState<Balances>();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [rule, setRule] = useState<number>(RULES.buyerProtected);
  const [openedName, setOpenedName] = useState<string>();

  useEffect(() => {
    if (!address) return;
    let live = true;
    setHasShop(undefined);
    Promise.all([reader.getMerchant(address), reader.getBalances(address)])
      .then(([shop, bal]) => {
        if (!live) return;
        setHasShop(!!shop);
        setBalances(bal);
      })
      .catch(() => live && setHasShop(false));
    return () => {
      live = false;
    };
  }, [address]);

  const trimmed = name.trim();
  const nameBytes = byteLength(name);
  const nameTooLong = nameBytes > MAX_NAME_BYTES;
  const nameBad = trimmed.length === 0 || nameTooLong;
  const lowXlm = !!balances && balances.xlmAvailable < MIN_XLM_TO_OPEN;
  const nextDisabled = (step === 1 && nameBad) || (step === 3 && (lowXlm || !balances));

  const open = async () => {
    if (!address || !writer) return;
    const done = await run({
      title: `Open ${trimmed}`,
      amount: "≈ 0.5 XLM set aside",
      build: () => writer.openShop(address, trimmed, rule),
    });
    if (done !== undefined) setOpenedName(trimmed);
  };

  const link = address ? shopUrl(address) : "";

  if (openedName && address) {
    return (
      <div className="mx-auto flex max-w-[560px] flex-col gap-6 px-5 pt-3 pb-12">
        <div className="animate-[kup_.4s_ease-out] flex flex-col gap-5">
          <div className="flex flex-col items-center gap-2.5 pt-2 text-center">
            <SuccessCheck />
            <h1 className="m-0 text-[32px] font-extrabold tracking-[-.02em]">Your shop is open.</h1>
            <span className="text-ink-2">Share this link so people can buy gift cards for {openedName}.</span>
          </div>
          <div className="flex flex-col items-center gap-4 rounded-[22px] border border-line bg-surface p-5">
            <div className="rounded-[14px] border border-line bg-white p-3">
              <QrImage text={link} size={180} label="QR code to your shop page" />
            </div>
            <div className="flex w-full items-center gap-2 rounded-xl bg-surface-2 py-1.5 pr-1.5 pl-3.5">
              <span className="flex-1 truncate font-semibold">{displayUrl(`${link.replace(address, shortAddress(address))}`)}</span>
              <Button
                variant="secondary"
                onClick={async () => toast((await copyText(link)) ? "Shop link copied" : "Could not copy")}
                className="min-h-11 rounded-[10px] px-3.5"
              >
                Copy
              </Button>
              <Button
                variant="secondary"
                onClick={async () => {
                  const r = await shareLink(link, `Gift cards from ${openedName}`);
                  if (r === "copied") toast("Shop link copied");
                }}
                className="min-h-11 rounded-[10px] px-3.5"
              >
                Share
              </Button>
            </div>
          </div>
          <div className="flex flex-col gap-2.5">
            <Button variant="accent" onClick={() => navigate("/shop/poster")} className="min-h-[54px] rounded-[14px] text-[17px]">
              Print your counter poster
            </Button>
            <Button variant="secondary" onClick={() => navigate("/shop")} className="min-h-[54px] rounded-[14px] text-[17px]">
              Go to your dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!address) {
    return (
      <div className="mx-auto flex max-w-[560px] flex-col gap-5 px-5 pt-3 pb-12">
        <h1 className="m-0 text-[32px] font-extrabold tracking-[-.02em]">Open your shop</h1>
        <div className="flex flex-col gap-3.5 rounded-[22px] border border-line bg-surface p-6">
          <span className="text-lg font-bold">First, connect your wallet</span>
          <span className="text-ink-2">Your shop is tied to your Stellar wallet. Payments from cards go straight to it.</span>
          <Button
            onClick={async () => {
              if (await connect()) toast("Wallet connected");
            }}
            className="min-h-[52px] rounded-[14px] text-[17px]"
          >
            Connect wallet
          </Button>
          <span className="text-sm text-ink-2">
            No wallet yet? On a phone, try{" "}
            <a href="https://lobstr.co" target="_blank" rel="noreferrer">
              LOBSTR
            </a>{" "}
            or WalletConnect. On a laptop,{" "}
            <a href="https://www.freighter.app" target="_blank" rel="noreferrer">
              Freighter
            </a>
            .
          </span>
        </div>
      </div>
    );
  }

  if (hasShop === undefined) {
    return (
      <div className="mx-auto flex max-w-[560px] flex-col gap-4 px-5 pt-3 pb-12">
        <Skeleton className="h-[5px] w-full rounded" />
        <Skeleton className="h-9 w-3/4 rounded-[10px]" />
        <Skeleton className="h-14 w-full rounded-[14px]" />
      </div>
    );
  }

  if (hasShop) {
    return (
      <div className="mx-auto max-w-[560px] px-5 pt-3 pb-12">
        <MessagePanel
          icon="i"
          tone="brand"
          title="This account already has a shop."
          action={
            <Button onClick={() => navigate("/shop")} className="mt-2 min-h-[52px] rounded-[14px] px-6 text-[17px]">
              Go to your dashboard
            </Button>
          }
        >
          Manage it from your dashboard.
        </MessagePanel>
      </div>
    );
  }

  const chosen = ruleCopy(rule);

  return (
    <div className="mx-auto flex max-w-[560px] flex-col gap-6 px-5 pt-3 pb-12">
      <div className="flex flex-col gap-[22px]">
        <div className="flex flex-col gap-3">
          <div className="flex gap-1.5">
            {[1, 2, 3].map((i) => (
              <span key={i} className={`h-[5px] flex-1 rounded-[3px] ${i <= step ? "bg-brand" : "bg-line"}`} />
            ))}
          </div>
          <span className="text-sm font-semibold text-ink-2">Step {step} of 3</span>
          <h1 className="m-0 text-[30px] font-extrabold tracking-[-.02em]">{TITLES[step - 1]}</h1>
        </div>

        {step === 1 && (
          <div className="flex flex-col gap-2">
            <label htmlFor="shop-name" className="font-semibold">
              Shop name
            </label>
            <input
              id="shop-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Tola's Kitchen"
              autoComplete="organization"
              className={`min-h-14 rounded-[14px] border-[1.5px] bg-surface px-4 text-lg text-ink outline-none ${
                nameTooLong ? "border-bad" : "border-line focus:border-brand"
              }`}
            />
            <div className="flex justify-between gap-3 text-sm">
              <span className="text-bad">{nameTooLong ? "Shop names must be 1 to 48 characters." : ""}</span>
              <span className={`tabular ${nameTooLong ? "text-bad" : "text-ink-2"}`}>
                {nameBytes} / {MAX_NAME_BYTES}
              </span>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-3">
            <span className="text-ink-2">When a card expires with money left on it, where should that money go?</span>
            {RULE_OPTIONS.map((r) => {
              const selected = r.bps === rule;
              return (
                <button
                  key={r.bps}
                  onClick={() => setRule(r.bps)}
                  aria-pressed={selected}
                  className={`flex cursor-pointer gap-3.5 rounded-[18px] border-2 bg-surface p-[18px] text-left text-ink ${
                    selected ? "border-brand" : "border-line"
                  }`}
                >
                  <span
                    className={`mt-0.5 flex size-[22px] flex-none items-center justify-center rounded-full border-2 ${
                      selected ? "border-brand" : "border-line"
                    }`}
                  >
                    <span className={`size-2.5 rounded-full ${selected ? "bg-brand" : "bg-transparent"}`} />
                  </span>
                  <span className="flex flex-col gap-1.5">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-lg font-bold">{r.title}</span>
                      {r.recommended && (
                        <span className="rounded-full bg-ok-bg px-2 py-[3px] text-xs font-bold text-ok">
                          Recommended for trust
                        </span>
                      )}
                    </span>
                    <span className="text-ink-2">{r.owner}</span>
                    <span className="text-sm text-ink-2">
                      Buyers will see: <em>“{r.buyer}”</em>
                    </span>
                  </span>
                </button>
              );
            })}
            <span className="text-sm text-ink-2">
              You can change this later. Cards already sold keep the rule they were bought with.
            </span>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-3.5">
            <div className="flex flex-col rounded-[18px] border border-line bg-surface">
              <div className="flex justify-between gap-3 border-b border-line px-[18px] py-4">
                <span className="text-ink-2">Shop name</span>
                <span className="text-right font-bold [overflow-wrap:anywhere]">{trimmed}</span>
              </div>
              <div className="flex justify-between gap-3 border-b border-line px-[18px] py-4">
                <span className="text-ink-2">Unused balance rule</span>
                <span className="font-bold">{chosen.title}</span>
              </div>
              <div className="flex justify-between gap-3 px-[18px] py-4">
                <span className="text-ink-2">Wallet</span>
                <span className="tabular font-bold">{shortAddress(address)}</span>
              </div>
            </div>
            <span className="text-[15px] text-ink-2">
              This also lets your account receive USDC. About 0.5 XLM is set aside for network fees.
            </span>
            {lowXlm && balances && (
              <div className="flex flex-col gap-1 rounded-[14px] bg-bad-bg px-4 py-3.5 text-[15px] text-bad">
                <strong>Your wallet needs a little more XLM.</strong>
                <span>
                  It has {formatXlm(balances.xlmAvailable)} XLM. Add at least 0.5 XLM for fees. On the test network you
                  can{" "}
                  <a href={XLM_FAUCET_URL} target="_blank" rel="noreferrer" className="font-bold text-bad">
                    get free test XLM
                  </a>
                  .
                </span>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2.5">
          {step > 1 && (
            <Button
              variant="secondary"
              onClick={() => setStep(step - 1)}
              className="min-h-[54px] rounded-[14px] px-5 text-[17px]"
            >
              Back
            </Button>
          )}
          <Button
            onClick={() => (step < 3 ? setStep(step + 1) : void open())}
            disabled={nextDisabled}
            className="min-h-[54px] flex-1 rounded-[14px] text-[17px]"
          >
            {step === 3 ? "Open shop" : "Continue"}
          </Button>
        </div>
      </div>
    </div>
  );
}
