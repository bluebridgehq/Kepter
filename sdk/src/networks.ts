export interface Network {
  name: string;
  networkPassphrase: string;
  rpcUrl: string;
  contractId: string;
  usdcAsset: string;
  usdcContractId: string;
  explorerUrl: string;
}

/** Kepter on Stellar testnet. Kept in step with deployments/testnet.json by a test. */
export const TESTNET: Network = {
  name: "testnet",
  networkPassphrase: "Test SDF Network ; September 2015",
  rpcUrl: "https://soroban-testnet.stellar.org",
  contractId: "CC54W5Y23QKGDCJGXI5LTSY5QO5JWLSYNUVWQXWV2AA2IFUDJYPHART7",
  usdcAsset: "USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
  usdcContractId: "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA",
  explorerUrl: "https://stellar.expert/explorer/testnet",
};
