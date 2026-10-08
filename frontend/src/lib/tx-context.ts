import { createContext, useContext } from "react";
import type { AssembledTransaction } from "@kepter/sdk";

export interface TxRequest<T> {
  /** Shown at the top of the progress sheet, for example "Gift card at Tola's Kitchen". */
  title: string;
  /** Shown large under the title, for example "$20.00 USDC". */
  amount: string;
  /** Builds and simulates the transaction. Called again on retry. */
  build: () => Promise<AssembledTransaction<T>>;
}

export interface TxApi {
  /** Runs a transaction through the progress sheet. Resolves to the result, or undefined if cancelled. */
  run: <T>(request: TxRequest<T>) => Promise<Unwrapped<T> | undefined>;
}

/** Contract calls that return Result<T> resolve to T. */
export type Unwrapped<T> = T extends { unwrap(): infer U } ? U : T;

export const TxContext = createContext<TxApi | null>(null);

export function useTx(): TxApi {
  const value = useContext(TxContext);
  if (!value) throw new Error("useTx must be used inside TxProvider");
  return value;
}
