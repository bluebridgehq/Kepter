import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Merchant } from "@kepter/sdk";

import { LogoMark } from "../components/icons.tsx";
import { Button, MessagePanel, QrImage, Skeleton } from "../components/ui.tsx";
import { displayUrl, reader, shopUrl } from "../lib/config.ts";
import { shortAddress } from "../lib/format.ts";
import { socialPosterPng } from "../lib/poster.ts";
import { useToast } from "../lib/toast-context.ts";
import { useWallet } from "../lib/wallet-context.ts";

export function Poster() {
  const navigate = useNavigate();
  const toast = useToast();
  const { address, connect } = useWallet();
  const [merchant, setMerchant] = useState<Merchant | null>();

  useEffect(() => {
    if (!address) return;
    reader.getMerchant(address).then((m) => setMerchant(m ?? null), () => setMerchant(null));
  }, [address]);

  if (!address) {
    return (
      <div className="mx-auto flex max-w-[560px] flex-col gap-5 px-5 pt-2 pb-12">
        <h1 className="m-0 text-[28px] font-extrabold tracking-[-.02em]">Counter poster</h1>
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
      <div className="mx-auto max-w-[560px] px-5 pt-2 pb-12">
        <MessagePanel
          icon="i"
          tone="brand"
          title="This account has no shop yet."
          action={
            <Button onClick={() => navigate("/open")} className="mt-2 min-h-[52px] rounded-[14px] px-6 text-[17px]">
              Open your shop
            </Button>
          }
        />
      </div>
    );
  }

  const link = shopUrl(address);
  const shortLink = displayUrl(link.replace(address, shortAddress(address)));
  const name = merchant?.name ?? "";

  const download = async () => {
    try {
      const blob = await socialPosterPng(name, link);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "kepter-poster.png";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast("Image saved");
    } catch {
      toast("Could not save the image");
    }
  };

  return (
    <div className="mx-auto flex max-w-[1100px] flex-col gap-5 px-5 pt-2 pb-12">
      <div data-noprint className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <button
            onClick={() => navigate("/shop")}
            className="min-h-11 cursor-pointer self-start border-none bg-transparent p-0 text-base font-semibold text-ink"
          >
            ← Dashboard
          </button>
          <h1 className="m-0 text-[28px] font-extrabold tracking-[-.02em]">Counter poster</h1>
        </div>
        <div className="flex gap-2.5">
          <Button onClick={() => window.print()} className="min-h-[50px] rounded-[14px] px-[22px] text-base">
            Print
          </Button>
          <Button
            variant="secondary"
            disabled={!merchant}
            onClick={() => void download()}
            className="min-h-[50px] rounded-[14px] px-[22px] text-base"
          >
            Download image
          </Button>
        </div>
      </div>

      {!merchant ? (
        <Skeleton className="aspect-[210/297] max-w-[440px] rounded-md" />
      ) : (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,340px),1fr))] items-start gap-7">
          <div className="flex flex-col gap-2.5">
            <span data-noprint className="text-sm font-bold text-ink-2">
              Print · A4 / Letter
            </span>
            <div className="@container flex aspect-[210/297] flex-col items-center justify-between rounded-md border border-[#DDD] bg-white px-[8%] py-[9%] text-center text-[#111] print:border-none">
              <div className="flex items-center gap-[2.2cqw]">
                <LogoMark size="7cqw" body="#111" dot="#fff" />
                <span className="text-[6cqw] font-extrabold tracking-[-.02em]">Kepter</span>
              </div>
              <div className="flex flex-col gap-[3cqw]">
                <div className="text-[10.5cqw] leading-[1.02] font-extrabold tracking-[-.03em] text-balance">
                  We accept Kepter gift cards
                </div>
                <div className="text-[4.4cqw] leading-[1.3] text-balance text-[#333]">
                  Buy a gift card for someone, they pay with their phone.
                </div>
              </div>
              <div className="rounded-[4cqw] border-[0.6cqw] border-[#111] p-[3cqw]">
                <QrImage text={link} size="46cqw" label="QR code to the shop's gift card page" />
              </div>
              <div className="flex flex-col gap-[1cqw]">
                <div className="text-[6cqw] font-extrabold [overflow-wrap:anywhere]">{name}</div>
                <div className="text-[3.8cqw] text-[#333]">{shortLink}</div>
              </div>
            </div>
          </div>
          <div data-noprint className="flex flex-col gap-2.5">
            <span className="text-sm font-bold text-ink-2">Social · 1080 × 1080</span>
            <div className="@container relative grid aspect-square grid-cols-[1fr_auto] grid-rows-[auto_1fr_auto] gap-[4cqw] overflow-hidden rounded-md bg-[#0F4C3A] p-[7%] text-white">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,.09)_1px,transparent_0)] bg-[length:16px_16px]" />
              <div className="absolute top-0 right-[22%] bottom-0 w-[6%] bg-[#F2A33A]" />
              <div className="relative col-span-2 flex items-center gap-[2cqw]">
                <LogoMark size="6cqw" body="#fff" dot="#F2A33A" />
                <span className="text-[5cqw] font-extrabold">Kepter</span>
              </div>
              <div className="relative col-span-2 max-w-[72%] self-center text-[10cqw] leading-[1.02] font-extrabold tracking-[-.03em] text-balance">
                We accept Kepter gift cards
              </div>
              <div className="relative flex flex-col justify-end gap-[1cqw]">
                <div className="text-[5.4cqw] font-extrabold [overflow-wrap:anywhere]">{name}</div>
                <div className="text-[3.4cqw] opacity-85">Buy a gift card for someone, they pay with their phone.</div>
              </div>
              <div className="relative self-end rounded-[3cqw] bg-white p-[2cqw]">
                <QrImage text={link} size="26cqw" label="" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
