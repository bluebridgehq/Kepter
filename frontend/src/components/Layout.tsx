import { Suspense, useEffect } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";

import { GITHUB_URL } from "../lib/config.ts";
import { useWallet } from "../lib/wallet-context.ts";
import { LogoMark } from "./icons.tsx";
import { Skeleton } from "./ui.tsx";
import { WalletButton } from "./WalletButton.tsx";

export function TestnetBanner() {
  return (
    <div className="flex items-center justify-center gap-2 bg-warn-bg px-3 py-1.5 text-center text-[13px] font-semibold text-warn">
      <span className="size-[7px] rounded-full bg-warn" />
      Test network: no real money.
    </div>
  );
}

function PageLoading() {
  return (
    <div className="mx-auto flex max-w-[560px] flex-col gap-3.5 px-5 pt-3">
      <Skeleton className="h-9 w-3/5 rounded-[10px]" />
      <Skeleton className="h-[220px] rounded-[22px]" />
    </div>
  );
}

export function Layout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { address } = useWallet();
  const onGiftCard = pathname.startsWith("/c/");

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="flex min-h-screen flex-col bg-bg text-ink">
      <TestnetBanner />
      <header
        data-noprint
        className="mx-auto flex w-full max-w-[1160px] items-center justify-between gap-3 px-5 py-3.5"
      >
        <Link to="/" className="flex items-center gap-[9px] text-ink no-underline hover:text-ink">
          <LogoMark />
          <span className="text-[22px] font-extrabold tracking-[-.02em]">Kepter</span>
        </Link>
        {!onGiftCard && (
          <div className="flex items-center gap-2.5 sm:gap-3.5">
            <button
              onClick={() => navigate(address ? "/shop" : "/open")}
              className="cursor-pointer border-none bg-transparent px-1 py-2.5 text-[15px] font-semibold whitespace-nowrap text-ink"
            >
              For shops
            </button>
            <WalletButton />
          </div>
        )}
      </header>
      <main className="w-full flex-1">
        <Suspense fallback={<PageLoading />}>
          <Outlet />
        </Suspense>
      </main>
      <footer
        data-noprint
        className="mx-auto flex w-full max-w-[1160px] flex-wrap items-center justify-between gap-x-5 gap-y-3 border-t border-line px-5 pt-6 pb-8 text-sm text-ink-2"
      >
        <div className="flex gap-[18px]">
          <a href={`${GITHUB_URL}#readme`} target="_blank" rel="noreferrer">
            About
          </a>
          <a href={GITHUB_URL} target="_blank" rel="noreferrer">
            GitHub
          </a>
        </div>
        <span>by Blue Bridge</span>
      </footer>
    </div>
  );
}
