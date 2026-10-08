import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";

import { GiftCard } from "../components/GiftCard.tsx";
import { CheckIcon } from "../components/icons.tsx";
import { Button, QrImage } from "../components/ui.tsx";
import { DEMO_SHOP, shopUrl } from "../lib/config.ts";

const WHYS = [
  { t: "Money set aside", d: "Every card is backed by real dollars held in the contract, not by the shop." },
  { t: "Proof of backing", d: "Every shop page shows its cards are fully backed. Anyone can check." },
  { t: "Nothing to install", d: "The person you gift just opens a link. No app, no account." },
  { t: "Friends can chip in", d: "Up to 20 people can add to one gift with a separate link." },
  { t: "Protected if a shop closes", d: "Everyone who paid gets their share back." },
];

const USES = ["A birthday dinner", "Groceries for family back home", "A colleague's farewell", "Store credit", "Prizes"];

function StepCard({ n, text, children }: { n: number; text: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 rounded-[22px] border border-line bg-surface p-[22px]">
      <div className="flex h-[120px] rounded-[14px] bg-surface-2">{children}</div>
      <div className="flex items-baseline gap-3">
        <span className="text-lg font-extrabold text-brand-text">{n}</span>
        <span className="text-lg font-semibold">{text}</span>
      </div>
    </div>
  );
}

export function Home() {
  const navigate = useNavigate();
  const goSetup = () => navigate("/open");

  return (
    <div className="mx-auto flex max-w-[1160px] flex-col gap-[72px] px-5 pt-3 pb-10">
      <section className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,420px),1fr))] items-center gap-10 pt-5">
        <div className="flex flex-col gap-[22px]">
          <h1 className="m-0 text-[clamp(40px,7vw,68px)] leading-[1.02] font-extrabold tracking-[-.035em] text-balance">
            Send what they need, not just money.
          </h1>
          <p className="m-0 max-w-[30ch] text-xl text-pretty text-ink-2">
            Gift cards for the shops people already use, backed by real money.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button variant="accent" onClick={goSetup} className="min-h-[54px] rounded-[14px] px-6 text-[17px]">
              Open your shop
            </Button>
            <Button
              variant="secondary"
              onClick={() => navigate(`/s/${DEMO_SHOP}`)}
              className="min-h-[54px] rounded-[14px] px-6 text-[17px]"
            >
              See a demo shop
            </Button>
          </div>
        </div>
        <div className="flex justify-center pt-2.5 pb-5">
          <div className="w-full max-w-[420px] -rotate-4">
            <GiftCard
              shop="Tola's Kitchen"
              amount="$40.00"
              label="Balance"
              tag="Gift card"
              footLeft="For Bisi"
              footRight="From Ade"
            />
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-6">
        <h2 className="m-0 text-[30px] font-extrabold tracking-[-.02em]">How it works</h2>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))] gap-4">
          <StepCard n={1} text="Buy a card for any shop on Kepter.">
            <div className="tabular flex w-full flex-wrap items-center justify-center gap-2 p-3 font-bold">
              <span className="rounded-full border-[1.5px] border-line bg-surface px-3.5 py-2">$10</span>
              <span className="rounded-full bg-brand px-3.5 py-2 text-brand-ink">$20</span>
              <span className="rounded-full border-[1.5px] border-line bg-surface px-3.5 py-2">$50</span>
            </div>
          </StepCard>
          <StepCard n={2} text="Send the link on WhatsApp.">
            <div className="flex w-full flex-col justify-center gap-1.5 px-[18px] py-3.5 text-sm">
              <div className="max-w-[85%] self-end rounded-[14px_14px_4px_14px] bg-[#D9F5C9] px-3 py-2 text-[#14211D]">
                Happy birthday! 🎁 kepter.app/c/1042
              </div>
              <div className="self-start rounded-[14px_14px_14px_4px] bg-surface px-3 py-2 text-ink">Thank you!!</div>
            </div>
          </StepCard>
          <StepCard n={3} text="They show a QR code at the counter.">
            <div className="flex w-full items-center justify-center">
              <div className="rounded-xl bg-white p-2 shadow-card">
                <QrImage text={shopUrl(DEMO_SHOP)} size={84} label="" />
              </div>
            </div>
          </StepCard>
        </div>
      </section>

      <section className="flex flex-col gap-6">
        <h2 className="m-0 text-[30px] font-extrabold tracking-[-.02em]">Why Kepter</h2>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] gap-x-10">
          {WHYS.map((w) => (
            <div key={w.t} className="flex gap-3.5 border-t border-line py-[18px]">
              <span className="mt-px flex size-[26px] flex-none items-center justify-center rounded-full bg-ok-bg text-ok">
                <CheckIcon size={14} />
              </span>
              <div className="flex flex-col gap-0.5">
                <span className="text-[17px] font-bold">{w.t}</span>
                <span className="text-ink-2">{w.d}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-5">
        <h2 className="m-0 text-[30px] font-extrabold tracking-[-.02em]">Ways to use it</h2>
        <div className="flex flex-wrap gap-2.5">
          {USES.map((u) => (
            <span key={u} className="rounded-full bg-surface-2 px-[18px] py-3 text-base font-semibold">
              {u}
            </span>
          ))}
        </div>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-6 rounded-[28px] bg-brand p-[clamp(28px,5vw,56px)] text-brand-ink">
        <div className="flex max-w-[560px] flex-col gap-2">
          <span className="text-sm font-bold tracking-[.12em] uppercase opacity-80">For shops</span>
          <h2 className="m-0 text-[clamp(28px,4vw,40px)] leading-[1.1] font-extrabold tracking-[-.02em] text-balance">
            Sell gift cards in two minutes. Get paid when they are used.
          </h2>
        </div>
        <Button variant="accent" onClick={goSetup} className="min-h-[54px] rounded-[14px] px-6 text-[17px]">
          Open your shop
        </Button>
      </section>
    </div>
  );
}
