import { useCallback, useMemo, useState, type ReactNode } from "react";
import { Kepter } from "@kepter/sdk";

import { network } from "./config.ts";
import { load, save } from "./storage.ts";
import { WalletContext, type WalletState } from "./wallet-context.ts";

type Kit = typeof import("@creit.tech/stellar-wallets-kit/sdk").StellarWalletsKit;

let kitPromise: Promise<Kit> | undefined;

/** The wallet kit is large, so it loads only when someone connects or signs. */
function getKit(): Promise<Kit> {
  kitPromise ??= Promise.all([
    import("@creit.tech/stellar-wallets-kit/sdk"),
    import("@creit.tech/stellar-wallets-kit/modules/utils"),
    import("@creit.tech/stellar-wallets-kit/types"),
  ]).then(([{ StellarWalletsKit }, { defaultModules }, { Networks }]) => {
    StellarWalletsKit.init({ modules: defaultModules(), network: Networks.TESTNET });
    return StellarWalletsKit;
  });
  return kitPromise;
}

interface StoredWallet {
  address: string;
  id: string;
  name: string;
}

const STORE_KEY = "kepter:wallet";

export function WalletProvider({ children }: { children: ReactNode }) {
  const [wallet, setWallet] = useState<StoredWallet | undefined>(
    () => load<StoredWallet | null>(STORE_KEY, null) ?? undefined,
  );

  const connect = useCallback(async () => {
    try {
      const kit = await getKit();
      const { address } = await kit.authModal();
      const module = kit.selectedModule;
      const next = { address, id: module.productId, name: module.productName };
      setWallet(next);
      save(STORE_KEY, next);
      return address;
    } catch {
      return undefined;
    }
  }, []);

  const disconnect = useCallback(async () => {
    try {
      const kit = await getKit();
      await kit.disconnect();
    } catch {
      // Already disconnected.
    }
    setWallet(undefined);
    save(STORE_KEY, null);
  }, []);

  const writer = useMemo(() => {
    if (!wallet) return undefined;
    const { address, id } = wallet;
    return new Kepter({
      network,
      publicKey: address,
      signTransaction: async (xdr: string) => {
        const kit = await getKit();
        kit.setWallet(id);
        return kit.signTransaction(xdr, { networkPassphrase: network.networkPassphrase, address });
      },
    });
  }, [wallet]);

  const value: WalletState = {
    address: wallet?.address,
    walletName: wallet?.name,
    connect,
    disconnect,
    writer,
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}
