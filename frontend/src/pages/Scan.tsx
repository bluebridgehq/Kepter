import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BrowserQRCodeReader, type IScannerControls } from "@zxing/browser";
import { decodeRedeemQr, verifyRedeem, type Merchant, type RedeemQr } from "@kepter/sdk";

import { CheckIcon, CrossIcon } from "../components/icons.tsx";
import { Button, MessagePanel, Rows } from "../components/ui.tsx";
import { network, reader } from "../lib/config.ts";
import { mmss, money, nowSeconds } from "../lib/format.ts";
import { cardStatus } from "../lib/status.ts";
import { useToast } from "../lib/toast-context.ts";
import { useTx } from "../lib/tx-context.ts";
import { useWallet } from "../lib/wallet-context.ts";

type Step = "camera" | "checking" | "confirm" | "paid" | "fail";

interface ScanError {
  t: string;
  d: string;
}

const ERRORS = {
  expired: { t: "This QR code has expired. Ask for a new one.", d: "Ask the customer to refresh their code." },
  used: {
    t: "This QR code is not valid for this card.",
    d: "It may have been used already. Ask the customer to make a new code.",
  },
  low: { t: "There is not enough left on this card.", d: "Ask for a smaller amount and take the rest another way." },
  cardexp: { t: "This card has expired.", d: "It can no longer be used to pay." },
  wrong: { t: "This card is for a different shop.", d: "It can only be used at the shop it was bought from." },
  notKepter: { t: "This is not a Kepter code.", d: "Ask the customer to open their gift and show the code again." },
  missing: { t: "That card does not exist.", d: "Ask the customer to check their gift link." },
  settled: { t: "This card has already been settled.", d: "It can no longer be used to pay." },
} satisfies Record<string, ScanError>;

interface Checked {
  qr: RedeemQr;
  balanceAfter: bigint;
}

export function Scan() {
  const navigate = useNavigate();
  const toast = useToast();
  const { run } = useTx();
  const { address, connect, writer } = useWallet();

  const [merchant, setMerchant] = useState<Merchant | null>();
  const [step, setStep] = useState<Step>("camera");
  const [error, setError] = useState<ScanError>();
  const [checked, setChecked] = useState<Checked>();
  const [cameraBlocked, setCameraBlocked] = useState(false);
  const [pasted, setPasted] = useState("");
  const [now, setNow] = useState(() => Number(nowSeconds()));
  const video = useRef<HTMLVideoElement>(null);
  const handling = useRef(false);

  useEffect(() => {
    if (!address) return;
    reader.getMerchant(address).then((m) => setMerchant(m ?? null), () => setMerchant(null));
  }, [address]);

  useEffect(() => {
    if (step !== "confirm") return;
    const t = setInterval(() => setNow(Number(nowSeconds())), 1000);
    return () => clearInterval(t);
  }, [step]);

  const fail = (e: ScanError) => {
    setError(e);
    setStep("fail");
  };

  const check = useCallback(
    async (text: string) => {
      if (handling.current || !address) return;
      handling.current = true;
      setStep("checking");
      try {
        let qr: RedeemQr;
        try {
          qr = decodeRedeemQr(text.trim());
        } catch {
          return fail(ERRORS.notKepter);
        }
        const card = await reader.getCard(qr.cardId);
        if (!card) return fail(ERRORS.missing);
        if (card.merchant !== address) return fail(ERRORS.wrong);
        const status = cardStatus(card, merchant ?? undefined);
        if (status === "settled") return fail(ERRORS.settled);
        if (status === "expired") return fail(ERRORS.cardexp);
        const current = nowSeconds();
        if (qr.validUntil < current) return fail(ERRORS.expired);
        if (qr.amount > card.balance) return fail(ERRORS.low);
        const valid = verifyRedeem(
          card.key,
          {
            networkPassphrase: network.networkPassphrase,
            cardId: qr.cardId,
            amount: qr.amount,
            nonce: card.nonce,
            validUntil: qr.validUntil,
          },
          qr.signature,
        );
        if (!valid) return fail(ERRORS.used);
        setNow(Number(current));
        setChecked({ qr, balanceAfter: card.balance - qr.amount });
        setStep("confirm");
      } catch {
        fail({ t: "Could not check this code.", d: "Check your connection and scan again." });
      } finally {
        handling.current = false;
      }
    },
    [address, merchant],
  );

  useEffect(() => {
    if (step !== "camera" || !video.current || !merchant) return;
    const element = video.current;
    let controls: IScannerControls | undefined;
    let stopped = false;
    // Starting after a short delay means a quick unmount and remount (React does
    // this in development) cancels the first start before it opens the camera.
    // Two scanners sharing one video element would stop each other's stream.
    const start = setTimeout(() => {
      new BrowserQRCodeReader()
        .decodeFromConstraints({ video: { facingMode: "environment" } }, element, (result) => {
          if (result && !stopped) {
            stopped = true;
            controls?.stop();
            void check(result.getText());
          }
        })
        .then((c) => {
          controls = c;
          if (stopped) c.stop();
        })
        .catch(() => setCameraBlocked(true));
    }, 100);
    return () => {
      clearTimeout(start);
      stopped = true;
      controls?.stop();
    };
  }, [step, merchant, check]);

  const reset = () => {
    setChecked(undefined);
    setError(undefined);
    setPasted("");
    setStep("camera");
  };

  const charge = async () => {
    if (!writer || !checked) return;
    const done = await run({
      title: `Charge card #${checked.qr.cardId}`,
      amount: money(checked.qr.amount),
      build: () => writer.redeem(checked.qr),
    });
    if (done !== undefined) setStep("paid");
  };

  if (!address) {
    return (
      <div className="mx-auto flex max-w-[480px] flex-col gap-5 px-5 pt-1 pb-10">
        <h1 className="m-0 text-[28px] font-extrabold tracking-[-.02em]">Scan a card</h1>
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
        </div>
      </div>
    );
  }

  if (merchant === null) {
    return (
      <div className="mx-auto max-w-[480px] px-5 pt-1 pb-10">
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
          Open a shop to start accepting gift cards.
        </MessagePanel>
      </div>
    );
  }

  const secondsLeft = checked ? Number(checked.qr.validUntil) - now : 0;

  return (
    <div className="mx-auto flex max-w-[480px] flex-col gap-[18px] px-5 pt-1 pb-10">
      {(step === "camera" || step === "checking") && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => navigate("/shop")}
              className="min-h-11 cursor-pointer border-none bg-transparent p-0 text-base font-semibold text-ink"
            >
              ← Dashboard
            </button>
            <span className="font-bold">{merchant?.name}</span>
          </div>
          {cameraBlocked ? (
            <div className="flex flex-col gap-3 rounded-[22px] border border-line bg-surface p-6">
              <span className="text-xl font-extrabold">Camera is blocked</span>
              <span className="text-ink-2">
                Allow camera access in your browser settings, then reload. Or paste the code text below.
              </span>
            </div>
          ) : (
            <div className="relative aspect-[3/4] overflow-hidden rounded-[26px] bg-[#1A2421]">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,#33413C_0%,#141C19_75%)]" />
              <video ref={video} muted playsInline className="absolute inset-0 size-full object-cover" />
              <div className="absolute top-[20%] right-[16%] left-[16%] aspect-square">
                <div className="absolute top-0 left-0 size-11 rounded-tl-[14px] border-t-[5px] border-l-[5px] border-white" />
                <div className="absolute top-0 right-0 size-11 rounded-tr-[14px] border-t-[5px] border-r-[5px] border-white" />
                <div className="absolute bottom-0 left-0 size-11 rounded-bl-[14px] border-b-[5px] border-l-[5px] border-white" />
                <div className="absolute right-0 bottom-0 size-11 rounded-br-[14px] border-r-[5px] border-b-[5px] border-white" />
                <div className="animate-kscan absolute right-[6%] left-[6%] h-[3px] rounded-[2px] bg-[#F2A33A] shadow-[0_0_14px_#F2A33A]" />
              </div>
              <div className="absolute right-0 bottom-[22px] left-0 text-center text-lg font-bold text-white">
                {step === "checking" ? "Checking…" : "Point at the customer's QR code"}
              </div>
            </div>
          )}
          <details
            open={cameraBlocked}
            className="rounded-2xl border border-line bg-surface px-4 py-1"
          >
            <summary className="flex min-h-11 cursor-pointer items-center font-bold">Paste the code text instead</summary>
            <div className="flex gap-2 pt-1 pb-3.5">
              <input
                value={pasted}
                onChange={(e) => setPasted(e.target.value)}
                placeholder="Paste code"
                className="min-h-12 min-w-0 flex-1 rounded-xl border-[1.5px] border-line bg-bg px-3 text-base text-ink"
              />
              <Button
                disabled={!pasted.trim()}
                onClick={() => void check(pasted)}
                className="min-h-12 rounded-xl px-4"
              >
                Check
              </Button>
            </div>
          </details>
        </div>
      )}

      {step === "confirm" && checked && (
        <div className="animate-kup flex flex-col gap-5">
          <div className="flex flex-col items-center gap-1.5 rounded-[26px] border border-line bg-surface px-[22px] py-7 text-center">
            <span className="text-[15px] font-semibold text-ink-2">Charge this card</span>
            <span className="tabular text-[68px] leading-[1.05] font-extrabold tracking-[-.03em]">
              {money(checked.qr.amount)}
            </span>
            <span className="text-[13px] font-bold text-ink-2">USDC</span>
          </div>
          <Rows
            rows={[
              ["Card", `#${checked.qr.cardId}`],
              ["Balance after", money(checked.balanceAfter)],
              ["Code works for", secondsLeft > 0 ? mmss(secondsLeft) : "Expired"],
            ]}
          />
          <Button
            variant="accent"
            disabled={secondsLeft <= 0}
            onClick={() => void charge()}
            className="tabular min-h-16 rounded-2xl text-xl font-extrabold"
          >
            Charge {money(checked.qr.amount)}
          </Button>
          <Button variant="secondary" onClick={reset} className="min-h-[54px] rounded-2xl text-[17px]">
            Cancel
          </Button>
        </div>
      )}

      {step === "paid" && checked && (
        <div className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-3.5 bg-[#1C7348] p-8 text-center text-white">
          <span className="animate-kpop flex size-[104px] items-center justify-center rounded-full bg-white text-[#1C7348]">
            <CheckIcon size={52} />
          </span>
          <span className="tabular text-[56px] leading-[1.05] font-extrabold tracking-[-.03em]">
            Paid {money(checked.qr.amount)}
          </span>
          <span className="tabular text-[19px] opacity-90">Card balance now {money(checked.balanceAfter)}</span>
          <button
            onClick={reset}
            className="mt-6 min-h-[60px] w-full max-w-[360px] cursor-pointer rounded-2xl border-none bg-white px-10 text-[19px] font-extrabold text-[#0F4C3A]"
          >
            Scan another
          </button>
          <button
            onClick={() => navigate("/shop")}
            className="min-h-11 cursor-pointer border-none bg-transparent text-base font-semibold text-white"
          >
            Back to dashboard
          </button>
        </div>
      )}

      {step === "fail" && error && (
        <div className="animate-kup flex flex-col items-center gap-3.5 px-2 py-10 text-center">
          <span className="flex size-[84px] items-center justify-center rounded-full bg-bad-bg text-bad">
            <CrossIcon size={38} />
          </span>
          <span className="text-[26px] leading-[1.2] font-extrabold text-balance">{error.t}</span>
          <span className="max-w-[32ch] text-[17px] text-ink-2">{error.d}</span>
          <Button onClick={reset} className="mt-3 min-h-[58px] w-full rounded-2xl text-lg font-extrabold">
            Scan again
          </Button>
        </div>
      )}
    </div>
  );
}
