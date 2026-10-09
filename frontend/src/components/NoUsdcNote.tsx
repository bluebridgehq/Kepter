import type { Balances } from "@kepter/sdk";

import { USDC_FAUCET_URL, XLM_FAUCET_URL } from "../lib/config.ts";
import { money } from "../lib/format.ts";
import { useToast } from "../lib/toast-context.ts";
import { useTx } from "../lib/tx-context.ts";
import { useWallet } from "../lib/wallet-context.ts";
import { Button } from "./ui.tsx";

/** Adding USDC sets aside 0.5 XLM, plus a little for the fee. */
const XLM_TO_ADD_USDC = 5_100_000n;

/** Shown when the connected wallet cannot pay: no USDC trustline yet, or not enough USDC. */
export function NoUsdcNote({
  balances,
  onAdded,
  className = "",
}: {
  balances: Balances;
  onAdded: () => void;
  className?: string;
}) {
  const { writer } = useWallet();
  const { run } = useTx();
  const toast = useToast();

  const faucet = (
    <a href={USDC_FAUCET_URL} target="_blank" rel="noreferrer" className="font-extrabold text-bad">
      Circle's faucet
    </a>
  );

  const addUsdc = async () => {
    if (!writer) return;
    const done = await run({ title: "Add USDC to your wallet", amount: "0.5 XLM set aside", build: async () => writer.addUsdc() });
    if (!done) return;
    toast("USDC added to your wallet");
    onAdded();
  };

  if (balances.usdc !== undefined) {
    return (
      <div className={`rounded-[14px] bg-bad-bg px-4 py-3.5 text-[15px] text-bad ${className}`}>
        <strong>Your wallet has {money(balances.usdc).slice(1)} USDC.</strong> On the test network you can get free
        test USDC from {faucet}.
      </div>
    );
  }

  const lowXlm = balances.xlmAvailable < XLM_TO_ADD_USDC;
  return (
    <div className={`flex flex-col gap-3 rounded-[14px] bg-bad-bg px-4 py-3.5 text-[15px] text-bad ${className}`}>
      <span>
        <strong>Your wallet cannot hold USDC yet.</strong>{" "}
        {lowXlm ? (
          <>
            Adding USDC sets aside 0.5 XLM, and your wallet needs a little more first. On the test network you can{" "}
            <a href={XLM_FAUCET_URL} target="_blank" rel="noreferrer" className="font-extrabold text-bad">
              get free test XLM
            </a>
            .
          </>
        ) : (
          <>Add it with one tap. Then get free test USDC from {faucet}.</>
        )}
      </span>
      {!lowXlm && (
        <Button onClick={() => void addUsdc()} className="min-h-12 self-start rounded-xl px-5 text-base">
          Add USDC to my wallet
        </Button>
      )}
    </div>
  );
}
