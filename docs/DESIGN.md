# Contract design

How the Kepter contract works, for anyone reading or changing the code. For what Kepter is and who it is for, see [OVERVIEW.md](OVERVIEW.md).

## The pieces

| Thing | What it is |
|---|---|
| Shop | A Stellar account that has opened a shop with `register_merchant`. It has a name and an unused balance rule |
| Card | Money held for one shop. It has a balance, an expiry date, the shop's rule at the time it was bought, and its own ed25519 public key |
| Funder | Anyone who paid into a card: the buyer first, then friends who chipped in or a shop giving store credit. At most 20 per card |
| Card key | A key pair made in the buyer's browser. Only the public key is stored. The secret lives in the card link after `#` |

## Lifecycle of a card

```
buy  ──▶  top_up (optional, any number of times)
 │
 ├──▶  redeem (any number of times, until the balance is 0)
 │
 └──▶  settle (after expiry, or once the shop closes)  ──▶  claim_owed (only if a payment failed)
```

## Spending a card

The recipient's page signs a redemption message with the card key and shows it as a QR code. The shop scans it and submits `redeem`, approving it with its own account. The contract rebuilds the message, checks it with `ed25519_verify`, lowers the balance, raises the card's nonce and pays the shop.

The message is 84 bytes, built the same way in the contract (`src/redeem.rs`) and the SDK:

| Part | Bytes | Value |
|---|---|---|
| Domain tag | 16 | ASCII `KEPTER_REDEEM_V1` |
| Network ID | 32 | SHA-256 of the network passphrase |
| Card ID | 8 | `u64`, big endian |
| Amount | 16 | `i128`, big endian, in base units |
| Nonce | 4 | `u32`, big endian, the card's current nonce |
| Valid until | 8 | `u64`, big endian, unix seconds |

- The network ID stops a testnet QR code from working on mainnet.
- The nonce stops a QR code from being used twice.
- "Valid until" stops an old screenshot from working. It may be at most 15 minutes ahead.
- The domain tag stops the signature from meaning anything else.

[`test-vectors/redeem.json`](../test-vectors/redeem.json) holds a fixed example. The contract tests check it, and the SDK tests will check the same file, so the two can never drift apart.

## The unused balance rule

Each shop chooses what happens to money left on a card when it expires, as `expiry_keep_bps` from 0 to 10,000 (0% to 100% to the shop). The website offers three values:

| Rule | Value | What happens at expiry |
|---|---|---|
| Buyer protected | 0 | Everything goes back to the funders |
| Shared | 5,000 | Half to the shop, half to the funders |
| Shop keeps it | 10,000 | Everything goes to the shop |

The rule is copied onto each card when it is bought. `set_expiry_rule` only affects cards bought afterwards.

## Settling a card

`settle(card_id)` works once the card has expired or its shop has closed. Anyone can call it, and the caller gets nothing.

1. If the shop closed before the card expired, the shop's share is 0, whatever the rule.
2. Otherwise the shop's share is `balance * expiry_keep_bps / 10000`, rounded down.
3. The rest is shared among funders in proportion to what each paid in, rounded down. The rounding remainder goes to the first funder, so the payouts always add up to the balance exactly.

Every payment is sent with `try_transfer`. If an account cannot receive USDC (no trustline, or frozen by the issuer), its amount is saved as owed and the other payments still go through. `claim_owed(card_id, account)` sends a saved amount later, once the account can receive again. Anyone can call it, and the money only goes to its owner.

## Proof of backing

The contract keeps a running total of everything it owes: open card balances plus amounts saved for someone to claim. `total_owed()` should always equal the contract's USDC balance, and the tests check this after every kind of action. The website compares the two to show a "fully backed" badge that anyone can verify on an explorer.

## Opening a shop

`register_merchant` calls the USDC contract's `trust` function (added in Protocol 26 by CAP-73), so opening a shop also creates the shop's USDC trustline. The shop owner needs about 0.5 XLM for the trustline reserve plus fees.

## Storage

| Key | Storage | Value |
|---|---|---|
| `Usdc` | Instance | USDC contract address, set once in the constructor |
| `NextCardId` | Instance | Next card ID, starting at 1 |
| `TotalOwed` | Instance | Everything the contract owes |
| `Merchant(address)` | Persistent | `Merchant` |
| `Card(id)` | Persistent | `Card` |
| `MerchantCard(address, n)` | Persistent | The shop's n'th card ID, for listing |
| `Funder(id, n)` | Persistent | The card's n'th funder |
| `Paid(id, address)` | Persistent | What a funder paid into a card in total |
| `Owed(id, address)` | Persistent | An amount saved for an account to claim |

Every write extends the entry's TTL to the network maximum (about 180 days today). Cards last at most 180 days, so a card's data stays live for its whole life.

## Limits

| Limit | Value |
|---|---|
| Smallest card or top up | 1 USDC |
| Largest card balance | 1,000 USDC |
| Funders per card | 20 |
| Card life | 7 to 180 days |
| QR code validity | At most 15 minutes ahead |
| Shop name | 1 to 48 bytes |

## Functions

| Function | Approved by | Purpose |
|---|---|---|
| `register_merchant(merchant, name, expiry_keep_bps)` | Shop | Open a shop and create its USDC trustline |
| `set_expiry_rule(merchant, expiry_keep_bps)` | Shop | Change the rule for new cards |
| `close_store(merchant)` | Shop | Close for good. Cards become settleable |
| `buy(buyer, merchant, amount, card_key, expires_at)` | Buyer | Create a card and return its ID |
| `top_up(funder, card_id, amount)` | Funder | Add money to an active card |
| `redeem(card_id, amount, valid_until, signature)` | The card's shop | Spend from a card |
| `settle(card_id)` | Anyone | Pay out an expired card or a closed shop's card |
| `claim_owed(card_id, account)` | Anyone | Send a saved amount to its owner |
| `get_merchant`, `get_card`, `get_merchant_card`, `get_funder`, `get_owed`, `total_owed`, `usdc` | Read only | |

## Errors

| Code | Name | When |
|---|---|---|
| 1 | `AlreadyRegistered` | The account already has a shop |
| 2 | `MerchantNotFound` | No shop for that account |
| 3 | `StoreClosed` | The shop has closed |
| 4 | `InvalidRule` | Rule above 10,000 |
| 5 | `InvalidName` | Empty or longer than 48 bytes |
| 6 | `InvalidAmount` | Outside the allowed amounts |
| 7 | `CardLimitReached` | A top up would pass 1,000 USDC |
| 8 | `TooManyFunders` | A 21st funder |
| 9 | `InvalidExpiry` | Card life outside 7 to 180 days |
| 10 | `CardNotFound` | No card with that ID |
| 11 | `CardExpired` | Spending or topping up an expired card |
| 12 | `CardSettled` | The card was already settled |
| 13 | `InsufficientBalance` | Spending more than the balance |
| 14 | `QrExpired` | The QR code's time has passed |
| 15 | `QrTooLong` | The QR code is valid too far ahead |
| 16 | `NotSettleable` | The card has not expired and its shop is open |
| 17 | `NothingToSettle` | The balance is already 0 |
| 18 | `NothingOwed` | Nothing saved for that account |
| 19 | `FunderNotFound` | No funder at that position |
| 20 | `Overflow` | A calculation overflowed |

A wrong signature fails inside `ed25519_verify` and aborts the transaction without a contract error code.

## Events

`StoreOpened`, `StoreClosed`, `ExpiryRuleChanged`, `CardBought`, `CardToppedUp`, `CardRedeemed`, `CardSettled`, `AmountOwed`, `OwedClaimed`. Field names and topics are in [`src/events.rs`](../contracts/kepter/src/events.rs).
