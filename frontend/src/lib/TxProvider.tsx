import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import { explainError } from "@kepter/sdk";

import { TxSheet, type TxStep } from "../components/TxSheet.tsx";
import { TxContext, type TxApi, type TxRequest } from "./tx-context.ts";

interface TxView {
  title: string;
  amount: string;
  step: TxStep;
  failAt: number;
  reason?: string;
}

interface Pending {
  request: TxRequest<unknown>;
  resolve: (value: unknown) => void;
}

function toError(error: unknown): Error {
  if (error instanceof Error) return error;
  const message = (error as { message?: unknown } | null)?.message;
  return new Error(typeof message === "string" ? message : String(error));
}

function unwrap(result: unknown): unknown {
  if (result && typeof result === "object" && "unwrap" in result) {
    const fn = (result as { unwrap: unknown }).unwrap;
    if (typeof fn === "function") return fn.call(result);
  }
  return result;
}

export function TxProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<TxView | null>(null);
  const pending = useRef<Pending | null>(null);

  const attempt = useCallback(async () => {
    const current = pending.current;
    if (!current) return;
    const { request, resolve } = current;
    let step: TxStep = "approve";
    setView({ title: request.title, amount: request.amount, step, failAt: 0 });
    try {
      const tx = await request.build();
      const sent = await tx.signAndSend({
        watcher: {
          onSubmitted: () => {
            step = "sending";
            setView((v) => (v ? { ...v, step } : v));
          },
        },
      });
      const value = unwrap(sent.result);
      setView((v) => (v ? { ...v, step: "done" } : v));
      setTimeout(() => {
        setView(null);
        pending.current = null;
        resolve(value);
      }, 900);
    } catch (error) {
      setView((v) =>
        v
          ? {
              ...v,
              step: "failed",
              failAt: step === "sending" ? 1 : 0,
              reason: explainError(toError(error)),
            }
          : v,
      );
    }
  }, []);

  const run = useCallback(
    <T,>(request: TxRequest<T>) =>
      new Promise<unknown>((resolve) => {
        pending.current = { request: request as TxRequest<unknown>, resolve };
        void attempt();
      }),
    [attempt],
  ) as TxApi["run"];

  const cancel = useCallback(() => {
    const current = pending.current;
    pending.current = null;
    setView(null);
    current?.resolve(undefined);
  }, []);

  const api = useMemo(() => ({ run }), [run]);

  return (
    <TxContext.Provider value={api}>
      {children}
      {view && (
        <TxSheet
          title={view.title}
          amount={view.amount}
          step={view.step}
          failAt={view.failAt}
          reason={view.reason}
          onRetry={() => void attempt()}
          onCancel={cancel}
        />
      )}
    </TxContext.Provider>
  );
}
