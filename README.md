# Kepter

**Send what they need, not just money.**

Kepter lets small shops sell gift cards and store credit that are backed by real money. When someone buys a card, the USDC is held by this Soroban contract on Stellar, not by the shop. The person who gets the card opens a link on their phone and shows a QR code at the counter. The shop scans it and is paid from the card on the spot.

This repository holds the whole project. The smart contract is done and live on testnet. The TypeScript SDK and the website are being built next and will live here too.

## How it works

- **The link is the card.** Each card has its own key. The secret part sits in the card link after `#`, so the recipient needs no wallet or account.
- **Spending is a signed QR code.** The recipient's page signs "spend this amount from this card", and the contract checks the signature before paying the shop. A QR code works once and only for a few minutes.
- **Friends can chip in.** Up to 20 people can add money to one card, and a shop can top up a card as store credit.
- **Shops choose a rule for unused money.** When a card expires, what is left goes back to the people who paid, is split with the shop, or goes to the shop. The buyer sees the rule before paying, and it is locked into the card.
- **Buyers are protected if a shop closes.** If a shop closes before a card expires, everyone who paid gets their share back.
- **Proof of backing.** The contract tracks everything it owes, and that total always equals its USDC balance. Anyone can check it.
- **No admin.** Nobody can move the money except by following these rules.

The full design is in [docs/DESIGN.md](docs/DESIGN.md), and the product overview is in [docs/OVERVIEW.md](docs/OVERVIEW.md).

## Status

| | |
|---|---|
| Network | Stellar testnet (Protocol 29) |
| Contract | [`CC54W5Y23QKGDCJGXI5LTSY5QO5JWLSYNUVWQXWV2AA2IFUDJYPHART7`](https://stellar.expert/explorer/testnet/contract/CC54W5Y23QKGDCJGXI5LTSY5QO5JWLSYNUVWQXWV2AA2IFUDJYPHART7) |
| Asset | Circle's testnet USDC (`CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA`) |
| Tests | 40 passing |
| Size | About 22 KB of WASM |

The full flow (open a shop, buy, chip in, redeem with a signed QR code, close, settle, and claim a share that could not be paid) has been run on testnet. Details of the current deployment are in [`deployments/testnet.json`](deployments/testnet.json).

This is testnet software and has not been audited.

## Getting started

You need Rust 1.91 or newer, the `wasm32v1-none` target and the [Stellar CLI](https://developers.stellar.org/docs/tools/cli).

```
rustup target add wasm32v1-none
cd contracts
cargo test
stellar contract build
```

### Deploy your own copy to testnet

```
stellar keys generate kepter-deployer --network testnet --fund
contracts/scripts/deploy.sh
```

The script builds the contract, deploys it against Circle's testnet USDC and writes the result to `deployments/testnet.json`. Set `ASSET=CODE:ISSUER` to use another asset.

### Try it from the command line

```
stellar contract invoke --id <contract id> --source-account <shop> --network testnet -- \
  register_merchant --merchant <shop address> --name "My Shop" --expiry_keep_bps 5000
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
test-vectors/         fixtures shared by the contract and the SDK
deployments/          addresses of deployed contracts, used by the SDK and website
docs/                 design and overview
```

The SDK (`sdk/`) and the website (`frontend/`) will be added as they are built.

## Contributing

Issues are open for anyone to pick up. See [CONTRIBUTING.md](CONTRIBUTING.md) for setup and how we work.

## License

Apache 2.0. See [LICENSE](LICENSE).
