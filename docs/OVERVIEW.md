# Kepter

**Send what they need, not just money.**

A meal, groceries, medicine, school books, a haircut. Gift cards for the shops people already use, backed by real money on Stellar.

## What Kepter is

Kepter lets a small business sell gift cards and store credit online. Anyone can buy a card in USDC for anyone else: a friend, a relative, a colleague, a client or a customer. The money does not go straight to the shop. It is held by a smart contract on Stellar until the card is spent at the shop. The person who receives the card gets a link. They open it on their phone and show a QR code at the counter, or send a payment code to the shop with an online order. If the shop closes, whatever is left on the card goes back to the people who paid for it. If the card simply expires unused, the leftover is split between the shop and the people who paid, following a rule the shop chose and the buyer saw before paying.

Nobody can move the money except by following those rules. Not the shop, not the buyer, and not us.

## Send what they need, not just money

When you send someone money, it is just money. Often what you really want to give is something specific: groceries, medicine, school books, a birthday dinner, a new phone screen. With Kepter you buy a gift card for a real shop near the person, they get the gift, and you know what it is for. The shop gets a new customer and is paid in dollars the moment the card is used.

Kepter works for any kind of shop: restaurants, grocery stores, pharmacies, salons, bookshops, repair shops and more. Buyers find them on the Kepter shop list by category and city, so they can pick a shop near the person they are gifting.

### Ways people can use it

| Who sends | Who receives | Example |
|---|---|---|
| Friends | Friends | A birthday dinner at a favourite restaurant, with a few friends chipping in |
| People living abroad | Relatives back home | Groceries or school books from a shop in their hometown |
| Colleagues | A teammate | A group gift for a new baby, a wedding or a farewell |
| Companies | Staff or clients | A thank you, a work anniversary or a reward at a local shop |
| Shops | Their own customers | Store credit instead of a cash refund, or a prize for loyal customers |
| Event hosts and creators | Winners and fans | Giveaways and competition prizes that people can actually spend |
| Communities, churches and schools | Members or students | Support for someone going through a hard time, at a shop they choose |

Because cards cross borders as easily as they cross town, a sender in one country can gift a card at a shop in another.

## The problem

Gift cards today are a promise from the shop. You pay now, the shop keeps your money, and you trust that it will still be open and honest when the card is used. When a shop closes, the money on unused cards is usually gone.

Small businesses also have a hard time selling gift cards at all. Big brands have gift card programs. A salon, a bakery or a phone repair shop usually has nothing, or a paper voucher that is easy to lose and easy to fake. Selling to someone in another city or another country is even harder.

## How it works

Here is a full example.

1. **Tola runs a small restaurant in Lagos.** She connects her Stellar wallet to Kepter, types her restaurant name, picks "Food and drinks", adds "Yaba, Lagos" and her WhatsApp number, and gets a public gift card page with its own link and QR code. Her restaurant now shows up on the Kepter shop list. She prints a "We accept Kepter gift cards" poster for her counter and adds her shop link to her Instagram bio.
2. **Ade lives in London and wants to treat his sister for her birthday.** He finds Tola's restaurant on the shop list by searching for Yaba, buys a 20 USDC gift card and writes a short message. He also shares a "chip in" link with two cousins, who each add 10 USDC. The card is now worth 40 USDC.
3. **Ade sends the card link to his sister on WhatsApp.** When she opens it, the card unwraps on her screen with Ade's message and the balance.
4. **She walks into the restaurant**, types the amount for her meal, and her phone shows a QR code.
5. **Tola scans the QR code** with the Kepter page on her phone. The contract checks that the card is real, takes the amount off the balance, and pays Tola in USDC. It takes a few seconds.
   Another evening she orders a takeaway instead. She taps **Use online**, types the amount, and sends the payment code to Tola on WhatsApp in one tap. Tola pastes the message into her Scan page, charges it, and sends the food.
6. **The leftover balance stays on the card** for the next visit. The card page shows how many days are left and can add the expiry date to her calendar.
7. **Tola sees the card on her dashboard** the moment it is bought, in a "Waiting to be spent" list with the balance and days left.
8. **If the card expires with money still on it**, the leftover follows the rule Tola chose when she opened her shop, which Ade saw before he paid. Tola chose "Shared", so half goes to her and half is shared back to Ade and his cousins in proportion to what each one paid. If Tola had closed her shop on Kepter instead, all of it would go back to them.

The sister never needed a wallet, an app, or an account. The link is the card.

## Who it is for

| Person | What they need | What they do |
|---|---|---|
| Shop owner | A Stellar wallet such as Freighter, LOBSTR or xBull | Opens a shop, prints a poster, scans cards, sees sales |
| Buyer | A Stellar wallet with some USDC | Buys a card and shares the link |
| Friends chipping in | A Stellar wallet with some USDC | Add money to someone else's card from a chip in link |
| Recipient | Only a phone with a browser | Opens the link and shows a QR code, or sends a payment code with an online order |

## What makes it different

- **Find a shop near them.** Every shop lists its category and city, so a buyer anywhere can find a shop close to the person they are gifting.
- **In the shop or online.** The recipient can pay at the counter, or send a payment code to the shop on WhatsApp with an order. Only that shop can use the code, and only for that amount.
- **Proof of backing.** Every shop page shows how many cards are outstanding and the USDC held for them. Anyone can check those numbers against the contract. A normal gift card program cannot prove its cards are backed. Kepter can, at any moment.
- **The money is real and set aside.** Each card is backed by USDC held in the contract, not by a promise.
- **Clear rules for unused money.** Each shop chooses what happens to money left on a card when it expires: it goes back to the people who paid, it is split with the shop, or the shop keeps it like a normal gift card. Buyers see the rule before they pay, and it is locked into the card so it can never change later.
- **Buyers are protected if a shop closes.** If a shop closes before a card expires, everyone who paid into the card gets their share of the balance back, whatever the shop's rule.
- **Shops earn and stay informed.** Shops are paid the moment a card is spent, can earn from unused balances if they choose, and see every card waiting to be spent on their dashboard.
- **Group gifts.** Friends, relatives or colleagues can chip in to one card from a separate link that never exposes the card itself.
- **Store credit.** Shops can top up a card for a customer instead of giving a cash refund.
- **The recipient needs nothing.** No wallet, no app and no sign up.
- **Nobody holds the keys to the money.** The contract has no admin and cannot be upgraded. The rules are fixed once it is deployed.
- **It works across borders.** A buyer in one country can gift a card for a shop in another, with no card fees or bank transfers.
- **Built to be reused.** The TypeScript SDK lets wallets and other Stellar apps offer "send a gift card" without building their own contract.

## What Kepter is not

- It is not a marketplace for trading gift cards.
- It is not a loyalty points program.
- It does not hold anyone's money on a server. There is no backend in the first version.
- It does not handle delivery. Online orders are arranged between the customer and the shop.
- It does not convert USDC to local currency yet. Shop owners use their wallet or a Stellar anchor for that.

## What we use on Stellar

| Stellar feature | What it is | How Kepter uses it |
|---|---|---|
| Soroban smart contracts | Stellar's smart contract platform, written in Rust | The gift card contract holds the money and enforces every rule: buying, chipping in, spending, expiry, settling unused balances and refunds when a shop closes |
| USDC on Stellar | A dollar stablecoin issued by Circle on Stellar | The money every card is bought and spent in. On testnet it is `USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`, from Circle's faucet |
| Stellar Asset Contract (SAC) | The built in contract that lets Soroban contracts move classic Stellar assets like USDC through the standard token interface (SEP-41) | Our contract calls USDC's SAC to pull money in when a card is bought or topped up, pay it out when a card is spent or settled, and read the contract's own balance for proof of backing |
| Authorization (`require_auth`) | Soroban's built in way for an account to approve exactly one action | Buyers and friends approve paying into a card. The shop approves each redemption and closing its store. Settling an expired card needs no approval because it only follows the rules |
| ed25519 signature check (`ed25519_verify`) | A host function that checks a signature inside a contract | Each card has its own key. The recipient's link signs "spend this amount from this card", and the contract checks that signature before paying the shop |
| Network ID and ledger time | The contract can read which network it runs on and the current ledger time | The network ID goes into every signed message so a testnet QR code can never work on mainnet. Ledger time enforces card expiry and keeps QR codes valid for only a few minutes |
| State archival and TTL | Contract data stays live for a limited number of ledgers and must be extended. Expired data is archived and can be restored | The contract extends a card's data every time it is used. Today the longest a single extension lasts is 3,110,400 ledgers, about 180 days at 5 seconds per ledger. If an old card is archived, the app restores it before using it, so money is never lost |
| Contract events | Records a contract emits when something happens | Every card bought, topped up, spent or settled, and every shop opened, updated, closed or changing its rule, emits an event, so history can be shown and indexed later |
| Stellar RPC | The API apps use to read contract data, simulate and send transactions | The website reads cards and shops straight from the contract and sends transactions through RPC. No server of our own |
| Stellar Wallets Kit | An open source library that connects many Stellar wallets with one interface | Shop owners, buyers and friends connect with Freighter, LOBSTR, xBull, Albedo and others |
| Stellar CLI | The official command line tool | Builds, tests, deploys the contract and generates the TypeScript client for it |
| Fast, cheap ledgers | Ledgers close about every 5 seconds and fees are a tiny fraction of a cent | A redemption at the counter confirms in seconds, and a small card is worth selling because fees do not eat it |

### Planned for later

| Stellar feature or idea | How Kepter would use it |
|---|---|
| Passkey smart wallets (`secp256r1_verify`) | Buyers pay with a fingerprint or face unlock instead of a browser extension |
| Fee sponsorship | Shops scan cards without holding XLM for fees |
| Anchors (SEP-24) | A "cash out" button that helps shops turn USDC into local currency |
| Onramps | Buyers pay with a bank card or local money instead of USDC |
| EURC | Sell cards in euros as well as dollars |
| Shop networks | One card that works at several shops in the same market, mall or street |
| Aid and school vouchers | NGOs and schools buy many cards at once that only work at approved shops |
| Embeddable button | Any shop website adds a "Buy a gift card" button with one line of code |

## Status

The contract is built, tested and deployed to Stellar testnet. See the [README](../README.md) for the contract address, and [DESIGN.md](DESIGN.md) for how the contract works. The TypeScript SDK and the website are next.
