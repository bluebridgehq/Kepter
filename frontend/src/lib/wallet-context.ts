import { createContext, useContext } from "react";
import type { Kepter } from "@kepter/sdk";

export interface WalletState {
  address?: string;
  /** For example "Freighter". */
  walletName?: string;
  /** Opens the wallet picker. Resolves to the address, or undefined if closed. */
  connect: () => Promise<string | undefined>;
  disconnect: () => Promise<void>;
  /** A client that signs with the connected wallet. */
  writer?: Kepter;
}

export const WalletContext = createContext<WalletState | null>(null);

export function useWallet(): WalletState {
  const value = useContext(WalletContext);
  if (!value) throw new Error("useWallet must be used inside WalletProvider");
  return value;
}
