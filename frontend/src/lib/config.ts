import { Kepter, TESTNET } from "@kepter/sdk";

const env = import.meta.env;

/** Testnet by default. The VITE_ variables point the site at another deployment, for local testing. */
export const network = {
  ...TESTNET,
  contractId: (env.VITE_CONTRACT_ID as string | undefined) || TESTNET.contractId,
  usdcAsset: (env.VITE_USDC_ASSET as string | undefined) || TESTNET.usdcAsset,
  usdcContractId: (env.VITE_USDC_CONTRACT_ID as string | undefined) || TESTNET.usdcContractId,
};

/** Base URL used in shared links. Set VITE_SITE_URL in production. */
export const SITE_URL = (import.meta.env.VITE_SITE_URL as string | undefined) || window.location.origin;

/** The demo shop opened on testnet ("Tola's Kitchen"). */
export const DEMO_SHOP = "GC22QLC7MX4UITYTPMXDK3FMULLOHLASVRJOJYXGI457WF3FVXZ3OKWG";

export const GITHUB_URL = "https://github.com/bluebridgehq/kepter";
export const USDC_FAUCET_URL = "https://faucet.circle.com";
export const XLM_FAUCET_URL = "https://lab.stellar.org/account/fund?$=network$id=testnet";
export const CONTRACT_URL = `${network.explorerUrl}/contract/${network.contractId}`;

/** About 0.5 XLM is set aside for the USDC trustline, plus a little for fees. */
export const MIN_XLM_TO_OPEN = 6_000_000n;

/** QR codes are valid for 10 minutes. The contract allows at most 15. */
export const QR_SECONDS = 600;

/** Read only client. Pages use it for anything that needs no wallet. */
export const reader = new Kepter({ network });

export function shopUrl(shop: string): string {
  return `${SITE_URL}/s/${shop}`;
}

export function displayUrl(url: string): string {
  return url.replace(/^https?:\/\//, "");
}
