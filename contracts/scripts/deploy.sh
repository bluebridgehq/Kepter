#!/usr/bin/env bash
# Builds and deploys the Kepter contract, then records the result in
# deployments/<network>.json at the repository root.
#
# Usage (from the repository root):
#   contracts/scripts/deploy.sh                       testnet, Circle's testnet USDC
#   NETWORK=testnet ASSET=CODE:ISSUER contracts/scripts/deploy.sh
#
# SOURCE is a Stellar CLI identity that pays for the deployment
# (default: kepter-deployer). Create one with:
#   stellar keys generate kepter-deployer --network testnet --fund
set -euo pipefail

NETWORK="${NETWORK:-testnet}"
SOURCE="${SOURCE:-kepter-deployer}"
ASSET="${ASSET:-USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="${OUT:-${ROOT}/deployments/${NETWORK}.json}"

cd "${ROOT}/contracts"

stellar contract build
WASM=target/wasm32v1-none/release/kepter.wasm

ASSET_ID=$(stellar contract id asset --asset "$ASSET" --network "$NETWORK")
WASM_HASH=$(stellar contract upload --wasm "$WASM" --source-account "$SOURCE" --network "$NETWORK")
CONTRACT_ID=$(stellar contract deploy --wasm-hash "$WASM_HASH" \
  --source-account "$SOURCE" --network "$NETWORK" \
  -- --usdc "$ASSET_ID")

mkdir -p "$(dirname "$OUT")"
cat > "$OUT" <<EOF
{
  "network": "${NETWORK}",
  "contract_id": "${CONTRACT_ID}",
  "asset": "${ASSET}",
  "asset_contract_id": "${ASSET_ID}",
  "wasm_hash": "${WASM_HASH}",
  "deployed_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

echo "Kepter deployed to ${NETWORK}: ${CONTRACT_ID}"
echo "Saved to ${OUT}"
