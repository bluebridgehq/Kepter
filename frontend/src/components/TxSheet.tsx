import { CheckIcon } from "./icons.tsx";

export type TxStep = "approve" | "sending" | "done" | "failed";

interface TxSheetProps {
  title: string;
  amount: string;
  step: TxStep;
  /** Which step failed, when step is "failed". */
  failAt: number;
  reason?: string;
  onRetry: () => void;
  onCancel: () => void;
}

const STEPS: Array<[string, string]> = [
  ["Approve in your wallet", "Check your wallet app or extension."],
  ["Sending", "This takes about 5 to 10 seconds."],
  ["Done", ""],
];

const ORDER: TxStep[] = ["approve", "sending", "done"];

/** The payment progress sheet shown for every action that needs the wallet. */
export function TxSheet({ title, amount, step, failAt, reason, onRetry, onCancel }: TxSheetProps) {
  const index = step === "failed" ? failAt : ORDER.indexOf(step);

  return (
    <div data-noprint className="fixed inset-0 z-[60] flex items-end justify-center bg-scrim">
      <div
        role="dialog"
        aria-modal="true"
        aria-live="polite"
        className="animate-[kup_.25s_ease-out] flex w-full max-w-[480px] flex-col gap-[18px] rounded-t-[26px] bg-surface px-[22px] pt-6 pb-7 text-ink"
      >
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold text-ink-2">{title}</span>
          <span className="tabular text-[28px] font-extrabold tracking-[-.02em]">{amount}</span>
        </div>
        <div className="flex flex-col gap-3.5">
          {STEPS.map(([label, hint], i) => {
            const failed = step === "failed" && i === index;
            const done = i < index || (step === "done" && i === 2);
            const active = !failed && !done && i === index;
            const tone = failed
              ? "bg-bad-bg text-bad"
              : done
                ? "bg-ok-bg text-ok"
                : active
                  ? "bg-brand-soft text-brand-text"
                  : "bg-surface-2 text-ink-2";
            const labelTone = failed ? "text-bad" : done || active ? "text-ink" : "text-ink-2";
            return (
              <div key={label} className="flex items-center gap-3.5">
                <span
                  className={`flex size-8 flex-none items-center justify-center rounded-full text-sm font-extrabold ${tone}`}
                >
                  {active && (
                    <span className="animate-kspin size-[18px] rounded-full border-[2.5px] border-current border-r-transparent" />
                  )}
                  {done && <CheckIcon stroke={2.4} />}
                  {!active && !done && String(i + 1)}
                </span>
                <div className="flex flex-col">
                  <span className={`font-bold ${labelTone}`}>{failed ? "Failed" : label}</span>
                  {active && <span className="text-sm text-ink-2">{hint}</span>}
                </div>
              </div>
            );
          })}
        </div>
        {step === "failed" && (
          <>
            <div className="rounded-[14px] bg-bad-bg px-4 py-3.5 font-bold text-bad">{reason}</div>
            <div className="flex gap-2.5">
              <button
                onClick={onCancel}
                className="min-h-[52px] flex-1 cursor-pointer rounded-[14px] border-[1.5px] border-line bg-surface text-base font-bold text-ink"
              >
                Cancel
              </button>
              <button
                onClick={onRetry}
                className="min-h-[52px] flex-1 cursor-pointer rounded-[14px] border-none bg-brand text-base font-bold text-brand-ink"
              >
                Try again
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
