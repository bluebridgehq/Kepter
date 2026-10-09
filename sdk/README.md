# @kepter/sdk

TypeScript SDK for [Kepter](../README.md), gift cards for small shops backed by USDC on Stellar.

It covers everything an app needs to work with the Kepter contract:

- **Card links**: create a card key, build the link sent to the recipient, and the separate chip in link for friends
- **Signed redemptions**: build and sign the redemption message, and encode or decode it as QR code text
- **Reads without a wallet**: shops, cards, funders and proof of backing, batched into as few RPC calls as possible
- **Transactions**: open a shop, buy, top up, redeem, settle and claim, ready to sign with any Stellar wallet
- **Amounts, rules and errors**: USDC amounts as `bigint`, the unused balance rules with plain wording, and readable error messages

## Install

```
pnpm add @kepter/sdk
```

## Examples

### Read a shop and check backing

```ts
import { Kepter, formatUnits } from "@kepter/sdk";

const kepter = new Kepter();
const shop = await kepter.getMerchant("G...");
const cards = await kepter.listMerchantCards("G...");
const backing = await kepter.getBacking();
console.log(shop?.name, cards.length, backing.backed, formatUnits(backing.owed));
```

### List shops

```ts
import { Kepter, categoryName } from "@kepter/sdk";

const shops = await new Kepter().listShops();
for (const { address, merchant } of shops) {
  if (merchant.closed_at === undefined) console.log(merchant.name, categoryName(merchant.category), merchant.city);
}
```

Shops open with `openShop(address, { name, category, city, contact }, rule)` and change their details with `updateShop`.

### Buy a card

```ts
import { Kepter, buildCardLink, buildChipInLink, createCardKey, toUnits } from "@kepter/sdk";

const kepter = new Kepter({ publicKey: buyer, signTransaction });
const key = createCardKey();
const expiresAt = BigInt(Math.floor(Date.now() / 1000)) + 90n * 86400n;

const tx = await kepter.buyCard({ buyer, merchant: shop, amount: toUnits("20"), cardKey: key.publicKey, expiresAt });
const { result } = await tx.signAndSend();
const cardId = result.unwrap();

const cardLink = buildCardLink("https://your.site", { cardId, secret: key.secret, to: "Bisi", message: "Happy birthday" });
const chipInLink = buildChipInLink("https://your.site", cardId);
```

`signTransaction` comes from the wallet, for example Stellar Wallets Kit.

A buyer's wallet must be able to hold USDC first. `kepter.addUsdc()` returns a transaction that adds the USDC asset (a trustline) to the connected account. It sets aside 0.5 XLM.

### Spend a card

On the recipient's phone:

```ts
import { encodeRedeemQr, parseCardLink, signRedeem, toUnits, TESTNET } from "@kepter/sdk";

const { cardId, secret } = parseCardLink(location.href);
const card = await kepter.getCard(cardId);
const qrText = encodeRedeemQr(
  signRedeem(secret, {
    networkPassphrase: TESTNET.networkPassphrase,
    cardId,
    amount: toUnits("5"),
    nonce: card!.nonce,
    validUntil: BigInt(Math.floor(Date.now() / 1000)) + 600n,
  }),
);
```

At the shop, after scanning, or after pasting a customer's message for an online order:

```ts
import { decodeRedeemQr, findRedeemCode } from "@kepter/sdk";

const tx = await kepter.redeem(decodeRedeemQr(findRedeemCode(text) ?? text));
await tx.signAndSend();
```

## Development

```
pnpm install
pnpm typecheck
pnpm test
pnpm build
```

Tests run with Node's built in test runner. `test/live.test.ts` reads from the testnet deployment and only runs with `KEPTER_LIVE=1`.

`src/generated/contract.ts` is generated from the contract. After changing the contract, rebuild it and run `pnpm generate`.

The redemption message must match the contract byte for byte. Both sides check [`test-vectors/redeem.json`](../test-vectors/redeem.json).

## License

Apache 2.0
