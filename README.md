# Kepter

**Send what they need, not just money.**

Kepter lets small shops sell gift cards and store credit that are backed by real money. When someone buys a card, the USDC is held by this Soroban contract on Stellar, not by the shop. Buyers find shops by category and city. The person who gets the card opens a link on their phone and shows a QR code at the counter, or sends a payment code to the shop with an online order. The shop is paid from the card on the spot.

**Try it: [kepter.vercel.app](https://kepter.vercel.app)** (Stellar testnet, no real money)

This repository holds the whole project: the Soroban contract (live on testnet), the TypeScript SDK and the website.

## How it works

- **The link is the card.** Each card has its own key. The secret part sits in the card link after `#`, so the recipient needs no wallet or account.
- **Spending is a signed QR code.** The recipient's page signs "spend this amount from this card", and the contract checks the signature before paying the shop. A QR code works once and only for a few minutes.
- **In the shop or online.** The same signed code can be shown as a QR code at the counter or sent to the shop on WhatsApp. Only that shop can use it.
- **A shop list with no server.** Each shop's category, city and contact are stored in the contract, along with a list of every shop, so the website can show them all.
- **Friends can chip in.** Up to 20 people can add money to one card, and a shop can top up a card as store credit.
- **Shops choose a rule for unused money.** When a card expires, what is left goes back to the people who paid, is split with the shop, or goes to the shop. The buyer sees the rule before paying, and it is locked into the card.
- **Buyers are protected if a shop closes.** If a shop closes before a card expires, everyone who paid gets their share back.
- **Proof of backing.** The contract tracks everything it owes, and that total always equals its USDC balance. Anyone can check it.
- **No admin.** Nobody can move the money except by following these rules.

The full design is in [docs/DESIGN.md](docs/DESIGN.md), and the product overview is in [docs/OVERVIEW.md](docs/OVERVIEW.md).

## Status

| | |
|---|---|
| Live demo | [kepter.vercel.app](https://kepter.vercel.app) |
| Network | Stellar testnet (Protocol 29) |
| Contract | [`CBOASWBXLWLNVMX65JGXITSO56WUHC6HXBFCVF2JTXVOYMIGY2LWNYU7`](https://stellar.expert/explorer/testnet/contract/CBOASWBXLWLNVMX65JGXITSO56WUHC6HXBFCVF2JTXVOYMIGY2LWNYU7) |
| Asset | Circle's testnet USDC (`CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA`) |
| Tests | 48 contract tests and 28 SDK tests passing, plus 5 live testnet tests |
| Size | About 24 KB of WASM |

The full flow (open a shop, buy, chip in, redeem with a signed QR code, close, settle, and claim a share that could not be paid) has been run on testnet, and the website flow (open a shop, edit its details, find it on the shop list, buy, pay online with a pasted code) has been run in a browser. Details of the current deployment are in [`deployments/testnet.json`](deployments/testnet.json).

This is testnet software and has not been audited.

## Getting started

You need Rust 1.91 or newer, the `wasm32v1-none` target and the [Stellar CLI](https://developers.stellar.org/docs/tools/cli).

```
rustup target add wasm32v1-none
cd contracts
cargo test
stellar contract build
```

### SDK and website

You need Node 24 or newer and pnpm.

```
pnpm install
pnpm --filter @kepter/sdk build
pnpm --filter @kepter/sdk test
pnpm dev
```

`pnpm dev` starts the website at http://localhost:5173.

### Deploy your own copy to testnet

```
stellar keys generate kepter-deployer --network testnet --fund
contracts/scripts/deploy.sh
```

The script builds the contract, deploys it against Circle's testnet USDC and writes the result to `deployments/testnet.json`. Set `ASSET=CODE:ISSUER` to use another asset.

### Try it from the command line

```
stellar contract invoke --id <contract id> --source-account <shop> --network testnet -- \
  register_merchant --merchant <shop address> --name "My Shop" --expiry_keep_bps 5000 \
  --category 1 --city "Yaba, Lagos" --contact "+2348012345678"
```

## Repository layout

```
contracts/            Rust workspace for the Soroban contract
  kepter/src/
    lib.rs            contract entry points
    storage.rs        storage keys, limits and TTL handling
    types.rs          Merchant, Card and return types
    redeem.rs         the signed redemption message
    settle.rs         shop and funder shares, payouts
    events.rs         contract events
    errors.rs         contract errors
    test/             tests, grouped by feature
  scripts/            deployment
sdk/                  @kepter/sdk, the TypeScript SDK (see sdk/README.md)
frontend/             the website (see frontend/README.md)
test-vectors/         fixtures shared by the contract and the SDK
deployments/          addresses of deployed contracts, used by the SDK and website
docs/                 design and overview
```


## Contributing

Issues are open for anyone to pick up. See [CONTRIBUTING.md](CONTRIBUTING.md) for setup and how we work.

## License

Apache 2.0. See [LICENSE](LICENSE).
